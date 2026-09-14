import type {
  CurvinessBreakdown,
  RouteCandidate,
  RouteProfile,
  ScoringWeights,
} from '@/core/types';

import { clampScore } from './rank';
import { minMaxNormalize, normalizeNullable } from './normalize';
import {
  curvatureDegPerKm,
  hairpinAndTurnDensity,
  scoreCorners,
} from './scoreCorners';
import { buildTags } from './tags';

export type RawMetrics = {
  curvatureDegPerKm: number;
  hairpinCount: number;
  hairpinPerKm: number;
  turnDensityPerKm: number;
  motorwayShare: number | null;
  lowSpeedRoadShare: number | null;
  elevationVariationM: number | null;
  detour: number;
};

export function rawMetricsFor(candidate: RouteCandidate): RawMetrics {
  const corners = scoreCorners(candidate.geometry);
  const { hairpinCount, turnDensityPerKm } = hairpinAndTurnDensity(
    corners,
    candidate.geometry.lengthM,
  );
  const km = Math.max(candidate.geometry.lengthM / 1000, 0.001);
  const fastest = candidate.fastestDurationS;
  const detour =
    fastest > 0 ? Math.max(0, candidate.breakdown.durationS / fastest - 1) : 0;
  return {
    curvatureDegPerKm: curvatureDegPerKm(candidate.geometry),
    hairpinCount,
    hairpinPerKm: hairpinCount / km,
    turnDensityPerKm,
    motorwayShare: candidate.roadShares.motorwayShare,
    lowSpeedRoadShare: candidate.roadShares.lowSpeedRoadShare,
    elevationVariationM: candidate.ascentM,
    detour,
  };
}

function weightSum(
  weights: ScoringWeights,
  skip: { elevation: boolean; motorway: boolean; lowSpeed: boolean },
): number {
  let sum =
    weights.curviness +
    weights.hairpinDensity +
    weights.turnDensity +
    weights.detourPenalty;
  if (!skip.lowSpeed) sum += weights.lowSpeedRoadShare;
  if (!skip.elevation) sum += weights.elevationVariation;
  if (!skip.motorway) sum += weights.motorwayPenalty;
  return sum === 0 ? 1 : sum;
}

function score01(
  n: {
    curviness: number;
    hairpin: number;
    turn: number;
    lowSpeed: number;
    elevation: number;
    motorway: number;
    detour: number;
  },
  weights: ScoringWeights,
  skip: { elevation: boolean; motorway: boolean; lowSpeed: boolean },
): number {
  const denom = weightSum(weights, skip);
  const raw =
    weights.curviness * n.curviness +
    weights.hairpinDensity * n.hairpin +
    weights.turnDensity * n.turn +
    (skip.lowSpeed ? 0 : weights.lowSpeedRoadShare * n.lowSpeed) +
    (skip.elevation ? 0 : weights.elevationVariation * n.elevation) -
    (skip.motorway ? 0 : weights.motorwayPenalty * n.motorway) -
    weights.detourPenalty * n.detour;
  return raw / denom;
}

function breakdownFrom(
  candidate: RouteCandidate,
  metrics: RawMetrics,
  score: number,
): CurvinessBreakdown {
  const partial: CurvinessBreakdown = {
    score,
    lengthM: candidate.geometry.lengthM,
    durationS: candidate.breakdown.durationS,
    curvatureDegPerKm: metrics.curvatureDegPerKm,
    hairpinCount: metrics.hairpinCount,
    turnDensityPerKm: metrics.turnDensityPerKm,
    motorwayShare: metrics.motorwayShare,
    lowSpeedRoadShare: metrics.lowSpeedRoadShare,
    elevationVariationM: metrics.elevationVariationM,
    tags: [],
  };
  return { ...partial, tags: buildTags(partial) };
}

/** Min-max across the set, then weighted score 0..100. */
export function scoreCandidates(
  candidates: RouteCandidate[],
  profile: RouteProfile,
): RouteCandidate[] {
  if (candidates.length === 0) {
    return [];
  }
  const fastestDurationS = Math.min(
    ...candidates.map((c) => c.breakdown.durationS),
  );
  const withFastest = candidates.map((c) => ({ ...c, fastestDurationS }));
  const metrics = withFastest.map(rawMetricsFor);
  const nCurv = minMaxNormalize(metrics.map((m) => m.curvatureDegPerKm));
  const nHair = minMaxNormalize(metrics.map((m) => m.hairpinPerKm));
  const nTurn = minMaxNormalize(metrics.map((m) => m.turnDensityPerKm));
  const nLow = normalizeNullable(metrics.map((m) => m.lowSpeedRoadShare));
  const nEl = normalizeNullable(metrics.map((m) => m.elevationVariationM));
  const nMw = normalizeNullable(metrics.map((m) => m.motorwayShare));
  const nDet = minMaxNormalize(metrics.map((m) => m.detour));
  const skip = {
    elevation: metrics.every((m) => m.elevationVariationM === null),
    motorway: metrics.every((m) => m.motorwayShare === null),
    lowSpeed: metrics.every((m) => m.lowSpeedRoadShare === null),
  };

  return withFastest.map((candidate, i) => {
    const s = score01(
      {
        curviness: nCurv[i],
        hairpin: nHair[i],
        turn: nTurn[i],
        lowSpeed: nLow[i],
        elevation: nEl[i],
        motorway: nMw[i],
        detour: nDet[i],
      },
      profile.weights,
      skip,
    );
    const scored = clampScore(s);
    return {
      ...candidate,
      breakdown: breakdownFrom(candidate, metrics[i], scored),
    };
  });
}

export function scoreSingle(
  candidate: RouteCandidate,
  profile: RouteProfile,
): RouteCandidate {
  return scoreCandidates([candidate], profile)[0];
}
