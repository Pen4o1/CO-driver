import type { NoteFilterOptions, PaceNote } from '@/core/types';

import { CHAIN_INTO_M, CHAIN_THEN_M } from './constants';
import { recomputeGaps } from './buildNotes';
import { applySpoken } from './spoken';

export const DEFAULT_NOTE_FILTER: NoteFilterOptions = {
  minGradeToCall: 6,
  includeJunctions: true,
  includeCrests: true,
  includeStraights: true,
  includeCareNotes: true,
  includeFinish: true,
  verbosity: 'standard',
  chainRadius: 60,
  confirmCalls: true,
};

function keepNote(note: PaceNote, options: NoteFilterOptions): boolean {
  switch (note.type) {
    case 'start':
      return true;
    case 'finish':
      return options.includeFinish;
    case 'straight':
      return options.includeStraights;
    case 'junction':
      return options.includeJunctions;
    case 'crest':
    case 'jump':
      return options.includeCrests;
    case 'care':
      return options.includeCareNotes;
    case 'corner':
      return note.grade !== undefined && note.grade <= options.minGradeToCall;
    default:
      return false;
  }
}

function rechain(notes: PaceNote[]): PaceNote[] {
  return notes.map((note, i) => {
    if (note.type !== 'corner') {
      return { ...note, chain: null };
    }
    const next = notes.slice(i + 1).find((n) => n.type === 'corner');
    if (!next) {
      return { ...note, chain: null };
    }
    const gap = next.entryDistance - note.exitDistance;
    if (gap < CHAIN_INTO_M) {
      return {
        ...note,
        chain: note.direction !== next.direction ? 'into' : 'and',
      };
    }
    if (gap < CHAIN_THEN_M) {
      return { ...note, chain: 'then' };
    }
    return { ...note, chain: null };
  });
}

/**
 * Filter without breaking distance continuity.
 *
 * Assumption: minGradeToCall keeps corners with grade <= N.
 * Grade 1 is tightest, so 1 = hairpins only and 6 = call everything.
 * (SPEC's "1 = call everything" comment contradicts the grade table.)
 */
export function filterNotes(
  notes: PaceNote[],
  options: NoteFilterOptions,
): PaceNote[] {
  const kept = notes.filter((note) => keepNote(note, options));
  const chained = rechain(kept);
  const gapped = recomputeGaps(chained);
  return applySpoken(gapped, options.verbosity);
}
