import { spokenDistanceM } from '../distances';
import { DEFAULT_NOTE_FILTER, filterNotes } from '../filterNotes';
import { makeArc } from '../__fixtures__/builders';
import { derivePaceNotes } from '../pipeline';
import { notesToScript } from '../script';
import { applySpoken } from '../spoken';

describe('spoken distances (undershoot)', () => {
  it('rounds down to 10 m under 100 and 50 m above', () => {
    expect(spokenDistanceM(19)).toBe(10);
    expect(spokenDistanceM(99)).toBe(90);
    expect(spokenDistanceM(149)).toBe(100);
    expect(spokenDistanceM(151)).toBe(150);
  });
});

describe('filterNotes', () => {
  it('recomputes distanceFromPrevious so gaps stay true', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 35, sweepDeg: 180 }), [], {
      ...DEFAULT_NOTE_FILTER,
      verbosity: 'full',
    });
    const filtered = filterNotes(notes, {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      includeFinish: false,
      minGradeToCall: 1,
    });
    for (let i = 1; i < filtered.length; i += 1) {
      expect(filtered[i].distanceFromPrevious).toBeCloseTo(
        filtered[i].atDistance - filtered[i - 1].atDistance,
        5,
      );
    }
  });

  it('verbosity terse uses grade-then-direction', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 70, sweepDeg: 90 }), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      includeFinish: false,
      verbosity: 'terse',
    });
    const corner = notes.find((n) => n.type === 'corner');
    expect(corner?.spokenShort).toMatch(
      /^(three|four|two|five|six) (left|right)$/,
    );
  });
});

describe('notesToScript', () => {
  it('keeps utterances at or under ~12 words', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 35, sweepDeg: 180 }), [], {
      ...DEFAULT_NOTE_FILTER,
      verbosity: 'standard',
    });
    const script = notesToScript(notes, {
      verbosity: 'standard',
      chainRadius: 60,
    });
    for (const utterance of script) {
      const words = utterance.text.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(14);
    }
  });
});

describe('applySpoken grammar', () => {
  it('full form starts with In <distance>', () => {
    const notes = derivePaceNotes(makeArc({ radiusM: 35, sweepDeg: 180 }), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      verbosity: 'full',
    });
    const corner = notes.find((n) => n.type === 'corner');
    expect(corner?.spokenFull).toMatch(/^In \d+, (left|right) /);
    const [spoken] = applySpoken(notes, 'standard').filter(
      (n) => n.type === 'corner',
    );
    expect(spoken.spokenShort).toMatch(/^\d+, (left|right) /);
  });
});
