import type { PaceNote, VoiceAction } from '@/core/types';

export type PlayPriority = 'urgent' | 'normal' | 'info';

/** Hairpins / care / off-route interrupt. Straights and bookends are info. */
export function priorityForNote(note: PaceNote): PlayPriority {
  if (note.type === 'offroute' || note.type === 'care') {
    return 'urgent';
  }
  if (note.type === 'corner' && note.grade !== undefined && note.grade <= 2) {
    return 'urgent';
  }
  if (
    note.type === 'start' ||
    note.type === 'finish' ||
    note.type === 'straight' ||
    note.type === 'info'
  ) {
    return 'info';
  }
  return 'normal';
}

export function priorityFromAction(action: VoiceAction): PlayPriority | null {
  if (action.kind !== 'speak') {
    return null;
  }
  return action.priority;
}
