import type { PaceNote, TurnGrade } from '@/core/types';

import { FINISH_WINDOW_M } from './constants';
import type { DriveStats, EngineState } from './types';

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

export function driveStats(state: EngineState, endedAtMs: number): DriveStats {
  const startedAt =
    state.callLog[0]?.atMs ?? state.lastFix?.timestampMs ?? endedAtMs;
  const durationS = Math.max(0, (endedAtMs - startedAt) / 1000);
  const distanceM = Math.min(state.geometry.lengthM, state.distanceAlongM);
  const movingTimeS =
    state.speedMps > 0.5 ? durationS : Math.max(0, durationS * 0.9);
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
  };
}
