import { getDb, getPlans, getSetting } from './db';
import { hasMuapiKey } from './muapi';

export function buildAdminOverview() {
  const db = getDb();
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const newUsers = db.prepare('SELECT COUNT(*) AS count FROM users WHERE created_at >= ?').get(weekAgo).count;
  const revenue = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS total FROM orders WHERE status = 'approved'")
    .get().total;
  const pendingOrders = db
    .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'")
    .get().count;
  const creditsOutstanding = db.prepare('SELECT COALESCE(SUM(credits), 0) AS total FROM users').get().total;
  const generationCount = db.prepare('SELECT COUNT(*) AS count FROM generations').get().count;
  const completed = db
    .prepare("SELECT COUNT(*) AS count FROM generations WHERE status = 'completed'")
    .get().count;
  const failed = db
    .prepare("SELECT COUNT(*) AS count FROM generations WHERE status = 'failed'")
    .get().count;
  const providerSpent = db
    .prepare("SELECT COALESCE(SUM(provider_cost_cents), 0) AS total FROM generations WHERE status = 'completed'")
    .get().total;

  const orders = db.prepare(`
    SELECT o.*, u.email AS user_email, u.name AS user_name
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC LIMIT 40
  `).all();

  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.credits, u.plan_id, u.status, u.ref_code, u.created_at,
      (SELECT COUNT(*) FROM generations g WHERE g.user_id = u.id) AS generation_count,
      (SELECT COALESCE(SUM(o.amount_cents), 0) FROM orders o WHERE o.user_id = u.id AND o.status = 'approved') AS spent_cents
    FROM users u ORDER BY u.created_at DESC LIMIT 200
  `).all();

  const generations = db.prepare(`
    SELECT g.id, g.user_id, g.category, g.mode, g.model_id, g.model_name, g.cost, g.status,
      g.provider_cost_cents, g.created_at, u.email AS user_email
    FROM generations g JOIN users u ON u.id = g.user_id
    ORDER BY g.created_at DESC LIMIT 60
  `).all();

  const topModels = db.prepare(`
    SELECT model_name, model_id, category, COUNT(*) AS count, COALESCE(SUM(cost), 0) AS credits
    FROM generations GROUP BY model_id, model_name, category
    ORDER BY count DESC LIMIT 12
  `).all();

  const showcase = db.prepare('SELECT * FROM showcase ORDER BY sort ASC').all();
  const plans = getPlans({ includeInactive: true });

  const key = getSetting('muapi_key', '');
  const keyString = typeof key === 'string' ? key : '';

  return {
    stats: {
      userCount,
      newUsers,
      revenue,
      pendingOrders,
      creditsOutstanding,
      generationCount,
      completed,
      failed,
      providerSpent,
      providerBudget: Number(getSetting('provider_budget_cents', 5000)) || 0,
      successRate: generationCount ? Math.round((completed / generationCount) * 100) : 0,
    },
    orders,
    users,
    generations,
    topModels,
    showcase,
    plans,
    settings: {
      muapiKeySet: hasMuapiKey(),
      muapiKeyPreview: keyString ? `••••••••${keyString.slice(-4)}` : '',
      providerBudgetCents: Number(getSetting('provider_budget_cents', 5000)) || 0,
      signupCredits: Number(getSetting('signup_credits', 50)) || 0,
      refBonusCredits: Number(getSetting('ref_bonus_credits', 100)) || 0,
      demoCheckout: Boolean(getSetting('demo_checkout', false)),
      manualPayment: getSetting('manual_payment', ''),
      announcement: getSetting('announcement', ''),
      muapiBalance: getSetting('muapi_balance', null),
      muapiBalanceAt: getSetting('muapi_balance_at', null),
    },
  };
}
