import { ApiError, handler, json, requireUser } from '@/lib/auth';
import { getDb, getUserById } from '@/lib/db';
import { failAndRefund, getGeneration, listGenerations, serializeGeneration } from '@/lib/generations';
import { pollPrediction } from '@/lib/muapi';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const GET = handler(async (request, context) => {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || 30);
  const offset = Number(searchParams.get('offset') || 0);
  const rows = listGenerations(user.id, { limit, offset });
  return json({ generations: rows.map(serializeGeneration) });
});
