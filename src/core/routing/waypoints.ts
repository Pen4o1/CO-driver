import { clamp } from '@/core/geo/clamp';
import { destinationPoint } from '@/core/geo/destination';
import { bearingDeg } from '@/core/geo/bearing';
import { haversineM } from '@/core/geo/haversine';
import type { LatLng, WaypointStrategy } from '@/core/types';

export type WaypointVariant = {
  id: string;
  rawPoints: LatLng[];
};

function segmentCount(lengthKm: number): number {
  return clamp(Math.round(lengthKm / 8), 2, 6);
}

function offsetRatio(strategy: WaypointStrategy): number {
  if (strategy === 'aggressive') return 0.25;
  if (strategy === 'moderate') return 0.18;
  return 0.12;
}

/**
 * Perpendicular offset samples along A→B.
 * K = clamp(round(lengthKm/8), 2, 6) segments.
 * Corridor = ±ratio of segment length.
 */
export function planWaypointVariants(
  start: LatLng,
  end: LatLng,
  strategy: WaypointStrategy,
): WaypointVariant[] {
  const lengthM = haversineM(start, end);
  if (strategy === 'none' || lengthM < 2000) {
    return [];
  }
  const k = segmentCount(lengthM / 1000);
  const segmentM = lengthM / k;
  const heading = bearingDeg(start, end);
  const ratio = offsetRatio(strategy);
  const offsetM = Math.min(segmentM * ratio, 8000);
  const left: LatLng[] = [];
  const right: LatLng[] = [];
  const nearLeft: LatLng[] = [];
  const alternate: LatLng[] = [];

  for (let i = 0; i < k; i += 1) {
    const along = (i + 0.5) * segmentM;
    const mid = destinationPoint(start, heading, along);
    const L = destinationPoint(mid, heading - 90, offsetM);
    const R = destinationPoint(mid, heading + 90, offsetM);
    const nL = destinationPoint(mid, heading - 90, offsetM * 0.5);
    left.push(L);
    right.push(R);
    nearLeft.push(nL);
    alternate.push(i % 2 === 0 ? L : R);
  }

  const aggressive: WaypointVariant[] = [
    { id: 'left', rawPoints: left },
    { id: 'right', rawPoints: right },
    { id: 'near-left', rawPoints: nearLeft },
    { id: 'alternate', rawPoints: alternate },
  ];
  if (strategy === 'moderate') {
    return aggressive.slice(0, 2);
  }
  return aggressive;
}

export function withEndpoints(
  start: LatLng,
  end: LatLng,
  via: LatLng[],
  maxCoords: number,
): LatLng[] {
  const points = [start, ...via, end];
  if (points.length <= maxCoords) {
    return points;
  }
  const keep = maxCoords - 2;
  const step = via.length / keep;
  const sampled: LatLng[] = [];
  for (let i = 0; i < keep; i += 1) {
    sampled.push(via[Math.floor(i * step)]);
  }
  return [start, ...sampled, end];
}
