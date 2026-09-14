import type { SQLiteDatabase } from 'expo-sqlite';

import { LIVE_CLIP_URI } from '@/core/voice';

import type { LocalFile } from './TtsProvider';

export type VoiceCacheRow = {
  textHash: string;
  providerId: string;
  voiceId: string;
  filePath: string;
  bytes: number;
  live: boolean;
};

export type VoiceCache = {
  get(textHash: string): Promise<VoiceCacheRow | null>;
  put(row: VoiceCacheRow): Promise<void>;
  totalBytes(): Promise<number>;
};

export function memoryVoiceCache(): VoiceCache {
  const rows = new Map<string, VoiceCacheRow>();
  return {
    async get(textHash) {
      return rows.get(textHash) ?? null;
    },
    async put(row) {
      rows.set(row.textHash, row);
    },
    async totalBytes() {
      let sum = 0;
      for (const row of rows.values()) {
        sum += row.bytes;
      }
      return sum;
    },
  };
}

export function sqliteVoiceCache(
  getDatabase: () => Promise<SQLiteDatabase>,
): VoiceCache {
  return {
    async get(textHash) {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{
        text_hash: string;
        provider_id: string;
        voice_id: string;
        file_path: string;
        bytes: number;
        live: number;
      }>(
        `SELECT text_hash, provider_id, voice_id, file_path, bytes, live
         FROM voice_cache WHERE text_hash = ?`,
        [textHash],
      );
      if (!row) return null;
      return {
        textHash: row.text_hash,
        providerId: row.provider_id,
        voiceId: row.voice_id,
        filePath: row.file_path,
        bytes: row.bytes,
        live: row.live === 1,
      };
    },
    async put(row) {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT OR REPLACE INTO voice_cache
          (text_hash, provider_id, voice_id, file_path, bytes, live, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          row.textHash,
          row.providerId,
          row.voiceId,
          row.filePath,
          row.bytes,
          row.live ? 1 : 0,
          Date.now(),
        ],
      );
    },
    async totalBytes() {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(bytes), 0) AS total FROM voice_cache',
      );
      return row?.total ?? 0;
    },
  };
}

export function rowToLocalFile(row: VoiceCacheRow): LocalFile {
  return {
    uri: row.live ? LIVE_CLIP_URI : row.filePath,
    bytes: row.bytes,
    live: row.live,
  };
}
