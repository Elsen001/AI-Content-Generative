import { ApiError, handler, json, requireUser } from '@/lib/auth';
import { getDb, getUserById } from '@/lib/db';
import { failAndRefund, getGeneration, serializeGeneration } from '@/lib/generations';
import { pollPrediction } from '@/lib/muapi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ageMs = (createdAt) => {
  const parsed = Date.parse(`${String(createdAt).replace(' ', 'T')}Z`);
  return Number.isFinite(parsed) ? Date.now() - parsed : 0;
};

export const GET = handler(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const row = user.role === 'admin' ? getGeneration(id) : getGeneration(id, user.id);
  if (!row) throw new ApiError(404, 'Generasiya tapılmadı.');

  const db = getDb();
  let current = row;

  if (current.status === 'processing') {
    if (current.request_id) {
      try {
        const result = await pollPrediction(current.request_id);
        if (result.status === 'completed' && result.url) {
          db.prepare(`
            UPDATE generations
            SET status = 'completed', output_url = ?, completed_at = datetime('now')
            WHERE id = ?
          `).run(result.url, id);
        } else if (result.status === 'failed') {
          failAndRefund(id, result.error || 'Model generasiyanı tamamlaya bilmədi.');
        } else if (ageMs(current.created_at) > 45 * 60 * 1000) {
          failAndRefund(id, 'Generasiya vaxtı bitdi (45 dəqiqə).');
        }
      } catch (error) {
        const notReady = error?.status === 404 && ageMs(current.created_at) < 90_000;
        if (!notReady) {
          failAndRefund(id, error?.message || 'Nəticə alınmadı.');
        }
      }
    } else if (ageMs(current.created_at) > 5 * 60 * 1000) {
      failAndRefund(id, 'Model request_id qaytarmadı.');
    }
  }

  current = getGeneration(id);
  const owner = getUserById(current.user_id);
  return json({
    generation: serializeGeneration(current),
    credits: owner?.credits ?? 0,
    refundedCredits: current.refunded ? current.cost : 0,
  });
});
