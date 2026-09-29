import { appError } from '@/core/errors';
import type { RouteRequest, RoutingProvider } from '@/core/routing';
import { makeCandidate, zigzagLine } from '@/core/scoring/testGeometry';
import type { RouteCandidate } from '@/core/types';

import { generateCandidates } from './generateCandidates';
import { createMockProvider } from './providers/mock/mockProvider';
import { identitySnapper } from './snap/osrmSnapper';

function provider(
  id: string,
  impl: (req: RouteRequest) => Promise<RouteCandidate[]>,
): RoutingProvider {
  return {
    id,
    route: impl,
    match: async (locs) => {
      throw new Error(`match unused ${locs.length}`);
    },
  };
}

describe('generateCandidates loops', () => {
  const start = { lat: 42.7, lng: 23.3 };
  const end = { lat: 42.6, lng: 23.4 };

  it('builds a loop from ORS round_trip and a Valhalla radius search', async () => {
    const ors = provider('ors', async (req) => {
      expect(req.roundTrip?.lengthM).toBe(30_000);
      expect(req.waypoints).toHaveLength(1);
      expect(req.providerParams?.useLivingStreets).toBe(0);
      return [
        makeCandidate({
          id: `loop-${req.roundTrip?.seed ?? 0}`,
          coords: zigzagLine(30_000),
          durationS: 1200,
          providerId: 'ors',
          streetShare: 0.2,
          ascentM: 500,
        }),
      ];
    });
    const valhalla = provider('valhalla', async (req) => {
      expect(req.waypoints.length).toBeGreaterThan(2);
      expect(req.providerParams?.useLivingStreets).toBe(0);
      return [
        makeCandidate({
          id: 'via-loop',
          coords: zigzagLine(20_000, 200),
          durationS: 1400,
          providerId: 'valhalla',
        }),
      ];
    });
    const picked = await generateCandidates(
      {
        start,
        end: null,
        mode: 'loop',
        loopDistanceKm: 30,
        profileId: 'twist',
      },
      { ors, valhalla, snap: identitySnapper() },
    );
    expect(picked.length).toBeGreaterThanOrEqual(1);
  });

  it('still returns a Valhalla radius loop when ORS loops fail', async () => {
    const ors = provider('ors', async () => {
      throw appError('no-route', 'ORS down');
    });
    const valhalla = provider('valhalla', async (req) => {
      expect(req.waypoints.length).toBeGreaterThan(2);
      return [
        makeCandidate({
          id: 'via-loop',
          coords: zigzagLine(40_000),
          durationS: 1500,
          providerId: 'valhalla',
        }),
      ];
    });
    const picked = await generateCandidates(
      {
        start,
        end: null,
        mode: 'loop',
        loopDistanceKm: 60,
        profileId: 'twist',
      },
      { ors, valhalla, snap: identitySnapper() },
    );
    expect(picked.some((c) => c.providerId === 'valhalla')).toBe(true);
  });

  it('drops a city-street loop when a climbing country loop exists', async () => {
    const ors = provider('ors', async (req) => {
      const seed = req.roundTrip?.seed ?? 0;
      if (seed === 1) {
        return [
          makeCandidate({
            id: 'city',
            coords: zigzagLine(8_000, 80),
            durationS: 900,
            providerId: 'ors',
            streetShare: 0.95,
            ascentM: 15,
          }),
        ];
      }
      return [
        makeCandidate({
          id: `country-${seed}`,
          coords: zigzagLine(30_000, 400 + seed * 40),
          durationS: 1800,
          providerId: 'ors',
          streetShare: 0.12,
          ascentM: 720,
        }),
      ];
    });
    const valhalla = provider('valhalla', async () => {
      throw appError('no-route', 'valhalla unused');
    });
    const picked = await generateCandidates(
      {
        start,
        end: null,
        mode: 'loop',
        loopDistanceKm: 60,
        profileId: 'twist',
      },
      { ors, valhalla, snap: identitySnapper() },
    );
    expect(picked.length).toBeGreaterThanOrEqual(1);
    expect(picked.some((c) => c.id.includes('city'))).toBe(false);
    expect(picked.every((c) => (c.roadShares.streetShare ?? 1) < 0.8)).toBe(
      true,
    );
    expect(picked[0]?.roadShares.streetShare).toBe(0.12);
  });

  it('uses mock when preferId is mock', async () => {
    const ors = provider('ors', async () => {
      throw new Error('ors should not run');
    });
    const valhalla = provider('valhalla', async () => {
      throw new Error('valhalla should not run');
    });
    const picked = await generateCandidates(
      { start, end, mode: 'ab', profileId: 'twist', preferId: 'mock' },
      {
        ors,
        valhalla,
        mock: createMockProvider(),
        snap: identitySnapper(),
      },
    );
    expect(picked[0]?.providerId).toBe('mock');
  });
});
