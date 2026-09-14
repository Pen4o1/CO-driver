import { frechetDistanceM } from './frechet';

describe('frechetDistanceM', () => {
  const a = [
    { lat: 42.0, lng: 23.0 },
    { lat: 42.01, lng: 23.0 },
  ];

  it('is 0 for identical polylines', () => {
    expect(frechetDistanceM(a, a)).toBe(0);
  });

  it('matches the offset for two parallel copies', () => {
    const b = [
      { lat: 42.0, lng: 23.001 },
      { lat: 42.01, lng: 23.001 },
    ];
    const d = frechetDistanceM(a, b);
    expect(d).toBeGreaterThan(70);
    expect(d).toBeLessThan(120);
  });
});
