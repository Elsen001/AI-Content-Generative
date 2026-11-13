import { z } from 'zod';
import {
  ApiError,
  assertSameOrigin,
  handler,
  json,
  rateLimit,
  requireUser,
} from '@/lib/auth';
import { getSetting, getUserById, planById } from '@/lib/db';
import { approveOrder, createOrder, listOrders, serializeOrder } from '@/lib/orders';
import { createCheckoutSession, getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const schema = z.object({
  planId: z.string().trim().min(1).max(40),
});

export const GET = handler(async () => {
  const user = await requireUser();
  const orders = listOrders(user.id, { limit: 50 });
  return json({ orders: orders.map(serializeOrder) });
});

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  rateLimit(`order:${user.id}`, 12, 60 * 60 * 1000);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, 'Plan seçilməyib.');

  const plan = planById(parsed.data.planId);
  if (!plan || !plan.active) throw new ApiError(404, 'Plan tapılmadı.');

  const stripe = getStripe();
  const method = stripe ? 'stripe' : 'manual';
  let order = createOrder(user, plan, method);

  if (stripe) {
    try {
      const session = await createCheckoutSession({ request, order, plan, user });
      if (session) {
        order = { ...order, reference: session.id };
        const { getDb } = await import('@/lib/db');
        getDb().prepare('UPDATE orders SET reference = ? WHERE id = ?').run(session.id, order.id);
        return json({ order: serializeOrder(order), checkoutUrl: session.url });
      }
    } catch (error) {
      console.error('[stripe]', error);
      throw new ApiError(502, 'Stripe sessiyası yaradılmadı.');
    }
  }

  const demo = Boolean(getSetting('demo_checkout', false)) && process.env.DEMO_CHECKOUT !== 'false';
  if (demo) {
    const approved = approveOrder(order.id, 'Demo checkout (avtomatik təsdiq)');
    if (approved.error) throw new ApiError(approved.status || 400, approved.error);
    const updated = getUserById(user.id);
    return json({
      order: serializeOrder(approved.order),
      demo: true,
      credits: updated.credits,
      message: 'Demo rejimi: kreditlər dərhal yükləndi.',
    });
  }

  return json({
    order: serializeOrder(order),
    checkoutUrl: `/checkout/${order.id}`,
    manual: true,
  });
});
