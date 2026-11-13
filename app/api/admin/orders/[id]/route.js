import { z } from 'zod';
import { ApiError, assertSameOrigin, handler, json, requireAdmin } from '@/lib/auth';
import { approveOrder, getOrder, rejectOrder, serializeOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(500).optional().nullable(),
});

export const PATCH = handler(async (request, context) => {
  assertSameOrigin(request);
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, 'Əməliyyat yanlışdır.');

  const result = parsed.data.action === 'approve'
    ? approveOrder(id, parsed.data.note)
    : rejectOrder(id, parsed.data.note);

  if (result.error) throw new ApiError(result.status || 400, result.error);
  return json({ order: serializeOrder(result.order), user: result.user || null });
});
