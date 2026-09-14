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
  const rebuilt = buildRouteGeometry(raw.coords, elevationM);
  return rebuilt;
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
  return {
    ...raw,
    geometry: geometryFromJson(raw.geometry),
  };
}

export async function saveRoute(input: {
  name: string;
  candidate: RouteCandidate;
  now?: () => number;
}): Promise<string> {
  const now = input.now ?? Date.now;
  const createdAt = now();
  const id = `rt_${hashKey(`${createdAt}:${input.name}:${input.candidate.id}`)}`;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO routes (
      id, name, created_at, profile_id, geometry_json, steps_json,
      breakdown_json, candidate_json, length_m, duration_s, bbox
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ],
  );
  return id;
}

export async function getRoute(id: string): Promise<SavedRouteRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    name: string;
    created_at: number;
    profile_id: string;
    candidate_json: string;
  }>(
    'SELECT id, name, created_at, profile_id, candidate_json FROM routes WHERE id = ?',
    [id],
  );
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    profileId: row.profile_id as RouteStyle,
    candidate: candidateFromJson(row.candidate_json),
  };
}

export async function listRoutes(): Promise<
  { id: string; name: string; lengthM: number; createdAt: number }[]
> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    length_m: number;
    created_at: number;
  }>(
    'SELECT id, name, length_m, created_at FROM routes ORDER BY created_at DESC',
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    lengthM: row.length_m,
    createdAt: row.created_at,
  }));
}
