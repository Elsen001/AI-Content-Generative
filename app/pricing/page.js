import Link from 'next/link';
import { ArrowRight, Check, Layers, Sparkles } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { getSetting, getPlans } from '@/lib/db';
import { FAQ_ITEMS } from '@/lib/content';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PricingCards } from '@/components/PricingCards';
import { Faq } from '@/components/Faq';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Planlar və kreditlər',
  description: 'VYRAL planları: Starter $9, Creator $29, Pro $79, Studio $199. Kreditlər dərhal hesaba yüklənir.',
};

export default async function PricingPage() {
  const user = await getSessionUser();
  const plans = getPlans();
  const budget = Number(getSetting('provider_budget_cents', 5000)) || 5000;
  const announcement = getSetting('announcement', '');

  return (
    <>
      <SiteHeader user={user} announcement={announcement} />
      <main>
        <section className="section-tight container text-center">
          <span className="eyebrow"><span className="dot" /> Planlar</span>
          <h1 style={{ fontSize: 'clamp(40px,6vw,76px)', marginTop: 18 }}>
            Kredit al.<br /><span className="gradient-text">Viral ol.</span>
          </h1>
          <p className="lead mt-2" style={{ maxWidth: 560, marginInline: 'auto' }}>
            Gizli ödəniş yoxdur. Hər plan birdəfəlik kredit paketidir və bütün
            587 modeldə keçərlidir.
          </p>
          <div className="pricing-toggle" style={{ justifyContent: 'center' }}>
            <Sparkles size={12} color="var(--lime)" />
            Bütün planlara 50 bonus qeydiyyat krediti daxildir
            <span className="save">-0% gizli komissiya</span>
          </div>
        </section>

        <section className="container" style={{ paddingBottom: 40 }}>
          <PricingCards plans={plans} user={user} />
        </section>

        <section className="container" style={{ paddingBottom: 60 }}>
          <div className="pool-banner">
            <div>
              <span className="eyebrow"><Layers size={12} /> Niyə belə işləyir</span>
              <h2 className="mt-2" style={{ fontSize: 'clamp(26px,3vw,38px)' }}>
                Paylaşımlı MuAPI balansı.
              </h2>
              <p className="lead mt-2" style={{ fontSize: 14 }}>
                Admin bir MuAPI paketi alır (default ${(budget / 100).toFixed(0)}).
                Hər istifadəçinin krediti bu balansın bir hissəsidir. Nəticədə
                siz API açarı, ayrı hesab və ya texniki setup ilə vaxt itirmirsiniz.
              </p>
              <ul className="price-features mt-2">
                <li><Check size={12} /> Bütün modellər serverdəki bir açarla işləyir</li>
                <li><Check size={12} /> Uğursuz generasiya avtomatik refund olunur</li>
                <li><Check size={12} /> Kreditlər bitəndə istənilən vaxt əlavə edilir</li>
              </ul>
            </div>
            <div className="panel">
              <div className="panel-head"><h3>Kredit nə qədər gedir?</h3><span className="tiny muted">təxmini</span></div>
              <div className="panel-body stack" style={{ gap: 0 }}>
                {[
                  ['Şəkil (standard)', '5–10 kredit'],
                  ['Şəkil (Pro / 4K)', '12–20 kredit'],
                  ['Video 5s 720p', '45–60 kredit'],
                  ['Video 5s 1080p', '65–90 kredit'],
                  ['Video 10s 4K', '140–190 kredit'],
                  ['Lip Sync', '55–90 kredit'],
                  ['Audio', '10–20 kredit'],
                ].map(([label, value]) => (
                  <div key={label} className="between" style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 11.5 }}>
                    <span className="muted">{label}</span>
                    <b style={{ color: 'var(--lime)' }}>{value}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section container" id="faq">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> FAQ</span>
              <h2 className="mt-2">Bilmək istədikləriniz.</h2>
            </div>
            <p>Ödəniş, kredit, model və istifadə hüququ haqqında.</p>
          </div>
          <Faq items={FAQ_ITEMS} />
          <div className="cta-band mt-4">
            <span className="eyebrow"><Sparkles size={12} /> Hazırsınız?</span>
            <h2 className="mt-2">İlk kadrını bu gün yarat.</h2>
            <div className="hero-actions">
              <Link href="/register" className="btn btn-primary btn-lg">
                Hesab yarat <ArrowRight size={15} />
              </Link>
              <Link href="/models" className="btn btn-lg">Modellərə bax</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
