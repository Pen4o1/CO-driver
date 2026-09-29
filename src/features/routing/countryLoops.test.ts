import { makeCandidate, zigzagLine } from '@/core/scoring/testGeometry';

import {
  countryLoopScore,
  pickCountryLoops,
  preferCountryLoops,
} from './countryLoops';

describe('country loops', () => {
  it('ranks a climb on country roads above a city street grid', () => {
    const city = makeCandidate({
      id: 'city',
      coords: zigzagLine(6_000, 80),
      durationS: 500,
      streetShare: 0.92,
      ascentM: 20,
    });
    const mountain = makeCandidate({
      id: 'mountain',
      coords: zigzagLine(12_000, 350),
      durationS: 900,
      streetShare: 0.15,
      ascentM: 700,
    });
    city.breakdown = { ...city.breakdown, score: 95 };
    mountain.breakdown = { ...mountain.breakdown, score: 40 };
    expect(countryLoopScore(mountain)).toBeGreaterThan(countryLoopScore(city));
  });

  it('drops a mostly-city loop only when a less urban loop exists', () => {
    const city = makeCandidate({
      id: 'city',
      coords: zigzagLine(5_000),
      durationS: 400,
      streetShare: 0.9,
    });
    const country = makeCandidate({
      id: 'country',
      coords: zigzagLine(8_000, 300),
      durationS: 700,
      streetShare: 0.2,
      ascentM: 400,
    });
    expect(preferCountryLoops([city, country]).map((c) => c.id)).toEqual([
      'country',
    ]);
    expect(preferCountryLoops([city]).map((c) => c.id)).toEqual(['city']);
  });

  it('does not keep a fast city loop beside a country loop', () => {
    const city = makeCandidate({
      id: 'city',
      coords: zigzagLine(5_000, 90),
      durationS: 300,
      streetShare: 0.7,
      ascentM: 10,
    });
    const mountain = makeCandidate({
      id: 'mountain',
      coords: zigzagLine(14_000, 400),
      durationS: 1200,
      streetShare: 0.1,
      ascentM: 800,
    });
    const picked = pickCountryLoops([city, mountain]);
    expect(picked.map((c) => c.id)).toEqual(['mountain']);
  });
});
