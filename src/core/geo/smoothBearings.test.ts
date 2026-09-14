import { bearingDeltaDeg } from './bearing';
import { smoothBearings } from './smoothBearings';

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
});
