import { destinationPoint } from '@/core/geo';

import { mulberry32 } from '../rng';
import { syntheticFix } from '../simulate';
import { straightGeometry } from './helpers';

describe('synthetic GPS', () => {
  it('stays near the polyline with ±5 m noise', () => {
    const geometry = straightGeometry(1000);
    const rng = mulberry32(1);
    const { fix } = syntheticFix({
      geometry,
      distanceAlongM: 200,
      speedMps: 20,
      nowMs: 1000,
      lastHeadingDeg: null,
      lateralOffsetM: 0,
      rng,
    });
    const on = destinationPoint({ lat: 42.7, lng: 23.32 }, 0, 200);
    const dLat = (fix.lat - on.lat) * 111_320;
    const dLng =
      (fix.lng - on.lng) * 111_320 * Math.cos((on.lat * Math.PI) / 180);
    const offset = Math.hypot(dLat, dLng);
    expect(offset).toBeLessThan(8);
    expect(fix.speedMps).toBe(20);
  });

  it('applies a 60 m lateral offset for off-route sim', () => {
    const geometry = straightGeometry(1000);
    const rng = () => 0.5;
    const { fix } = syntheticFix({
      geometry,
      distanceAlongM: 200,
      speedMps: 20,
      nowMs: 1000,
      lastHeadingDeg: 0,
      lateralOffsetM: 60,
      rng,
      accuracyM: 5,
    });
    const on = destinationPoint({ lat: 42.7, lng: 23.32 }, 0, 200);
    const dLat = (fix.lat - on.lat) * 111_320;
    const dLng =
      (fix.lng - on.lng) * 111_320 * Math.cos((on.lat * Math.PI) / 180);
    expect(Math.hypot(dLat, dLng)).toBeGreaterThan(50);
    expect(fix.headingDeg).toBe(0);
  });
});
