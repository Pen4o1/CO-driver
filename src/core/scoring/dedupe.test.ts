import { makeCandidate, straightLine, zigzagLine } from './testGeometry';
import { dedupeCandidates, sameRoad } from './dedupe';

describe('dedupeCandidates', () => {
  it('treats a copy of the same polyline as the same road', () => {
    const a = makeCandidate({
      id: 'a',
      coords: straightLine(5000),
      durationS: 400,
    });
    const b = makeCandidate({
      id: 'b',
      coords: straightLine(5000),
      durationS: 380,
    });
    expect(sameRoad(a, b)).toBe(true);
    const kept = dedupeCandidates([a, b]);
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe('b');
  });

  it('keeps geometrically different roads', () => {
    const a = makeCandidate({
      id: 'a',
      coords: straightLine(8000),
      durationS: 400,
    });
    const b = makeCandidate({
      id: 'b',
      coords: zigzagLine(8000).map((p) => ({
        lat: p.lat + 0.2,
        lng: p.lng + 0.2,
      })),
      durationS: 500,
    });
    expect(sameRoad(a, b)).toBe(false);
    expect(dedupeCandidates([a, b])).toHaveLength(2);
  });
});
