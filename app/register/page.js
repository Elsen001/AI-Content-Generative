import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getSetting } from '@/lib/db';
import { Logo } from '@/components/Logo';
import { AuthForm } from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Qeydiyyat' };

const safeNext = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');
const safeRef = (value) => (typeof value === 'string' && /^[a-zA-Z0-9-]{4,40}$/.test(value) ? value : '');

export default async function RegisterPage({ searchParams }) {
  const user = await getSessionUser();
  const params = await searchParams;
  const next = safeNext(params?.next);
  const referral = safeRef(params?.ref);
  if (user) redirect(next);
  const signupCredits = Number(getSetting('signup_credits', 50)) || 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="container-wide" style={{ height: 74, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo />
        <Link href="/login" className="btn btn-sm">Daxil ol</Link>
      </div>
      <div className="auth-page" style={{ minHeight: 'calc(100vh - 74px)' }}>
        <div className="auth-side">
          <video src="/showcase/bloom.mp4" autoPlay muted loop playsInline preload="metadata" />
          <div className="auth-side-content">
            <span className="eyebrow"><span className="dot" /> Pulsuz başla</span>
            <h2 className="mt-2">İlk kadrın üçün heç nə ödəmirsən.</h2>
            <p>
              Qeydiyyatdan dərhal sonra {signupCredits} kredit hesabına düşür.
              Şəkil, video və audio modellərini sına.
            </p>
            <div className="hero-meta">
              <span><Check size={12} /> Kart tələb olunmur</span>
              <span><Check size={12} /> {signupCredits} bonus kredit</span>
              <span><Check size={12} /> Referral bonusu</span>
            </div>
          </div>
        </div>

        <div className="auth-main">
          <div className="auth-card">
            <span className="eyebrow"><Sparkles size={12} /> 30 saniyə</span>
            <h1 className="mt-2">Hesab yarat</h1>
            <p>{signupCredits} bonus kredit və 587 modelə giriş.</p>
            <AuthForm mode="register" next={next} referral={referral} />
            <p className="auth-alt">
              Artıq hesabın var? <Link href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>Daxil ol</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
