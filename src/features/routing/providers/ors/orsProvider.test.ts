import { createOrsProvider, orsRequestBody } from './orsProvider';
import { memoryCache } from '@/features/storage/kvCache';
import type { HttpGet } from '../../httpErrors';
import mini from '@/core/__fixtures__/ors-2d-mini.json';

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Awaited<ReturnType<HttpGet>> {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const waypoints = [
  { lat: 42.7, lng: 23.32 },
  { lat: 42.69, lng: 23.33 },
];

describe('createOrsProvider', () => {
  it('maps a fixture body with no network', async () => {
    const fetchImpl: HttpGet = jest.fn(async () => jsonResponse(200, mini));
    const provider = createOrsProvider({
      fetchImpl,
      getApiKey: () => 'test-key',
    });
    const routes = await provider.route({
      waypoints,
      profileId: 'balanced',
    });
    expect(routes).toHaveLength(1);
    expect(routes[0].providerId).toBe('ors');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves the second request from cache', async () => {
    const fetchImpl: HttpGet = jest.fn(async () => jsonResponse(200, mini));
    const provider = createOrsProvider({
      fetchImpl,
      getApiKey: () => 'test-key',
      cache: memoryCache(),
    });
    const req = { waypoints, profileId: 'balanced' as const };
    await provider.route(req);
    await provider.route(req);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws bad-key on 401', async () => {
    const provider = createOrsProvider({
      fetchImpl: async () => jsonResponse(401, { error: 'unauthorized' }),
      getApiKey: () => 'nope',
    });
    await expect(
      provider.route({ waypoints, profileId: 'balanced' }),
    ).rejects.toMatchObject({ code: 'bad-key' });
  });

  it('throws forbidden on 403', async () => {
    const provider = createOrsProvider({
      fetchImpl: async () => jsonResponse(403, { error: 'forbidden' }),
      getApiKey: () => 'key',
    });
    await expect(
      provider.route({ waypoints, profileId: 'balanced' }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('backs off on 429 then succeeds', async () => {
    const fetchImpl: HttpGet = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(429, { error: 'slow down' }, { 'retry-after': '0' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, mini));
    const sleep = jest.fn(async () => undefined);
    const provider = createOrsProvider({
      fetchImpl,
      getApiKey: () => 'key',
      sleep,
      now: () => 0,
    });
    const routes = await provider.route({
      waypoints,
      profileId: 'balanced',
    });
    expect(routes).toHaveLength(1);
    expect(sleep).toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws no-route on 404', async () => {
    const provider = createOrsProvider({
      fetchImpl: async () => jsonResponse(404, { error: 'not found' }),
      getApiKey: () => 'key',
    });
    await expect(
      provider.route({ waypoints, profileId: 'balanced' }),
    ).rejects.toMatchObject({ code: 'no-route' });
  });

  it('throws offline on TypeError', async () => {
    const provider = createOrsProvider({
      fetchImpl: async () => {
        throw new TypeError('Network request failed');
      },
      getApiKey: () => 'key',
    });
    await expect(
      provider.route({ waypoints, profileId: 'balanced' }),
    ).rejects.toMatchObject({ code: 'offline' });
  });

  it('throws bad-key when the env key is missing', async () => {
    const provider = createOrsProvider({
      fetchImpl: async () => jsonResponse(200, mini),
      getApiKey: () => undefined,
    });
    await expect(
      provider.route({ waypoints, profileId: 'balanced' }),
    ).rejects.toMatchObject({ code: 'bad-key' });
  });

  it('nests round_trip and avoid_features under options', () => {
    const body = orsRequestBody({
      waypoints: [{ lat: 42.7, lng: 23.32 }],
      profileId: 'twist',
      providerParams: { avoidFeatures: ['highways', 'tollways'] },
      roundTrip: { lengthM: 60000, points: 4, seed: 2 },
    });
    const options = body.options as {
      avoid_features: string[];
      round_trip: { length: number; points: number; seed: number };
    };
    expect(options.avoid_features).toEqual(['highways', 'tollways']);
    expect(options.round_trip).toEqual({ length: 60000, points: 4, seed: 2 });
    expect(body).not.toHaveProperty('round_trip');
    expect(body).not.toHaveProperty('avoid_features');
    expect(body).not.toHaveProperty('alternative_routes');
  });
});
