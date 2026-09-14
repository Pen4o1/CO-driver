import valhalla from '@/core/__fixtures__/valhalla-sofia-zlatnite-mostove.json';

import { decodePolyline } from './polyline6';

describe('decodePolyline', () => {
  it('decodes the Sofia Valhalla fixture near the start pin', () => {
    const shape = (
      valhalla as {
        trip: { legs: { shape: string }[] };
      }
    ).trip.legs[0].shape;
    const coords = decodePolyline(shape, 1e6);
    expect(coords.length).toBeGreaterThan(50);
    expect(coords[0].lat).toBeCloseTo(42.6977, 3);
    expect(coords[0].lng).toBeCloseTo(23.3219, 3);
  });
});
