import type { GeoFix, PaceNote, TurnGrade } from '@/core/types';

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
