import { handler, json } from '@/lib/auth';
import { approveOrder } from '@/lib/orders';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export const POST = handler(async (request) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return json({ error: 'Stripe webhook konfiqurasiya olunmayıb.' }, 503);
  }

  const signature = request.headers.get('stripe-signature');
  const raw = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    return json({ error: `Webhook imzası yanlışdır: ${error.message}` }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const result = approveOrder(orderId, `Stripe ${session.id}`);
      if (result.error) console.error('[stripe-webhook]', result.error);
    }
  }

  return json({ received: true });
});
