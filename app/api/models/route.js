import { handler, json } from '@/lib/auth';
import { getFacets, searchModels } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  const { searchParams } = new URL(request.url);
  const result = searchModels({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || 'all',
    mode: searchParams.get('mode') || '',
    provider: searchParams.get('provider') || '',
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 48,
  });

  return json({
    ...result,
    facets: getFacets(),
  });
});
