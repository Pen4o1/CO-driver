import type { PaceNote } from '@/core/types';

import { DEFAULT_NOTE_FILTER, filterNotes } from '../filterNotes';
import { impliedRouterGrade } from '../grade';

function stub(
  partial: Partial<PaceNote> & Pick<PaceNote, 'id' | 'type'>,
): PaceNote {
  return {
    modifiers: [],
    chain: null,
    atDistance: 0,
    entryDistance: 0,
    exitDistance: 0,
    distanceFromPrevious: 0,
    severity: 0,
    spokenFull: '',
    spokenShort: '',
    ...partial,
  };
}

describe('filterNotes extras', () => {
  const notes: PaceNote[] = [
    stub({ id: 's', type: 'start', atDistance: 0 }),
    stub({
      id: 'c',
      type: 'corner',
      grade: 4,
      direction: 'left',
      atDistance: 100,
    }),
    stub({ id: 'cr', type: 'crest', atDistance: 200 }),
    stub({ id: 'ca', type: 'care', atDistance: 250 }),
    stub({ id: 'j', type: 'junction', atDistance: 300 }),
    stub({ id: 'f', type: 'finish', atDistance: 400 }),
  ];

  it('drops crests, care, junctions and finish when toggled off', () => {
    const filtered = filterNotes(notes, {
      ...DEFAULT_NOTE_FILTER,
      minGradeToCall: 3,
      includeCrests: false,
      includeCareNotes: false,
      includeJunctions: false,
      includeFinish: false,
    });
    expect(filtered.map((n) => n.type)).toEqual(['start']);
  });
});

describe('impliedRouterGrade', () => {
  it('maps modifiers to the SPEC table', () => {
    expect(impliedRouterGrade('sharp left')).toBe(2);
    expect(impliedRouterGrade('slight right')).toBe(5);
    expect(impliedRouterGrade('left')).toBe(3.5);
    expect(impliedRouterGrade(undefined)).toBeNull();
  });
});
