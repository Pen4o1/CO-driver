import { overlapShare } from './overlap';

describe('overlapShare', () => {
  const a = [
    { lat: 42.0, lng: 23.0 },
    { lat: 42.001, lng: 23.0 },
    { lat: 42.002, lng: 23.0 },
  ];

  it('is 1 for identical polylines', () => {
    expect(overlapShare(a, a, 50)).toBe(1);
  });

  it('is low for a far-away copy', () => {
    const b = a.map((p) => ({ lat: p.lat, lng: p.lng + 0.05 }));
    expect(overlapShare(a, b, 50)).toBe(0);
  });
});
