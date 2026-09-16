import { latToTileY, lngToTileX, tileCountForBbox } from './webMercator';

describe('webMercator', () => {
  it('maps 0,0 at z0 to tile 0,0', () => {
    expect(lngToTileX(0, 0)).toBe(0);
    expect(latToTileY(0, 0)).toBe(0);
  });

  it('counts a one-tile world at z0', () => {
    expect(tileCountForBbox([-180, -85, 179.9, 85], 0)).toBe(1);
  });

  it('counts a Sofia box at z14 as several tiles', () => {
    const n = tileCountForBbox([23.24, 42.61, 23.33, 42.7], 14);
    expect(n).toBeGreaterThan(1);
    expect(n).toBeLessThan(80);
  });
});
