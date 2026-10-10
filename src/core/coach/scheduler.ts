import { priorityForNote } from '@/core/voice';
import { spokenTerse } from '@/core/pacenotes';
import type { NoteFilterOptions, PaceNote, VoiceAction } from '@/core/types';

import { CALL_CATCHUP_M } from './constants';
import { coalesceGroup, groupUtterance } from './coalesce';
import { isFired } from './fired';
import { confirmTriggerM, primaryTriggerM } from './timing';
import type { CallLogEntry, FiredRecord, TimingSettings } from './types';

function crossed(
  previousM: number,
  currentM: number,
  triggerM: number,
): boolean {
  return previousM < triggerM && currentM >= triggerM;
}

/** True when the trigger was crossed, or the player dropped it and we are still at the corner. */
function dueNow(
  previousM: number,
  currentM: number,
  triggerM: number,
  lateM: number,
): boolean {
  if (crossed(previousM, currentM, triggerM)) {
    return true;
  }
  return currentM >= triggerM && currentM <= lateM;
}

export type ScheduledCall = {
  action: VoiceAction;
  log: CallLogEntry;
  records: FiredRecord[];
};

function callableNotes(notes: PaceNote[]): PaceNote[] {
  return notes.filter((note) => note.type !== 'start');
}

/**
 * Notes whose trigger we just crossed. Primary never repeats.
 * Confirms are terse and skipped if the primary fired within confirmGapMs.
 */
export function scheduleCalls(input: {
  notes: PaceNote[];
  previousDistanceM: number;
  distanceAlongM: number;
  speedMps: number;
  nowMs: number;
  fired: Readonly<Record<string, FiredRecord>>;
  timing: TimingSettings;
  filter: Pick<NoteFilterOptions, 'chainRadius' | 'confirmCalls' | 'verbosity'>;
}): ScheduledCall[] {
  const notes = callableNotes(input.notes);
  const out: ScheduledCall[] = [];
  const consumed = new Set<string>();

  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    if (consumed.has(note.id) || isFired(input.fired, note.id, 'primary')) {
      continue;
    }
    const trigger = primaryTriggerM(note, input.speedMps, input.timing);
    const lateM = note.exitDistance + CALL_CATCHUP_M;
    if (
      !dueNow(input.previousDistanceM, input.distanceAlongM, trigger, lateM)
    ) {
      continue;
    }
    const group = coalesceGroup(notes, i, input.filter.chainRadius).filter(
      (item) => !isFired(input.fired, item.id, 'primary'),
    );
    for (const item of group) {
      consumed.add(item.id);
    }
    const text = groupUtterance(group, input.filter.verbosity);
    const head = group[0];
    const atM = input.distanceAlongM;
    const records: FiredRecord[] = group.map((item) => ({
      noteId: item.id,
      kind: 'primary',
      atDistanceM: atM,
      atMs: input.nowMs,
    }));
    out.push({
      action: {
        kind: 'speak',
        noteId: head.id,
        text,
        priority: priorityForNote(head),
        clipId: head.audioClipId,
        coveredNoteIds: group.map((item) => item.id),
      },
      log: {
        noteId: head.id,
        kind: 'primary',
        text,
        atDistanceM: atM,
        atMs: input.nowMs,
      },
      records,
    });
  }

  if (!input.filter.confirmCalls) {
    return out;
  }

  for (const note of notes) {
    if (note.type !== 'corner' || isFired(input.fired, note.id, 'confirm')) {
      continue;
    }
    const primary = input.fired[`${note.id}:primary`];
    if (!primary) {
      continue;
    }
    if (input.nowMs - primary.atMs < input.timing.confirmGapMs) {
      continue;
    }
    const trigger = confirmTriggerM(note, input.timing);
    const lateM = note.exitDistance + CALL_CATCHUP_M;
    if (
      !dueNow(input.previousDistanceM, input.distanceAlongM, trigger, lateM)
    ) {
      continue;
    }
    const text = spokenTerse(note);
    const record: FiredRecord = {
      noteId: note.id,
      kind: 'confirm',
      atDistanceM: input.distanceAlongM,
      atMs: input.nowMs,
    };
    out.push({
      action: {
        kind: 'speak',
        noteId: `${note.id}:confirm`,
        text,
        priority: 'normal',
        coveredNoteIds: [note.id],
      },
      log: {
        noteId: note.id,
        kind: 'confirm',
        text,
        atDistanceM: input.distanceAlongM,
        atMs: input.nowMs,
      },
      records: [record],
    });
  }

  return out;
}
