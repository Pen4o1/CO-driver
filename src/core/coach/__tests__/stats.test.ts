import { driveStats, twistinessSoFar } from '../stats';
import { engineFrom } from '../engine';
import { cornerNote, FILTER, straightGeometry } from './helpers';

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
});
