import { ELEVATION_SMOOTH_WINDOW_M } from '@/core/config';

export type AscentDescent = {
  ascentM: number;
  descentM: number;
  rawAscentM: number;
  rawDescentM: number;
};

function sumAscentDescent(heights: Float64Array): {
  ascentM: number;
  descentM: number;
} {
  let ascentM = 0;
  let descentM = 0;
  for (let i = 0; i < heights.length - 1; i += 1) {
    const deltaM = heights[i + 1] - heights[i];
    if (deltaM > 0) {
      ascentM += deltaM;
    } else {
      descentM += -deltaM;
    }
  }
  return { ascentM, descentM };
}

/**
 * Moving-average elevation along-track.
 * Window is metres of arc length (not sample count) so DEM jitter damps evenly.
 */
export function smoothElevationM(
  elevationM: Float64Array,
  cumulative: Float64Array,
  windowM: number = ELEVATION_SMOOTH_WINDOW_M,
): Float64Array {
  const n = elevationM.length;
  const out = new Float64Array(n);
  const halfM = windowM / 2;
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < n; j += 1) {
      if (Math.abs(cumulative[j] - cumulative[i]) <= halfM) {
        sum += elevationM[j];
        count += 1;
      }
    }
    out[i] = count === 0 ? elevationM[i] : sum / count;
  }
  return out;
}

/** Derive ascent/descent from elevationM. Spec §7: never use summary.ascent. */
export function deriveAscentDescent(
  elevationM: Float64Array | null,
  cumulative: Float64Array,
  windowM: number = ELEVATION_SMOOTH_WINDOW_M,
): AscentDescent | null {
  if (elevationM === null || elevationM.length < 2) {
    return null;
  }
  const raw = sumAscentDescent(elevationM);
  const smoothed = smoothElevationM(elevationM, cumulative, windowM);
  const smooth = sumAscentDescent(smoothed);
  return {
    ascentM: smooth.ascentM,
    descentM: smooth.descentM,
    rawAscentM: raw.ascentM,
    rawDescentM: raw.descentM,
  };
}
