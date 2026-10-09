import { DEFAULT_TIMING, type TimingSettings } from '@/core/coach';
import {
  filterFromPersisted,
  voiceForRoute,
  type RouteVoiceCard,
} from '@/core/settings';
import { DEFAULT_NOTE_FILTER, derivePaceNotesDetailed } from '@/core/pacenotes';
import type { NoteFilterOptions, PaceNote, RouteCandidate } from '@/core/types';
import { getRoute, getVoicePrepare } from '@/features/storage';
import { clipLookup, type PreparedClip } from '@/features/voice/prepareRoute';
import { useSettings } from '@/state/settings';

export function filterFromSettings(): NoteFilterOptions {
  return filterFromPersisted(useSettings.getState());
}

export function timingFromSettings(): TimingSettings {
  return { ...DEFAULT_TIMING, preset: useSettings.getState().leadPreset };
}

export function voiceForSavedRoute(voiceCard: RouteVoiceCard | null): {
  filter: NoteFilterOptions;
  timing: TimingSettings;
} {
  const voice = voiceForRoute(voiceCard, useSettings.getState());
  return {
    filter: voice.filter,
    timing: { ...DEFAULT_TIMING, preset: voice.leadPreset },
  };
}

export type DriveBundle = {
  name: string;
  candidate: RouteCandidate;
  notes: PaceNote[];
  rawNotes: PaceNote[];
  clips: Map<string, PreparedClip>;
  clipCount: number;
  filter: NoteFilterOptions;
  timing: TimingSettings;
};

export async function loadDriveBundle(
  routeId: string,
): Promise<DriveBundle | null> {
  const row = await getRoute(routeId);
  if (!row) return null;
  const { filter, timing } = voiceForSavedRoute(row.voiceCard);
  const derived = derivePaceNotesDetailed(
    row.candidate.geometry,
    row.candidate.steps,
    filter,
  );
  const prepared = await getVoicePrepare(routeId);
  return {
    name: row.name,
    candidate: row.candidate,
    notes: derived.notes,
    rawNotes: derived.rawNotes,
    clips: prepared ? clipLookup(prepared.clips) : new Map(),
    clipCount: prepared?.clipCount ?? 0,
    filter,
    timing,
  };
}

export { DEFAULT_NOTE_FILTER };
