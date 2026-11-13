import { getDb, getUserById } from './db';

export function getGeneration(id, userId = null) {
  const db = getDb();
  const row = userId
    ? db.prepare('SELECT * FROM generations WHERE id = ? AND user_id = ?').get(id, userId)
    : db.prepare('SELECT * FROM generations WHERE id = ?').get(id);
  return row || null;
}

export function serializeGeneration(row) {
  if (!row) return null;
  return {
    id: row.id,
    category: row.category,
    mode: row.mode,
    modelId: row.model_id,
    modelName: row.model_name,
    prompt: row.prompt,
    params: (() => {
      try {
        return JSON.parse(row.params || '{}');
      } catch {
        return {};
      }
    })(),
    cost: row.cost,
    status: row.status,
    requestId: row.request_id,
    outputUrl: row.output_url,
    error: row.error,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function failAndRefund(generationId, message) {
  const db = getDb();
  const result = db.transaction(() => {
    const row = db.prepare('SELECT * FROM generations WHERE id = ?').get(generationId);
    if (!row) return null;
    if (row.refunded || row.status === 'completed') {
      return { refundedCredits: 0, row };
    }

    db.prepare(`
      UPDATE generations
      SET status = 'failed', error = ?, refunded = 1, completed_at = datetime('now')
      WHERE id = ?
    `).run(String(message || 'Generation failed').slice(0, 600), generationId);

    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(row.cost, row.user_id);
    db.prepare('INSERT INTO ledger (user_id, type, amount, note) VALUES (?, ?, ?, ?)')
      .run(row.user_id, 'refund', row.cost, `Refund: ${row.model_name}`);

    return { refundedCredits: row.cost, row };
  })();

  return {
    row: result?.row ? getGeneration(generationId) : null,
    refundedCredits: result?.refundedCredits || 0,
    user: result?.row ? getUserById(result.row.user_id) : null,
  };
}

export function listGenerations(userId, { limit = 30, offset = 0 } = {}) {
  return getDb()
    .prepare('SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?')
    .all(userId, Math.min(100, Math.max(1, limit)), Math.max(0, offset));
}
