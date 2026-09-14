import { createValhallaProvider } from './valhallaProvider';
import valhalla from '@/core/__fixtures__/valhalla-sofia-zlatnite-mostove.json';
import type { HttpGet } from '../../httpErrors';

function jsonResponse(
  status: number,
  body: unknown,
): Awaited<ReturnType<HttpGet>> {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('createValhallaProvider', () => {
  const waypoints = [
    { lat: 42.6977, lng: 23.3219 },
    { lat: 42.6187, lng: 23.2483 },
  ];

  it('maps a fixture body with no network', async () => {
    const fetchImpl: HttpGet = jest.fn(async () => jsonResponse(200, valhalla));
    const provider = createValhallaProvider({ fetchImpl });
    const routes = await provider.route({
      waypoints,
      profileId: 'twist',
      providerParams: { useHighways: 0, useTrails: 0.9 },
      alternatives: true,
    });
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0].providerId).toBe('valhalla');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      (fetchImpl as jest.Mock).mock.calls[0][1].body as string,
    ) as { costing: string; alternates: number };
    expect(body.costing).toBe('motorcycle');
    expect(body.alternates).toBe(2);
  });
});
