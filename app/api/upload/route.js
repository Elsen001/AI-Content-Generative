import { ApiError, assertSameOrigin, handler, json, rateLimit, requireUser } from '@/lib/auth';
import { uploadFile } from '@/lib/muapi';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = 30 * 1024 * 1024;

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  rateLimit(`upload:${user.id}`, 30, 60 * 60 * 1000);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    throw new ApiError(400, 'Fayl tapılmadı.');
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(413, 'Fayl 30 MB-dan böyük ola bilməz.');
  }

  const type = String(file.type || '');
  if (!/^(image|video|audio)\//.test(type)) {
    throw new ApiError(415, 'Yalnız şəkil, video və ya audio yükləmək olar.');
  }

  const url = await uploadFile(file);
  return json({ url, name: file.name, type, size: file.size });
});
