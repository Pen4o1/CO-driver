import type { GeoFix, PaceNote, VoiceAction } from '@/core/types';
import { priorityForNote } from '@/core/voice';

import { leadDistanceM, primaryTriggerM } from './timing';
import type {
  EngineOutputStatus,
  EngineState,
  TimingSettings,
  UpcomingCall,
} from './types';

export function outputStatus(state: EngineState): EngineOutputStatus {
  if (state.paused) return 'paused';
  if (state.status === 'finished') return 'finished';
  if (state.status === 'off-route') return 'off-route';
  return 'on-route';
}

export function effectiveSpeed(
  state: EngineState,
  fix: GeoFix,
  nowMs: number,
): number {
  if (fix.speedMps >= 0.5) {
    return fix.speedMps;
  }
  const prev = state.lastFix;
  if (!prev) {
    return state.speedMps > 0 ? state.speedMps : 13.9;
  }
  const dtS = (nowMs - prev.timestampMs) / 1000;
  if (dtS <= 0.05) {
    return state.speedMps > 0 ? state.speedMps : 13.9;
  }
  return Math.abs(state.distanceAlongM - state.previousDistanceAlongM) / dtS;
}

export function upcomingCalls(
  notes: PaceNote[],
  distanceAlongM: number,
  speedMps: number,
  timing: TimingSettings,
  fired: EngineState['fired'],
): UpcomingCall[] {
  const horizon =
    distanceAlongM + speedMps * timing.lookAheadS + timing.maxLeadM;
  const out: UpcomingCall[] = [];
  for (const note of notes) {
    if (note.type === 'start' || fired[`${note.id}:primary`]) {
      continue;
    }
    if (note.atDistance > horizon) {
      continue;
    }
    const trigger = primaryTriggerM(note, speedMps, timing);
    out.push({
      noteId: note.id,
      kind: 'primary',
      fireInM: trigger - distanceAlongM,
      atDistance: note.atDistance,
    });
  }
  out.sort((a, b) => a.fireInM - b.fireInM);
  return out.slice(0, 3);
}

export function nextNotes(
  notes: PaceNote[],
  distanceAlongM: number,
): PaceNote[] {
  return notes
    .filter((n) => n.type !== 'start' && n.atDistance >= distanceAlongM)
    .slice(0, 3);
}

export function startAction(note: PaceNote | undefined): VoiceAction[] {
  if (!note || note.type !== 'start') {
    return [];
  }
  return [
    {
      kind: 'speak',
      noteId: note.id,
      text: note.spokenShort || note.spokenFull,
      priority: priorityForNote(note),
    },
  ];
}

export function leadForFirstCorner(
  notes: PaceNote[],
  speedMps: number,
  timing: TimingSettings,
): number {
  const first = notes.find((n) => n.type === 'corner');
  return first ? leadDistanceM(first, speedMps, timing) : 0;
}
