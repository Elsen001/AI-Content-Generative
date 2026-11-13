import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock, CreditCard, XCircle } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getSetting } from '@/lib/db';
import { getOrder, serializeOrder } from '@/lib/orders';
import { formatCredits } from '@/lib/credit-rules';
import { formatDateTime } from '@/lib/format';
import { SiteHeader } from '@/components/SiteHeader';
import { CheckoutForm } from '@/components/CheckoutForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Sifariş' };

export default async function CheckoutPage({ params }) {
  const user = await getSessionUser();
  const { id } = await params;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);

  const raw = getOrder(id);
  if (!raw) redirect('/pricing');
  if (raw.user_id !== user.id && user.role !== 'admin') redirect('/dashboard');
  const order = serializeOrder(raw);
  const instructions = getSetting('manual_payment', '');

  const icon = order.status === 'approved'
    ? <CheckCircle2 size={22} color="var(--success)" />
    : order.status === 'rejected'
      ? <XCircle size={22} color="var(--danger)" />
      : <Clock size={22} color="#ffc977" />;

  return (
    <>
      <SiteHeader user={user} />
      <main className="container">
        <div className="checkout-card">
          <div className="row" style={{ gap: 10 }}>
            {icon}
            <div>
              <h1 style={{ fontSize: 28, letterSpacing: '-0.04em' }}>Sifariş {order.id}</h1>
              <p className="muted small">
                {order.status === 'approved'
                  ? 'Ödəniş təsdiqləndi, kreditlər balansınızdadır.'
                  : order.status === 'rejected'
                    ? 'Sifariş rədd edildi. Dəstək ilə əlaqə saxlayın.'
                    : 'Ödəniş gözlənilir. Aşağıdakı təlimatlara baxın.'}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="checkout-row"><span>Plan</span><b>{order.planName}</b></div>
            <div className="checkout-row"><span>Məbləğ</span><b>${(order.amountCents / 100).toFixed(2)}</b></div>
            <div className="checkout-row"><span>Kredit</span><b style={{ color: 'var(--lime)' }}>{formatCredits(order.credits)}</b></div>
            <div className="checkout-row"><span>Status</span><b><span className={`status ${order.status}`}>{order.status}</span></b></div>
            <div className="checkout-row"><span>Üsul</span><b>{order.method === 'stripe' ? 'Stripe' : 'Manual / bank'}</b></div>
            <div className="checkout-row" style={{ borderBottom: 0 }}><span>Tarix</span><b>{formatDateTime(order.createdAt)}</b></div>
          </div>

          {order.status === 'pending' ? (
            <>
              <div className="payment-instructions">{instructions || 'Ödəniş məlumatları üçün adminlə əlaqə saxlayın.'}</div>
              <h3 className="mt-3" style={{ fontSize: 15 }}>Ödənişi bildir</h3>
              <p className="muted small mb-2">
                Ödəniş etdikdən sonra referans nömrəsini göndərin. Admin təsdiqləyəndə
                kreditlər avtomatik yüklənir.
              </p>
              <CheckoutForm orderId={order.id} />
            </>
          ) : order.status === 'approved' ? (
            <div className="stack mt-3">
              <div className="form-success">
                {formatCredits(order.credits)} kredit hesabınıza əlavə edildi.
                Balans: {formatCredits(user.credits)} kredit.
              </div>
              <div className="row wrap">
                <Link href="/studio/video" className="btn btn-primary"><CreditCard size={14} /> Video yarat</Link>
                <Link href="/dashboard" className="btn">Kabinetə keç</Link>
              </div>
            </div>
          ) : (
            <div className="stack mt-3">
              <div className="form-error">Bu sifariş üzrə ödəniş təsdiqlənmədi.</div>
              <Link href="/pricing" className="btn">Planlara qayıt</Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
