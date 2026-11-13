import { getSessionUser } from '@/lib/auth';
import { categoryCounts, getFacets, searchModels } from '@/lib/catalog';
import { getSetting } from '@/lib/db';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ModelBrowser } from '@/components/ModelBrowser';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Model kataloqu',
  description: '587 AI modeli — şəkil, video və audio. Provider, rejim və istifadə halına görə filterləyin.',
};

export default async function ModelsPage() {
  const user = await getSessionUser();
  const announcement = getSetting('announcement', '');
  const initialData = {
    ...searchModels({ limit: 48 }),
    facets: getFacets(),
  };

  return (
    <>
      <SiteHeader user={user} announcement={announcement} />
      <main>
        <section className="section-tight container">
          <span className="eyebrow"><span className="dot" /> Model kataloqu</span>
          <h1 style={{ fontSize: 'clamp(38px,5vw,66px)', marginTop: 18 }}>
            {categoryCounts.all} model.<br />
            <span className="gradient-text">Bir studio.</span>
          </h1>
          <p className="lead mt-2" style={{ maxWidth: 620 }}>
            Nano Banana və Flux-dan Kling, Veo, Seedance və Sora-ya qədər.
            Şəkil, video, lip sync, motion control və audio modelləri — hamısı
            eyni hesab və eyni kredit ilə.
          </p>
          <div className="row wrap mt-3">
            <span className="micro-tag">{categoryCounts.image} şəkil modeli</span>
            <span className="micro-tag">{categoryCounts.video} video modeli</span>
            <span className="micro-tag">{categoryCounts.audio} audio modeli</span>
          </div>
        </section>

        <section className="container" style={{ paddingBottom: 80 }}>
          <ModelBrowser initialData={initialData} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
