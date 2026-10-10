import { buildRouteGeometry, destinationPoint } from '@/core/geo';

import { pathChangedMaterially, usableReroute } from '../reroute';

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

describe('usableReroute', () => {
  it('rejects an empty replacement that would wipe the route', () => {
    expect(
      usableReroute({
        coords: [],
        cumulative: new Float64Array(),
        lengthM: 0,
        bbox: [0, 0, 0, 0],
        elevationM: null,
      }),
    ).toBe(false);
    expect(usableReroute(line(20))).toBe(false);
    expect(usableReroute(line(400))).toBe(true);
  });
});
