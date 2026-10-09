import {
  formatClimbM,
  formatDistanceKm,
  formatDrivenDistance,
  formatDuration,
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

  it('shows how much of the route a drive finished', () => {
    expect(formatDrivenDistance(18200, 24600, 'metric')).toBe('18.2 km · 74%');
    expect(formatDrivenDistance(1609.344, 3218.688, 'imperial')).toBe(
      '1.0 mi · 50%',
    );
    expect(formatDrivenDistance(11000, 10000, 'metric')).toBe('11.0 km · 100%');
    expect(formatDrivenDistance(18200, null, 'metric')).toBe('18.2 km');
  });

  it('formats climb in metres or feet', () => {
    expect(formatClimbM(420, 'metric')).toBe('420 m');
    expect(formatClimbM(420, 'imperial')).toBe('1378 ft');
    expect(formatClimbM(null, 'metric')).toBeNull();
  });

  it('formats duration', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3720)).toBe('1h 2m');
  });

  it('formats speed', () => {
    expect(formatSpeed(27.777, 'metric')).toBe('100 km/h');
    expect(formatSpeed(26.8224, 'imperial')).toBe('60 mph');
  });

  it('converts a mile', () => {
    expect(metresToMiles(1609.344)).toBeCloseTo(1, 6);
  });
});
