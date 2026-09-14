import type { LatLng } from '@/core/types';

import { haversineM } from './haversine';

/** Prefix-sum of consecutive haversine distances. `out[0] === 0`. */
export function cumulativeDistancesM(coords: LatLng[]): Float64Array {
  const out = new Float64Array(coords.length);
  for (let i = 1; i < coords.length; i += 1) {
    out[i] = out[i - 1] + haversineM(coords[i - 1], coords[i]);
  }
  return out;
}

export function polylineLengthM(cumulative: Float64Array): number {
  if (cumulative.length === 0) {
    return 0;
  }
  return cumulative[cumulative.length - 1];
}
