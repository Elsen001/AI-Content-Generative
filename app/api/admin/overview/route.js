import { handler, json, requireAdmin } from '@/lib/auth';
import { buildAdminOverview } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin();
  return json(buildAdminOverview());
});
