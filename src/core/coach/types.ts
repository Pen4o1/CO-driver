import type {
  DriveSessionStatus,
  GeoFix,
  LeadTimePreset,
  NoteFilterOptions,
  PaceNote,
  RouteGeometry,
  VoiceAction,
} from '@/core/types';

export type TimingSettings = {
  preset: LeadTimePreset;
  minLeadM: number;
  maxLeadM: number;
  confirmLeadM: number;
  confirmGapMs: number;
  lookAheadS: number;
};

export type FiredKind = 'primary' | 'confirm';

export type FiredRecord = {
  noteId: string;
  kind: FiredKind;
  atDistanceM: number;
  atMs: number;
};

export type CallLogEntry = {
  noteId: string;
  kind: FiredKind;
  text: string;
  atDistanceM: number;
  atMs: number;
};

export type UpcomingCall = {
  noteId: string;
  kind: FiredKind;
  fireInM: number;
  atDistance: number;
};

export type EngineDebug = {
  speedMps: number;
  leadM: number;
  upcoming: UpcomingCall[];
  lastCall: CallLogEntry | null;
  callLog: CallLogEntry[];
  offRouteStreak: number;
};

export type EngineOutputStatus =
  'on-route' | 'off-route' | 'paused' | 'finished';

export type EngineOutput = {
  positionAlongRoute: number;
  crossTrackM: number;
  nextNotes: PaceNote[];
  actions: VoiceAction[];
  status: EngineOutputStatus;
  debug: EngineDebug;
};

export type EngineConfig = {
  geometry: RouteGeometry;
  notes: PaceNote[];
  filter: NoteFilterOptions;
  timing: TimingSettings;
};

export type EngineState = EngineConfig & {
  status: DriveSessionStatus;
  distanceAlongM: number;
  previousDistanceAlongM: number;
  crossTrackM: number;
  speedMps: number;
  headingDeg: number;
  fired: Readonly<Record<string, FiredRecord>>;
  offRouteStreak: number;
  offRouteSinceMs: number | null;
  lastFix: GeoFix | null;
  callLog: CallLogEntry[];
  paused: boolean;
  /** Fastest trustworthy GPS speed seen on this drive. */
  maxSpeedMps: number;
  /** Time spent moving, from GPS samples. */
  movingMs: number;
};

export type DriveStats = {
  distanceM: number;
  durationS: number;
  movingTimeS: number;
  cornersByGrade: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
  hairpinsHit: number;
  /** Distance divided by elapsed time, including stops. */
  avgSpeedMps: number;
  /** Peak GPS speed. Missing on drives recorded before this field existed. */
  maxSpeedMps?: number;
  /** Planned route length. Missing on drives recorded before this field existed. */
  routeLengthM?: number;
};
