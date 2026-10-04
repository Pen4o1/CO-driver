import { clamp } from '@/core/geo';
import type { LeadTimePreset, PaceNote } from '@/core/types';

import {
  LEAD_SECONDS_FAST,
  LEAD_SECONDS_MEDIUM,
  LEAD_SECONDS_OTHER,
  LEAD_SECONDS_TIGHT,
  MAX_LEAD_M,
  MIN_LEAD_M,
} from './constants';
import type { TimingSettings } from './types';

export const PRESET_SCALE: Record<LeadTimePreset, number> = {
  early: 1.25,
  normal: 1.0,
  late: 0.8,
};

export const DEFAULT_TIMING: TimingSettings = {
  preset: 'normal',
  minLeadM: MIN_LEAD_M,
  maxLeadM: MAX_LEAD_M,
  confirmLeadM: 40,
  confirmGapMs: 3000,
  lookAheadS: 8,
};

/** Seconds of warning before the apex, by grade / note type. */
export function leadSeconds(note: PaceNote): number {
  if (note.grade === 1 || note.grade === 2) {
    return LEAD_SECONDS_TIGHT;
  }
  if (note.grade === 3 || note.grade === 4) {
    return LEAD_SECONDS_MEDIUM;
  }
  if (note.grade === 5 || note.grade === 6) {
    return LEAD_SECONDS_FAST;
  }
  return LEAD_SECONDS_OTHER;
}

/**
 * Lead distance in whole metres.
 * Assumption: round-to-nearest so 100 km/h × 5 s = 139 m (SPEC acceptance).
 */
export function leadDistanceM(
  note: PaceNote,
  speedMps: number,
  timing: TimingSettings = DEFAULT_TIMING,
): number {
  const raw = speedMps * leadSeconds(note) * PRESET_SCALE[timing.preset];
  return clamp(Math.round(raw), timing.minLeadM, timing.maxLeadM);
}

/**
 * Where the warning is measured to.
 * Corners use the entry: braking has to be done before the road starts to turn.
 * Other notes use their own point (apex, midpoint, or junction).
 */
export function warningAnchorM(note: PaceNote): number {
  if (note.type === 'corner') {
    return note.entryDistance;
  }
  return note.atDistance;
}

export function primaryTriggerM(
  note: PaceNote,
  speedMps: number,
  timing: TimingSettings = DEFAULT_TIMING,
): number {
  return warningAnchorM(note) - leadDistanceM(note, speedMps, timing);
}

export function confirmTriggerM(
  note: PaceNote,
  timing: TimingSettings = DEFAULT_TIMING,
): number {
  return warningAnchorM(note) - timing.confirmLeadM;
}
