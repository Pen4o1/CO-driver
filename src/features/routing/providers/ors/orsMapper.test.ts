import mini from '@/core/__fixtures__/ors-2d-mini.json';
import sofia from '@/core/__fixtures__/ors-sofia-zlatnite-mostove.json';

import { mapOrsDirections } from './orsMapper';
import { orsCoordSchema, orsDirectionsSchema } from './orsSchema';
import { extraBlockByKeys } from './orsExtras';

describe('orsCoordSchema', () => {
  it('accepts 2D and 3D tuples', () => {
    expect(orsCoordSchema.parse([23.32, 42.7])).toEqual([23.32, 42.7]);
    expect(orsCoordSchema.parse([23.32, 42.7, 551])).toEqual([
      23.32, 42.7, 551,
    ]);
  });

  it('rejects a 1D tuple', () => {
    expect(orsCoordSchema.safeParse([23.32]).success).toBe(false);
  });
});

describe('orsDirectionsSchema + mapper (committed fixtures, no network)', () => {
  it('maps the 2D mini fixture including extras.waytypes', () => {
    const parsed = orsDirectionsSchema.parse(mini);
    const extras = parsed.features[0].properties.extras;
    expect(extraBlockByKeys(extras, ['waytype', 'waytypes'])).toBeDefined();
    expect(extras?.waytypes).toBeDefined();

    const candidates = mapOrsDirections(parsed, 'ors', 'balanced', [
      { lat: 42.7, lng: 23.32 },
      { lat: 42.69, lng: 23.33 },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].geometry.coords[0]).toEqual({
      lat: 42.7,
      lng: 23.32,
    });
    expect(candidates[0].geometry.elevationM).toBeNull();
    expect(candidates[0].ascentM).toBeNull();
    expect(candidates[0].steps[0].wayType).toBe(3);
  });

  it('maps the Sofia 3D fixture, splits z into elevationM, derives ascent', () => {
    const parsed = orsDirectionsSchema.parse(sofia);
    const extras = parsed.features[0].properties.extras;
    expect(
      extraBlockByKeys(extras, ['waytype', 'waytypes'])?.values.length,
    ).toBeGreaterThan(0);
    expect(extras?.waytype).toBeDefined();
    expect(extras?.waytypes).toBeUndefined();

    const start = { lat: 42.6977, lng: 23.3219 };
    const end = { lat: 42.6187, lng: 23.2483 };
    const candidates = mapOrsDirections(parsed, 'ors', 'twist', [start, end]);
    expect(candidates.length).toBe(3);

    const first = candidates[0];
    expect(first.geometry.elevationM).not.toBeNull();
    expect(first.geometry.elevationM).toHaveLength(
      first.geometry.coords.length,
    );
    expect(first.geometry.elevationM?.[0]).toBeCloseTo(551, 0);
    expect(first.ascentM).not.toBeNull();
    expect(first.descentM).not.toBeNull();
    expect(first.ascentM ?? 0).toBeGreaterThan(500);
    expect(
      Object.prototype.hasOwnProperty.call(
        parsed.features[0].properties.summary,
        'ascent',
      ),
    ).toBe(false);
    expect(first.steps.length).toBeGreaterThan(5);
    expect(first.providerId).toBe('ors');
  });
});
