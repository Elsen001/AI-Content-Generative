import { z } from 'zod';
import {
  ApiError,
  assertSameOrigin,
  clientIp,
  createSession,
  handler,
  json,
  rateLimit,
  verifyPassword,
} from '@/lib/auth';
import { getUserByEmail, toPublicUser } from '@/lib/db';

const schema = z.object({
  email: z.string().trim().email('Düzgün email daxil edin.'),
  password: z.string().min(1, 'Şifrəni daxil edin.'),
});

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');
  }

  const email = parsed.data.email.toLowerCase();
  rateLimit(`login:${clientIp(request)}:${email}`, 15, 15 * 60 * 1000);

  const user = getUserByEmail(email);
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    throw new ApiError(401, 'Email və ya şifrə yanlışdır.');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Hesab bloklanıb. Dəstək ilə əlaqə saxlayın.');
  }

  await createSession(user.id);
  return json({ user: toPublicUser(user) });
});
