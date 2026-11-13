import Stripe from 'stripe';

let client = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export function siteUrl(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function createCheckoutSession({ request, order, plan, user }) {
  const stripe = getStripe();
  if (!stripe) return null;
  const base = siteUrl(request);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: plan.priceCents,
          product_data: {
            name: `VYRAL ${plan.name}`,
            description: `${plan.credits.toLocaleString('en-US')} kredit`,
          },
        },
      },
    ],
    metadata: { orderId: order.id, userId: String(user.id), planId: plan.id },
    success_url: `${base}/checkout/${order.id}?paid=1`,
    cancel_url: `${base}/pricing?cancelled=1`,
  });

  return session;
}
