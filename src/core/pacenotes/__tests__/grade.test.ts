import { gradeFromRadiusM } from '@/core/scoring/gradeFromRadius';
import type { TurnGrade } from '@/core/types';

import { makeArc } from '../__fixtures__/builders';
import { gradeCorner } from '../grade';
import { derivePaceNotes } from '../pipeline';
import { DEFAULT_NOTE_FILTER } from '../filterNotes';

const CASES: { radiusM: number; sweepDeg: number; grade: TurnGrade }[] = [
  { radiusM: 15, sweepDeg: 180, grade: 1 },
  { radiusM: 35, sweepDeg: 180, grade: 2 },
  { radiusM: 70, sweepDeg: 120, grade: 3 },
  { radiusM: 130, sweepDeg: 90, grade: 4 },
  { radiusM: 220, sweepDeg: 90, grade: 5 },
  { radiusM: 400, sweepDeg: 45, grade: 6 },
];

describe('grade table (SPEC §5)', () => {
  it.each(CASES)(
    'r=$radiusM m sweep $sweepDeg° → grade $grade',
    ({ radiusM, sweepDeg, grade }) => {
      const notes = derivePaceNotes(makeArc({ radiusM, sweepDeg }), [], {
        ...DEFAULT_NOTE_FILTER,
        includeStraights: false,
        verbosity: 'full',
      });
      const corners = notes.filter((n) => n.type === 'corner');
      expect(corners.length).toBeGreaterThanOrEqual(1);
      const main = corners.reduce((best, n) =>
        Math.abs(n.totalAngleDeg ?? 0) > Math.abs(best.totalAngleDeg ?? 0)
          ? n
          : best,
      );
      expect(main.grade).toBe(grade);
      expect(gradeFromRadiusM(main.radiusM ?? radiusM)).toBeGreaterThanOrEqual(
        grade === 1 ? 1 : grade,
      );
    },
  );

  it('15 m radius sweeping only 45° is NOT a hairpin', () => {
    const notes = derivePaceNotes(
      makeArc({ radiusM: 15, sweepDeg: 45, leadM: 40 }),
      [],
      { ...DEFAULT_NOTE_FILTER, includeStraights: false },
    );
    const corners = notes.filter((n) => n.type === 'corner');
    expect(corners.length).toBeGreaterThanOrEqual(1);
    for (const corner of corners) {
      expect(corner.grade).not.toBe(1);
    }
    const fake = gradeCorner({
      entryIndex: 0,
      exitIndex: 10,
      apexIndex: 5,
      totalAngleDeg: 45,
      radiusM: 15,
      arcLengthM: (15 * (45 * Math.PI)) / 180,
      entryDistance: 40,
      exitDistance: 80,
      apexDistance: 60,
      entryBearingDeg: 0,
      direction: 'right',
      directionConsistency: 1,
      chain: null,
      tightens: false,
      opens: false,
      isLong: false,
      isShort: false,
    });
    expect(fake?.grade).toBe(2);
  });

  it('keeps a wide 15° sweeper the 40 m window misses', () => {
    const notes = derivePaceNotes(
      makeArc({ radiusM: 400, sweepDeg: 15, leadM: 120 }),
      [],
      { ...DEFAULT_NOTE_FILTER, includeStraights: false },
    );
    const corners = notes.filter((n) => n.type === 'corner');
    expect(corners.length).toBeGreaterThanOrEqual(1);
    expect(Math.abs(corners[0].totalAngleDeg ?? 0)).toBeGreaterThanOrEqual(12);
  });

  it('ignores an 8° kink', () => {
    const notes = derivePaceNotes(
      makeArc({ radiusM: 500, sweepDeg: 8, leadM: 80 }),
      [],
      { ...DEFAULT_NOTE_FILTER, includeStraights: false },
    );
    expect(notes.filter((n) => n.type === 'corner')).toHaveLength(0);
  });
});
