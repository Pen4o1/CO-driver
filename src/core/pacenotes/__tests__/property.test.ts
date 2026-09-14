import { resampleCentreline } from '../resample';
import { makeArc, makeClosedCircle } from '../__fixtures__/builders';
import { DEFAULT_NOTE_FILTER } from '../filterNotes';
import { derivePaceNotes } from '../pipeline';

describe('property: detection does not invent turning', () => {
  it('a closed circle totals about 360° of corner angle', () => {
    const notes = derivePaceNotes(makeClosedCircle(40), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      includeFinish: false,
    });
    const corners = notes.filter((n) => n.type === 'corner');
    const sum = corners.reduce(
      (acc, n) => acc + Math.abs(n.totalAngleDeg ?? 0),
      0,
    );
    expect(sum).toBeGreaterThan(300);
    expect(sum).toBeLessThan(420);
  });

  it('corner + straight angles cover most of the centreline turning', () => {
    const geometry = makeArc({ radiusM: 70, sweepDeg: 120 });
    const line = resampleCentreline(geometry);
    let total = 0;
    for (let i = 0; i < line.dThetaDeg.length; i += 1) {
      total += Math.abs(line.dThetaDeg[i]);
    }
    const notes = derivePaceNotes(geometry, [], DEFAULT_NOTE_FILTER);
    const accounted = notes
      .filter((n) => n.type === 'corner' || n.type === 'straight')
      .reduce((acc, n) => acc + Math.abs(n.totalAngleDeg ?? 0), 0);
    expect(accounted).toBeGreaterThan(total * 0.7);
    expect(accounted).toBeLessThan(total * 1.25 + 15);
  });
});
