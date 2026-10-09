import { parseRouteVoiceCard, type RouteVoiceCard } from '@/core/settings';
import type { RouteCandidate, RouteStyle } from '@/core/types';

import { hashKey } from './kvCache';
import {
  candidateFromJson,
  candidateToJson,
  geometryToJson,
} from './routeJson';
import { getDb } from './sqliteCache';

export type SavedRouteRow = {
  id: string;
  name: string;
  createdAt: number;
  profileId: RouteStyle;
  candidate: RouteCandidate;
  favourite: boolean;
  note: string | null;
  photoUri: string | null;
  voiceCard: RouteVoiceCard | null;
};

export type RouteSummary = {
  id: string;
  name: string;
  lengthM: number;
  durationS: number;
  createdAt: number;
  profileId: RouteStyle;
  score: number;
  favourite: boolean;
  lastDrivenAt: number | null;
};

export async function saveRoute(input: {
  name: string;
  candidate: RouteCandidate;
  now?: () => number;
  note?: string | null;
  voiceCard?: RouteVoiceCard | null;
}): Promise<string> {
  const now = input.now ?? Date.now;
  const createdAt = now();
  const id = `rt_${hashKey(`${createdAt}:${input.name}:${input.candidate.id}`)}`;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO routes (
      id, name, created_at, profile_id, geometry_json, steps_json,
      breakdown_json, candidate_json, length_m, duration_s, bbox,
      favourite, note, photo_uri, voice_card_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, ?)`,
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
      input.voiceCard ? JSON.stringify(input.voiceCard) : null,
    ],
  );
  return id;
}

export async function updateRoute(
  id: string,
  input: { candidate: RouteCandidate; name?: string },
): Promise<void> {
  const db = await getDb();
  const result = await db.runAsync(
    `UPDATE routes SET
       name = COALESCE(?, name),
       profile_id = ?,
       geometry_json = ?,
       steps_json = ?,
       breakdown_json = ?,
       candidate_json = ?,
       length_m = ?,
       duration_s = ?,
       bbox = ?
     WHERE id = ?`,
    [
      input.name ?? null,
      input.candidate.profileId,
      JSON.stringify(geometryToJson(input.candidate.geometry)),
      JSON.stringify(input.candidate.steps),
      JSON.stringify(input.candidate.breakdown),
      candidateToJson(input.candidate),
      input.candidate.geometry.lengthM,
      input.candidate.breakdown.durationS,
      JSON.stringify(input.candidate.geometry.bbox),
      id,
    ],
  );
  if (result.changes === 0) {
    throw new Error('Route not found');
  }
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
  voice_card_json: string | null;
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
    voiceCard: parseVoiceCard(row.voice_card_json),
  };
}

function parseVoiceCard(raw: string | null): RouteVoiceCard | null {
  if (!raw) return null;
  try {
    return parseRouteVoiceCard(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
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
    voice_card_json: string | null;
  }>(
    `SELECT id, name, created_at, profile_id, candidate_json,
            favourite, note, photo_uri, voice_card_json
     FROM routes WHERE id = ?`,
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
    duration_s: number;
    created_at: number;
    profile_id: string;
    breakdown_json: string;
    favourite: number;
    last_driven: number | null;
  }>(
    `SELECT r.id, r.name, r.length_m, r.duration_s, r.created_at, r.profile_id,
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
      durationS: row.duration_s,
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
