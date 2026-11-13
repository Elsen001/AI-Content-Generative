import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PLANS } from './plans';
import { SHOWCASE } from './showcase';

const DB_PATH = process.env.DB_PATH ||
  (process.env.VERCEL
    ? '/tmp/vyral.db'
    : path.join(process.cwd(), 'data', 'vyral.db'));

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      credits INTEGER NOT NULL DEFAULT 0,
      plan_id TEXT,
      ref_code TEXT UNIQUE,
      referred_by INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      price_cents INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      features TEXT NOT NULL DEFAULT '[]',
      popular INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      method TEXT NOT NULL DEFAULT 'manual',
      reference TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      mode TEXT NOT NULL,
      model_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      prompt TEXT,
      params TEXT,
      cost INTEGER NOT NULL DEFAULT 0,
      provider_cost_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'processing',
      request_id TEXT,
      output_url TEXT,
      error TEXT,
      refunded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS showcase (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'video',
      model TEXT,
      video_url TEXT,
      poster_url TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  seed(db);
  return db;
}

function seed(db) {
  const defaults = {
    muapi_key: '',
    provider_budget_cents: 5000,
    provider_name: 'MuAPI',
    signup_credits: 50,
    ref_bonus_credits: 100,
    demo_checkout: process.env.DEMO_CHECKOUT !== 'false',
    manual_payment:
      'Bank köçürməsi: VYRAL MMC · AZ00 0000 0000 0000 0000 0000 0000 · SWIFT: VYRALAZ22\n' +
      'Kripto (USDT TRC20): TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\n\n' +
      'Ödənişdən sonra sifariş nömrəsini qeyd edin. Admin təsdiqindən sonra kreditlər avtomatik yüklənir.',
    announcement: 'Yeni: Seedance 2.0 və Kling 2.5 video modelləri artıq aktivdir.',
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, JSON.stringify(value));
  }

  const planCount = db.prepare('SELECT COUNT(*) AS count FROM plans').get().count;
  if (planCount === 0) {
    const insertPlan = db.prepare(`
      INSERT INTO plans (id, name, tagline, price_cents, credits, features, popular, active, sort)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const plan of PLANS) {
      insertPlan.run(
        plan.id,
        plan.name,
        plan.tagline,
        plan.priceCents,
        plan.credits,
        JSON.stringify(plan.features),
        plan.popular ? 1 : 0,
        1,
        plan.sort,
      );
    }
  }

  const showcaseCount = db.prepare('SELECT COUNT(*) AS count FROM showcase').get().count;
  if (showcaseCount === 0) {
    const insertShowcase = db.prepare(`
      INSERT INTO showcase (id, title, category, model, video_url, poster_url, likes, active, sort)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    for (const item of SHOWCASE) {
      insertShowcase.run(
        item.id,
        item.title,
        item.category,
        item.model,
        item.videoUrl,
        item.posterUrl,
        item.likes,
        item.sort,
      );
    }
  }

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const email = (process.env.ADMIN_EMAIL || 'admin@vyral.studio').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'VyralAdmin!2026';
    db.prepare(`
      INSERT INTO users (email, name, password_hash, role, credits, ref_code, status)
      VALUES (?, ?, ?, 'admin', 0, ?, 'active')
    `).run(
      email,
      'VYRAL Admin',
      hashPassword(password),
      `admin-${crypto.randomBytes(3).toString('hex')}`,
    );
    console.warn(
      `[vyral] Seeded admin ${email}. Change ADMIN_PASSWORD in .env.local before deploying.`,
    );
  }
}

const globalForDb = globalThis;

export function getDb() {
  if (!globalForDb.__vyralDb) {
    globalForDb.__vyralDb = createDb();
  }
  return globalForDb.__vyralDb;
}

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    credits: row.credits,
    planId: row.plan_id,
    refCode: row.ref_code,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

export function getUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase()) || null;
}

export function addCredits(userId, amount, type, note) {
  const db = getDb();
  const apply = db.transaction(() => {
    db.prepare('UPDATE users SET credits = MAX(0, credits + ?) WHERE id = ?').run(amount, userId);
    db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
      .run(userId, type, amount, note || null);
  });
  apply();
  return getUserById(userId);
}

export function getSetting(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function setSetting(key, value) {
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, JSON.stringify(value));
}

export function getPlans({ includeInactive = false } = {}) {
  const rows = getDb()
    .prepare(`SELECT * FROM plans ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY sort ASC, price_cents ASC`)
    .all();
  return rows.map((row) => ({
    ...row,
    priceCents: row.price_cents,
    popular: Boolean(row.popular),
    active: Boolean(row.active),
    features: (() => {
      try {
        return JSON.parse(row.features);
      } catch {
        return [];
      }
    })(),
  }));
}

export function planById(id) {
  return getPlans({ includeInactive: true }).find((plan) => plan.id === id) || null;
}

export function listShowcase() {
  return getDb().prepare('SELECT * FROM showcase WHERE active = 1 ORDER BY sort ASC').all();
}
