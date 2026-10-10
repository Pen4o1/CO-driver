import { buildRouteGeometry, destinationPoint } from './index';
import { projectOnPolyline, projectProgress } from './project';

describe('projectOnPolyline', () => {
  const line = [
    { lat: 42.0, lng: 23.0 },
    { lat: 42.01, lng: 23.0 },
  ];

  it('projects a point on the line to itself', () => {
    const onLine = { lat: 42.005, lng: 23.0 };
    const hit = projectOnPolyline(onLine, line);
    expect(hit.point.lat).toBeCloseTo(42.005, 5);
    expect(hit.crossTrackM).toBeLessThan(1);
    expect(hit.segmentIndex).toBe(0);
  });

  it('reports a non-zero cross-track for an offset point', () => {
    const offset = { lat: 42.005, lng: 23.001 };
    const hit = projectOnPolyline(offset, line);
    expect(hit.crossTrackM).toBeGreaterThan(50);
    expect(hit.distanceAlongM).toBeGreaterThan(0);
  });
});

describe('projectProgress', () => {
  it('stays on the outbound leg when the return leg is closer on the map', () => {
    const start = { lat: 42.7, lng: 23.32 };
    const north = destinationPoint(start, 0, 400);
    const east = destinationPoint(north, 90, 30);
    const south = destinationPoint(east, 180, 400);
    const line = buildRouteGeometry([start, north, east, south], null);
    const onOutbound = destinationPoint(start, 0, 80);
    const towardReturn = destinationPoint(onOutbound, 90, 26);
    const hit = projectProgress({
      point: towardReturn,
      coords: line.coords,
      hintM: 80,
      expectedM: 90,
      backM: 80,
      aheadM: 800,
    });
    expect(hit.distanceAlongM).toBeGreaterThan(50);
    expect(hit.distanceAlongM).toBeLessThan(150);
  });
});
