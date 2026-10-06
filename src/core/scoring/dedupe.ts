import { resamplePolyline } from '@/core/geo/interpolate';
import { overlapShare } from '@/core/geo/overlap';
import { frechetDistanceM } from '@/core/geo/frechet';
import type { LatLng, RouteCandidate } from '@/core/types';

import {
  DEDUPE_FRECHET_MAX_POINTS,
  DEDUPE_FRECHET_RATIO,
  DEDUPE_FRECHET_SAMPLE_M,
  DEDUPE_OVERLAP_RADIUS_M,
  DEDUPE_OVERLAP_SHARE,
} from './constants';

type Samples = {
  frechet: LatLng[];
  overlap: LatLng[];
};

function frechetSpacingM(lengthM: number): number {
  if (!(lengthM > 0)) {
    return DEDUPE_FRECHET_SAMPLE_M;
  }
  return Math.max(DEDUPE_FRECHET_SAMPLE_M, lengthM / DEDUPE_FRECHET_MAX_POINTS);
}

function samplesFor(
  candidate: RouteCandidate,
  cache: WeakMap<RouteCandidate, Samples>,
): Samples {
  const hit = cache.get(candidate);
  if (hit) {
    return hit;
  }
  const built: Samples = {
    frechet: resamplePolyline(
      candidate.geometry.coords,
      frechetSpacingM(candidate.geometry.lengthM),
    ),
    overlap: resamplePolyline(
      candidate.geometry.coords,
      DEDUPE_FRECHET_SAMPLE_M,
    ),
  };
  cache.set(candidate, built);
  return built;
}

function sameRoadCached(
  a: RouteCandidate,
  b: RouteCandidate,
  cache: WeakMap<RouteCandidate, Samples>,
): boolean {
  const minLen = Math.min(a.geometry.lengthM, b.geometry.lengthM);
  if (minLen <= 0) {
    return true;
  }
  const sa = samplesFor(a, cache);
  const sb = samplesFor(b, cache);
  const frechet = frechetDistanceM(sa.frechet, sb.frechet);
  if (frechet < DEDUPE_FRECHET_RATIO * minLen) {
    return true;
  }
  const shareAb = overlapShare(sa.overlap, sb.overlap, DEDUPE_OVERLAP_RADIUS_M);
  const shareBa = overlapShare(sb.overlap, sa.overlap, DEDUPE_OVERLAP_RADIUS_M);
  return shareAb > DEDUPE_OVERLAP_SHARE || shareBa > DEDUPE_OVERLAP_SHARE;
}

export function sameRoad(a: RouteCandidate, b: RouteCandidate): boolean {
  return sameRoadCached(a, b, new WeakMap());
}

function durationS(candidate: RouteCandidate): number {
  return candidate.breakdown.durationS;
}

/** Keep the faster of each same-road pair. Order is otherwise preserved. */
export function dedupeCandidates(
  candidates: RouteCandidate[],
): RouteCandidate[] {
  const cache = new WeakMap<RouteCandidate, Samples>();
  const kept: RouteCandidate[] = [];
  for (const candidate of candidates) {
    let duplicateOf = -1;
    for (let i = 0; i < kept.length; i += 1) {
      if (sameRoadCached(kept[i], candidate, cache)) {
        duplicateOf = i;
        break;
      }
    }
    if (duplicateOf < 0) {
      kept.push(candidate);
      continue;
    }
    if (durationS(candidate) < durationS(kept[duplicateOf])) {
      kept[duplicateOf] = candidate;
    }
  }
  return kept;
}
