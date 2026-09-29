import type { RouteCandidate } from '@/core/types';

/**
 * A loop this full of city streets (ORS waytype 3) is dropped when any
 * less-urban loop came back. Below this, ranking prefers climb.
 */
export const CITY_LOOP_DROP = 0.8;

/** Unknown street share must not outrank a measured country road. */
const UNKNOWN_STREET = 0.7;

const RURAL_WEIGHT = 50;
const CLIMB_WEIGHT = 35;
const CLIMB_FULL_M = 800;
const BASE_WEIGHT = 0.15;

export function preferCountryLoops(
  candidates: RouteCandidate[],
): RouteCandidate[] {
  const open = candidates.filter((candidate) => {
    const street = candidate.roadShares.streetShare;
    return street === null || street < CITY_LOOP_DROP;
  });
  return open.length > 0 ? open : candidates;
}

/** Rural share and climb dominate. Twist score is only a tie-break. */
export function countryLoopScore(candidate: RouteCandidate): number {
  const street = candidate.roadShares.streetShare ?? UNKNOWN_STREET;
  const rural = 1 - Math.min(1, Math.max(0, street));
  const climb =
    candidate.ascentM ?? candidate.breakdown.elevationVariationM ?? 0;
  const climb01 = Math.min(1, Math.max(0, climb) / CLIMB_FULL_M);
  return (
    rural * RURAL_WEIGHT +
    climb01 * CLIMB_WEIGHT +
    candidate.breakdown.score * BASE_WEIGHT
  );
}

export function rankCountryLoops(
  candidates: RouteCandidate[],
): RouteCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    breakdown: {
      ...candidate.breakdown,
      score: countryLoopScore(candidate),
    },
  }));
}

/**
 * Top country/mountain loops. A short city loop is not kept just because it
 * is faster — detour is the wrong rule once the search is "roads around here".
 */
export function pickCountryLoops(
  candidates: RouteCandidate[],
): RouteCandidate[] {
  const ranked = rankCountryLoops(candidates).sort(
    (a, b) => b.breakdown.score - a.breakdown.score,
  );
  const best = ranked[0];
  if (!best) {
    return [];
  }
  const bestStreet = best.roadShares.streetShare ?? UNKNOWN_STREET;
  return ranked
    .filter((candidate) => {
      const street = candidate.roadShares.streetShare ?? UNKNOWN_STREET;
      return street <= bestStreet + 0.25;
    })
    .slice(0, 3);
}
