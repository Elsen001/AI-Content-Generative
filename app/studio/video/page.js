import { getSessionUser } from '@/lib/auth';
import { getFullCatalog, getModel, searchModels } from '@/lib/catalog';
import { getDb } from '@/lib/db';
import { serializeGeneration } from '@/lib/generations';
import { SiteHeader } from '@/components/SiteHeader';
import { StudioClient } from '@/components/StudioClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Video studiyası',
  description: 'Kling, Veo, Seedance, Wan, Sora və digər video modelləri ilə AI video yarat.',
};

const VIDEO_MODES = ['text-to-video', 'image-to-video', 'video-to-video', 'lipsync', 'recast', 'motion-control'];

function pickInitialModel(requestedId, mode) {
  if (requestedId) {
    const direct = getModel('video', mode, requestedId);
    if (direct) return direct;
    const fallback = getFullCatalog().find(
      (item) => item.category === 'video' && item.id === requestedId,
    );
    if (fallback) return fallback;
  }
  const first = searchModels({ category: 'video', mode, limit: 1 }).models[0];
  return first ? getModel('video', first.mode, first.id) : null;
}

export default async function VideoStudioPage({ searchParams }) {
  const user = await getSessionUser();
  const params = await searchParams;
  const mode = VIDEO_MODES.includes(params?.mode) ? params.mode : VIDEO_MODES[0];
  const initialModel = pickInitialModel(params?.model, mode);

  let recent = [];
  if (user) {
    recent = getDb()
      .prepare("SELECT * FROM generations WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 24")
      .all(user.id)
      .map(serializeGeneration);
  }

  return (
    <>
      <SiteHeader user={user} />
      <StudioClient
        user={user}
        category="video"
        initialMode={initialModel?.mode || mode}
        initialModel={initialModel}
        initialGenerations={recent}
      />
    </>
  );
}
