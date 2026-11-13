import crypto from 'node:crypto';
import { z } from 'zod';
import {
  ApiError,
  assertSameOrigin,
  handler,
  json,
  rateLimit,
  requireUser,
} from '@/lib/auth';
import { getModel, isImageMode, isVideoMode } from '@/lib/catalog';
import { estimateCredits, estimateProviderCostCents } from '@/lib/credit-rules';
import { getDb, getUserById } from '@/lib/db';
import { failAndRefund } from '@/lib/generations';
import { hasMuapiKey, submitPrediction } from '@/lib/muapi';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const schema = z.object({
  category: z.enum(['image', 'video', 'audio']),
  mode: z.string().trim().min(2).max(40),
  modelId: z.string().trim().min(1).max(120),
  prompt: z.string().max(6000).optional().default(''),
  image_url: z.string().url().max(2000).optional().nullable(),
  images_list: z.array(z.string().url().max(2000)).max(16).optional().default([]),
  last_image: z.string().url().max(2000).optional().nullable(),
  video_url: z.string().url().max(2000).optional().nullable(),
  audio_url: z.string().url().max(2000).optional().nullable(),
  aspect_ratio: z.string().max(20).optional().nullable(),
  duration: z.union([z.number(), z.string()]).optional().nullable(),
  resolution: z.string().max(30).optional().nullable(),
  quality: z.string().max(30).optional().nullable(),
  seed: z.union([z.number(), z.string()]).optional().nullable(),
  params: z.record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).optional().default({}),
});

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  rateLimit(`generate:${user.id}`, 40, 60 * 1000);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');
  }

  const values = parsed.data;
  const model = getModel(values.category, values.mode, values.modelId);
  if (!model) throw new ApiError(404, 'Model tapılmadı.');

  if (values.category === 'image' && !isImageMode(values.mode)) {
    throw new ApiError(400, 'Bu model şəkil studiyasında işləmir.');
  }
  if (values.category === 'video' && !isVideoMode(values.mode)) {
    throw new ApiError(400, 'Bu model video studiyasında işləmir.');
  }

  const prompt = String(values.prompt || '').trim();
  if (model.promptRequired && !prompt && model.hasPrompt !== false) {
    throw new ApiError(400, 'Bu model üçün prompt tələb olunur.');
  }

  const hasImage = Boolean(values.image_url) || values.images_list.length > 0;
  if ((values.mode === 'image-to-image' || values.mode === 'image-to-video') && !hasImage) {
    throw new ApiError(400, 'Bu model üçün istinad şəkil yükləyin.');
  }
  if (values.mode === 'video-to-video' && !values.video_url) {
    throw new ApiError(400, 'Bu model üçün video yükləyin.');
  }
  if (!hasMuapiKey()) {
    throw new ApiError(503, 'Platformanın MuAPI açarı hələ qoşulmayıb. Adminlə əlaqə saxlayın.');
  }

  const credits = estimateCredits(model, {
    duration: values.duration,
    resolution: values.resolution,
    quality: values.quality,
  });
  const providerCost = estimateProviderCostCents(model, credits);

  const db = getDb();
  const id = crypto.randomUUID();
  const deduct = db.transaction(() => {
    const update = db
      .prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?')
      .run(credits, user.id, credits);
    if (update.changes === 0) return false;

    db.prepare(`
      INSERT INTO generations
        (id, user_id, category, mode, model_id, model_name, prompt, params, cost, provider_cost_cents, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')
    `).run(
      id,
      user.id,
      values.category,
      values.mode,
      model.id,
      model.name,
      prompt,
      JSON.stringify({
        ...values.params,
        image_url: values.image_url || null,
        images_list: values.images_list,
        video_url: values.video_url || null,
        aspect_ratio: values.aspect_ratio || null,
        duration: values.duration || null,
        resolution: values.resolution || null,
        quality: values.quality || null,
      }),
      credits,
      providerCost,
    );

    db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
      .run(user.id, 'generation', -credits, `${model.name} (${values.mode})`);
    return true;
  });

  if (!deduct()) {
    throw new ApiError(402, `Kifayət qədər kredit yoxdur. Bu generasiya ${credits} kredit tələb edir.`);
  }

  try {
    const result = await submitPrediction(model, values);
    if (result.status === 'completed' && result.url) {
      db.prepare(`
        UPDATE generations
        SET status = 'completed', request_id = ?, output_url = ?, completed_at = datetime('now')
        WHERE id = ?
      `).run(result.requestId, result.url, id);
    } else {
      db.prepare('UPDATE generations SET request_id = ? WHERE id = ?').run(result.requestId, id);
    }

    const row = db.prepare('SELECT * FROM generations WHERE id = ?').get(id);
    const updatedUser = getUserById(user.id);
    return json({
      generation: {
        id: row.id,
        status: row.status,
        requestId: row.request_id,
        outputUrl: row.output_url,
        cost: row.cost,
        modelName: row.model_name,
        mode: row.mode,
      },
      credits: updatedUser.credits,
      user: { id: updatedUser.id, credits: updatedUser.credits },
    }, 202);
  } catch (error) {
    const refund = failAndRefund(id, error?.message || 'MuAPI xətası');
    throw new ApiError(error?.status || 502, error?.message || 'Generasiya başladılmadı.', {
      refundedCredits: refund.refundedCredits,
      credits: refund.user?.credits,
    });
  }
});
