import crypto from 'node:crypto';
import { getDb, getUserById, planById } from './db';

export function createOrder(user, plan, method = 'manual') {
  const db = getDb();
  const id = `VR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  db.prepare(`
    INSERT INTO orders (id, user_id, plan_id, plan_name, amount_cents, credits, status, method)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, user.id, plan.id, plan.name, plan.priceCents, plan.credits, method);
  return getOrder(id);
}

export function getOrder(id) {
  return getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id) || null;
}

export function serializeOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    planName: row.plan_name,
    amountCents: row.amount_cents,
    credits: row.credits,
    status: row.status,
    method: row.method,
    reference: row.reference,
    note: row.note,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

export function approveOrder(orderId, note = null) {
  const db = getDb();
  const result = db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return { error: 'Sifariş tapılmadı.', status: 404 };
    if (order.status === 'approved') return { order, alreadyApproved: true };
    if (order.status !== 'pending') return { error: 'Bu sifariş artıq bağlanıb.', status: 409 };

    const plan = planById(order.plan_id);
    db.prepare(`
      UPDATE orders SET status = 'approved', approved_at = datetime('now'), note = COALESCE(?, note)
      WHERE id = ?
    `).run(note, orderId);

    db.prepare('UPDATE users SET credits = credits + ?, plan_id = ? WHERE id = ?')
      .run(order.credits, order.plan_id, order.user_id);
    db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
      .run(order.user_id, 'plan', order.credits, `${plan?.name || order.plan_name} planı (${order.id})`);

    return { order: db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) };
  })();

  if (result.error) return result;
  return { ...result, user: getUserById(result.order.user_id) };
}

export function rejectOrder(orderId, note = null) {
  const db = getDb();
  const order = getOrder(orderId);
  if (!order) return { error: 'Sifariş tapılmadı.', status: 404 };
  if (order.status !== 'pending') return { error: 'Bu sifariş artıq bağlanıb.', status: 409 };
  db.prepare("UPDATE orders SET status = 'rejected', note = COALESCE(?, note) WHERE id = ?")
    .run(note, orderId);
  return { order: getOrder(orderId) };
}

export function listOrders(userId = null, { limit = 50, status = null } = {}) {
  const db = getDb();
  const where = [];
  const params = [];
  if (userId) {
    where.push('o.user_id = ?');
    params.push(userId);
  }
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  const sql = `
    SELECT o.*, u.email AS user_email, u.name AS user_name
    FROM orders o JOIN users u ON u.id = o.user_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY o.created_at DESC LIMIT ?
  `;
  params.push(Math.min(200, Math.max(1, limit)));
  return db.prepare(sql).all(...params);
}
