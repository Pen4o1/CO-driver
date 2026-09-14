import type {
  RouteProfile,
  RouteStyle,
  ScoringWeights,
  TurnGrade,
  WaypointStrategy,
} from '@/core/types';

const TWIST_WEIGHTS: ScoringWeights = {
  curviness: 0.4,
  hairpinDensity: 0.25,
  turnDensity: 0.15,
  lowSpeedRoadShare: 0.1,
  elevationVariation: 0.1,
  motorwayPenalty: 0.35,
  detourPenalty: 0.25,
};

const BALANCED_WEIGHTS: ScoringWeights = {
  curviness: 0.25,
  hairpinDensity: 0.15,
  turnDensity: 0.15,
  lowSpeedRoadShare: 0.1,
  elevationVariation: 0.1,
  motorwayPenalty: 0.2,
  detourPenalty: 0.45,
};

const CRUISE_WEIGHTS: ScoringWeights = {
  curviness: 0.05,
  hairpinDensity: 0,
  turnDensity: 0.05,
  lowSpeedRoadShare: 0.05,
  elevationVariation: 0.05,
  motorwayPenalty: 0,
  detourPenalty: 0.7,
};

const GENTLE_WEIGHTS: ScoringWeights = {
  curviness: 0.15,
  hairpinDensity: 0,
  turnDensity: 0,
  lowSpeedRoadShare: 0.15,
  elevationVariation: 0.05,
  motorwayPenalty: 0.1,
  detourPenalty: 0.5,
};

function avoidFeatures(flags: {
  motorway: boolean;
  toll: boolean;
  ferry: boolean;
}): string[] {
  const out: string[] = [];
  if (flags.motorway) out.push('highways');
  if (flags.toll) out.push('tollways');
  if (flags.ferry) out.push('ferries');
  return out;
}

function valhallaParams(useHighways: number, useTrails: number) {
  return { useHighways, useTrails };
}

export const TWIST_SEEKER: RouteProfile = {
  id: 'twist',
  label: 'Twist seeker',
  description: 'Maximise curvature. Avoid motorways and tolls.',
  avoidMotorway: true,
  avoidToll: true,
  avoidFerry: true,
  avoidUnpaved: false,
  minGradeTolerance: 3,
  maxDetourRatio: 1.35,
  weights: TWIST_WEIGHTS,
  waypointStrategy: 'aggressive',
  providerProfile: 'motorcycle',
  providerParams: {
    ...valhallaParams(0, 0.9),
    avoidFeatures: avoidFeatures({ motorway: true, toll: true, ferry: true }),
    orsPreference: 'recommended',
  },
};

export const BALANCED: RouteProfile = {
  id: 'balanced',
  label: 'Balanced',
  description: 'A mix of interesting roads without a huge detour.',
  avoidMotorway: false,
  avoidToll: true,
  avoidFerry: true,
  avoidUnpaved: false,
  minGradeTolerance: 4,
  maxDetourRatio: 1.35,
  weights: BALANCED_WEIGHTS,
  waypointStrategy: 'moderate',
  providerProfile: 'auto',
  providerParams: {
    ...valhallaParams(0.3, 0.45),
    avoidFeatures: avoidFeatures({ motorway: false, toll: true, ferry: true }),
    orsPreference: 'recommended',
  },
};

export const CRUISE: RouteProfile = {
  id: 'cruise',
  label: 'Cruise',
  description: 'Minimise turns. Motorways allowed and rewarded.',
  avoidMotorway: false,
  avoidToll: false,
  avoidFerry: true,
  avoidUnpaved: true,
  minGradeTolerance: 6,
  maxDetourRatio: 1.15,
  weights: CRUISE_WEIGHTS,
  waypointStrategy: 'none',
  providerProfile: 'auto',
  providerParams: {
    ...valhallaParams(0.95, 0),
    avoidFeatures: avoidFeatures({ motorway: false, toll: false, ferry: true }),
    orsPreference: 'fastest',
  },
};

