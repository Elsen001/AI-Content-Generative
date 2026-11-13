import Link from 'next/link';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Logo />
            <p>
              Higgsfield üslubunda AI şəkil və video studiyası. 587 model, bir
              hesab, paylaşımlı MuAPI gücü.
            </p>
            <div className="row mt-2" style={{ gap: 6 }}>
              <span className="micro-tag">MuAPI</span>
              <span className="micro-tag">Seedance</span>
              <span className="micro-tag">Kling</span>
              <span className="micro-tag">Veo</span>
            </div>
          </div>
          <div className="footer-col">
            <h4>Studio</h4>
            <Link href="/studio/image">Şəkil studiyası</Link>
            <Link href="/studio/video">Video studiyası</Link>
            <Link href="/models">Model kataloqu</Link>
            <Link href="/pricing">Planlar</Link>
          </div>
          <div className="footer-col">
            <h4>Hesab</h4>
            <Link href="/register">Qeydiyyat</Link>
            <Link href="/login">Daxil ol</Link>
            <Link href="/dashboard">Kabinet</Link>
            <Link href="/dashboard#referral">Referral</Link>
          </div>
          <div className="footer-col">
            <h4>Şirkət</h4>
            <a href="https://muapi.ai" target="_blank" rel="noreferrer">MuAPI</a>
            <a href="https://github.com/Elsen001/Open-Generative-AI" target="_blank" rel="noreferrer">Open source</a>
            <Link href="/pricing#faq">FAQ</Link>
            <a href="mailto:support@vyral.studio">Dəstək</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} VYRAL Studio. Bütün hüquqlar qorunur.</span>
          <span className="socials">
            <span className="micro-tag">Paylaşımlı MuAPI balansı</span>
            <span className="micro-tag">Server-side açarlar</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
