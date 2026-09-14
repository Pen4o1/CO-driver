import { resamplePolyline } from '@/core/geo/interpolate';
import { overlapShare } from '@/core/geo/overlap';
import { frechetDistanceM } from '@/core/geo/frechet';
import type { RouteCandidate } from '@/core/types';

import {
  DEDUPE_FRECHET_RATIO,
  DEDUPE_FRECHET_SAMPLE_M,
  DEDUPE_OVERLAP_RADIUS_M,
  DEDUPE_OVERLAP_SHARE,
} from './constants';

function sampled(candidate: RouteCandidate) {
  return resamplePolyline(candidate.geometry.coords, DEDUPE_FRECHET_SAMPLE_M);
}

export function sameRoad(a: RouteCandidate, b: RouteCandidate): boolean {
  const minLen = Math.min(a.geometry.lengthM, b.geometry.lengthM);
  if (minLen <= 0) {
    return true;
  }
  const sa = sampled(a);
  const sb = sampled(b);
  const frechet = frechetDistanceM(sa, sb);
  if (frechet < DEDUPE_FRECHET_RATIO * minLen) {
    return true;
  }
  const shareAb = overlapShare(sa, sb, DEDUPE_OVERLAP_RADIUS_M);
  const shareBa = overlapShare(sb, sa, DEDUPE_OVERLAP_RADIUS_M);
  return shareAb > DEDUPE_OVERLAP_SHARE || shareBa > DEDUPE_OVERLAP_SHARE;
}

function durationS(candidate: RouteCandidate): number {
  return candidate.breakdown.durationS;
}

/** Keep the faster of each same-road pair. Order is otherwise preserved. */
export function dedupeCandidates(
  candidates: RouteCandidate[],
): RouteCandidate[] {
  const kept: RouteCandidate[] = [];
  for (const candidate of candidates) {
    let duplicateOf = -1;
    for (let i = 0; i < kept.length; i += 1) {
      if (sameRoad(kept[i], candidate)) {
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
