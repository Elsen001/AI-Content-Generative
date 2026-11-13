import { z } from 'zod';
import { ApiError, assertSameOrigin, handler, json, requireAdmin } from '@/lib/auth';
import { addCredits, getDb, getUserById, toPublicUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('credits'),
    amount: z.number().int().min(-1000000).max(1000000),
    note: z.string().max(300).optional(),
  }),
  z.object({ action: z.literal('role'), role: z.enum(['user', 'admin']) }),
  z.object({ action: z.literal('status'), status: z.enum(['active', 'blocked']) }),
]);

export const PATCH = handler(async (request, context) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const { id } = await context.params;
  const userId = Number(id);
  const target = getUserById(userId);
  if (!target) throw new ApiError(404, 'İstifadəçi tapılmadı.');

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');

  if (parsed.data.action === 'credits') {
    if (parsed.data.amount === 0) throw new ApiError(400, 'Məbləğ 0 ola bilməz.');
    const updated = addCredits(userId, parsed.data.amount, 'admin', parsed.data.note || 'Admin düzəlişi');
    return json({ user: toPublicUser(updated) });
  }

  if (parsed.data.action === 'role') {
    if (userId === admin.id && parsed.data.role !== 'admin') {
      throw new ApiError(400, 'Öz admin icazənizi silə bilməzsiniz.');
    }
    getDb().prepare('UPDATE users SET role = ? WHERE id = ?').run(parsed.data.role, userId);
  }

  if (parsed.data.action === 'status') {
    if (userId === admin.id && parsed.data.status !== 'active') {
      throw new ApiError(400, 'Öz hesabınızı bloklaya bilməzsiniz.');
    }
    getDb().prepare('UPDATE users SET status = ? WHERE id = ?').run(parsed.data.status, userId);
    if (parsed.data.status === 'blocked') {
      getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    }
  }

  return json({ user: toPublicUser(getUserById(userId)) });
});
