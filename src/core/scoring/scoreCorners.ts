import { bearingDeltaDeg } from '@/core/geo/bearing';
import { resamplePolyline } from '@/core/geo/interpolate';
import { smoothBearings } from '@/core/geo/smoothBearings';
import type { RouteGeometry } from '@/core/types';

import {
  SCORE_BEARING_WINDOW_M,
  SCORE_CORNER_OPEN_DEG,
  SCORE_CORNER_WINDOW_M,
  SCORE_RESAMPLE_M,
} from './constants';
import { isHairpin } from './gradeFromRadius';

export type ScoreCorner = {
  radiusM: number;
  totalAngleDeg: number;
  arcLengthM: number;
};

/**
 * Scoring-only corner pass. Not the Phase 3 pace-note detector.
 *
 * Assumptions:
 * 1. 10 m resample is enough to count hairpins / turn density.
 * 2. A corner opens when |Δθ| over 40 m exceeds 12° with a consistent sign.
 * 3. It closes when the window drops below 60% of the peak.
 * 4. radiusM = arcLength / |angleRad|; spans with |angle| < 1° are noise.
 */
export function scoreCorners(geometry: RouteGeometry): ScoreCorner[] {
  if (geometry.coords.length < 3 || geometry.lengthM < SCORE_CORNER_WINDOW_M) {
    return [];
  }
  const samples = resamplePolyline(geometry.coords, SCORE_RESAMPLE_M);
  if (samples.length < 4) {
    return [];
  }
  const bearings = smoothBearings(samples, SCORE_BEARING_WINDOW_M);
  const ds = SCORE_RESAMPLE_M;
  const windowN = Math.max(2, Math.round(SCORE_CORNER_WINDOW_M / ds));
  const windowAngle: number[] = [];
  for (let i = 0; i < bearings.length; i += 1) {
    let acc = 0;
    const end = Math.min(bearings.length - 1, i + windowN);
    for (let j = i; j < end; j += 1) {
      acc += bearingDeltaDeg(bearings[j], bearings[j + 1]);
    }
    windowAngle.push(acc);
  }

  const corners: ScoreCorner[] = [];
  let openAt: number | null = null;
  let peak = 0;
  for (let i = 0; i < windowAngle.length; i += 1) {
    const mag = Math.abs(windowAngle[i]);
    if (openAt === null) {
      if (mag > SCORE_CORNER_OPEN_DEG) {
        openAt = i;
        peak = mag;
      }
      continue;
    }
    if (mag > peak) {
      peak = mag;
    }
    const closing = mag < peak * 0.6 || i === windowAngle.length - 1;
    if (!closing) {
      continue;
    }
    const exitIndex = i;
    const arcLengthM = Math.max(ds, (exitIndex - openAt) * ds);
    if (arcLengthM >= 15) {
      let totalAngleDeg = 0;
      for (let j = openAt; j < exitIndex; j += 1) {
        totalAngleDeg += bearingDeltaDeg(bearings[j], bearings[j + 1]);
      }
      if (Math.abs(totalAngleDeg) >= 1) {
        const radiusM =
          arcLengthM / (Math.abs(totalAngleDeg) * (Math.PI / 180));
        corners.push({ radiusM, totalAngleDeg, arcLengthM });
      }
    }
    openAt = null;
    peak = 0;
  }
  return corners;
}

export function curvatureDegPerKm(geometry: RouteGeometry): number {
  if (geometry.lengthM <= 0 || geometry.coords.length < 3) {
    return 0;
  }
  const samples = resamplePolyline(geometry.coords, SCORE_RESAMPLE_M);
  const bearings = smoothBearings(samples, SCORE_BEARING_WINDOW_M);
  let sum = 0;
  for (let i = 0; i < bearings.length - 1; i += 1) {
    sum += Math.abs(bearingDeltaDeg(bearings[i], bearings[i + 1]));
  }
  return sum / (geometry.lengthM / 1000);
}

export function hairpinAndTurnDensity(
  corners: ScoreCorner[],
  lengthM: number,
): {
  hairpinCount: number;
  turnDensityPerKm: number;
} {
  const km = lengthM / 1000;
  if (km <= 0) {
    return { hairpinCount: 0, turnDensityPerKm: 0 };
  }
  let hairpinCount = 0;
  let turns = 0;
  for (const corner of corners) {
    if (isHairpin(corner.radiusM, corner.totalAngleDeg)) {
      hairpinCount += 1;
    }
    if (corner.radiusM <= 150) {
      turns += 1;
    }
  }
  return { hairpinCount, turnDensityPerKm: turns / km };
}
