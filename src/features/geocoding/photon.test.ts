import { searchPhoton } from './photon';
import photonSofia from '@/core/__fixtures__/photon-sofia.json';
import { memoryCache } from '@/features/storage/kvCache';

describe('searchPhoton', () => {
  it('parses a committed Photon fixture with no network on cache hit', async () => {
    const cache = memoryCache();
    await cache.set('unused', JSON.stringify(photonSofia));
    const fetchImpl = jest.fn(async () => ({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => photonSofia,
      text: async () => JSON.stringify(photonSofia),
    }));
    const result = await searchPhoton('Sofia', { fetchImpl, cache });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value[0]?.label).toContain('Sofia');
    expect(result.value[0]?.lat).toBeCloseTo(42.6977, 3);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const again = await searchPhoton('Sofia', { fetchImpl, cache });
    expect(again.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
