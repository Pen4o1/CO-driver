import type { NoteFilterOptions, PaceNote } from '@/core/types';

import { SCRIPT_MAX_NOTES, SCRIPT_MAX_WORDS } from './constants';
import { DEFAULT_NOTE_FILTER } from './filterNotes';
import type { Utterance } from './types';

function spoken(
  note: PaceNote,
  verbosity: NoteFilterOptions['verbosity'],
): string {
  if (verbosity === 'full') {
    return note.spokenFull;
  }
  return note.spokenShort;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Group consecutive notes into utterances of at most ~12 words / 3 notes.
 * Notes closer than chainRadius merge. Geometric `into` chains always merge.
 */
export function notesToScript(
  notes: PaceNote[],
  options: Partial<NoteFilterOptions> = {},
): Utterance[] {
  const verbosity = options.verbosity ?? DEFAULT_NOTE_FILTER.verbosity;
  const chainRadius = options.chainRadius ?? DEFAULT_NOTE_FILTER.chainRadius;
  const callables = notes.filter((n) => n.type !== 'start');
  const utterances: Utterance[] = [];

  let bucket: PaceNote[] = [];
  let texts: string[] = [];

  const flush = () => {
    if (bucket.length === 0) {
      return;
    }
    utterances.push({
      text: texts.join(' ').replace(/\s+/g, ' ').trim(),
      noteIds: bucket.map((n) => n.id),
      atDistance: bucket[0].atDistance,
    });
    bucket = [];
    texts = [];
  };

  for (let i = 0; i < callables.length; i += 1) {
    const note = callables[i];
    const text = spoken(note, verbosity).replace(/\.$/, '');
    const prev = bucket[bucket.length - 1];
    const chained =
      Boolean(prev && prev.chain) ||
      Boolean(prev && note.atDistance - prev.atDistance <= chainRadius);
    const wouldWords = wordCount([...texts, text].join(' '));
    const wouldNotes = bucket.length + 1;
    const overflow =
      bucket.length > 0 &&
      (!chained ||
        wouldWords > SCRIPT_MAX_WORDS ||
        wouldNotes > SCRIPT_MAX_NOTES);
    if (overflow) {
      flush();
    }
    bucket.push(note);
    texts.push(text);
  }
  flush();
  return utterances;
}
