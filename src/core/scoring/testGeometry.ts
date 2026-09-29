import { destinationPoint } from '@/core/geo/destination';
import { buildRouteGeometry } from '@/core/geo/buildGeometry';
import { emptyBreakdown } from '@/core/routing';
import type { LatLng, RouteCandidate, RouteStyle } from '@/core/types';

export function walk(
  start: LatLng,
  steps: { bearingDeg: number; distanceM: number }[],
): LatLng[] {
  const coords: LatLng[] = [start];
  let current = start;
  for (const step of steps) {
    current = destinationPoint(current, step.bearingDeg, step.distanceM);
    coords.push(current);
  }
  return coords;
}

export function straightLine(lengthM: number): LatLng[] {
  const start = { lat: 42.7, lng: 23.3 };
  const n = Math.max(4, Math.round(lengthM / 100));
  const stepM = lengthM / n;
  return walk(
    start,
    Array.from({ length: n }, () => ({ bearingDeg: 0, distanceM: stepM })),
  );
}

/** Equal-length zigzag: 90° turns every `stepM`. */
export function zigzagLine(lengthM: number, stepM = 120): LatLng[] {
  const start = { lat: 42.7, lng: 23.32 };
  const n = Math.max(4, Math.round(lengthM / stepM));
  const steps = Array.from({ length: n }, (_, i) => ({
    bearingDeg: i % 2 === 0 ? 45 : 135,
    distanceM: stepM,
  }));
  return walk(start, steps);
}

export function makeCandidate(input: {
  id: string;
  coords: LatLng[];
  durationS: number;
  profileId?: RouteStyle;
  providerId?: string;
  motorwayShare?: number | null;
  lowSpeedRoadShare?: number | null;
  streetShare?: number | null;
  unpavedShare?: number | null;
  ascentM?: number | null;
  fastestDurationS?: number;
}): RouteCandidate {
  const geometry = buildRouteGeometry(input.coords, null);
  return {
    id: input.id,
    providerId: input.providerId ?? 'mock',
    geometry,
    steps: [],
    breakdown: emptyBreakdown(
      geometry.lengthM,
      input.durationS,
      null,
      input.motorwayShare ?? null,
      input.lowSpeedRoadShare ?? null,
    ),
    fastestDurationS: input.fastestDurationS ?? input.durationS,
    profileId: input.profileId ?? 'twist',
    waypointsUsed: [input.coords[0], input.coords[input.coords.length - 1]],
    ascentM: input.ascentM ?? null,
    descentM: null,
    roadShares: {
      motorwayShare: input.motorwayShare ?? null,
      lowSpeedRoadShare: input.lowSpeedRoadShare ?? null,
      streetShare: input.streetShare ?? null,
      unpavedShare: input.unpavedShare ?? null,
    },
  };
}
