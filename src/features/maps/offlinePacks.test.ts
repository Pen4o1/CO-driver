import { estimateOfflinePack, isRoutePack } from '@/core/offline';

import {
  deleteRoutePack,
  downloadRoutePack,
  findRoutePack,
  resetOfflineHost,
  setOfflineHostForTests,
  type OfflineHost,
} from './offlinePacks';

function memoryHost(): OfflineHost & {
  packs: Map<string, Record<string, unknown>>;
} {
  const packs = new Map<string, Record<string, unknown>>();
  let seq = 0;
  return {
    packs,
    async createPack(options, onProgress) {
      seq += 1;
      const id = `pack_${seq}`;
      packs.set(id, options.metadata);
      onProgress({
        percentage: 100,
        completedResourceCount: 1,
        requiredResourceCount: 1,
        completedResourceSize: 1000,
        state: 'complete',
      });
      return { id };
    },
    async getPacks() {
      return [...packs.entries()].map(([id, metadata]) => ({ id, metadata }));
    },
    async deletePack(id) {
      packs.delete(id);
    },
  };
}

describe('offline packs host', () => {
  afterEach(() => {
    resetOfflineHost();
  });

  it('stores one pack per route and replaces it', async () => {
    const mem = memoryHost();
    setOfflineHostForTests(mem);
    const bbox: [number, number, number, number] = [23.24, 42.61, 23.33, 42.7];
    const first = await downloadRoutePack(
      'rt_1',
      bbox,
      () => undefined,
      () => undefined,
    );
    expect(await findRoutePack('rt_1')).toEqual({ id: first.id });
    const second = await downloadRoutePack(
      'rt_1',
      bbox,
      () => undefined,
      () => undefined,
    );
    expect(second.id).not.toBe(first.id);
    expect(mem.packs.size).toBe(1);
    expect(isRoutePack([...mem.packs.values()][0] ?? {}, 'rt_1')).toBe(true);
    await deleteRoutePack('rt_1');
    expect(await findRoutePack('rt_1')).toBeNull();
  });

  it('estimates before download', () => {
    const est = estimateOfflinePack([23.24, 42.61, 23.33, 42.7]);
    expect(est.vectorTiles).toBeGreaterThan(0);
  });
});
