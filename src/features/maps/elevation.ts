/**
 * Terrain elevation helpers.
 *
 * MapLibre GL JS has `queryTerrainElevation`. MapLibre React Native 11.3.10's
 * MapRef does not expose it (verified against the package types). This file
 * isolates that gap:
 *  - `decodeTerrariumRgb` is the AWS Terrarium formula, tested on fixture pixels
 *  - `queryMapTerrainElevation` calls `queryTerrainElevation` if a map ref
 *    ever grows that method; otherwise returns null
 */

export const TERRARIUM_OFFSET_M = 32768;

/** AWS Terrarium: height = (R * 256 + G + B / 256) - 32768 */
export function decodeTerrariumRgb(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - TERRARIUM_OFFSET_M;
}

export function decodeTerrariumTile(
  pixels: { r: number; g: number; b: number }[],
): number[] {
  return pixels.map((p) => decodeTerrariumRgb(p.r, p.g, p.b));
}

export type TerrainQueryable = {
  queryTerrainElevation?: (
    lngLat: [number, number],
  ) => Promise<number | null> | number | null;
};

export async function queryMapTerrainElevation(
  map: TerrainQueryable | null,
  lngLat: [number, number],
): Promise<number | null> {
  const query = map?.queryTerrainElevation;
  if (typeof query !== 'function') {
    return null;
  }
  const height = await query.call(map, lngLat);
  return height ?? null;
}
