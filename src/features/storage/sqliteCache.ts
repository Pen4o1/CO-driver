import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { hashKey, type StringCache } from './kvCache';

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
`;

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLiteDatabase> {
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

export { hashKey };
