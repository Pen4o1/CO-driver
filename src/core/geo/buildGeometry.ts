import type { LatLng, RouteGeometry } from '@/core/types';

import { cumulativeDistancesM, polylineLengthM } from './cumulative';

/** GeoJSON bbox: [west, south, east, north]. */
export function boundingBox(
  coords: LatLng[],
): [number, number, number, number] {
  if (coords.length === 0) {
    return [0, 0, 0, 0];
  }
  let west = coords[0].lng;
  let east = coords[0].lng;
  let south = coords[0].lat;
  let north = coords[0].lat;
  for (let i = 1; i < coords.length; i += 1) {
    const p = coords[i];
    if (p.lng < west) west = p.lng;
    if (p.lng > east) east = p.lng;
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
  }
  return [west, south, east, north];
}

export function buildRouteGeometry(
  coords: LatLng[],
  elevationM: Float64Array | null,
): RouteGeometry {
  const cumulative = cumulativeDistancesM(coords);
  return {
    coords,
    cumulative,
    lengthM: polylineLengthM(cumulative),
    bbox: boundingBox(coords),
    elevationM,
  };
}
