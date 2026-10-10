import photonSofia from '@/core/__fixtures__/photon-sofia.json';
import { memoryCache } from '@/features/storage/kvCache';

import { clearPhotonHotCache, searchPhoton } from './photon';

const sofia = { lat: 42.6977, lng: 23.3219 };

function jsonResponse(body: unknown) {
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('searchPhoton', () => {
  beforeEach(() => {
    clearPhotonHotCache();
  });

  it('parses a committed Photon fixture and skips the network on cache hit', async () => {
    const cache = memoryCache();
    const fetchImpl = jest.fn(async () => jsonResponse(photonSofia));
    const result = await searchPhoton('Sofia', { fetchImpl, cache });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.label).toBe('Sofia, Bulgaria');
    expect(result.value[0]?.kind).toBe('City');
    expect(result.value[0]?.lat).toBeCloseTo(42.6977, 3);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const again = await searchPhoton('Sofia', { fetchImpl, cache });
    expect(again.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not call the network for a tiny query', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(photonSofia));
    const result = await searchPhoton('ул', { fetchImpl });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('searches the street, biased nearby, and drops unsupported languages', async () => {
    let requested = '';
    const fetchImpl = jest.fn(async (url: string) => {
      requested = url;
      return jsonResponse(photonSofia);
    });
    await searchPhoton(
      'ул. Витоша 15',
      { fetchImpl },
      { bias: sofia, lang: 'bg' },
    );
    const params = new URL(requested).searchParams;
    expect(params.get('q')).toBe('Витоша 15');
    expect(params.get('dedupe')).toBe('0');
    expect(params.get('lat')).toBe('42.69770');
    expect(params.get('location_bias_scale')).toBe('0.5');
    expect(params.get('lang')).toBeNull();
  });

  it('asks for english names when the phone language is supported', async () => {
    let requested = '';
    const fetchImpl = jest.fn(async (url: string) => {
      requested = url;
      return jsonResponse(photonSofia);
    });
    await searchPhoton('Paris', { fetchImpl }, { lang: 'en', bias: sofia });
    expect(new URL(requested).searchParams.get('lang')).toBe('en');
  });

  it('treats a cancelled request as no results', async () => {
    const aborted = new Error('Aborted');
    aborted.name = 'AbortError';
    const fetchImpl = jest.fn(async () => {
      throw aborted;
    });
    const result = await searchPhoton('Sofia', { fetchImpl }, { bias: sofia });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });
});
