import { deriveAscentDescent, smoothElevationM } from './elevation';

describe('deriveAscentDescent', () => {
  it('returns null without elevation', () => {
    expect(deriveAscentDescent(null, new Float64Array([0, 100]))).toBeNull();
  });

  it('counts a climb then a descent after smoothing', () => {
    const elevationM = new Float64Array([100, 101, 150, 149, 120]);
    const cumulative = new Float64Array([0, 50, 150, 200, 300]);
    const result = deriveAscentDescent(elevationM, cumulative, 80);
    expect(result).not.toBeNull();
    if (result === null) {
      return;
    }
    expect(result.ascentM).toBeGreaterThan(0);
    expect(result.descentM).toBeGreaterThan(0);
    expect(result.rawAscentM).toBeGreaterThanOrEqual(result.ascentM);
  });

  it('damps single-sample DEM jitter', () => {
    const elevationM = new Float64Array([100, 130, 100, 100]);
    const cumulative = new Float64Array([0, 10, 20, 120]);
    const smoothed = smoothElevationM(elevationM, cumulative, 100);
    const spike = smoothed[1] - 100;
    expect(Math.abs(spike)).toBeLessThan(20);
  });
});
