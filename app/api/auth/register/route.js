import crypto from 'node:crypto';
import { z } from 'zod';
import {
  ApiError,
  assertSameOrigin,
  clientIp,
  createSession,
  handler,
  hashPassword,
  json,
  rateLimit,
} from '@/lib/auth';
import { getDb, getSetting, getUserByEmail, toPublicUser } from '@/lib/db';

const schema = z.object({
  name: z.string().trim().min(2, 'Ad ən azı 2 simvol olmalıdır.').max(60),
  email: z.string().trim().email('Düzgün email daxil edin.').max(120),
  password: z.string().min(8, 'Şifrə ən azı 8 simvol olmalıdır.').max(100),
  ref: z.string().trim().max(40).optional().nullable(),
});

function uniqueRefCode(db) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = crypto.randomBytes(4).toString('hex');
    if (!db.prepare('SELECT 1 FROM users WHERE ref_code = ?').get(code)) return code;
  }
  return crypto.randomBytes(8).toString('hex');
}

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  rateLimit(`register:${clientIp(request)}`, 12, 60 * 60 * 1000);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message || 'Məlumatlar yanlışdır.');
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  if (getUserByEmail(email)) {
    throw new ApiError(409, 'Bu email ilə hesab artıq mövcuddur.');
  }

  const signupCredits = Math.max(0, Number(getSetting('signup_credits', 50)) || 0);
  const refBonus = Math.max(0, Number(getSetting('ref_bonus_credits', 100)) || 0);
  const refCode = uniqueRefCode(db);
  let referrer = null;
  if (parsed.data.ref) {
    referrer = db.prepare('SELECT * FROM users WHERE ref_code = ?').get(parsed.data.ref);
  }

  const insert = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO users (email, name, password_hash, role, credits, ref_code, referred_by, status)
      VALUES (?, ?, ?, 'user', ?, ?, ?, 'active')
    `).run(
      email,
      parsed.data.name,
      hashPassword(parsed.data.password),
      signupCredits + (referrer ? refBonus : 0),
      refCode,
      referrer?.id || null,
    );

    const userId = Number(result.lastInsertRowid);
    if (signupCredits > 0) {
      db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
        .run(userId, 'signup', signupCredits, 'Qeydiyyat bonusu');
    }
    if (referrer && refBonus > 0) {
      db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
        .run(userId, 'referral', refBonus, `Referral: ${referrer.email}`);
      db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(refBonus, referrer.id);
      db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
        .run(referrer.id, 'referral', refBonus, `Dəvət bonusu: ${email}`);
    }

    return userId;
  });

  const userId = insert();
  await createSession(userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return json({ user: toPublicUser(user) }, 201);
});
