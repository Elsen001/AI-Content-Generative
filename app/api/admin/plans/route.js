import { z } from 'zod';
import { ApiError, assertSameOrigin, handler, json, requireAdmin } from '@/lib/auth';
import { getDb, getPlans } from '@/lib/db';

export const dynamic = 'force-dynamic';

const planSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  tagline: z.string().max(160).optional().default(''),
  priceCents: z.number().int().min(0).max(10000000),
  credits: z.number().int().min(0).max(100000000),
  features: z.array(z.string().max(160)).max(20).optional().default([]),
  popular: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
  sort: z.number().int().min(0).max(999).optional().default(0),
});

const schema = z.object({ plans: z.array(planSchema).min(1).max(20) });

export const GET = handler(async () => {
  await requireAdmin();
  return json({ plans: getPlans({ includeInactive: true }) });
});

export const PUT = handler(async (request) => {
  assertSameOrigin(request);
  await requireAdmin();
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Planlar yanlışdır.');

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO plans (id, name, tagline, price_cents, credits, features, popular, active, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      tagline = excluded.tagline,
      price_cents = excluded.price_cents,
      credits = excluded.credits,
      features = excluded.features,
      popular = excluded.popular,
      active = excluded.active,
      sort = excluded.sort
  `);

  const save = db.transaction(() => {
    for (const plan of parsed.data.plans) {
      upsert.run(
        plan.id,
        plan.name,
        plan.tagline || '',
        plan.priceCents,
        plan.credits,
        JSON.stringify(plan.features || []),
        plan.popular ? 1 : 0,
        plan.active ? 1 : 0,
        plan.sort || 0,
      );
    }
  });
  save();

  return json({ plans: getPlans({ includeInactive: true }) });
});
