import {
  formatDistanceKm,
  formatLengthM,
  formatSpeed,
  metresToMiles,
} from './format';

describe('units', () => {
  it('formats metric and imperial distances', () => {
    expect(formatDistanceKm(12400, 'metric')).toBe('12.4 km');
    expect(formatDistanceKm(1609.344, 'imperial')).toBe('1.0 mi');
    expect(formatLengthM(150, 'metric')).toBe('150 m');
    expect(formatLengthM(91.44, 'imperial')).toBe('100 yd');
  });

  it('formats speed', () => {
    expect(formatSpeed(27.777, 'metric')).toBe('100 km/h');
    expect(formatSpeed(26.8224, 'imperial')).toBe('60 mph');
  });

  it('converts a mile', () => {
    expect(metresToMiles(1609.344)).toBeCloseTo(1, 6);
  });
});
