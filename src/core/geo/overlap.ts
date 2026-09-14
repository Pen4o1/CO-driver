import type { LatLng } from '@/core/types';

import { haversineM } from './haversine';

const CELL_DEG = 0.001;

function cellKey(lat: number, lng: number): string {
  return `${Math.round(lat / CELL_DEG)}_${Math.round(lng / CELL_DEG)}`;
}

function buildIndex(points: LatLng[]): Map<string, LatLng[]> {
  const index = new Map<string, LatLng[]>();
  for (const point of points) {
    const key = cellKey(point.lat, point.lng);
    const bucket = index.get(key);
    if (bucket) {
      bucket.push(point);
    } else {
      index.set(key, [point]);
    }
  }
  return index;
}

function nearby(index: Map<string, LatLng[]>, point: LatLng): LatLng[] {
  const i0 = Math.round(point.lat / CELL_DEG);
  const j0 = Math.round(point.lng / CELL_DEG);
  const out: LatLng[] = [];
  for (let di = -1; di <= 1; di += 1) {
    for (let dj = -1; dj <= 1; dj += 1) {
      const bucket = index.get(`${i0 + di}_${j0 + dj}`);
      if (bucket) {
        out.push(...bucket);
      }
    }
  }
  return out;
}

/**
 * Share of `b` vertices that lie within `radiusM` of some vertex of `a`.
 * Spatial hash on ~0.001° cells keeps this near-linear.
 */
export function overlapShare(
  a: LatLng[],
  b: LatLng[],
  radiusM: number,
): number {
  if (b.length === 0) {
    return 0;
  }
  const index = buildIndex(a);
  let hits = 0;
  for (const point of b) {
    const candidates = nearby(index, point);
    for (const other of candidates) {
      if (haversineM(point, other) <= radiusM) {
        hits += 1;
        break;
      }
    }
  }
  return hits / b.length;
}
