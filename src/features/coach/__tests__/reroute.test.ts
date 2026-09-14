import { buildRouteGeometry, destinationPoint } from '@/core/geo';

import { pathChangedMaterially } from '../reroute';

function line(lengthM: number) {
  const start = { lat: 42.7, lng: 23.32 };
  return buildRouteGeometry(
    [
      start,
      destinationPoint(start, 0, lengthM / 2),
      destinationPoint(start, 0, lengthM),
    ],
    null,
  );
}

describe('pathChangedMaterially', () => {
  it('is false for nearly identical polylines', () => {
    const a = line(1000);
    expect(pathChangedMaterially(a, a)).toBe(false);
  });

  it('is true when length jumps more than 15%', () => {
    expect(pathChangedMaterially(line(1000), line(2000))).toBe(true);
  });
});
