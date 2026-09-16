import { hashKey } from './kvCache';
import { getDb } from './sqliteCache';
import type { RouteCandidate, RouteGeometry, RouteStyle } from '@/core/types';
import { buildRouteGeometry } from '@/core/geo';

export type SavedRouteRow = {
  id: string;
  name: string;
  createdAt: number;
  profileId: RouteStyle;
  candidate: RouteCandidate;
  favourite: boolean;
  note: string | null;
  photoUri: string | null;
};

export type RouteSummary = {
  id: string;
  name: string;
  lengthM: number;
  createdAt: number;
  profileId: RouteStyle;
  score: number;
  favourite: boolean;
  lastDrivenAt: number | null;
};

type GeometryJson = {
  coords: RouteGeometry['coords'];
  cumulative: number[];
  lengthM: number;
  bbox: RouteGeometry['bbox'];
  elevationM: number[] | null;
};

function geometryToJson(geometry: RouteGeometry): GeometryJson {
  return {
    coords: geometry.coords,
    cumulative: Array.from(geometry.cumulative),
    lengthM: geometry.lengthM,
    bbox: geometry.bbox,
    elevationM: geometry.elevationM ? Array.from(geometry.elevationM) : null,
  };
}

function geometryFromJson(raw: GeometryJson): RouteGeometry {
  const elevationM =
    raw.elevationM === null ? null : Float64Array.from(raw.elevationM);
  return buildRouteGeometry(raw.coords, elevationM);
}

function candidateToJson(candidate: RouteCandidate): string {
  return JSON.stringify({
    ...candidate,
    geometry: geometryToJson(candidate.geometry),
  });
}

function candidateFromJson(text: string): RouteCandidate {
  const raw = JSON.parse(text) as Omit<RouteCandidate, 'geometry'> & {
    geometry: GeometryJson;
  };
  return { ...raw, geometry: geometryFromJson(raw.geometry) };
}

export async function saveRoute(input: {
  name: string;
  candidate: RouteCandidate;
  now?: () => number;
  note?: string | null;
}): Promise<string> {
  const now = input.now ?? Date.now;
  const createdAt = now();
  const id = `rt_${hashKey(`${createdAt}:${input.name}:${input.candidate.id}`)}`;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO routes (
      id, name, created_at, profile_id, geometry_json, steps_json,
      breakdown_json, candidate_json, length_m, duration_s, bbox,
      favourite, note, photo_uri
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL)`,
    [
      id,
      input.name,
      createdAt,
      input.candidate.profileId,
      JSON.stringify(geometryToJson(input.candidate.geometry)),
      JSON.stringify(input.candidate.steps),
      JSON.stringify(input.candidate.breakdown),
      candidateToJson(input.candidate),
      input.candidate.geometry.lengthM,
      input.candidate.breakdown.durationS,
      JSON.stringify(input.candidate.geometry.bbox),
      input.note ?? null,
    ],
  );
  return id;
}

function mapRow(row: {
  id: string;
  name: string;
  created_at: number;
  profile_id: string;
  candidate_json: string;
  favourite: number;
  note: string | null;
  photo_uri: string | null;
}): SavedRouteRow {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    profileId: row.profile_id as RouteStyle,
    candidate: candidateFromJson(row.candidate_json),
    favourite: row.favourite === 1,
    note: row.note,
    photoUri: row.photo_uri,
  };
}

export async function getRoute(id: string): Promise<SavedRouteRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    name: string;
    created_at: number;
    profile_id: string;
    candidate_json: string;
    favourite: number;
    note: string | null;
    photo_uri: string | null;
  }>(
    `SELECT id, name, created_at, profile_id, candidate_json,
            favourite, note, photo_uri FROM routes WHERE id = ?`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function listRoutes(): Promise<RouteSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    length_m: number;
    created_at: number;
    profile_id: string;
    breakdown_json: string;
    favourite: number;
    last_driven: number | null;
  }>(
    `SELECT r.id, r.name, r.length_m, r.created_at, r.profile_id,
            r.breakdown_json, r.favourite,
            (SELECT MAX(d.started_at) FROM drives d WHERE d.route_id = r.id)
              AS last_driven
     FROM routes r
     ORDER BY r.favourite DESC, r.created_at DESC`,
  );
  return rows.map((row) => {
    let score = 0;
    try {
      const breakdown = JSON.parse(row.breakdown_json) as { score?: number };
      score = breakdown.score ?? 0;
    } catch {
      score = 0;
    }
    return {
      id: row.id,
      name: row.name,
      lengthM: row.length_m,
      createdAt: row.created_at,
      profileId: row.profile_id as RouteStyle,
      score,
      favourite: row.favourite === 1,
      lastDrivenAt: row.last_driven,
    };
  });
}

export async function renameRoute(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routes SET name = ? WHERE id = ?', [name, id]);
}

export async function setRouteNote(id: string, note: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routes SET note = ? WHERE id = ?', [note, id]);
}

export async function setRouteFavourite(
  id: string,
  favourite: boolean,
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routes SET favourite = ? WHERE id = ?', [
    favourite ? 1 : 0,
    id,
  ]);
}

export async function deleteRoute(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routes WHERE id = ?', [id]);
}

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
  });
}
