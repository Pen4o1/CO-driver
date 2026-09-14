import { geoFixFromLocation, gpsBand } from '../geoFix';

describe('geoFixFromLocation', () => {
  it('maps expo location and treats negative speed as 0', () => {
    const fix = geoFixFromLocation({
      timestamp: 1000,
      coords: {
        latitude: 42.7,
        longitude: 23.32,
        altitude: 0,
        accuracy: 8,
        altitudeAccuracy: 1,
        heading: 90,
        speed: -1,
      },
    });
    expect(fix.speedMps).toBe(0);
    expect(fix.headingDeg).toBe(90);
    expect(gpsBand(8)).toBe('good');
    expect(gpsBand(20)).toBe('ok');
    expect(gpsBand(40)).toBe('poor');
  });
});
