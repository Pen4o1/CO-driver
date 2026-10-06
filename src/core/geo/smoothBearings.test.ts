import type { LatLng } from '@/core/types';

import { bearingDeltaDeg, bearingDeg } from './bearing';
import { cumulativeDistancesM } from './cumulative';
import { smoothBearings } from './smoothBearings';

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function hannWeight(ds: number, windowM: number): number {
  const t = windowM === 0 ? 0 : ds / windowM;
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/** Previous full scan, kept so the sliding window stays equivalent. */
function bruteSmooth(coords: LatLng[], windowM: number): number[] {
  const raw: number[] = [];
  for (let i = 0; i < coords.length; i += 1) {
    if (i === coords.length - 1) {
      raw.push(bearingDeg(coords[i - 1], coords[i]));
    } else {
      raw.push(bearingDeg(coords[i], coords[i + 1]));
    }
  }
  const cum = cumulativeDistancesM(coords);
  return raw.map((heading, i) => {
    let sumSin = 0;
    let sumCos = 0;
    let weightSum = 0;
    for (let j = 0; j < raw.length; j += 1) {
      const ds = Math.abs(cum[j] - cum[i]);
      if (ds > windowM) continue;
      const w = hannWeight(ds, windowM);
      const rad = (raw[j] * Math.PI) / 180;
      sumSin += w * Math.sin(rad);
      sumCos += w * Math.cos(rad);
      weightSum += w;
    }
    if (weightSum === 0) return heading;
    return wrap360((Math.atan2(sumSin, sumCos) * 180) / Math.PI);
  });
}

describe('smoothBearings', () => {
  it('leaves a constant heading unchanged', () => {
    const coords = [
      { lat: 42.0, lng: 23.0 },
      { lat: 42.001, lng: 23.0 },
      { lat: 42.002, lng: 23.0 },
      { lat: 42.003, lng: 23.0 },
    ];
    const smoothed = smoothBearings(coords, 30);
    for (const heading of smoothed) {
      expect(heading).toBeCloseTo(0, 0);
    }
  });

  it('preserves a sustained right turn', () => {
    const coords = [
      { lat: 42.0, lng: 23.0 },
      { lat: 42.002, lng: 23.0 },
      { lat: 42.004, lng: 23.0 },
      { lat: 42.004, lng: 23.002 },
      { lat: 42.004, lng: 23.004 },
    ];
    const smoothed = smoothBearings(coords, 40);
    expect(smoothed).toHaveLength(coords.length);
    const net = bearingDeltaDeg(smoothed[0], smoothed[smoothed.length - 1]);
    expect(net).toBeGreaterThan(45);
  });

  it('matches a full scan on uneven spacing', () => {
    const coords: LatLng[] = [];
    let lat = 42;
    let lng = 23;
    for (let i = 0; i < 80; i += 1) {
      lat += 0.00002 * (1 + (i % 5));
      lng += i % 11 === 0 ? 0.00015 : 0.00001;
      coords.push({ lat, lng });
    }
    const expected = bruteSmooth(coords, 25);
    const smoothed = smoothBearings(coords, 25);
    expect(smoothed).toHaveLength(expected.length);
    smoothed.forEach((heading, i) => {
      expect(heading).toBeCloseTo(expected[i], 6);
    });
  });

  it('smooths a long polyline in linear time', () => {
    const coords = Array.from({ length: 12_000 }, (_, i) => ({
      lat: 42 + i * 0.0001,
      lng: 23,
    }));
    const start = Date.now();
    const smoothed = smoothBearings(coords, 15);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(smoothed).toHaveLength(coords.length);
    expect(smoothed[100]).toBeCloseTo(0, 0);
  });
});
