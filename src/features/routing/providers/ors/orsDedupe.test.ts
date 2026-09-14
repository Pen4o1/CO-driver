import sofia from '@/core/__fixtures__/ors-sofia-zlatnite-mostove.json';

import { mapOrsDirections } from './orsMapper';
import { orsDirectionsSchema } from './orsSchema';
import { extraBlockByKeys } from './orsExtras';
import { dedupeCandidates } from '@/core/scoring';

describe('Sofia ORS fixture (spike)', () => {
  it('maps 3 features and dedupes near-duplicate mountain roads', () => {
    const parsed = orsDirectionsSchema.parse(sofia);
    const extras = parsed.features[0].properties.extras;
    expect(extraBlockByKeys(extras, ['waytype', 'waytypes'])).toBeDefined();
    const candidates = mapOrsDirections(parsed, 'ors', 'twist', [
      { lat: 42.6977, lng: 23.3219 },
      { lat: 42.6187, lng: 23.2483 },
    ]);
    expect(candidates).toHaveLength(3);
    const deduped = dedupeCandidates(candidates);
    expect(deduped.length).toBeLessThan(3);
    expect(deduped.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].roadShares.lowSpeedRoadShare).not.toBeUndefined();
  });
});
