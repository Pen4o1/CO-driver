import { makeChicane } from '../__fixtures__/builders';
import { DEFAULT_NOTE_FILTER } from '../filterNotes';
import { derivePaceNotes } from '../pipeline';

describe('chicane chaining', () => {
  it('left-right-left yields 3 corners chained with into', () => {
    const notes = derivePaceNotes(makeChicane(), [], {
      ...DEFAULT_NOTE_FILTER,
      includeStraights: false,
      includeFinish: false,
      verbosity: 'full',
    });
    const corners = notes.filter((n) => n.type === 'corner');
    expect(corners.length).toBe(3);
    expect(corners.map((c) => c.direction)).toEqual(['left', 'right', 'left']);
    expect(corners[0].chain).toBe('into');
    expect(corners[1].chain).toBe('into');
    expect(corners[2].chain).toBeNull();
  });
});
