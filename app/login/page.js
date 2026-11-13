import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { AuthForm } from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Daxil ol' };

const safeNext = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard');

export default async function LoginPage({ searchParams }) {
  const user = await getSessionUser();
  const params = await searchParams;
  const next = safeNext(params?.next);
  if (user) redirect(next);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="container-wide" style={{ height: 74, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo />
        <Link href="/register" className="btn btn-sm">Hesab yarat</Link>
      </div>
      <div className="auth-page" style={{ minHeight: 'calc(100vh - 74px)' }}>
        <div className="auth-side">
          <video src="/showcase/liquid.mp4" autoPlay muted loop playsInline preload="metadata" />
          <div className="auth-side-content">
            <span className="eyebrow"><span className="dot" /> VYRAL Studio</span>
            <h2 className="mt-2">Xəyal etdiyin kadr bir prompt uzaqlıqdadır.</h2>
            <p>
              587 model, paylaşımlı MuAPI balansı, kredit geri qaytarma.
              API açarı olmadan birbaşa yarat.
            </p>
            <div className="hero-meta">
              <span><Check size={12} /> 50 bonus kredit</span>
              <span><Check size={12} /> 4K video</span>
              <span><Check size={12} /> Kommersiya lisenziyası</span>
            </div>
          </div>
        </div>

        <div className="auth-main">
          <div className="auth-card">
            <span className="eyebrow"><Sparkles size={12} /> Xoş gəldin</span>
            <h1 className="mt-2">Daxil ol</h1>
            <p>Hesabına daxil ol və yaratmağa davam et.</p>
            <AuthForm mode="login" next={next} />
            <p className="auth-alt">
              Hesabın yoxdur? <Link href={`/register${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>Qeydiyyatdan keç</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
