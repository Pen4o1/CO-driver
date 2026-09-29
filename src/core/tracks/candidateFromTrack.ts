import {
  buildRouteGeometry,
  deriveAscentDescent,
  haversineM,
} from '@/core/geo';
import { emptyBreakdown } from '@/core/routing';
import { rawMetricsFor } from '@/core/scoring';
import type { RouteCandidate } from '@/core/types';

import type { ParsedTrack, TrackPoint } from './parseGpx';

const MIN_LENGTH_M = 50;
const MIN_STEP_M = 8;
const MAX_POINTS = 8_000;
const ASSUMED_SPEED_MPS = 50 / 3.6;

export type TrackCandidateResult =
  { ok: true; candidate: RouteCandidate } | { ok: false; message: string };

function thin(points: TrackPoint[], stepM: number): TrackPoint[] {
  const kept: TrackPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = kept[kept.length - 1];
    if (haversineM(prev, points[i]) >= stepM) kept.push(points[i]);
  }
  const last = points[points.length - 1];
  const end = kept[kept.length - 1];
  if (haversineM(end, last) >= 1) kept.push(last);
  else kept[kept.length - 1] = last;
  return kept;
}

/** Drop GPS samples closer than 8 m, then widen the gap if the line is still huge. */
export function thinTrack(points: TrackPoint[]): TrackPoint[] {
  if (points.length < 2) return points.slice();
  let stepM = MIN_STEP_M;
  let kept = thin(points, stepM);
  while (kept.length > MAX_POINTS && stepM < 500) {
    stepM *= 1.5;
    kept = thin(points, stepM);
  }
  return kept;
}

function elevationOf(points: TrackPoint[]): Float64Array | null {
  let present = 0;
  for (const point of points) {
    if (point.eleM !== null) present += 1;
  }
  if (present < points.length * 0.8) return null;
  const heights = new Float64Array(points.length);
  let last = points.find((point) => point.eleM !== null)?.eleM ?? 0;
  for (let i = 0; i < points.length; i += 1) {
    const ele = points[i].eleM;
    if (ele !== null) last = ele;
    heights[i] = last;
  }
  return heights;
}

function durationS(points: TrackPoint[], lengthM: number): number {
  const first = points.find((point) => point.timeMs !== null)?.timeMs ?? null;
  let last: number | null = null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i].timeMs !== null) {
      last = points[i].timeMs;
      break;
    }
  }
  if (first !== null && last !== null) {
    const spanS = (last - first) / 1000;
    if (spanS > 30 && spanS < 12 * 3600) return spanS;
  }
  return lengthM / ASSUMED_SPEED_MPS;
}

export function candidateFromTrack(
  track: ParsedTrack,
  id: string,
): TrackCandidateResult {
  const points = thinTrack(track.points);
  if (points.length < 2) {
    return { ok: false, message: 'The track needs at least two points.' };
  }
  const coords = points.map((point) => ({ lat: point.lat, lng: point.lng }));
  const geometry = buildRouteGeometry(coords, elevationOf(points));
  if (geometry.lengthM < MIN_LENGTH_M) {
    return { ok: false, message: 'That track is too short to call notes on.' };
  }
  const climb = deriveAscentDescent(geometry.elevationM, geometry.cumulative);
  const duration = durationS(points, geometry.lengthM);
  const draft: RouteCandidate = {
    id,
    providerId: 'gpx',
    geometry,
    steps: [],
    breakdown: emptyBreakdown(
      geometry.lengthM,
      duration,
      climb?.ascentM ?? null,
    ),
    fastestDurationS: duration,
    profileId: 'balanced',
    waypointsUsed: [coords[0], coords[coords.length - 1]],
    ascentM: climb?.ascentM ?? null,
    descentM: climb?.descentM ?? null,
    roadShares: {
      motorwayShare: null,
      lowSpeedRoadShare: null,
      streetShare: null,
      unpavedShare: null,
    },
  };
  const metrics = rawMetricsFor(draft);
  return {
    ok: true,
    candidate: {
      ...draft,
      breakdown: {
        ...draft.breakdown,
        curvatureDegPerKm: metrics.curvatureDegPerKm,
        hairpinCount: metrics.hairpinCount,
        turnDensityPerKm: metrics.turnDensityPerKm,
        elevationVariationM: metrics.elevationVariationM,
        tags: ['uploaded'],
      },
    },
  };
}
