import { planWaypointVariants } from './waypoints';

describe('planWaypointVariants', () => {
  const start = { lat: 42.7, lng: 23.3 };
  const end = { lat: 42.5, lng: 23.5 };

  it('returns nothing for none or very short hops', () => {
    expect(planWaypointVariants(start, end, 'none')).toEqual([]);
    expect(
      planWaypointVariants(start, { lat: 42.701, lng: 23.301 }, 'aggressive'),
    ).toEqual([]);
  });

  it('returns two corridors for moderate and four for aggressive', () => {
    expect(planWaypointVariants(start, end, 'moderate')).toHaveLength(2);
    expect(planWaypointVariants(start, end, 'aggressive')).toHaveLength(4);
  });
});
