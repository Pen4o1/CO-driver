import { getDb } from './sqliteCache';
import type { PreparedClip } from '@/features/voice/prepareRoute';

export type VoicePrepareRow = {
  routeId: string;
  providerId: string;
  voiceId: string;
  clipCount: number;
  bytes: number;
  live: boolean;
  clips: PreparedClip[];
  updatedAt: number;
};

export async function saveVoicePrepare(
  row: Omit<VoicePrepareRow, 'updatedAt'>,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO voice_prepare
      (route_id, provider_id, voice_id, clip_count, bytes, live, clips_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.routeId,
      row.providerId,
      row.voiceId,
      row.clipCount,
      row.bytes,
      row.live ? 1 : 0,
      JSON.stringify(row.clips),
      Date.now(),
    ],
  );
}

export async function getVoicePrepare(
  routeId: string,
): Promise<VoicePrepareRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    route_id: string;
    provider_id: string;
    voice_id: string;
    clip_count: number;
    bytes: number;
    live: number;
    clips_json: string;
    updated_at: number;
  }>('SELECT * FROM voice_prepare WHERE route_id = ?', [routeId]);
  if (!row) return null;
  return {
    routeId: row.route_id,
    providerId: row.provider_id,
    voiceId: row.voice_id,
    clipCount: row.clip_count,
    bytes: row.bytes,
    live: row.live === 1,
    clips: JSON.parse(row.clips_json) as PreparedClip[],
    updatedAt: row.updated_at,
  };
}
