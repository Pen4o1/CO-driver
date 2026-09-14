import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { type StringCache } from './kvCache';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS route_cache (
  request_hash TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS geocode_cache (
  query TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS grid_cache (
  cell_id TEXT PRIMARY KEY,
  snapped_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  profile_id TEXT NOT NULL,
  geometry_json TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  breakdown_json TEXT NOT NULL,
  candidate_json TEXT NOT NULL,
  length_m REAL NOT NULL,
  duration_s REAL NOT NULL,
  bbox TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS voice_cache (
  text_hash TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  live INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS voice_prepare (
  route_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  clip_count INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  live INTEGER NOT NULL,
  clips_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

let dbPromise: Promise<SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync('apex.db');
      await db.execAsync(SCHEMA);
      return db;
    })();
  }
  return dbPromise;
}

export function sqliteStringCache(
  table: 'route_cache' | 'geocode_cache',
  keyColumn: 'request_hash' | 'query',
  now: () => number = () => Date.now(),
): StringCache {
  return {
    async get(key: string) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ response_json: string }>(
        `SELECT response_json FROM ${table} WHERE ${keyColumn} = ?`,
        [key],
      );
      return row?.response_json ?? null;
    },
    async set(key: string, value: string) {
      const db = await getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (${keyColumn}, response_json, created_at)
         VALUES (?, ?, ?)`,
        [key, value, now()],
      );
    },
  };
}

export function sqliteRouteCache(): StringCache {
  return sqliteStringCache('route_cache', 'request_hash');
}

export function sqliteGeocodeCache(): StringCache {
  return sqliteStringCache('geocode_cache', 'query');
}

export function sqliteGridCache(): StringCache {
  return {
    async get(key: string) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ snapped_json: string }>(
        'SELECT snapped_json FROM grid_cache WHERE cell_id = ?',
        [key],
      );
      return row?.snapped_json ?? null;
    },
    async set(key: string, value: string) {
      const db = await getDb();
      await db.runAsync(
        `INSERT OR REPLACE INTO grid_cache (cell_id, snapped_json, created_at)
         VALUES (?, ?, ?)`,
        [key, value, Date.now()],
      );
    },
  };
}
