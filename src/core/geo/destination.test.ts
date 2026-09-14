import { destinationPoint } from './destination';
import { haversineM } from './haversine';

describe('destinationPoint', () => {
  const start = { lat: 42.7, lng: 23.3 };

  it('walks ~1 km north', () => {
    const end = destinationPoint(start, 0, 1000);
    expect(haversineM(start, end)).toBeCloseTo(1000, 0);
    expect(end.lat).toBeGreaterThan(start.lat);
    expect(end.lng).toBeCloseTo(start.lng, 4);
  });

  it('walks east and west back near the start', () => {
    const east = destinationPoint(start, 90, 500);
    const back = destinationPoint(east, 270, 500);
    expect(haversineM(start, back)).toBeLessThan(2);
  });
});
