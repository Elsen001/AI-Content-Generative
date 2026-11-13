import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { buildAdminOverview } from '@/lib/admin-data';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminClient } from '@/components/AdminClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin panel',
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/dashboard');

  const initialData = buildAdminOverview();

  return (
    <>
      <SiteHeader user={user} />
      <main className="container-wide">
        <AdminClient initialData={initialData} />
      </main>
    </>
  );
}
