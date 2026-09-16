import { clamp } from './clamp';
import { EARTH_RADIUS_M } from './haversine';

/** GeoJSON bbox: [west, south, east, north]. */
export type BBox = [number, number, number, number];

const METRES_PER_DEG_LAT = (Math.PI / 180) * EARTH_RADIUS_M;
const MERCATOR_MAX_LAT = 85.05112878;

/**
 * Expand a route bbox by `bufferM` in every direction.
 *
 * Assumptions:
 * 1. Sphere of EARTH_RADIUS_M. 1° latitude is constant; longitude shrinks by cos(midLat).
 * 2. Near the poles, cos(lat) is floored at 0.2 so the buffer cannot explode.
 * 3. Lat is clamped to Web-Mercator limits so tile math stays defined.
 * 4. Antimeridian: if the expanded box crosses ±180, we do not split it (Bulgarian
 *    corridors never wrap; a wrapping box is still a valid conservative envelope).
 */
export function bufferBbox(bbox: BBox, bufferM: number): BBox {
  const [west, south, east, north] = bbox;
  const midLat = (south + north) / 2;
  const cos = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const dLat = bufferM / METRES_PER_DEG_LAT;
  const dLng = bufferM / (METRES_PER_DEG_LAT * cos);
  return [
    west - dLng,
    clamp(south - dLat, -MERCATOR_MAX_LAT, MERCATOR_MAX_LAT),
    east + dLng,
    clamp(north + dLat, -MERCATOR_MAX_LAT, MERCATOR_MAX_LAT),
  ];
}
