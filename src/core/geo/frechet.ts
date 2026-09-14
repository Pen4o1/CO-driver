import type { LatLng } from '@/core/types';

import { haversineM } from './haversine';

/**
 * Discrete Fréchet distance in metres between two polylines.
 * Coupling uses haversine; this is the vertex-discrete variant (no resampling).
 */
export function frechetDistanceM(a: LatLng[], b: LatLng[]): number {
  if (a.length === 0 || b.length === 0) {
    throw new Error('frechetDistanceM: empty polyline');
  }
  const n = a.length;
  const m = b.length;
  const dp = new Float64Array(n * m);
  const idx = (i: number, j: number) => i * m + j;

  dp[idx(0, 0)] = haversineM(a[0], b[0]);
  for (let i = 1; i < n; i += 1) {
    dp[idx(i, 0)] = Math.max(dp[idx(i - 1, 0)], haversineM(a[i], b[0]));
  }
  for (let j = 1; j < m; j += 1) {
    dp[idx(0, j)] = Math.max(dp[idx(0, j - 1)], haversineM(a[0], b[j]));
  }
  for (let i = 1; i < n; i += 1) {
    for (let j = 1; j < m; j += 1) {
      const prev = Math.min(
        dp[idx(i - 1, j)],
        dp[idx(i - 1, j - 1)],
        dp[idx(i, j - 1)],
      );
      dp[idx(i, j)] = Math.max(prev, haversineM(a[i], b[j]));
    }
  }
  return dp[idx(n - 1, m - 1)];
}
