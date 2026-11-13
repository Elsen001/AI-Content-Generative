import { destroySession, handler, json } from '@/lib/auth';

export const POST = handler(async () => {
  await destroySession();
  return json({ ok: true });
});