export const GENTLE: RouteProfile = {
  id: 'gentle',
  label: 'Gentle',
  description: 'A nice drive, not a workout. Prefer flowing curves.',
  avoidMotorway: false,
  avoidToll: true,
  avoidFerry: true,
  avoidUnpaved: true,
  minGradeTolerance: 4,
  maxDetourRatio: 1.35,
  weights: GENTLE_WEIGHTS,
  waypointStrategy: 'moderate',
  providerProfile: 'motorcycle',
  providerParams: {
    ...valhallaParams(0.6, 0.2),
    avoidFeatures: avoidFeatures({ motorway: false, toll: true, ferry: true }),
    orsPreference: 'recommended',
  },
};

export type CustomProfileInput = {
  curviness: number;
  maxSharpness: TurnGrade;
  avoidMotorway: boolean;
  avoidToll: boolean;
  avoidFerry: boolean;
  avoidUnpaved: boolean;
  maxDetourRatio: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpWeights(
  a: ScoringWeights,
  b: ScoringWeights,
  t: number,
): ScoringWeights {
  return {
    curviness: lerp(a.curviness, b.curviness, t),
    hairpinDensity: lerp(a.hairpinDensity, b.hairpinDensity, t),
    turnDensity: lerp(a.turnDensity, b.turnDensity, t),
    lowSpeedRoadShare: lerp(a.lowSpeedRoadShare, b.lowSpeedRoadShare, t),
    elevationVariation: lerp(a.elevationVariation, b.elevationVariation, t),
    motorwayPenalty: lerp(a.motorwayPenalty, b.motorwayPenalty, t),
    detourPenalty: lerp(a.detourPenalty, b.detourPenalty, t),
  };
}

export function customProfile(input: CustomProfileInput): RouteProfile {
  const t = Math.min(10, Math.max(0, input.curviness)) / 10;
  let waypointStrategy: WaypointStrategy = 'none';
  if (t >= 0.6) waypointStrategy = 'aggressive';
  else if (t >= 0.3) waypointStrategy = 'moderate';
  return {
    id: 'custom',
    label: 'Custom',
    description: 'Your mix of twist vs cruise.',
    avoidMotorway: input.avoidMotorway,
    avoidToll: input.avoidToll,
    avoidFerry: input.avoidFerry,
    avoidUnpaved: input.avoidUnpaved,
    minGradeTolerance: input.maxSharpness,
    maxDetourRatio: input.maxDetourRatio,
    weights: lerpWeights(CRUISE_WEIGHTS, TWIST_WEIGHTS, t),
    waypointStrategy,
    providerProfile: 'motorcycle',
    providerParams: {
      useHighways: 1 - t,
      useTrails: t * 0.9,
      avoidFeatures: avoidFeatures({
        motorway: input.avoidMotorway,
        toll: input.avoidToll,
        ferry: input.avoidFerry,
      }),
      orsPreference: t < 0.35 ? 'fastest' : 'recommended',
    },
  };
}

const BUILTIN: Record<Exclude<RouteStyle, 'custom'>, RouteProfile> = {
  twist: TWIST_SEEKER,
  balanced: BALANCED,
  cruise: CRUISE,
  gentle: GENTLE,
};

export function profileById(
  id: RouteStyle,
  custom?: CustomProfileInput,
): RouteProfile {
  if (id === 'custom') {
    return customProfile(
      custom ?? {
        curviness: 5,
        maxSharpness: 3,
        avoidMotorway: false,
        avoidToll: true,
        avoidFerry: true,
        avoidUnpaved: false,
        maxDetourRatio: 1.35,
      },
    );
  }
  return BUILTIN[id];
}

export const BUILTIN_PROFILES: RouteProfile[] = [
  TWIST_SEEKER,
  BALANCED,
  CRUISE,
  GENTLE,
];
