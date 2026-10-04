import type { GeoFix } from '@/core/types';

import { SPEED_BAND_COUNT, speedHeat } from '../speedHeat';

function fix(
  lat: number,
  lng: number,
  speedMps: number,
  timestampMs: number,
): GeoFix {
  return {
    lat,
    lng,
    speedMps,
    headingDeg: 0,
    accuracyM: 5,
    timestampMs,
  };
}

/** ~11 m of latitude, so a run of points is a short connected trace. */
function northbound(speeds: number[], step = 0.0002, dt = 1_000): GeoFix[] {
  return speeds.map((speedMps, index) =>
    fix(42.7 + index * step, 23.32, speedMps, index * dt),
  );
}

describe('speed heat', () => {
  it('paints faster stretches in a hotter band than slower ones', () => {
    const { segments } = speedHeat([
      ...northbound([6, 6, 6, 6], 0.0003),
      ...northbound([22, 22, 22, 22], 0.0003, 1_000).map((sample, index) => ({
        ...sample,
        lat: 42.702 + index * 0.0003,
        timestampMs: 8_000 + index * 1_000,
      })),
    ]);
    expect(segments.length).toBeGreaterThan(1);
    expect(segments[0].band).toBeLessThan(segments[segments.length - 1].band);
    for (const segment of segments) {
      expect(segment.band).toBeGreaterThanOrEqual(0);
      expect(segment.band).toBeLessThan(SPEED_BAND_COUNT);
      expect(segment.coords.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('marks the sustained peak and ignores a GPS spike', () => {
    const { highlights } = speedHeat(
      northbound([10, 10, 200, 10, 28, 28], 0.0003),
    );
    const peak = highlights.find((item) => item.kind === 'peak');
    expect(peak?.speedMps).toBe(28);
    expect(peak?.at.lat).toBeGreaterThan(42.7);
  });

  it('marks the hardest brake away from the peak', () => {
    const { highlights } = speedHeat(
      northbound([8, 8, 30, 28, 12, 8, 8], 0.0004),
    );
    const brake = highlights.find((item) => item.kind === 'brake');
    expect(brake?.kind).toBe('brake');
    if (brake?.kind === 'brake') {
      expect(brake.dropMps).toBeGreaterThanOrEqual(6);
    }
  });

  it('does not connect a line across a long gap', () => {
    const { segments } = speedHeat([
      fix(42.7, 23.32, 12, 0),
      fix(42.701, 23.32, 14, 1_000),
      fix(42.8, 23.32, 20, 60_000),
      fix(42.801, 23.32, 22, 61_000),
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0].coords).toHaveLength(2);
    expect(segments[1].coords[0].lat).toBeCloseTo(42.8);
  });

  it('returns nothing for an empty trace', () => {
    expect(speedHeat([])).toEqual({ segments: [], highlights: [] });
  });
});
