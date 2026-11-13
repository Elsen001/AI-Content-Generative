import Link from 'next/link';
import { ArrowRight, Check, Clapperboard, Image as ImageIcon, Layers, Sparkles, Zap } from 'lucide-react';
import { getSessionUser } from '@/lib/auth';
import { categoryCounts, providerCounts, searchModels } from '@/lib/catalog';
import { getSetting, getPlans, listShowcase } from '@/lib/db';
import { formatCredits } from '@/lib/credit-rules';
import { FAQ_ITEMS } from '@/lib/content';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HeroComposer } from '@/components/HeroComposer';
import { ShowcaseWall } from '@/components/ShowcaseWall';
import { PricingCards } from '@/components/PricingCards';
import { Faq } from '@/components/Faq';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSessionUser();
  const showcase = listShowcase();
  const plans = getPlans();
  const announcement = getSetting('announcement', '');
  const budget = Number(getSetting('provider_budget_cents', 5000)) || 5000;
  const imageModels = searchModels({ category: 'image', limit: 6 }).models;
  const videoModels = searchModels({ category: 'video', limit: 6 }).models;
  const topProviders = Object.entries(providerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14);
  const marquee = [...topProviders, ...topProviders];

  return (
    <>
      <SiteHeader user={user} announcement={announcement} />

      <main>
        <section className="hero">
          <div className="hero-glow one" />
          <div className="hero-glow two" />
          <div className="container">
            <div className="hero-inner">
              <div className="hero-copy fade-up">
                <span className="eyebrow">
                  <span className="dot" /> {categoryCounts.all} model · bir studio
                </span>
                <h1>
                  <span className="line">Xəyal et.</span>
                  <span className="line">Yarad.</span>
                  <span className="line gradient-text">Viral ol.</span>
                </h1>
                <p className="hero-sub">
                  Higgsfield səviyyəsində AI şəkil və video istehsalı.
                  <strong> 587 model</strong>, bir hesab, paylaşımlı MuAPI gücü.
                  API açarı, quraşdırma, mürəkkəb setup — yoxdur.
                </p>

                <HeroComposer />

                <div className="hero-meta">
                  <span><span className="dot" /> <b>587</b> model</span>
                  <span><span className="dot" /> <b>4K</b> video</span>
                  <span><span className="dot" /> Server-side <b>MuAPI</b></span>
                  <span><span className="dot" /> Kredit geri qaytarılır</span>
                </div>
              </div>

              <div className="hero-visual fade-up" style={{ animationDelay: '120ms' }}>
                <div className="hero-stage">
                  <video
                    src="/showcase/neon.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                  <div className="stage-top">
                    <span className="stage-badge"><span className="live" /> Live render</span>
                    <span className="stage-badge">Kling 2.5 · 1080p</span>
                  </div>
                  <div className="stage-caption">
                    <p className="prompt">“Neon yağışında rəqs edən kiberpunk personaj, cinematic kamera, 35mm film grain…”</p>
                    <h3>Viral loop · 9:16</h3>
                  </div>
                </div>
                <div className="hero-float float-stat">
                  <span className="ring" />
                  <div>
                    <b>Paylaşımlı balans</b>
                    <span>${(budget / 100).toFixed(0)} MuAPI pool</span>
                  </div>
                </div>
                <div className="hero-float float-prompt">
                  <div className="row"><span className="dot" /> Növbəti kadr</div>
                  <p>“Şüşə portret, maye metal işığı, ultra makro detal…”</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {marquee.map(([name, count], index) => (
              <span className="marquee-item" key={`${name}-${index}`}>
                <span className="spark" /> {name} <span style={{ opacity: 0.45 }}>{count}</span>
              </span>
            ))}
          </div>
        </div>

        <section className="section container-wide">
          <ShowcaseWall items={showcase} />
        </section>

        <section className="section container">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Studio</span>
              <h2 className="mt-2">İki studio. Sonsuz kadr.</h2>
            </div>
            <p>
              Şəkil üçün 172, video üçün 392 model. Eyni hesab, eyni kredit,
              eyni keyfiyyət.
            </p>
          </div>

          <div className="split">
            <Link href="/studio/image" className="feature-card">
              <span className="eyebrow"><ImageIcon size={12} /> Image studio</span>
              <h3>Şəkil<br />yaradıcılığı</h3>
              <p>
                Nano Banana Pro, Flux Kontext, Seedream, Midjourney üslubu və
                daha çoxu. Mətnlə yarat, şəkli dəyiş, 4K-ya qədər export et.
              </p>
              <div className="feature-art">
                <img src="/showcase/portrait.png" alt="AI portret" />
              </div>
              <div className="feature-foot">
                <span className="micro-tag">{categoryCounts.image} model</span>
                <span className="micro-tag">Text → Image</span>
                <span className="micro-tag">Image → Image</span>
              </div>
            </Link>

            <Link href="/studio/video" className="feature-card video-card">
              <span className="eyebrow"><Clapperboard size={12} /> Video studio</span>
              <h3>Kinematik<br />video</h3>
              <p>
                Kling, Veo, Seedance, Wan, Hailuo, Sora. Mətndən və ya şəkildən
                4K video, audio, lip sync və motion control.
              </p>
              <div className="feature-art">
                <video src="/showcase/liquid.mp4" autoPlay muted loop playsInline preload="metadata" />
              </div>
              <div className="feature-foot">
                <span className="micro-tag">{categoryCounts.video} model</span>
                <span className="micro-tag">Text → Video</span>
                <span className="micro-tag">Image → Video</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="section container">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Model kataloqu</span>
              <h2 className="mt-2">Sənayenin ən yaxşıları.</h2>
            </div>
            <Link href="/models" className="btn">
              Bütün {categoryCounts.all} model <ArrowRight size={14} />
            </Link>
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-head">
                <h3><ImageIcon size={13} style={{ verticalAlign: -2, marginRight: 6 }} /> Şəkil modelləri</h3>
                <span className="tiny muted">{categoryCounts.image} model</span>
              </div>
              <div className="panel-body stack" style={{ gap: 0 }}>
                {imageModels.map((model) => (
                  <Link
                    key={model.key}
                    href={`/studio/image?model=${encodeURIComponent(model.id)}&mode=${encodeURIComponent(model.mode)}`}
                    className="between"
                    style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}
                  >
                    <span>
                      <b style={{ fontSize: 12.5, display: 'block' }}>{model.name}</b>
                      <span className="tiny muted">{model.providerName} · {model.modeLabel}</span>
                    </span>
                    <ArrowRight size={13} color="var(--lime)" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3><Clapperboard size={13} style={{ verticalAlign: -2, marginRight: 6 }} /> Video modelləri</h3>
                <span className="tiny muted">{categoryCounts.video} model</span>
              </div>
              <div className="panel-body stack" style={{ gap: 0 }}>
                {videoModels.map((model) => (
                  <Link
                    key={model.key}
                    href={`/studio/video?model=${encodeURIComponent(model.id)}&mode=${encodeURIComponent(model.mode)}`}
                    className="between"
                    style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}
                  >
                    <span>
                      <b style={{ fontSize: 12.5, display: 'block' }}>{model.name}</b>
                      <span className="tiny muted">{model.providerName} · {model.modeLabel}</span>
                    </span>
                    <ArrowRight size={13} color="var(--lime)" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Necə işləyir</span>
              <h2 className="mt-2">Üç addım. Bir studiya.</h2>
            </div>
            <p>API açarı yox, quraşdırma yox. Qeydiyyatdan ilk kadra qədər 2 dəqiqə.</p>
          </div>
          <div className="steps">
            <div className="step">
              <span className="num">01</span>
              <h3>Qeydiyyat</h3>
              <p>Email ilə hesab yarat. Dərhal 50 bonus kredit və şəxsi referral linki al.</p>
            </div>
            <div className="step">
              <span className="num">02</span>
              <h3>Plan seç</h3>
              <p>Starter, Creator, Pro və ya Studio. Kreditlər dərhal balansa düşür.</p>
            </div>
            <div className="step">
              <span className="num">03</span>
              <h3>Yarat və paylaş</h3>
              <p>587 modeldən seç, prompt yaz, nəticəni yüklə və viral et.</p>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="pool-banner">
            <div>
              <span className="eyebrow"><Layers size={12} /> Paylaşımlı MuAPI pool</span>
              <h2 className="mt-2" style={{ fontSize: 'clamp(26px,3vw,38px)' }}>
                Admin bir dəfə ödəyir.<br />Hamı istifadə edir.
              </h2>
              <p className="lead mt-2" style={{ fontSize: 14 }}>
                Platformanın MuAPI hesabına ${(budget / 100).toFixed(0)} paket alınır.
                Sizin kreditləriniz həmin balansdan qidalanır — ayrıca API açarı,
                ayrıca hesab, ayrıca limit yoxdur.
              </p>
              <div className="row wrap mt-3">
                <Link href="/pricing" className="btn btn-primary btn-sm">
                  Planları gör <ArrowRight size={13} />
                </Link>
                <Link href="/models" className="btn btn-sm">
                  Modelləri kəşf et
                </Link>
              </div>
            </div>
            <div className="pool-stats">
              <div className="pool-stat"><b>${(budget / 100).toFixed(0)}</b><span>MuAPI pool</span></div>
              <div className="pool-stat"><b>{formatCredits(categoryCounts.all)}</b><span>Model</span></div>
              <div className="pool-stat"><b>1¢</b><span>1 kredit</span></div>
            </div>
          </div>
        </section>

        <section className="section container" id="pricing">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> Planlar</span>
              <h2 className="mt-2">Ehtiyacına uyğun kredit.</h2>
            </div>
            <Link href="/pricing" className="btn">
              Müqayisə et <ArrowRight size={14} />
            </Link>
          </div>
          <PricingCards plans={plans} user={user} compact />
        </section>

        <section className="section container">
          <div className="section-head">
            <div>
              <span className="eyebrow"><span className="dot" /> FAQ</span>
              <h2 className="mt-2">Sualınız var?</h2>
            </div>
            <p>Ən çox verilən suallar. Cavab tapmadınız? support@vyral.studio</p>
          </div>
          <Faq items={FAQ_ITEMS.slice(0, 5)} />
        </section>

        <section className="section container">
          <div className="cta-band">
            <span className="eyebrow"><Zap size={12} /> İlk kadr pulsuz</span>
            <h2 className="mt-2">Bu gün viral olacaq kadrı yarat.</h2>
            <p>Qeydiyyat 30 saniyədir. 50 bonus kredit dərhal hesabında.</p>
            <div className="hero-actions">
              <Link href="/register" className="btn btn-primary btn-lg">
                Pulsuz başla <ArrowRight size={15} />
              </Link>
              <Link href="/models" className="btn btn-lg">
                Modellərə bax
              </Link>
            </div>
            <div className="hero-meta" style={{ justifyContent: 'center' }}>
              <span><Check size={12} /> Kart tələb olunmur</span>
              <span><Check size={12} /> 50 bonus kredit</span>
              <span><Check size={12} /> İstənilən vaxt yüksəlt</span>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
