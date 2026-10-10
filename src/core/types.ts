import { z } from 'zod';

export type LatLng = { lat: number; lng: number };

export const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export type TurnGrade = 1 | 2 | 3 | 4 | 5 | 6;

export type RouteGeometry = {
  coords: LatLng[];
  cumulative: Float64Array;
  lengthM: number;
  bbox: [number, number, number, number];
  elevationM: Float64Array | null;
};

export type RouteStyle = 'twist' | 'balanced' | 'cruise' | 'gentle' | 'custom';

export type WaypointStrategy = 'aggressive' | 'moderate' | 'none';

export type ScoringWeights = {
  curviness: number;
  hairpinDensity: number;
  turnDensity: number;
  lowSpeedRoadShare: number;
  elevationVariation: number;
  motorwayPenalty: number;
  detourPenalty: number;
};

export type RouteProfile = {
  id: RouteStyle;
  label: string;
  description: string;
  avoidMotorway: boolean;
  avoidToll: boolean;
  avoidFerry: boolean;
  avoidUnpaved: boolean;
  minGradeTolerance: TurnGrade;
  maxDetourRatio: number;
  weights: ScoringWeights;
  waypointStrategy: WaypointStrategy;
  providerProfile: string;
  providerParams: Record<string, unknown>;
};

export type CurvinessBreakdown = {
  score: number;
  lengthM: number;
  durationS: number;
  curvatureDegPerKm: number;
  hairpinCount: number;
  turnDensityPerKm: number;
  motorwayShare: number | null;
  lowSpeedRoadShare: number | null;
  elevationVariationM: number | null;
  tags: string[];
};

export type RoadShares = {
  motorwayShare: number | null;
  /** Country road + track share. City streets are `streetShare`, not this. */
  lowSpeedRoadShare: number | null;
  /** ORS waytype 3 (residential / living street / service). Null if unknown. */
  streetShare: number | null;
  unpavedShare: number | null;
};

export type RouteStep = {
  distanceM: number;
  durationS: number;
  roadName?: string;
  wayType?: number;
  surface?: string;
  steepnessPct?: number;
  maneuver: {
    type: string;
    modifier?: string;
    instruction: string;
    location: LatLng;
  };
};

export type RouteCandidate = {
  id: string;
  providerId: string;
  geometry: RouteGeometry;
  steps: RouteStep[];
  breakdown: CurvinessBreakdown;
  fastestDurationS: number;
  profileId: RouteStyle;
  waypointsUsed: LatLng[];
  ascentM: number | null;
  descentM: number | null;
  roadShares: RoadShares;
};

export type NoteType =
  | 'start'
  | 'finish'
  | 'corner'
  | 'straight'
  | 'junction'
  | 'crest'
  | 'jump'
  | 'care'
  | 'offroute'
  | 'info';

export type NoteModifier =
  | 'tightens'
  | 'opens'
  | 'long'
  | 'short'
  | 'dont-cut'
  | 'narrows'
  | 'blind'
  | 'bumpy'
  | 'over-crest'
  | 'downhill'
  | 'slippery';

export type NoteChain = 'into' | 'and' | 'then' | null;

export type PaceNote = {
  id: string;
  type: NoteType;
  direction?: 'left' | 'right' | 'straight';
  grade?: TurnGrade;
  modifiers: NoteModifier[];
  chain: NoteChain;
  atDistance: number;
  entryDistance: number;
  exitDistance: number;
  distanceFromPrevious: number;
  radiusM?: number;
  totalAngleDeg?: number;
  arcLengthM?: number;
  severity: number;
  roadName?: string;
  spokenFull: string;
  spokenShort: string;
  junctionInstruction?: string;
  audioClipId?: string;
};

export type NoteFilterOptions = {
  minGradeToCall: TurnGrade;
  includeJunctions: boolean;
  includeCrests: boolean;
  includeStraights: boolean;
  includeCareNotes: boolean;
  includeFinish: boolean;
  verbosity: 'full' | 'standard' | 'terse';
  chainRadius: number;
  confirmCalls: boolean;
};

export type LeadTimePreset = 'early' | 'normal' | 'late';

export type DriveSessionStatus =
  'idle' | 'recce' | 'driving' | 'paused' | 'off-route' | 'finished';

export type GeoFix = {
  lat: number;
  lng: number;
  speedMps: number;
  headingDeg: number;
  accuracyM: number;
  timestampMs: number;
};

export type VoiceAction =
  | {
      kind: 'speak';
      noteId: string;
      text: string;
      priority: 'urgent' | 'normal' | 'info';
      clipId?: string;
      /** Every note spoken by this one utterance. A dropped call retries all of them. */
      coveredNoteIds?: string[];
    }
  | { kind: 'stop' }
  | { kind: 'duck'; ms: number };
