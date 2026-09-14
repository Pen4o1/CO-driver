import { destinationPoint, pointAtDistance } from '@/core/geo';
import { bearingDeg } from '@/core/geo/bearing';
import type { GeoFix, RouteGeometry } from '@/core/types';

import { SIM_NOISE_M } from './constants';
import type { Rng } from './rng';

export type SimConfig = {
  geometry: RouteGeometry;
  speedMps: number;
  multiplier: number;
  lateralOffsetM: number;
  rng: Rng;
};

export type SimCursor = {
  distanceAlongM: number;
  lastHeadingDeg: number;
};

function headingAt(geometry: RouteGeometry, distanceAlongM: number): number {
  const a = pointAtDistance(
    geometry.coords,
    Math.max(0, distanceAlongM - 8),
    geometry.cumulative,
  );
  const b = pointAtDistance(
    geometry.coords,
    Math.min(geometry.lengthM, distanceAlongM + 8),
    geometry.cumulative,
  );
  return bearingDeg(a, b);
}

/**
 * One synthetic GPS sample on the polyline.
 * Noise is ±5 m cross-track. Heading is lagged one sample (previous heading).
 */
export function syntheticFix(input: {
  geometry: RouteGeometry;
  distanceAlongM: number;
  speedMps: number;
  nowMs: number;
  lastHeadingDeg: number | null;
  lateralOffsetM: number;
  rng: Rng;
  accuracyM?: number;
}): { fix: GeoFix; headingDeg: number } {
  const heading = headingAt(input.geometry, input.distanceAlongM);
  const onLine = pointAtDistance(
    input.geometry.coords,
    input.distanceAlongM,
    input.geometry.cumulative,
  );
  const noiseM = (input.rng() * 2 - 1) * SIM_NOISE_M;
  const offsetM = input.lateralOffsetM + noiseM;
  const point =
    offsetM === 0 ? onLine : destinationPoint(onLine, heading + 90, offsetM);
  const lagged = input.lastHeadingDeg ?? heading;
  return {
    headingDeg: heading,
    fix: {
      lat: point.lat,
      lng: point.lng,
      speedMps: input.speedMps,
      headingDeg: lagged,
      accuracyM: input.accuracyM ?? 5,
      timestampMs: input.nowMs,
    },
  };
}

export function advanceCursor(
  cursor: SimCursor,
  geometry: RouteGeometry,
  speedMps: number,
  dtS: number,
): SimCursor {
  return {
    distanceAlongM: Math.min(
      geometry.lengthM,
      cursor.distanceAlongM + speedMps * dtS,
    ),
    lastHeadingDeg: headingAt(geometry, cursor.distanceAlongM),
  };
}

export function routeCruiseSpeedMps(
  geometry: RouteGeometry,
  durationS: number,
): number {
  if (durationS <= 0) {
    return 22.2;
  }
  return Math.max(5, geometry.lengthM / durationS);
}
