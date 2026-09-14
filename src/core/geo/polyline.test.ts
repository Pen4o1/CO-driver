import { cumulativeDistancesM, polylineLengthM } from './cumulative';
import { pointAtDistance, resamplePolyline } from './interpolate';

const line = [
  { lat: 42.0, lng: 23.0 },
  { lat: 42.001, lng: 23.0 },
  { lat: 42.002, lng: 23.0 },
];

describe('cumulativeDistancesM', () => {
  it('starts at 0 and is monotonic', () => {
    const cum = cumulativeDistancesM(line);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]);
    expect(polylineLengthM(cum)).toBe(cum[2]);
  });
});

describe('pointAtDistance', () => {
  it('returns the start at 0', () => {
    expect(pointAtDistance(line, 0)).toEqual(line[0]);
  });

  it('returns the end past the length', () => {
    const cum = cumulativeDistancesM(line);
    expect(pointAtDistance(line, polylineLengthM(cum) + 100, cum)).toEqual(
      line[2],
    );
  });

  it('lands on the middle vertex at its cumulative distance', () => {
    const cum = cumulativeDistancesM(line);
    const mid = pointAtDistance(line, cum[1], cum);
    expect(mid.lat).toBeCloseTo(line[1].lat, 8);
    expect(mid.lng).toBeCloseTo(line[1].lng, 8);
  });
});

describe('resamplePolyline', () => {
  it('keeps start and end', () => {
    const resampled = resamplePolyline(line, 20);
    expect(resampled[0]).toEqual(line[0]);
    expect(resampled[resampled.length - 1]).toEqual(line[2]);
    expect(resampled.length).toBeGreaterThan(2);
  });
});
