import { formatBytes, estimateOfflinePack } from './estimate';

describe('estimateOfflinePack', () => {
  it('returns a buffered envelope and a positive size', () => {
    const est = estimateOfflinePack([23.2483, 42.6187, 23.3219, 42.6977]);
    expect(est.vectorTiles).toBeGreaterThan(10);
    expect(est.demTiles).toBeGreaterThan(0);
    expect(est.bytes).toBeGreaterThan(100_000);
    expect(est.bounds[0]).toBeLessThan(23.2483);
  });

  it('formats megabytes', () => {
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
