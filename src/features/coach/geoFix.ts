import type { LocationObject } from 'expo-location';

import type { GeoFix } from '@/core/types';

export function geoFixFromLocation(location: LocationObject): GeoFix {
  const speed = location.coords.speed ?? 0;
  const heading = location.coords.heading ?? 0;
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    speedMps: speed < 0 ? 0 : speed,
    headingDeg: heading < 0 ? 0 : heading,
    accuracyM: location.coords.accuracy ?? 999,
    timestampMs: location.timestamp,
  };
}

export function gpsBand(accuracyM: number): 'good' | 'ok' | 'poor' {
  if (accuracyM <= 10) return 'good';
  if (accuracyM <= 25) return 'ok';
  return 'poor';
}
