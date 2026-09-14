import { RESAMPLE_M } from '../constants';
import { resampleCentreline } from '../resample';
import { makeArc } from '../__fixtures__/builders';

describe('resampleCentreline', () => {
  it('samples at ~5 m and produces finite curvature', () => {
    const line = resampleCentreline(makeArc({ radiusM: 40, sweepDeg: 90 }));
    expect(line.dsM).toBe(RESAMPLE_M);
    expect(line.coords.length).toBeGreaterThan(10);
    for (let i = 1; i < line.coords.length; i += 1) {
      const step = line.cumulative[i] - line.cumulative[i - 1];
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(RESAMPLE_M * 2.5);
    }
    for (const k of line.curvaturePerM) {
      expect(Number.isFinite(k)).toBe(true);
    }
  });

  it('right turns have positive mean curvature', () => {
    const line = resampleCentreline(
      makeArc({ radiusM: 40, sweepDeg: 180, direction: 'right' }),
    );
    let sum = 0;
    for (const d of line.dThetaDeg) sum += d;
    expect(sum).toBeGreaterThan(90);
  });
});
