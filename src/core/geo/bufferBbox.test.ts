import { bufferBbox } from './bufferBbox';

describe('bufferBbox', () => {
  it('expands a Sofia bbox by ~2 km', () => {
    const bbox: [number, number, number, number] = [
      23.2483, 42.6187, 23.3219, 42.6977,
    ];
    const out = bufferBbox(bbox, 2000);
    expect(out[0]).toBeLessThan(bbox[0]);
    expect(out[1]).toBeLessThan(bbox[1]);
    expect(out[2]).toBeGreaterThan(bbox[2]);
    expect(out[3]).toBeGreaterThan(bbox[3]);
    const dLat = out[3] - bbox[3];
    expect(dLat).toBeGreaterThan(0.015);
    expect(dLat).toBeLessThan(0.025);
  });

  it('clamps latitude to mercator limits', () => {
    const out = bufferBbox([-10, 84.9, 10, 85.05], 2000);
    expect(out[3]).toBeLessThanOrEqual(85.05112878);
  });
});
