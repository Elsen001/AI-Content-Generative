import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, CreditCard, Layers, Sparkles, TrendingUp, Video } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getDb, getSetting, planById } from '@/lib/db';
import { formatCredits } from '@/lib/credit-rules';
import { formatDate } from '@/lib/format';
import { serializeGeneration } from '@/lib/generations';
import { listOrders, serializeOrder } from '@/lib/orders';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReferralBox } from '@/components/ReferralBox';
import { AccountForm } from '@/components/AccountForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Kabinet' };

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/dashboard');

  const db = getDb();
  const plan = user.planId ? planById(user.planId) : null;
  const generationCount = db.prepare('SELECT COUNT(*) AS count FROM generations WHERE user_id = ?').get(user.id).count;
  const completedCount = db
    .prepare("SELECT COUNT(*) AS count FROM generations WHERE user_id = ? AND status = 'completed'")
    .get(user.id).count;
  const spent = db
    .prepare('SELECT COALESCE(SUM(cost), 0) AS total FROM generations WHERE user_id = ? AND refunded = 0')
    .get(user.id).total;
  const referralCount = db
    .prepare('SELECT COUNT(*) AS count FROM users WHERE referred_by = ?')
    .get(user.id).count;
  const recent = db
    .prepare("SELECT * FROM generations WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 12")
    .all(user.id)
    .map(serializeGeneration);
  const orders = listOrders(user.id, { limit: 12 }).map(serializeOrder);
  const refBonus = Number(getSetting('ref_bonus_credits', 100)) || 0;

  return (
    <>
      <SiteHeader user={user} />
      <main className="container" style={{ paddingBottom: 60 }}>
        <div className="dash-head">
          <div>
            <span className="eyebrow"><span className="dot" /> Kabinet</span>
            <h1 style={{ fontSize: 'clamp(32px,4vw,46px)', marginTop: 14 }}>
              Salam, {user.name?.split(' ')[0]}.
            </h1>
            <p className="muted small mt-1">{user.email}</p>
          </div>
          <div className="row wrap">
            <Link href="/studio/video" className="btn btn-primary">
              <Video size={14} /> Video yarat
            </Link>
            <Link href="/pricing" className="btn">
              <CreditCard size={14} /> Kredit al
            </Link>
            {user.role === 'admin' ? (
              <Link href="/admin" className="btn">Admin panel</Link>
            ) : null}
          </div>
        </div>

        <div className="dash-stats">
          <div className="stat-card">
            <span className="label"><Sparkles size={11} /> Balans</span>
            <b>{formatCredits(user.credits)}</b>
            <span>kredit · ≈ ${(user.credits * 0.01).toFixed(2)}</span>
          </div>
          <div className="stat-card">
            <span className="label"><Layers size={11} /> Plan</span>
            <b style={{ fontSize: 22 }}>{plan?.name || 'Pulsuz'}</b>
            <span>{plan ? `${formatCredits(plan.credits)} kredit paketi` : 'Plan seçilməyib'}</span>
          </div>
          <div className="stat-card">
            <span className="label"><TrendingUp size={11} /> Generasiya</span>
            <b>{formatCredits(generationCount)}</b>
            <span>{formatCredits(completedCount)} uğurlu</span>
          </div>
          <div className="stat-card">
            <span className="label"><Video size={11} /> Xərclənən</span>
            <b>{formatCredits(spent)}</b>
            <span>kredit istifadə edilib</span>
          </div>
        </div>

        <div className="dash-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>Son generasiyalar</h3>
              <Link href="/studio/image" className="tiny" style={{ color: 'var(--lime)' }}>
                Yeni yarat <ArrowRight size={11} style={{ verticalAlign: -1 }} />
              </Link>
            </div>
            <div className="panel-body">
              <div className="gallery-grid">
                {recent.length ? (
                  recent.map((item) => (
                    <a
                      key={item.id}
                      href={item.outputUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="gallery-item"
                      title={item.prompt || item.modelName}
                    >
                      {item.category === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(item.outputUrl || '') ? (
                        <video src={item.outputUrl} muted />
                      ) : (
                        <img src={item.outputUrl} alt={item.modelName} loading="lazy" />
                      )}
                      <span className="gallery-meta">{item.modelName}</span>
                    </a>
                  ))
                ) : (
                  <div className="gallery-empty">
                    Hələ generasiya yoxdur.{' '}
                    <Link href="/studio/image" style={{ color: 'var(--lime)' }}>İlk şəklini yarat →</Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="panel">
              <div className="panel-head"><h3>Plan və kredit</h3></div>
              <div className="panel-body">
                <div className="between">
                  <span className="muted small">Cari plan</span>
                  <b style={{ fontSize: 13 }}>{plan?.name || 'Pulsuz'}</b>
                </div>
                <div className="between mt-1">
                  <span className="muted small">Balans</span>
                  <b style={{ color: 'var(--lime)' }}>{formatCredits(user.credits)} kredit</b>
                </div>
                <div className="between mt-1">
                  <span className="muted small">Dəvət edilən</span>
                  <b>{referralCount} istifadəçi</b>
                </div>
                <Link href="/pricing" className="btn btn-primary btn-block mt-2">
                  Kredit əlavə et
                </Link>
                <p className="tiny muted mt-1" style={{ marginTop: 8 }}>
                  Bütün generasiyalar platformanın paylaşımlı MuAPI balansından işləyir.
                </p>
              </div>
            </div>

            <ReferralBox code={user.refCode} bonus={refBonus} />

            <div className="panel">
              <div className="panel-head"><h3>Hesab</h3></div>
              <div className="panel-body">
                <AccountForm user={user} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel mt-3">
          <div className="panel-head">
            <h3>Sifarişlər</h3>
            <span className="tiny muted">Son 12</span>
          </div>
          {orders.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sifariş</th>
                    <th>Plan</th>
                    <th>Məbləğ</th>
                    <th>Kredit</th>
                    <th>Status</th>
                    <th>Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="mono">{order.id}</td>
                      <td>{order.planName}</td>
                      <td>${(order.amountCents / 100).toFixed(2)}</td>
                      <td>{formatCredits(order.credits)}</td>
                      <td><span className={`status ${order.status}`}>{order.status}</span></td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-body muted small">Hələ sifariş yoxdur.</div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
