import { bearingDeg, bearingDeltaDeg } from './bearing';

describe('bearingDeg', () => {
  it('is ~0 heading due north', () => {
    expect(
      bearingDeg({ lat: 42, lng: 23 }, { lat: 42.1, lng: 23 }),
    ).toBeCloseTo(0, 0);
  });

  it('is ~90 heading due east', () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(
      90,
      0,
    );
  });
});

describe('bearingDeltaDeg', () => {
  it('is positive for a right turn', () => {
    expect(bearingDeltaDeg(0, 90)).toBeCloseTo(90, 6);
  });

  it('is negative for a left turn', () => {
    expect(bearingDeltaDeg(0, 270)).toBeCloseTo(-90, 6);
  });

  it('wraps across 0/360', () => {
    expect(bearingDeltaDeg(350, 10)).toBeCloseTo(20, 6);
  });
});
