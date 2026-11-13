import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb, getUserById, toPublicUser } from './db';

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const SESSION_COOKIE = 'vyral_session';
const SESSION_DAYS = 30;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  getDb()
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash(token), userId, expiresAt);

  getDb()
    .prepare('DELETE FROM sessions WHERE expires_at < ?')
    .run(Date.now());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  }
  jar.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = getDb()
    .prepare('SELECT * FROM sessions WHERE token_hash = ?')
    .get(tokenHash(token));
  if (!session || session.expires_at < Date.now()) return null;

  const user = getUserById(session.user_id);
  if (!user || user.status !== 'active') return null;
  return toPublicUser(user);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, 'Daxil olmalısınız.');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') throw new ApiError(403, 'Admin icazəsi tələb olunur.');
  return user;
}

export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('host');
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError(403, 'Etibarsız mənbə.');
    }
  } catch {
    throw new ApiError(403, 'Etibarsız mənbə.');
  }
}

const buckets = globalThis.__vyralBuckets || (globalThis.__vyralBuckets = new Map());

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > bucket.reset) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > limit) {
    throw new ApiError(429, 'Çox cəhd etdiniz. Bir az sonra yenidən yoxlayın.');
  }
}

export function clientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

export function json(data, status = 200) {
  return Response.json(data, { status });
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return json({ error: error.message, details: error.details }, error.status);
  }
  console.error('[vyral]', error);
  return json({ error: 'Server xətası. Yenidən cəhd edin.' }, 500);
}

// Wrap route handlers with a consistent error response.
export function handler(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
