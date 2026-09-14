import { TWIST_SEEKER, CRUISE } from '@/core/routing';
import { curvatureDegPerKm } from './scoreCorners';
import { pickCandidates } from './rank';
import { scoreCandidates } from './curviness';
import { makeCandidate, straightLine, zigzagLine } from './testGeometry';

describe('SPEC §Scoring fixtures', () => {
  it('winding vs straight of equal length: curvature differs by ≥ 3×', () => {
    const lengthM = 8000;
    const straight = makeCandidate({
      id: 'straight',
      coords: straightLine(lengthM),
      durationS: 600,
    });
    const winding = makeCandidate({
      id: 'winding',
      coords: zigzagLine(lengthM),
      durationS: 720,
    });
    const a = curvatureDegPerKm(straight.geometry);
    const b = curvatureDegPerKm(winding.geometry);
    expect(b / Math.max(a, 1e-6)).toBeGreaterThanOrEqual(3);
  });

  it('100% motorway scores ≤ 20 under twist', () => {
    const motorway = makeCandidate({
      id: 'mw',
      coords: straightLine(10_000),
      durationS: 400,
      motorwayShare: 1,
    });
    const backroad = makeCandidate({
      id: 'br',
      coords: zigzagLine(10_000),
      durationS: 520,
      motorwayShare: 0,
    });
    const scored = scoreCandidates([motorway, backroad], TWIST_SEEKER);
    const mw = scored.find((c) => c.id === 'mw');
    expect(mw?.roadShares.motorwayShare).toBe(1);
    expect(mw?.breakdown.score).toBeLessThanOrEqual(20);
  });

  it('cruise never ranks a maxDetourRatio violator above the fastest', () => {
    const fastest = makeCandidate({
      id: 'fast',
      coords: straightLine(10_000),
      durationS: 400,
    });
    const scenic = makeCandidate({
      id: 'slow',
      coords: zigzagLine(18_000),
      durationS: 400 * 2,
      fastestDurationS: 400,
    });
    const scored = scoreCandidates([fastest, scenic], CRUISE);
    const picked = pickCandidates(scored, CRUISE);
    expect(picked[0].id).toBe('fast');
    expect(picked.some((c) => c.id === 'slow')).toBe(false);
  });
});
