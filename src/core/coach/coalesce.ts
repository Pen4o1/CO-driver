import { notesToScript, spokenTerse } from '@/core/pacenotes';
import type { NoteFilterOptions, PaceNote } from '@/core/types';

/** Consecutive notes within chainRadius (or already chained) speak as one clip. */
export function coalesceGroup(
  notes: PaceNote[],
  startIndex: number,
  chainRadius: number,
): PaceNote[] {
  const first = notes[startIndex];
  if (!first) {
    return [];
  }
  const group = [first];
  for (let i = startIndex + 1; i < notes.length; i += 1) {
    const note = notes[i];
    const prev = group[group.length - 1];
    const gap = note.atDistance - first.atDistance;
    const chained = Boolean(prev.chain) || gap <= chainRadius;
    if (!chained) {
      break;
    }
    group.push(note);
  }
  return group;
}

export function groupUtterance(
  group: PaceNote[],
  verbosity: NoteFilterOptions['verbosity'],
): string {
  if (group.length === 0) {
    return '';
  }
  if (group.length === 1) {
    const note = group[0];
    if (verbosity === 'terse') {
      return spokenTerse(note);
    }
    return verbosity === 'full' ? note.spokenFull : note.spokenShort;
  }
  const script = notesToScript(group, {
    verbosity,
    chainRadius: Number.POSITIVE_INFINITY,
  });
  return script[0]?.text ?? group.map((n) => n.spokenShort).join(' ');
}
