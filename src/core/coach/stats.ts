import { haversineM } from '@/core/geo/haversine';
import { projectOnPolyline } from '@/core/geo/project';
import type { GeoFix, PaceNote, RouteGeometry, TurnGrade } from '@/core/types';

import { FINISH_WINDOW_M } from './constants';
import type { DriveStats, EngineState } from './types';

const MOVING_MIN_MPS = 0.5;
/** Reject GPS spikes above about 430 km/h. */
const MAX_TRUSTED_SPEED_MPS = 120;
const MAX_TRUSTED_ACCURACY_M = 30;
/** A long gap is a pause in sampling, not time spent moving. */
const MAX_SAMPLE_GAP_MS = 5_000;

export function nextMotion(
  state: Pick<EngineState, 'lastFix' | 'maxSpeedMps' | 'movingMs'>,
  fix: GeoFix,
  nowMs: number,
): { maxSpeedMps: number; movingMs: number } {
  let maxSpeedMps = state.maxSpeedMps;
  let movingMs = state.movingMs;
  if (trustedSpeed(fix) !== null) {
    maxSpeedMps = Math.max(maxSpeedMps, fix.speedMps);
  }
  const prev = state.lastFix;
  if (prev && trustedSpeed(prev) !== null) {
    const dt = Math.min(
      MAX_SAMPLE_GAP_MS,
      Math.max(0, nowMs - prev.timestampMs),
    );
    movingMs += dt;
  }
  return { maxSpeedMps, movingMs };
}

function trustedSpeed(fix: GeoFix): number | null {
  if (fix.accuracyM > MAX_TRUSTED_ACCURACY_M) return null;
  if (fix.speedMps < MOVING_MIN_MPS || fix.speedMps > MAX_TRUSTED_SPEED_MPS) {
    return null;
  }
  return fix.speedMps;
}

const EMPTY_GRADES: Record<TurnGrade, number> = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
};

export function twistinessSoFar(
  notes: PaceNote[],
  distanceAlongM: number,
): number {
  const corners = notes.filter((n) => n.type === 'corner');
  if (corners.length === 0) {
    return 0;
  }
  const passed = corners.filter((n) => n.atDistance <= distanceAlongM).length;
  return passed / corners.length;
}

/** Time spent waiting: elapsed time minus time the car was moving. */
export function stoppedTimeS(durationS: number, movingTimeS: number): number {
  if (!Number.isFinite(durationS) || !Number.isFinite(movingTimeS)) return 0;
  return Math.max(0, durationS - movingTimeS);
}

export function driveStats(state: EngineState, endedAtMs: number): DriveStats {
  const startedAt =
    state.callLog[0]?.atMs ?? state.lastFix?.timestampMs ?? endedAtMs;
  const durationS = Math.max(0, (endedAtMs - startedAt) / 1000);
  const distanceM = Math.min(state.geometry.lengthM, state.distanceAlongM);
  const movingTimeS = state.movingMs / 1000;
  const cornersByGrade = { ...EMPTY_GRADES };
  let hairpinsHit = 0;
  for (const note of state.notes) {
    if (note.type !== 'corner' || note.grade === undefined) {
      continue;
    }
    if (note.atDistance > distanceM + FINISH_WINDOW_M) {
      continue;
    }
    cornersByGrade[note.grade] += 1;
    if (note.grade === 1) {
      hairpinsHit += 1;
    }
  }
  return {
    distanceM,
    durationS,
    movingTimeS,
    cornersByGrade,
    hairpinsHit,
    avgSpeedMps: durationS > 0 ? distanceM / durationS : 0,
    maxSpeedMps: state.maxSpeedMps,
    routeLengthM: state.geometry.lengthM,
  };
}

/** A row that was created but never received an end-of-drive save. */
export function isBlankDriveStats(
  stats: DriveStats | null | undefined,
): boolean {
  if (!stats) return true;
  return (
    stats.distanceM <= 0 &&
    stats.durationS <= 0 &&
    stats.movingTimeS <= 0 &&
    (stats.maxSpeedMps ?? 0) <= 0
  );
}

const TRACE_GAP_MS = 15_000;
const TRACE_JUMP_M = 200;
const ON_ROUTE_M = 80;

/**
 * Rebuild distance, time, and speed from saved GPS points.
 * Assumption: a step longer than 15 s or 200 m is a gap, not driven road.
 * Corner counts use the furthest point still near the route.
 */
export function statsFromTrace(
  fixes: GeoFix[],
  input: {
    geometry?: RouteGeometry | null;
    notes?: PaceNote[];
    routeLengthM?: number | null;
  } = {},
): DriveStats | null {
  const ordered = fixes
    .filter(
      (fix) =>
        Number.isFinite(fix.lat) &&
        Number.isFinite(fix.lng) &&
        Number.isFinite(fix.timestampMs),
    )
    .sort((a, b) => a.timestampMs - b.timestampMs);
  if (ordered.length < 2) return null;

  let pathM = 0;
  let movingMs = 0;
  let maxSpeedMps = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const speed = trustedSpeed(ordered[i]);
    if (speed !== null) maxSpeedMps = Math.max(maxSpeedMps, speed);
    if (i === 0) continue;
    const prev = ordered[i - 1];
    const dt = ordered[i].timestampMs - prev.timestampMs;
    const step = haversineM(prev, ordered[i]);
    if (dt > TRACE_GAP_MS || step > TRACE_JUMP_M) continue;
    pathM += step;
    if (trustedSpeed(prev) !== null) {
      movingMs += Math.min(MAX_SAMPLE_GAP_MS, Math.max(0, dt));
    }
  }

  const geometry = input.geometry;
  let alongM = pathM;
  if (geometry && geometry.coords.length >= 2) {
    let furthest = 0;
    let onRoute = false;
    for (const fix of ordered) {
      const projected = projectOnPolyline(fix, geometry.coords);
      if (projected.crossTrackM > ON_ROUTE_M) continue;
      onRoute = true;
      furthest = Math.max(furthest, projected.distanceAlongM);
    }
    if (onRoute) alongM = furthest;
  }

  const durationS = Math.max(
    0,
    (ordered[ordered.length - 1].timestampMs - ordered[0].timestampMs) / 1000,
  );
  const routeLengthM = input.routeLengthM ?? geometry?.lengthM;
  const distanceM =
    routeLengthM && routeLengthM > 0
      ? Math.min(routeLengthM, alongM)
      : alongM;
  const cornersByGrade = { ...EMPTY_GRADES };
  let hairpinsHit = 0;
  for (const note of input.notes ?? []) {
    if (note.type !== 'corner' || note.grade === undefined) continue;
    if (note.atDistance > distanceM + FINISH_WINDOW_M) continue;
    cornersByGrade[note.grade] += 1;
    if (note.grade === 1) hairpinsHit += 1;
  }
  return {
    distanceM,
    durationS,
    movingTimeS: movingMs / 1000,
    cornersByGrade,
    hairpinsHit,
    avgSpeedMps: durationS > 0 ? distanceM / durationS : 0,
    maxSpeedMps,
    routeLengthM: routeLengthM ?? undefined,
  };
}
