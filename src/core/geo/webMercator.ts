import type { BBox } from './bufferBbox';

/**
 * Web Mercator tile indices (XYZ / OSM).
 *
 * Assumptions:
 * 1. EPSG:3857 spherical Mercator. Latitude is already clamped by bufferBbox.
 * 2. y increases southward (TMS is inverted; we use XYZ).
 * 3. Tile count at zoom z is 2^z on each axis.
 */
export function lngToTileX(lng: number, zoom: number): number {
  const n = 2 ** zoom;
  return Math.floor(((lng + 180) / 360) * n);
}

export function latToTileY(lat: number, zoom: number): number {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return Math.floor(y * n);
}

export function tileCountForBbox(bbox: BBox, zoom: number): number {
  const n = 2 ** zoom;
  const x0 = Math.min(n - 1, Math.max(0, lngToTileX(bbox[0], zoom)));
  const x1 = Math.min(n - 1, Math.max(0, lngToTileX(bbox[2], zoom)));
  const y0 = Math.min(n - 1, Math.max(0, latToTileY(bbox[3], zoom)));
  const y1 = Math.min(n - 1, Math.max(0, latToTileY(bbox[1], zoom)));
  const width = Math.abs(x1 - x0) + 1;
  const height = Math.abs(y1 - y0) + 1;
  return width * height;
}

export function tileCountForZooms(
  bbox: BBox,
  minZoom: number,
  maxZoom: number,
): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z += 1) {
    total += tileCountForBbox(bbox, z);
  }
  return total;
}
