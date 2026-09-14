import { createMockProvider } from './mockProvider';

describe('createMockProvider', () => {
  const waypoints = [
    { lat: 42.7, lng: 23.32 },
    { lat: 42.69, lng: 23.33 },
  ];

  it('returns one straight-line candidate', async () => {
    const provider = createMockProvider();
    const [candidate] = await provider.route({
      waypoints,
      profileId: 'balanced',
    });
    expect(candidate.providerId).toBe('mock');
    expect(candidate.geometry.coords.length).toBeGreaterThan(1);
    expect(candidate.geometry.elevationM).toBeNull();
  });

  it('match builds geometry from the input points', async () => {
    const provider = createMockProvider();
    const geometry = await provider.match(waypoints);
    expect(geometry.coords).toEqual(waypoints);
  });
});
