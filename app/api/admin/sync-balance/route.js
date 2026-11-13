import { ApiError, assertSameOrigin, handler, json, requireAdmin } from '@/lib/auth';
import { setSetting } from '@/lib/db';
import { getBalance, hasMuapiKey } from '@/lib/muapi';

export const dynamic = 'force-dynamic';

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  await requireAdmin();
  if (!hasMuapiKey()) {
    throw new ApiError(400, 'Əvvəlcə MuAPI açarını yadda saxlayın.');
  }

  const balance = await getBalance();
  setSetting('muapi_balance', balance);
  setSetting('muapi_balance_at', new Date().toISOString());
  return json({ balance });
});
