import type { NoteModifier, PaceNote } from '@/core/types';

import type { JunctionHit } from './mergeJunctions';
import type { GradedCorner, StraightRun } from './types';

function modifiersOf(corner: GradedCorner): NoteModifier[] {
  const mods: NoteModifier[] = [];
  if (corner.tightens) mods.push('tightens');
  if (corner.opens) mods.push('opens');
  if (corner.isLong) mods.push('long');
  if (corner.isShort) mods.push('short');
  if (corner.grade <= 2) mods.push('dont-cut');
  return mods;
}

function noteId(
  type: PaceNote['type'],
  atDistance: number,
  extra: string,
): string {
  return `pn:${type}:${Math.round(atDistance)}:${extra}`;
}

function withGap(prevAt: number, atDistance: number): number {
  return Math.max(0, atDistance - prevAt);
}

/**
 * Ordered notes. atDistance is the APEX (corners) or midpoint (straights).
 * Spoken text is filled later by applySpoken so filtering can re-run it.
 */
export function buildNotes(
  corners: GradedCorner[],
  straights: StraightRun[],
  junctions: JunctionHit[],
  routeLengthM: number,
): PaceNote[] {
  type Draft = Omit<
    PaceNote,
    'distanceFromPrevious' | 'spokenFull' | 'spokenShort'
  > & { sortKey: number };

  const drafts: Draft[] = [
    {
      id: noteId('start', 0, 's'),
      type: 'start',
      modifiers: [],
      chain: null,
      atDistance: 0,
      entryDistance: 0,
      exitDistance: 0,
      severity: 0,
      sortKey: 0,
    },
  ];

  for (const corner of corners) {
    drafts.push({
      id: noteId(
        'corner',
        corner.apexDistance,
        `${corner.direction}${corner.grade}`,
      ),
      type: 'corner',
      direction: corner.direction,
      grade: corner.grade,
      modifiers: modifiersOf(corner),
      chain: corner.chain,
      atDistance: corner.apexDistance,
      entryDistance: corner.entryDistance,
      exitDistance: corner.exitDistance,
      radiusM: corner.radiusM,
      totalAngleDeg: corner.totalAngleDeg,
      arcLengthM: corner.arcLengthM,
      severity: corner.severity,
      roadName: corner.roadName,
      junctionInstruction: corner.junctionInstruction,
      sortKey: corner.apexDistance,
    });
  }

  for (const run of straights) {
    drafts.push({
      id: noteId('straight', run.midDistance, 'st'),
      type: 'straight',
      direction: 'straight',
      modifiers: ['long'],
      chain: null,
      atDistance: run.midDistance,
      entryDistance: run.entryDistance,
      exitDistance: run.exitDistance,
      totalAngleDeg: run.netAngleDeg,
      arcLengthM: run.exitDistance - run.entryDistance,
      severity: 0.1,
      sortKey: run.midDistance,
    });
  }

  for (const hit of junctions) {
    drafts.push({
      id: noteId('junction', hit.atDistance, 'j'),
      type: 'junction',
      modifiers: [],
      chain: null,
      atDistance: hit.atDistance,
      entryDistance: hit.atDistance,
      exitDistance: hit.atDistance,
      severity: 0.4,
      roadName: hit.roadName,
      junctionInstruction: hit.instruction,
      sortKey: hit.atDistance,
    });
  }

  drafts.push({
    id: noteId('finish', routeLengthM, 'f'),
    type: 'finish',
    modifiers: [],
    chain: null,
    atDistance: routeLengthM,
    entryDistance: routeLengthM,
    exitDistance: routeLengthM,
    severity: 0,
    sortKey: routeLengthM,
  });

  drafts.sort((a, b) => a.sortKey - b.sortKey || a.type.localeCompare(b.type));

  const notes: PaceNote[] = [];
  let prevAt = 0;
  for (const draft of drafts) {
    const { sortKey: _sortKey, ...rest } = draft;
    void _sortKey;
    notes.push({
      ...rest,
      distanceFromPrevious: withGap(prevAt, draft.atDistance),
      spokenFull: '',
      spokenShort: '',
    });
    prevAt = draft.atDistance;
  }
  return notes;
}

export function recomputeGaps(notes: PaceNote[]): PaceNote[] {
  let prevAt = 0;
  return notes.map((note, index) => {
    const distanceFromPrevious =
      index === 0 ? 0 : Math.max(0, note.atDistance - prevAt);
    prevAt = note.atDistance;
    return { ...note, distanceFromPrevious };
  });
}
