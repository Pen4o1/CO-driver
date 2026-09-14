import type { LatLng } from '@/core/types';

import { cumulativeDistancesM, polylineLengthM } from './cumulative';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateSegment(a: LatLng, b: LatLng, t: number): LatLng {
  return { lat: lerp(a.lat, b.lat, t), lng: lerp(a.lng, b.lng, t) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Point at arc-length `distanceM` along the polyline.
 * Distances outside [0, length] clamp to the endpoints.
 */
export function pointAtDistance(
  coords: LatLng[],
  distanceM: number,
  cumulative?: Float64Array,
): LatLng {
  if (coords.length === 0) {
    throw new Error('pointAtDistance: empty polyline');
  }
  if (coords.length === 1) {
    return coords[0];
  }
  const cum = cumulative ?? cumulativeDistancesM(coords);
  const lengthM = polylineLengthM(cum);
  const targetM = clamp(distanceM, 0, lengthM);
  if (targetM <= 0) {
    return coords[0];
  }
  if (targetM >= lengthM) {
    return coords[coords.length - 1];
  }
  let lo = 0;
  let hi = cum.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= targetM) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const spanM = cum[hi] - cum[lo];
  const t = spanM <= 0 ? 0 : (targetM - cum[lo]) / spanM;
  return interpolateSegment(coords[lo], coords[hi], t);
}

/**
 * Resample the polyline at a fixed along-track spacing.
 * Always includes the original start and end vertices.
 */
export function resamplePolyline(coords: LatLng[], spacingM: number): LatLng[] {
  if (coords.length === 0) {
    return [];
  }
  if (coords.length === 1 || spacingM <= 0) {
    return coords.slice();
  }
  const cum = cumulativeDistancesM(coords);
  const lengthM = polylineLengthM(cum);
  if (lengthM === 0) {
    return [coords[0]];
  }
  const out: LatLng[] = [coords[0]];
  const steps = Math.max(1, Math.floor(lengthM / spacingM));
  for (let i = 1; i < steps; i += 1) {
    out.push(pointAtDistance(coords, i * spacingM, cum));
  }
  const end = coords[coords.length - 1];
  const last = out[out.length - 1];
  if (last.lat !== end.lat || last.lng !== end.lng) {
    out.push(end);
  }
  return out;
}
