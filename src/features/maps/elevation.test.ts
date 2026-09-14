import fixture from './__fixtures__/terrarium-pixels.json';

import {
  decodeTerrariumRgb,
  decodeTerrariumTile,
  queryMapTerrainElevation,
} from './elevation';

describe('decodeTerrariumRgb', () => {
  it('decodes the committed fixture tile pixels', () => {
    const heights = decodeTerrariumTile(fixture.pixels);
    fixture.pixels.forEach((pixel, index) => {
      expect(heights[index]).toBeCloseTo(pixel.expectedM, 5);
      expect(decodeTerrariumRgb(pixel.r, pixel.g, pixel.b)).toBeCloseTo(
        pixel.expectedM,
        5,
      );
    });
  });
});

describe('queryMapTerrainElevation', () => {
  it('returns null when the map ref has no queryTerrainElevation', async () => {
    expect(await queryMapTerrainElevation({}, [23.32, 42.7])).toBeNull();
  });

  it('delegates when the helper exists', async () => {
    const map = {
      queryTerrainElevation: jest.fn(async () => 551),
    };
    expect(await queryMapTerrainElevation(map, [23.32, 42.7])).toBe(551);
    expect(map.queryTerrainElevation).toHaveBeenCalledWith([23.32, 42.7]);
  });
});
