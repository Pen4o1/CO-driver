import {
  buildRouteGeometry,
  destinationPoint,
  pointAtDistance,
} from '@/core/geo';
import { DEFAULT_NOTE_FILTER } from '@/core/pacenotes';
import type { GeoFix, PaceNote, RouteGeometry, TurnGrade } from '@/core/types';

export function straightGeometry(lengthM: number): RouteGeometry {
  const start = { lat: 42.7, lng: 23.32 };
  const coords = [start];
  for (let d = 25; d <= lengthM; d += 25) {
    coords.push(destinationPoint(start, 0, d));
  }
  return buildRouteGeometry(coords, null);
}

export function fixAt(
  geometry: RouteGeometry,
  distanceM: number,
  speedMps: number,
  nowMs: number,
  extras: Partial<GeoFix> = {},
): GeoFix {
  const point = pointAtDistance(
    geometry.coords,
    distanceM,
    geometry.cumulative,
  );
  return {
    lat: point.lat,
    lng: point.lng,
    speedMps,
    headingDeg: 0,
    accuracyM: 5,
    timestampMs: nowMs,
    ...extras,
  };
}

export function cornerNote(
  id: string,
  atDistance: number,
  grade: TurnGrade,
  extras: Partial<PaceNote> = {},
): PaceNote {
  return {
    id,
    type: 'corner',
    direction: extras.direction ?? 'left',
    grade,
    modifiers: extras.modifiers ?? [],
    chain: extras.chain ?? null,
    atDistance,
    entryDistance: atDistance - 20,
    exitDistance: atDistance + 20,
    distanceFromPrevious: atDistance,
    severity: extras.severity ?? 0.7,
    spokenFull: extras.spokenFull ?? `In 150, left ${grade}.`,
    spokenShort: extras.spokenShort ?? `150, left ${grade}.`,
    ...extras,
  };
}

export const FILTER = {
  ...DEFAULT_NOTE_FILTER,
  confirmCalls: true,
  chainRadius: 60,
  verbosity: 'standard' as const,
};
