import { handler, json } from '@/lib/auth';
import { getSetting } from '@/lib/db';
import { hasMuapiKey } from '@/lib/muapi';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  return json({
    configured: hasMuapiKey(),
    announcement: getSetting('announcement', ''),
  });
});
