import type { NoteModifier, PaceNote, TurnGrade } from '@/core/types';

import { spokenDistanceM } from './distances';

const GRADE_WORD: Record<TurnGrade, string> = {
  1: 'hairpin',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
};

const MODIFIER_TEXT: Record<NoteModifier, string> = {
  tightens: 'tightens',
  opens: 'opens',
  long: 'long',
  short: 'short',
  'dont-cut': "don't cut",
  narrows: 'narrows',
  blind: 'blind',
  bumpy: 'bumpy',
  'over-crest': 'over crest',
  downhill: 'downhill',
  slippery: 'slippery',
};

export function gradeWord(grade: TurnGrade): string {
  return GRADE_WORD[grade];
}

function modifierClause(modifiers: NoteModifier[]): string {
  const parts = modifiers.map((m) => MODIFIER_TEXT[m]);
  return parts.length === 0 ? '' : `, ${parts.join(', ')}`;
}

function cornerPhrase(note: PaceNote): string {
  if (note.junctionInstruction) {
    const dir = note.direction ?? 'left';
    const g = note.grade ? gradeWord(note.grade) : '';
    const head = g === 'hairpin' ? `Hairpin ${dir}` : `${dir} ${g}`.trim();
    return `${head}, ${note.junctionInstruction.toLowerCase()}`;
  }
  const dir = note.direction ?? 'left';
  const g = note.grade ? gradeWord(note.grade) : dir;
  if (g === 'hairpin') {
    return `hairpin ${dir}`;
  }
  return `${dir} ${g}`;
}

function partnerPhrase(partner: PaceNote | undefined): string {
  if (!partner || !partner.direction || !partner.grade) {
    return '';
  }
  const g = gradeWord(partner.grade);
  if (g === 'hairpin') {
    return `hairpin ${partner.direction}`;
  }
  return `${partner.direction} ${g}`;
}

export function spokenFull(note: PaceNote, next?: PaceNote): string {
  const d = spokenDistanceM(note.distanceFromPrevious);
  if (note.type === 'start') {
    const ahead = next ? spokenDistanceM(next.atDistance) : d;
    return ahead > 0 ? `start, first note in ${ahead}` : 'start';
  }
  if (note.type === 'finish') {
    return d > 0 ? `finish, ${d} to go` : 'finish';
  }
  if (note.type === 'straight') {
    return d > 0 ? `In ${d}, long straight` : 'long straight';
  }
  if (note.type === 'junction') {
    const inst = note.junctionInstruction ?? 'junction';
    return d > 0 ? `In ${d}, ${inst}` : inst;
  }
  if (note.type === 'crest') {
    return d > 0 ? `In ${d}, over crest` : 'over crest';
  }
  if (note.type === 'care') {
    return d > 0 ? `In ${d}, care` : 'care';
  }
  const head = d > 0 ? `In ${d}, ${cornerPhrase(note)}` : cornerPhrase(note);
  const mods = note.junctionInstruction ? '' : modifierClause(note.modifiers);
  if (note.chain && next && next.type === 'corner') {
    return `${head}${mods}, ${note.chain} ${partnerPhrase(next)}.`;
  }
  return `${head}${mods}.`;
}

export function spokenShort(note: PaceNote): string {
  const d = spokenDistanceM(note.distanceFromPrevious);
  if (note.type === 'start') {
    return 'start';
  }
  if (note.type === 'finish') {
    return 'finish';
  }
  if (note.type === 'straight') {
    return d > 0 ? `${d}, straight` : 'straight';
  }
  if (note.type === 'junction') {
    return note.junctionInstruction ?? 'junction';
  }
  if (note.type === 'corner' && note.direction && note.grade) {
    const phrase = cornerPhrase(note);
    return d > 0 ? `${d}, ${phrase}.` : `${phrase}.`;
  }
  return note.spokenFull;
}

/** Terse: grade then direction. Used for grade ≥ 5 and verbosity=terse. */
export function spokenTerse(note: PaceNote): string {
  if (note.type === 'corner' && note.direction && note.grade) {
    const g = gradeWord(note.grade);
    if (g === 'hairpin') {
      return `hairpin ${note.direction}`;
    }
    return `${g} ${note.direction}`;
  }
  return spokenShort(note).replace(/\.$/, '');
}

export function applySpoken(
  notes: PaceNote[],
  verbosity: 'full' | 'standard' | 'terse',
): PaceNote[] {
  return notes.map((note, i) => {
    const next = notes[i + 1];
    const full = spokenFull(note, next);
    const short = spokenShort(note);
    const terse = spokenTerse(note);
    return {
      ...note,
      spokenFull: full,
      spokenShort:
        verbosity === 'terse' ? terse : verbosity === 'full' ? full : short,
    };
  });
}
