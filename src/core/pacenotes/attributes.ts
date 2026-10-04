import {
  CHAIN_INTO_M,
  CHAIN_THEN_M,
  ENTRY_EXIT_FRACTION,
  GENTLE_MIN_ANGLE_DEG,
  LONG_ARC_M,
  MIN_SPAN_M,
  NOTE_MIN_SEPARATION_M,
  OPENS_RATIO,
  STRAIGHT_MAX_TURN_DEG,
  STRAIGHT_MIN_M,
  TIGHTENS_RATIO,
} from './constants';
import type { Centreline, DetectedCorner, StraightRun } from './types';
import { signOf, spanMetrics, refineSpan } from './window';

function radiusOfPortion(
  line: Centreline,
  entryIndex: number,
  exitIndex: number,
  fromFrac: number,
  toFrac: number,
): number {
  const span = Math.max(1, exitIndex - entryIndex);
  const lo = entryIndex + Math.floor(span * fromFrac);
  const hi = entryIndex + Math.max(lo + 1, Math.floor(span * toFrac));
  return spanMetrics(line, lo, Math.min(exitIndex, hi)).radiusM;
}

export function applyCornerAttributes(
  line: Centreline,
  corners: DetectedCorner[],
): DetectedCorner[] {
  const out = corners.map((corner) => ({ ...corner }));
  for (const corner of out) {
    const entryR = radiusOfPortion(
      line,
      corner.entryIndex,
      corner.exitIndex,
      0,
      ENTRY_EXIT_FRACTION,
    );
    const exitR = radiusOfPortion(
      line,
      corner.entryIndex,
      corner.exitIndex,
      1 - ENTRY_EXIT_FRACTION,
      1,
    );
    corner.tightens = exitR < TIGHTENS_RATIO * entryR;
    corner.opens = exitR > OPENS_RATIO * entryR;
    corner.isLong = corner.arcLengthM > LONG_ARC_M;
  }
  for (let i = 0; i < out.length; i += 1) {
    const next = out[i + 1];
    if (!next) {
      out[i].chain = null;
      continue;
    }
    const gap = next.entryDistance - out[i].exitDistance;
    if (gap < CHAIN_INTO_M) {
      out[i].chain = out[i].direction !== next.direction ? 'into' : 'and';
    } else if (gap < CHAIN_THEN_M) {
      out[i].chain = 'then';
    } else {
      out[i].chain = null;
    }
  }
  return out;
}

function overlapsCorner(
  corners: DetectedCorner[],
  loM: number,
  hiM: number,
): boolean {
  return corners.some(
    (c) => !(hiM < c.entryDistance - 5 || loM > c.exitDistance + 5),
  );
}

/**
 * Gentle kinks the 12°/40 m gate misses (grade 5–6 arcs).
 * A same-sign run with |net| ≥ 12° becomes a corner if it does not overlap.
 */
export function detectGentleCorners(
  line: Centreline,
  existing: DetectedCorner[],
): DetectedCorner[] {
  const extra: DetectedCorner[] = [];
  let runStart: number | null = null;
  let runDir: -1 | 0 | 1 = 0;
  let zeros = 0;

  const flush = (endIndex: number) => {
    if (runStart === null) return;
    const refined = refineSpan(line, runStart, endIndex);
    const metrics = spanMetrics(line, refined.entryIndex, refined.exitIndex);
    const loM = line.cumulative[refined.entryIndex];
    const hiM = line.cumulative[refined.exitIndex];
    if (
      Math.abs(metrics.totalAngleDeg) >= GENTLE_MIN_ANGLE_DEG &&
      metrics.arcLengthM >= MIN_SPAN_M &&
      Number.isFinite(metrics.radiusM) &&
      metrics.consistency >= 0.75 &&
      !overlapsCorner(existing.concat(extra), loM, hiM)
    ) {
      extra.push({
        entryIndex: refined.entryIndex,
        exitIndex: refined.exitIndex,
        apexIndex: metrics.apexIndex,
        totalAngleDeg: metrics.totalAngleDeg,
        radiusM: metrics.radiusM,
        arcLengthM: metrics.arcLengthM,
        entryDistance: loM,
        exitDistance: hiM,
        apexDistance: line.cumulative[metrics.apexIndex],
        entryBearingDeg: line.bearingsDeg[refined.entryIndex] ?? 0,
        direction: metrics.totalAngleDeg < 0 ? 'left' : 'right',
        directionConsistency: metrics.consistency,
        chain: null,
        tightens: false,
        opens: false,
        isLong: false,
        isShort: false,
      });
    }
    runStart = null;
    runDir = 0;
    zeros = 0;
  };

  for (let i = 0; i < line.rawDThetaDeg.length - 1; i += 1) {
    const d = line.rawDThetaDeg[i];
    if (Math.abs(d) <= 0.35) {
      zeros += 1;
      if (runStart !== null && zeros > 3) {
        flush(i - zeros + 1);
      }
      continue;
    }
    zeros = 0;
    const dir = signOf(d);
    if (dir === 0) {
      continue;
    }
    if (runStart === null) {
      runStart = i;
      runDir = dir;
      continue;
    }
    if (dir !== runDir) {
      flush(i);
      runStart = i;
      runDir = dir;
    }
  }
  flush(line.coords.length - 1);
  return extra;
}

export function detectStraights(
  line: Centreline,
  corners: DetectedCorner[],
): StraightRun[] {
  const bounds = [
    0,
    ...corners.flatMap((c) => [c.entryDistance, c.exitDistance]),
    line.lengthM,
  ];
  const runs: StraightRun[] = [];
  for (let i = 0; i < bounds.length - 1; i += 2) {
    const loM = bounds[i];
    const hiM = bounds[i + 1];
    const lengthM = hiM - loM;
    if (lengthM < STRAIGHT_MIN_M) {
      continue;
    }
    let net = 0;
    for (let s = 0; s < line.coords.length - 1; s += 1) {
      if (line.cumulative[s] < loM || line.cumulative[s] >= hiM) {
        continue;
      }
      net += line.dThetaDeg[s];
    }
    if (Math.abs(net) >= STRAIGHT_MAX_TURN_DEG) {
      continue;
    }
    runs.push({
      entryDistance: loM,
      exitDistance: hiM,
      midDistance: (loM + hiM) / 2,
      netAngleDeg: net,
    });
  }
  return runs;
}

export function dropTightPairs(corners: DetectedCorner[]): DetectedCorner[] {
  const sorted = corners
    .slice()
    .sort((a, b) => a.apexDistance - b.apexDistance);
  const kept: DetectedCorner[] = [];
  for (const corner of sorted) {
    const prev = kept[kept.length - 1];
    if (
      prev &&
      Math.abs(corner.apexDistance - prev.apexDistance) < NOTE_MIN_SEPARATION_M
    ) {
      if (Math.abs(corner.totalAngleDeg) > Math.abs(prev.totalAngleDeg)) {
        kept[kept.length - 1] = corner;
      }
      continue;
    }
    kept.push(corner);
  }
  return kept;
}
