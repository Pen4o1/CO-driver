import { CORNER_WINDOW_M } from './constants';
import type { Centreline } from './types';

/** Signed turning (deg) in the forward window starting at each sample. */
export function windowAnglesDeg(
  line: Centreline,
  windowM: number = CORNER_WINDOW_M,
): Float64Array {
  const n = line.dThetaDeg.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const endM = line.cumulative[i] + windowM;
    let acc = 0;
    for (let j = i; j < n - 1; j += 1) {
      if (line.cumulative[j] >= endM) {
        break;
      }
      acc += line.dThetaDeg[j];
    }
    out[i] = acc;
  }
  return out;
}

export function signOf(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

export function spanMetrics(
  line: Centreline,
  entryIndex: number,
  exitIndex: number,
): {
  totalAngleDeg: number;
  arcLengthM: number;
  radiusM: number;
  apexIndex: number;
  consistency: number;
} {
  const lo = Math.max(0, Math.min(entryIndex, exitIndex));
  const hi = Math.min(line.coords.length - 1, Math.max(entryIndex, exitIndex));
  let totalAngleDeg = 0;
  let apexIndex = lo;
  let peakK = 0;
  for (let i = lo; i < hi; i += 1) {
    totalAngleDeg += line.rawDThetaDeg[i];
    const mag = Math.abs(line.curvaturePerM[i]);
    if (mag > peakK) {
      peakK = mag;
      apexIndex = i;
    }
  }
  const dir = signOf(totalAngleDeg);
  let matching = 0;
  let counted = 0;
  for (let i = lo; i < hi; i += 1) {
    const d = line.rawDThetaDeg[i];
    if (Math.abs(d) < 0.05) continue;
    counted += 1;
    if (signOf(d) === dir) matching += 1;
  }
  const arcLengthM = Math.max(
    line.dsM,
    line.cumulative[hi] - line.cumulative[lo],
  );
  const angleRad = Math.abs(totalAngleDeg) * (Math.PI / 180);
  const radiusM =
    angleRad < 1e-6 ? Number.POSITIVE_INFINITY : arcLengthM / angleRad;
  const consistency = counted === 0 ? 0 : matching / counted;
  return { totalAngleDeg, arcLengthM, radiusM, apexIndex, consistency };
}

const TURN_EPS_DEG = 0.35;
const STRAIGHT_SAMPLES = 3;

/**
 * Grow the seed span to the full same-sign turn, then trim leading/trailing
 * straights. Window hysteresis only finds the seed so one hairpin stays one corner.
 */
export function refineSpan(
  line: Centreline,
  entryIndex: number,
  exitIndex: number,
): { entryIndex: number; exitIndex: number } {
  const seed = spanMetrics(line, entryIndex, exitIndex);
  const dir = signOf(seed.totalAngleDeg);
  if (dir === 0) {
    return { entryIndex, exitIndex };
  }

  let exit = exitIndex;
  let zeros = 0;
  for (let i = exitIndex; i < line.coords.length - 1; i += 1) {
    const d = line.rawDThetaDeg[i];
    if (signOf(d) === dir && Math.abs(d) > TURN_EPS_DEG) {
      exit = i + 1;
      zeros = 0;
    } else if (Math.abs(d) <= TURN_EPS_DEG) {
      zeros += 1;
      if (zeros > STRAIGHT_SAMPLES) break;
    } else {
      break;
    }
  }

  let entry = entryIndex;
  zeros = 0;
  for (let i = entryIndex - 1; i >= 0; i -= 1) {
    const d = line.rawDThetaDeg[i];
    if (signOf(d) === dir && Math.abs(d) > TURN_EPS_DEG) {
      entry = i;
      zeros = 0;
    } else if (Math.abs(d) <= TURN_EPS_DEG) {
      zeros += 1;
      if (zeros > STRAIGHT_SAMPLES) break;
    } else {
      break;
    }
  }

  while (entry < exit && Math.abs(line.rawDThetaDeg[entry]) <= TURN_EPS_DEG) {
    entry += 1;
  }
  while (
    exit > entry &&
    Math.abs(line.rawDThetaDeg[exit - 1]) <= TURN_EPS_DEG
  ) {
    exit -= 1;
  }
  return {
    entryIndex: entry,
    exitIndex: Math.min(line.coords.length - 1, exit),
  };
}
