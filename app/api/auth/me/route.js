import { z } from 'zod';
import {
  ApiError,
  assertSameOrigin,
  handler,
  hashPassword,
  json,
  requireUser,
  verifyPassword,
} from '@/lib/auth';
import { getDb, getUserById, planById, toPublicUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const user = await requireUser();
  const db = getDb();
  const generationCount = db
    .prepare('SELECT COUNT(*) AS count FROM generations WHERE user_id = ?')
    .get(user.id).count;
  const completedCount = db
    .prepare("SELECT COUNT(*) AS count FROM generations WHERE user_id = ? AND status = 'completed'")
    .get(user.id).count;
  const spent = db
    .prepare('SELECT COALESCE(SUM(cost), 0) AS total FROM generations WHERE user_id = ? AND refunded = 0')
    .get(user.id).total;
  const recent = db
    .prepare('SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 12')
    .all(user.id);

  return json({
    user,
    plan: user.planId ? planById(user.planId) : null,
    stats: { generationCount, completedCount, spent },
    recent: recent.map((row) => ({
      id: row.id,
      category: row.category,
      mode: row.mode,
      modelName: row.model_name,
      prompt: row.prompt,
      status: row.status,
      outputUrl: row.output_url,
      cost: row.cost,
      createdAt: row.created_at,
    })),
  });
});

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Yeni şifrə ən azı 8 simvol olmalıdır.').max(100).optional(),
});

export const PATCH = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');
  }

  const db = getDb();
  if (parsed.data.name) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(parsed.data.name, user.id);
  }
  if (parsed.data.newPassword) {
    const row = getUserById(user.id);
    if (!verifyPassword(parsed.data.currentPassword || '', row.password_hash)) {
      throw new ApiError(400, 'Mövcud şifrə yanlışdır.');
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(parsed.data.newPassword), user.id);
  }

  return json({ user: toPublicUser(getUserById(user.id)) });
});
