import { clamp } from '@/core/geo/clamp';
import type { RouteCandidate, RouteProfile } from '@/core/types';

import { SCORE_KEEP_RATIO } from './constants';

function detourRatio(candidate: RouteCandidate): number {
  if (candidate.fastestDurationS <= 0) {
    return 1;
  }
  return candidate.breakdown.durationS / candidate.fastestDurationS;
}

/**
 * Rank by score, drop maxDetourRatio violators, drop under 0.6 * best.
 * Always keep the fastest as a fallback. Return at most 3 + fallback.
 */
export function pickCandidates(
  candidates: RouteCandidate[],
  profile: RouteProfile,
): RouteCandidate[] {
  if (candidates.length === 0) {
    return [];
  }
  const fastest = candidates.reduce((a, b) =>
    a.breakdown.durationS <= b.breakdown.durationS ? a : b,
  );
  const withinDetour = candidates.filter(
    (c) => detourRatio(c) <= profile.maxDetourRatio,
  );
  const pool = withinDetour.length > 0 ? withinDetour : [fastest];
  const sorted = [...pool].sort(
    (a, b) => b.breakdown.score - a.breakdown.score,
  );
  const best = sorted[0]?.breakdown.score ?? 0;
  const cutoff = best * SCORE_KEEP_RATIO;
  const ranked = sorted.filter((c) => c.breakdown.score >= cutoff).slice(0, 3);
  if (!ranked.some((c) => c.id === fastest.id)) {
    ranked.push(fastest);
  }
  return ranked;
}

export function vsFastestLabel(candidate: RouteCandidate): string {
  const deltaS = candidate.breakdown.durationS - candidate.fastestDurationS;
  const minutes = Math.round(deltaS / 60);
  if (minutes <= 0) {
    return 'fastest';
  }
  return `vs fastest: +${minutes} min`;
}

export function clampScore(score01: number): number {
  return clamp(score01, 0, 1) * 100;
}
