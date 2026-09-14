import { getDb } from './sqliteCache';

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [
    key,
    value,
  ]);
}

export async function disclaimerAccepted(): Promise<boolean> {
  return (await getMeta('disclaimer')) === '1';
}

export async function acceptDisclaimer(): Promise<void> {
  await setMeta('disclaimer', '1');
}
