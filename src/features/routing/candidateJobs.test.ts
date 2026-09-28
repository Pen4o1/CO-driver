import { loopViaPoints } from './candidateJobs';

describe('loopViaPoints', () => {
  it('closes a four-vertex loop around the start', () => {
    const start = { lat: 42.7, lng: 23.32 };
    const points = loopViaPoints(start, 60_000, 1);
    expect(points).toHaveLength(6);
    expect(points[0]).toEqual(start);
    expect(points[5]).toEqual(start);
  });
});
