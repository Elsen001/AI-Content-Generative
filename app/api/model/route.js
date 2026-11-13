import { ApiError, handler, json } from '@/lib/auth';
import { getModel } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const mode = searchParams.get('mode');
  const id = searchParams.get('id');
  if (!category || !mode || !id) {
    throw new ApiError(400, 'category, mode və id tələb olunur.');
  }
  const model = getModel(category, mode, id);
  if (!model) throw new ApiError(404, 'Model tapılmadı.');
  return json({ model });
});
