import { getDb } from './sqliteCache';
import type { DriveStats } from '@/core/coach';
import type { GeoFix } from '@/core/types';

export type DriveRow = {
  id: string;
  routeId: string;
  startedAt: number;
  endedAt: number | null;
  distanceM: number;
  durationS: number;
  stats: DriveStats | null;
};

export async function createDrive(
  routeId: string,
  nowMs: number,
): Promise<string> {
  const id = `drv_${nowMs.toString(36)}`;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO drives (id, route_id, started_at, ended_at, distance_m, duration_s, stats_json)
     VALUES (?, ?, ?, NULL, 0, 0, NULL)`,
    [id, routeId, nowMs],
  );
  return id;
}

export async function appendDriveFix(
  driveId: string,
  fix: GeoFix,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO drive_fixes (drive_id, t_ms, lat, lng, speed_mps, heading_deg)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [driveId, fix.timestampMs, fix.lat, fix.lng, fix.speedMps, fix.headingDeg],
  );
}

export async function finishDrive(input: {
  id: string;
  endedAt: number;
  stats: DriveStats;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE drives SET ended_at = ?, distance_m = ?, duration_s = ?, stats_json = ?
     WHERE id = ?`,
    [
      input.endedAt,
      input.stats.distanceM,
      input.stats.durationS,
      JSON.stringify(input.stats),
      input.id,
    ],
  );
}

export async function getDrive(id: string): Promise<DriveRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    route_id: string;
    started_at: number;
    ended_at: number | null;
    distance_m: number;
    duration_s: number;
    stats_json: string | null;
  }>('SELECT * FROM drives WHERE id = ?', [id]);
  if (!row) return null;
  return {
    id: row.id,
    routeId: row.route_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceM: row.distance_m,
    durationS: row.duration_s,
    stats: row.stats_json ? (JSON.parse(row.stats_json) as DriveStats) : null,
  };
}

export async function deleteDrive(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM drive_fixes WHERE drive_id = ?', [id]);
    await db.runAsync('DELETE FROM drives WHERE id = ?', [id]);
  });
}

export async function listDriveFixes(driveId: string): Promise<GeoFix[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    t_ms: number;
    lat: number;
    lng: number;
    speed_mps: number;
    heading_deg: number;
  }>(
    'SELECT t_ms, lat, lng, speed_mps, heading_deg FROM drive_fixes WHERE drive_id = ? ORDER BY t_ms',
    [driveId],
  );
  return rows.map((row) => ({
    lat: row.lat,
    lng: row.lng,
    speedMps: row.speed_mps,
    headingDeg: row.heading_deg,
    accuracyM: 5,
    timestampMs: row.t_ms,
  }));
}

export async function listDrives(): Promise<DriveRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    route_id: string;
    started_at: number;
    ended_at: number | null;
    distance_m: number;
    duration_s: number;
    stats_json: string | null;
  }>('SELECT * FROM drives ORDER BY started_at DESC');
  return rows.map((row) => ({
    id: row.id,
    routeId: row.route_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceM: row.distance_m,
    durationS: row.duration_s,
    stats: row.stats_json ? (JSON.parse(row.stats_json) as DriveStats) : null,
  }));
}

export type DriveHistoryRow = DriveRow & {
  routeName: string;
  geometryJson: string | null;
  /** Planned length of the route this drive belongs to. Null if the route is gone. */
  routeLengthM: number | null;
};

export async function listDriveHistory(): Promise<DriveHistoryRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    route_id: string;
    started_at: number;
    ended_at: number | null;
    distance_m: number;
    duration_s: number;
    stats_json: string | null;
    route_name: string | null;
    geometry_json: string | null;
    route_length_m: number | null;
  }>(
    `SELECT d.*, r.name AS route_name, r.geometry_json, r.length_m AS route_length_m
     FROM drives d
     LEFT JOIN routes r ON r.id = d.route_id
     ORDER BY d.started_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    routeId: row.route_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceM: row.distance_m,
    durationS: row.duration_s,
    stats: row.stats_json ? (JSON.parse(row.stats_json) as DriveStats) : null,
    routeName: row.route_name ?? 'Deleted route',
    geometryJson: row.geometry_json,
    routeLengthM: row.route_length_m,
  }));
}
