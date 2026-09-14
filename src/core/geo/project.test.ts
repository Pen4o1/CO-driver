import { projectOnPolyline } from './project';

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
