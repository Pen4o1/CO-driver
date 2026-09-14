import { createProviderRegistry } from './registry';
import mini from '@/core/__fixtures__/ors-2d-mini.json';

describe('createProviderRegistry', () => {
  const registry = createProviderRegistry({
    fetchImpl: async () => ({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => mini,
      text: async () => JSON.stringify(mini),
    }),
    getApiKey: () => 'key',
  });

  it('selects providers by id without touching feature code', () => {
    expect(registry.get('mock').id).toBe('mock');
    expect(registry.get('ors').id).toBe('ors');
    expect(registry.ids()).toEqual(['ors', 'mock']);
  });

  it('falls back to ORS for an unknown id', () => {
    expect(registry.get('nope').id).toBe('ors');
  });
});
