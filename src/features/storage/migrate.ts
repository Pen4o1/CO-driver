import type { SQLiteDatabase } from 'expo-sqlite';

const ROUTE_COLUMNS: { name: string; sql: string }[] = [
  {
    name: 'favourite',
    sql: 'ALTER TABLE routes ADD COLUMN favourite INTEGER NOT NULL DEFAULT 0',
  },
  { name: 'note', sql: 'ALTER TABLE routes ADD COLUMN note TEXT' },
  { name: 'photo_uri', sql: 'ALTER TABLE routes ADD COLUMN photo_uri TEXT' },
];

export async function migrateSchema(db: SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(routes)',
  );
  const have = new Set(cols.map((c) => c.name));
  for (const col of ROUTE_COLUMNS) {
    if (!have.has(col.name)) {
      await db.execAsync(col.sql);
    }
  }
}
