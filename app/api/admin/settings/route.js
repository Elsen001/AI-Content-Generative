import { z } from 'zod';
import { ApiError, assertSameOrigin, handler, json, requireAdmin } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/db';

export const dynamic = 'force-dynamic';

const schema = z.object({
  muapiKey: z.string().trim().max(300).optional(),
  clearKey: z.boolean().optional(),
  providerBudgetCents: z.number().int().min(0).max(10000000).optional(),
  signupCredits: z.number().int().min(0).max(100000).optional(),
  refBonusCredits: z.number().int().min(0).max(100000).optional(),
  demoCheckout: z.boolean().optional(),
  manualPayment: z.string().max(4000).optional(),
  announcement: z.string().max(500).optional(),
});

export const PUT = handler(async (request) => {
  assertSameOrigin(request);
  await requireAdmin();
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');
  const data = parsed.data;

  if (data.clearKey) setSetting('muapi_key', '');
  else if (data.muapiKey) setSetting('muapi_key', data.muapiKey);

  if (data.providerBudgetCents !== undefined) setSetting('provider_budget_cents', data.providerBudgetCents);
  if (data.signupCredits !== undefined) setSetting('signup_credits', data.signupCredits);
  if (data.refBonusCredits !== undefined) setSetting('ref_bonus_credits', data.refBonusCredits);
  if (data.demoCheckout !== undefined) setSetting('demo_checkout', data.demoCheckout);
  if (data.manualPayment !== undefined) setSetting('manual_payment', data.manualPayment);
  if (data.announcement !== undefined) setSetting('announcement', data.announcement);

  return json({
    ok: true,
    settings: {
      muapiKeySet: Boolean(getSetting('muapi_key', '')),
      providerBudgetCents: Number(getSetting('provider_budget_cents', 5000)),
      signupCredits: Number(getSetting('signup_credits', 50)),
      refBonusCredits: Number(getSetting('ref_bonus_credits', 100)),
      demoCheckout: Boolean(getSetting('demo_checkout', false)),
      manualPayment: getSetting('manual_payment', ''),
      announcement: getSetting('announcement', ''),
    },
  });
});
