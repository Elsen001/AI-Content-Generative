import crypto from 'node:crypto';
import { z } from 'zod';
import { ApiError, assertSameOrigin, handler, json, requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  id: z.string().trim().max(60).optional().nullable(),
  title: z.string().trim().min(1).max(120),
  category: z.enum(['image', 'video']).default('video'),
  model: z.string().trim().max(80).optional().default(''),
  videoUrl: z.string().trim().max(2000).optional().default(''),
  posterUrl: z.string().trim().max(2000).optional().default(''),
  likes: z.number().int().min(0).max(100000000).optional().default(0),
  active: z.boolean().optional().default(true),
  sort: z.number().int().min(0).max(999).optional().default(0),
});

export const GET = handler(async () => {
  await requireAdmin();
  return json({ showcase: getDb().prepare('SELECT * FROM showcase ORDER BY sort ASC').all() });
});

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  await requireAdmin();
  const body = await request.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');

  const item = parsed.data;
  const id = item.id || `sc-${crypto.randomBytes(4).toString('hex')}`;
  const db = getDb();

  if (item.category === 'video' && !item.videoUrl) {
    throw new ApiError(400, 'Video kartı üçün video URL tələb olunur.');
  }

  db.prepare(`
    INSERT INTO showcase (id, title, category, model, video_url, poster_url, likes, active, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      model = excluded.model,
      video_url = excluded.video_url,
      poster_url = excluded.poster_url,
      likes = excluded.likes,
      active = excluded.active,
      sort = excluded.sort
  `).run(
    id,
    item.title,
    item.category,
    item.model || '',
    item.videoUrl || null,
    item.posterUrl || null,
    item.likes,
    item.active ? 1 : 0,
    item.sort,
  );

  return json({ showcase: db.prepare('SELECT * FROM showcase ORDER BY sort ASC').all() });
});

export const DELETE = handler(async (request) => {
  assertSameOrigin(request);
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) throw new ApiError(400, 'id tələb olunur.');
  getDb().prepare('DELETE FROM showcase WHERE id = ?').run(id);
  return json({ showcase: getDb().prepare('SELECT * FROM showcase ORDER BY sort ASC').all() });
});
