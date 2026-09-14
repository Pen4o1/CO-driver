import { leadDistanceM, leadSeconds } from '../timing';
import { cornerNote } from './helpers';

describe('leadDistance (SPEC §8)', () => {
  const speed100kmh = 100 / 3.6;

  it('grade 2 at 100 km/h, normal preset, fires 139 m before apex', () => {
    const note = cornerNote('g2', 1000, 2);
    expect(leadSeconds(note)).toBe(5);
    expect(leadDistanceM(note, speed100kmh)).toBe(139);
  });

  it('clamps to 60–350 m', () => {
    const tight = cornerNote('g1', 1000, 1);
    expect(leadDistanceM(tight, 1)).toBe(60);
    expect(leadDistanceM(tight, 200)).toBe(350);
  });
});
