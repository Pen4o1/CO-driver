import type { LatLng, NoteChain, TurnGrade } from '@/core/types';

export type Centreline = {
  coords: LatLng[];
  cumulative: Float64Array;
  bearingsDeg: number[];
  /** Signed turning to the next sample (deg), smoothed. Last value is 0. */
  dThetaDeg: Float64Array;
  /** Unsmoothed turning — used for radius/angle so Hann smoothing cannot un-hairpin a real bend. */
  rawDThetaDeg: Float64Array;
  /** k = dθ_rad / ds, positive = right. */
  curvaturePerM: Float64Array;
  dsM: number;
  lengthM: number;
};

export type DetectedCorner = {
  entryIndex: number;
  exitIndex: number;
  apexIndex: number;
  totalAngleDeg: number;
  radiusM: number;
  arcLengthM: number;
  entryDistance: number;
  exitDistance: number;
  apexDistance: number;
  entryBearingDeg: number;
  direction: 'left' | 'right';
  directionConsistency: number;
  chain: NoteChain;
  tightens: boolean;
  opens: boolean;
  isLong: boolean;
  isShort: boolean;
};

export type GradedCorner = DetectedCorner & {
  grade: TurnGrade;
  severity: number;
  junctionInstruction?: string;
  roadName?: string;
};

export type GradeDisagreement = {
  apexDistance: number;
  geometryGrade: TurnGrade;
  routerGrade: number;
  instruction: string;
};

export type StraightRun = {
  entryDistance: number;
  exitDistance: number;
  midDistance: number;
  netAngleDeg: number;
};

export type Utterance = {
  text: string;
  noteIds: string[];
  atDistance: number;
};
