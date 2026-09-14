import { haversineM } from './haversine';

describe('haversineM', () => {
  it('returns 0 for the same point', () => {
    const p = { lat: 42.6977, lng: 23.3219 };
    expect(haversineM(p, p)).toBe(0);
  });

  it('is about 111.32 km per degree of latitude', () => {
    const a = { lat: 42, lng: 23 };
    const b = { lat: 43, lng: 23 };
    expect(haversineM(a, b) / 1000).toBeCloseTo(111.2, 0);
  });

  it('is symmetric', () => {
    const a = { lat: 42.6977, lng: 23.3219 };
    const b = { lat: 42.6187, lng: 23.2483 };
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6);
  });
});
