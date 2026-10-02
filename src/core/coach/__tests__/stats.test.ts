import { driveStats, twistinessSoFar } from '../stats';
import { engineFrom, updateEngine } from '../engine';
import { cornerNote, FILTER, fixAt, straightGeometry } from './helpers';

describe('drive stats', () => {
  it('counts hairpins passed and twistiness so far', () => {
    const geometry = straightGeometry(2000);
    const notes = [
      cornerNote('h', 400, 1),
      cornerNote('g3', 800, 3),
      cornerNote('g5', 1600, 5),
    ];
    const state = {
      ...engineFrom(geometry, notes, FILTER),
      distanceAlongM: 900,
    };
    expect(twistinessSoFar(notes, 900)).toBeCloseTo(2 / 3);
    const stats = driveStats(state, 10_000);
    expect(stats.hairpinsHit).toBe(1);
    expect(stats.cornersByGrade[3]).toBe(1);
    expect(stats.cornersByGrade[5]).toBe(0);
  });

  it('records max speed and moving time from GPS samples', () => {
    const geometry = straightGeometry(2000);
    const start = engineFrom(geometry, [], FILTER);
    const first = updateEngine(start, fixAt(geometry, 0, 10, 1_000), 1_000);
    const second = updateEngine(
      first.state,
      fixAt(geometry, 300, 28, 5_000),
      5_000,
    );
    const spike = updateEngine(
      second.state,
      fixAt(geometry, 320, 200, 6_000, { accuracyM: 80 }),
      6_000,
    );
    expect(spike.state.maxSpeedMps).toBe(28);
    expect(spike.state.movingMs).toBe(5_000);
    const stats = driveStats(spike.state, 16_000);
    expect(stats.maxSpeedMps).toBe(28);
    expect(stats.movingTimeS).toBe(5);
    expect(stats.avgSpeedMps).toBeGreaterThan(0);
  });
});
