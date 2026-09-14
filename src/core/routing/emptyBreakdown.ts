import type { CurvinessBreakdown } from '@/core/types';

/** Phase 1 placeholder. Phase 2 fills real curviness metrics. */
export function emptyBreakdown(
  lengthM: number,
  durationS: number,
  elevationVariationM: number | null,
  motorwayShare: number | null = null,
  lowSpeedRoadShare: number | null = null,
): CurvinessBreakdown {
  return {
    score: 0,
    lengthM,
    durationS,
    curvatureDegPerKm: 0,
    hairpinCount: 0,
    turnDensityPerKm: 0,
    motorwayShare,
    lowSpeedRoadShare,
    elevationVariationM,
    tags: [],
  };
}
