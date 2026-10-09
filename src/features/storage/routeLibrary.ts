import type { RouteVoiceCard } from '@/core/settings';
import { reverseCandidate, reversedRouteName } from '@/core/tracks';

import { getRoute, saveRoute } from './routesRepo';
import { getDb } from './sqliteCache';

export async function duplicateRoute(
  id: string,
  now?: () => number,
): Promise<string | null> {
  const row = await getRoute(id);
  if (!row) return null;
  return saveRoute({
    name: `${row.name} copy`,
    candidate: row.candidate,
    now,
    note: row.note,
    voiceCard: row.voiceCard,
  });
}

export async function reverseRoute(
  id: string,
  now?: () => number,
): Promise<string | null> {
  const row = await getRoute(id);
  if (!row) return null;
  return saveRoute({
    name: reversedRouteName(row.name),
    candidate: reverseCandidate(row.candidate),
    now,
    note: row.note,
    voiceCard: row.voiceCard,
  });
}

export async function setRouteVoiceCard(
  id: string,
  card: RouteVoiceCard,
): Promise<void> {
  const db = await getDb();
  const result = await db.runAsync(
    'UPDATE routes SET voice_card_json = ? WHERE id = ?',
    [JSON.stringify(card), id],
  );
  if (result.changes === 0) {
    throw new Error('Route not found');
  }
}
