import valhalla from '@/core/__fixtures__/valhalla-sofia-zlatnite-mostove.json';

import { mapValhallaDirections } from './valhallaMapper';
import { valhallaDirectionsSchema } from './valhallaSchema';

describe('valhalla mapper (committed fixture, no network)', () => {
  it('maps the primary trip and alternates', () => {
    const parsed = valhallaDirectionsSchema.parse(valhalla);
    const candidates = mapValhallaDirections(parsed, 'twist', [
      { lat: 42.6977, lng: 23.3219 },
      { lat: 42.6187, lng: 23.2483 },
    ]);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    expect(candidates[0].providerId).toBe('valhalla');
    expect(candidates[0].geometry.coords.length).toBeGreaterThan(50);
    expect(candidates[0].geometry.coords[0].lat).toBeCloseTo(42.6977, 2);
    expect(candidates[0].ascentM).toBeNull();
    expect(candidates[0].roadShares.motorwayShare).toBe(0);
  });
});
