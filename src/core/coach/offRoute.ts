import type { GeoFix } from '@/core/types';

import {
  OFF_ROUTE_CROSS_TRACK_M,
  OFF_ROUTE_HOLD_MS,
  OFF_ROUTE_MAX_ACCURACY_M,
  OFF_ROUTE_MIN_SPEED_MPS,
  OFF_ROUTE_STREAK,
} from './constants';

export type OffRouteSample = {
  streak: number;
  sinceMs: number | null;
  tripped: boolean;
};

/**
 * Off-route needs a real GPS fix, not a tunnel glitch:
 * accuracy ≤ 30 m, speed > 2 m/s, cross-track > 35 m,
 * 3 consecutive samples spanning ≥ 5 s.
 */
export function isCredibleFix(fix: GeoFix): boolean {
  return (
    fix.accuracyM <= OFF_ROUTE_MAX_ACCURACY_M &&
    fix.speedMps > OFF_ROUTE_MIN_SPEED_MPS
  );
}

export function nextOffRoute(input: {
  crossTrackM: number;
  fix: GeoFix;
  nowMs: number;
  streak: number;
  sinceMs: number | null;
}): OffRouteSample {
  const bad =
    isCredibleFix(input.fix) && input.crossTrackM > OFF_ROUTE_CROSS_TRACK_M;
  if (!bad) {
    return { streak: 0, sinceMs: null, tripped: false };
  }
  const streak = input.streak + 1;
  const sinceMs = input.sinceMs ?? input.nowMs;
  const tripped =
    streak >= OFF_ROUTE_STREAK && input.nowMs - sinceMs >= OFF_ROUTE_HOLD_MS;
  return { streak, sinceMs, tripped };
}
