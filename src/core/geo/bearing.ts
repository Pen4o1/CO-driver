import type { LatLng } from '@/core/types';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Forward azimuth from `from` to `to`, degrees clockwise from north, [0, 360). */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return wrap360(toDeg(Math.atan2(y, x)));
}

/**
 * Smallest signed turn from `fromDeg` to `toDeg`.
 * Positive = right, negative = left, range (-180, 180].
 */
export function bearingDeltaDeg(fromDeg: number, toDeg: number): number {
  const delta = wrap360(toDeg - fromDeg);
  return delta > 180 ? delta - 360 : delta;
}
