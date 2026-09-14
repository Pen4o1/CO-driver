import { generateCandidates } from './generateCandidates';
import { identitySnapper } from './snap/osrmSnapper';
import type { RouteRequest, RoutingProvider } from '@/core/routing';
import {
  makeCandidate,
  straightLine,
  zigzagLine,
} from '@/core/scoring/testGeometry';
import type { RouteCandidate } from '@/core/types';

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

describe('generateCandidates', () => {
  const start = { lat: 42.7, lng: 23.3 };
  const end = { lat: 42.6, lng: 23.4 };

  it('returns up to 3 ranked candidates plus fastest fallback', async () => {
    const ors = provider('ors', async (req) => {
      if (req.waypoints.length > 2) {
        return [
          makeCandidate({
            id: 'via',
            coords: zigzagLine(12_000),
            durationS: 900,
            providerId: 'ors',
          }),
        ];
      }
      return [
        makeCandidate({
          id: 'fast',
          coords: straightLine(10_000),
          durationS: 400,
          providerId: 'ors',
          motorwayShare: 1,
        }),
        makeCandidate({
          id: 'alt',
          coords: zigzagLine(11_000),
          durationS: 520,
          providerId: 'ors',
          motorwayShare: 0,
        }),
      ];
    });
    const valhalla = provider('valhalla', async () => [
      makeCandidate({
        id: 'twist',
        coords: zigzagLine(13_000, 80),
        durationS: 640,
        providerId: 'valhalla',
        motorwayShare: 0,
      }),
    ]);

    const picked = await generateCandidates(
      { start, end, mode: 'ab', profileId: 'twist' },
      { ors, valhalla, snap: identitySnapper() },
    );
    expect(picked.length).toBeGreaterThanOrEqual(2);
    expect(picked.length).toBeLessThanOrEqual(4);
    const scores = picked.map((c) => c.breakdown.score);
    expect(Math.max(...scores)).toBeGreaterThan(0);
  });
});
