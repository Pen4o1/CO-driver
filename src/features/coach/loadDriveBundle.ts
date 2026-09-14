import { DEFAULT_NOTE_FILTER, derivePaceNotesDetailed } from '@/core/pacenotes';
import { DEFAULT_TIMING, type TimingSettings } from '@/core/coach';
import type { NoteFilterOptions, PaceNote, RouteCandidate } from '@/core/types';
import { getRoute, getVoicePrepare } from '@/features/storage';
import { clipLookup, type PreparedClip } from '@/features/voice/prepareRoute';
import { useSettings } from '@/state/settings';

export function filterFromSettings(): NoteFilterOptions {
  const s = useSettings.getState();
  return {
    ...DEFAULT_NOTE_FILTER,
    confirmCalls: s.confirmCalls,
    chainRadius: s.chainRadius,
    minGradeToCall: s.minGradeToCall,
  };
}

export function timingFromSettings(): TimingSettings {
  return { ...DEFAULT_TIMING, preset: useSettings.getState().leadPreset };
}

export type DriveBundle = {
  name: string;
  candidate: RouteCandidate;
  notes: PaceNote[];
  rawNotes: PaceNote[];
  clips: Map<string, PreparedClip>;
  clipCount: number;
};

export async function loadDriveBundle(
  routeId: string,
  filter: NoteFilterOptions = filterFromSettings(),
): Promise<DriveBundle | null> {
  const row = await getRoute(routeId);
  if (!row) return null;
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
  };
}
