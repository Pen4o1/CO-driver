import {
  CLOSE_PEAK_RATIO,
  CORNER_WINDOW_M,
  DIRECTION_CONSISTENCY_MIN,
  MIN_ANGLE_DEG,
  MIN_SPAN_M,
  OPEN_CONSISTENT_SAMPLES,
  OPEN_DEG,
  S_CURVE_WINDOW_M,
} from './constants';
import type { Centreline, DetectedCorner } from './types';
import { signOf, spanMetrics, windowAnglesDeg, refineSpan } from './window';

type RawSpan = { entryIndex: number; exitIndex: number };

function isOpening(windowDeg: Float64Array, i: number): boolean {
  if (i + OPEN_CONSISTENT_SAMPLES > windowDeg.length) {
    return false;
  }
  const dir = signOf(windowDeg[i]);
  if (dir === 0) {
    return false;
  }
  for (let k = 0; k < OPEN_CONSISTENT_SAMPLES; k += 1) {
    const value = windowDeg[i + k];
    if (Math.abs(value) <= OPEN_DEG || signOf(value) !== dir) {
      return false;
    }
  }
  return true;
}

function detectSpans(
  line: Centreline,
  windowM: number,
  fromIndex: number,
  toIndex: number,
): RawSpan[] {
  const windowDeg = windowAnglesDeg(line, windowM);
  const last = Math.min(toIndex, windowDeg.length - 1);
  const spans: RawSpan[] = [];
  let openAt: number | null = null;
  let peak = 0;

  for (let i = fromIndex; i <= last; i += 1) {
    const mag = Math.abs(windowDeg[i]);
    if (openAt === null) {
      if (isOpening(windowDeg, i)) {
        openAt = i;
        peak = mag;
      }
      continue;
    }
    if (mag > peak) {
      peak = mag;
    }
    const atEnd = i === last;
    const closing = mag < peak * CLOSE_PEAK_RATIO || atEnd;
    if (!closing) {
      continue;
    }
    const exitIndex = Math.min(line.coords.length - 1, i);
    const arcM = line.cumulative[exitIndex] - line.cumulative[openAt];
    if (arcM >= MIN_SPAN_M) {
      spans.push({ entryIndex: openAt, exitIndex });
    }
    openAt = null;
    peak = 0;
  }
  return mergeOverlapping(line, spans);
}

function mergeOverlapping(line: Centreline, spans: RawSpan[]): RawSpan[] {
  if (spans.length === 0) {
    return [];
  }
  const sorted = spans.slice().sort((a, b) => a.entryIndex - b.entryIndex);
  const out: RawSpan[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = out[out.length - 1];
    const next = sorted[i];
    if (next.entryIndex <= prev.exitIndex) {
      prev.exitIndex = Math.max(prev.exitIndex, next.exitIndex);
    } else {
      out.push({ ...next });
    }
  }
  return out.filter((span) => {
    const arcM =
      line.cumulative[span.exitIndex] - line.cumulative[span.entryIndex];
    return arcM >= MIN_SPAN_M;
  });
}

function toCorner(line: Centreline, span: RawSpan): DetectedCorner | null {
  const refined = refineSpan(line, span.entryIndex, span.exitIndex);
  const metrics = spanMetrics(line, refined.entryIndex, refined.exitIndex);
  if (Math.abs(metrics.totalAngleDeg) < MIN_ANGLE_DEG) {
    return null;
  }
  if (!Number.isFinite(metrics.radiusM)) {
    return null;
  }
  const direction: 'left' | 'right' =
    metrics.totalAngleDeg < 0 ? 'left' : 'right';
  return {
    entryIndex: refined.entryIndex,
    exitIndex: refined.exitIndex,
    apexIndex: metrics.apexIndex,
    totalAngleDeg: metrics.totalAngleDeg,
    radiusM: metrics.radiusM,
    arcLengthM: metrics.arcLengthM,
    entryDistance: line.cumulative[refined.entryIndex],
    exitDistance: line.cumulative[refined.exitIndex],
    apexDistance: line.cumulative[metrics.apexIndex],
    entryBearingDeg: line.bearingsDeg[refined.entryIndex] ?? 0,
    direction,
    directionConsistency: metrics.consistency,
    chain: null,
    tightens: false,
    opens: false,
    isLong: false,
    isShort: false,
  };
}

function refineSCurves(
  line: Centreline,
  spans: RawSpan[],
  windowM: number,
): RawSpan[] {
  if (windowM <= S_CURVE_WINDOW_M) {
    return spans;
  }
  const out: RawSpan[] = [];
  for (const span of spans) {
    const metrics = spanMetrics(line, span.entryIndex, span.exitIndex);
    if (metrics.consistency >= DIRECTION_CONSISTENCY_MIN) {
      out.push(span);
      continue;
    }
    const inner = detectSpans(
      line,
      S_CURVE_WINDOW_M,
      span.entryIndex,
      span.exitIndex,
    );
    if (inner.length === 0) {
      continue;
    }
    out.push(...inner);
  }
  return mergeOverlapping(line, out);
}

/** Windowed corner spans. S-curves are split with a 20 m retry. */
export function detectCornerSpans(line: Centreline): DetectedCorner[] {
  if (line.coords.length < 4 || line.lengthM < CORNER_WINDOW_M) {
    return [];
  }
  const raw = detectSpans(line, CORNER_WINDOW_M, 0, line.coords.length - 1);
  const refined = refineSCurves(line, raw, CORNER_WINDOW_M);
  const corners: DetectedCorner[] = [];
  for (const span of refined) {
    const corner = toCorner(line, span);
    if (corner && corner.directionConsistency >= DIRECTION_CONSISTENCY_MIN) {
      corners.push(corner);
    }
  }
  return corners;
}
