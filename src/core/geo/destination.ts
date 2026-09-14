import type { LatLng } from '@/core/types';

import { EARTH_RADIUS_M } from './haversine';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function wrapLng(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * Destination point from `from` walking `distanceM` along `bearingDeg`.
 * Sphere of EARTH_RADIUS_M. No ellipsoid.
 */
export function destinationPoint(
  from: LatLng,
  bearingDeg: number,
  distanceM: number,
): LatLng {
  const delta = distanceM / EARTH_RADIUS_M;
  const theta = toRad(bearingDeg);
  const lat1 = toRad(from.lat);
  const lng1 = toRad(from.lng);
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinDelta = Math.sin(delta);
  const cosDelta = Math.cos(delta);
  const lat2 = Math.asin(
    sinLat1 * cosDelta + cosLat1 * sinDelta * Math.cos(theta),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(theta) * sinDelta * cosLat1,
      cosDelta - sinLat1 * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lng: wrapLng(toDeg(lng2)) };
}
