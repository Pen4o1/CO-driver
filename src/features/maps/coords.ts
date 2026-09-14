import type { LatLng } from '@/core/types';

export function toLngLat(point: LatLng): [number, number] {
  return [point.lng, point.lat];
}

export function fromLngLat(lngLat: [number, number]): LatLng {
  return { lng: lngLat[0], lat: lngLat[1] };
}

export type RouteLineFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
};

export function routeToGeoJSON(coords: LatLng[]): RouteLineFeature {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: coords.map(toLngLat),
    },
  };
}
