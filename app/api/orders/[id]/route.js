import { z } from 'zod';
import { ApiError, assertSameOrigin, handler, json, requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getOrder, serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

async function loadOrder(id) {
  const user = await requireUser();
  const order = getOrder(id);
  if (!order) throw new ApiError(404, 'Sifariş tapılmadı.');
  if (order.user_id !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Bu sifariş sizə aid deyil.');
  }
  return { user, order };
}

export const GET = handler(async (request, context) => {
  const { id } = await context.params;
  const { order } = await loadOrder(id);
  return json({ order: serializeOrder(order) });
});

const patchSchema = z.object({
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const PATCH = handler(async (request, context) => {
  assertSameOrigin(request);
  const { id } = await context.params;
  const { order } = await loadOrder(id);
  if (order.status !== 'pending') {
    throw new ApiError(409, 'Bu sifariş artıq bağlanıb.');
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, 'Məlumatlar yanlışdır.');

  getDb().prepare(`
    UPDATE orders SET reference = COALESCE(?, reference), note = COALESCE(?, note) WHERE id = ?
  `).run(parsed.data.reference ?? null, parsed.data.note ?? null, id);

  return json({ order: serializeOrder(getOrder(id)) });
});
