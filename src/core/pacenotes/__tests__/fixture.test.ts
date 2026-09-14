import sofia from '@/core/__fixtures__/ors-sofia-zlatnite-mostove.json';

import { geometryFromLngLat } from '../__fixtures__/builders';
import { DEFAULT_NOTE_FILTER, filterNotes } from '../filterNotes';
import { derivePaceNotes } from '../pipeline';

function sofiaGeometry() {
  const feature = sofia.features[0];
  return geometryFromLngLat(
    feature.geometry.coordinates as [number, number, number][],
  );
}

function compact(notes: ReturnType<typeof derivePaceNotes>) {
  return notes
    .filter(
      (n) =>
        n.type === 'corner' || n.type === 'straight' || n.type === 'finish',
    )
    .map((n) => ({
      type: n.type,
      dir: n.direction ?? null,
      grade: n.grade ?? null,
      at: Math.round(n.atDistance),
      chain: n.chain,
      short: n.spokenShort,
    }));
}

describe('Sofia → Zlatnite Mostove fixture', () => {
  const geometry = sofiaGeometry();

  it('snapshots the full note list', () => {
    const notes = derivePaceNotes(geometry, [], {
      ...DEFAULT_NOTE_FILTER,
      verbosity: 'standard',
    });
    expect(compact(notes)).toMatchSnapshot();
  });

  it('grade-3 threshold removes only corners looser than 3', () => {
    const all = derivePaceNotes(geometry, [], {
      ...DEFAULT_NOTE_FILTER,
      verbosity: 'standard',
    });
    const filtered = filterNotes(all, {
      ...DEFAULT_NOTE_FILTER,
      minGradeToCall: 3,
      verbosity: 'standard',
    });
    const removed = all.filter(
      (n) => n.type === 'corner' && !filtered.some((f) => f.id === n.id),
    );
    expect(removed.every((n) => (n.grade ?? 0) > 3)).toBe(true);
    expect(
      filtered
        .filter((n) => n.type === 'corner')
        .every((n) => (n.grade ?? 6) <= 3),
    ).toBe(true);
    expect(removed.map((n) => n.spokenShort)).toMatchSnapshot(
      'grade-3-removed',
    );
  });
});
