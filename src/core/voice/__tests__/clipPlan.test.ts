import { DEFAULT_NOTE_FILTER } from '@/core/pacenotes/filterNotes';
import { makeArc } from '@/core/pacenotes/__fixtures__/builders';
import { derivePaceNotes } from '@/core/pacenotes/pipeline';

import { planRouteClipVariants, planRouteClips } from '../clipPlan';
import { priorityForNote } from '../priority';

describe('planRouteClips', () => {
  it('dedupes texts across the three chainRadius variants', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 35, sweepDeg: 180 }), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      verbosity: 'standard',
    });
    const plan = planRouteClips(notes, {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      verbosity: 'standard',
    });
    expect(plan.uniqueTexts.length).toBeGreaterThan(0);
    expect(new Set(plan.uniqueTexts).size).toBe(plan.uniqueTexts.length);
    expect(plan.estimatedBytes).toBeGreaterThan(0);
  });

  it('records terse phrases that the standard script does not say', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 35, sweepDeg: 180 }), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
    });
    const filter = { ...DEFAULT_NOTE_FILTER, includeStraights: false };
    const terse = planRouteClips(notes, { ...filter, verbosity: 'terse' });
    const prepared = planRouteClipVariants(notes, filter);
    const have = new Set(prepared.uniqueTexts);
    expect(terse.uniqueTexts.length).toBeGreaterThan(0);
    expect(terse.uniqueTexts.every((text) => have.has(text))).toBe(true);
    expect(prepared.uniqueTexts.length).toBeGreaterThan(
      terse.uniqueTexts.length,
    );
  });
});

describe('priorityForNote', () => {
  it('marks grade-1/2 corners urgent and straights as info', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 15, sweepDeg: 180 }), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: true,
    });
    const hairpin = notes.find((n) => n.type === 'corner' && n.grade === 1);
    const straight = notes.find((n) => n.type === 'straight');
    if (hairpin) {
      expect(priorityForNote(hairpin)).toBe('urgent');
    }
    if (straight) {
      expect(priorityForNote(straight)).toBe('info');
    }
  });
});
