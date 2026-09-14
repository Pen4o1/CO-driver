import sofia from '@/core/__fixtures__/ors-sofia-zlatnite-mostove.json';
import { buildRouteGeometry } from '@/core/geo/buildGeometry';
import type { LatLng, RouteGeometry, RouteStep } from '@/core/types';

export function sofiaDemoGeometry(): {
  geometry: RouteGeometry;
  steps: RouteStep[];
  name: string;
} {
  const tuples = sofia.features[0].geometry.coordinates;
  const coords: LatLng[] = tuples.map((t) => ({ lng: t[0], lat: t[1] }));
  const elevationM = Float64Array.from(
    tuples.map((t) => (t.length === 3 ? t[2] : Number.NaN)),
  );
  return {
    name: 'Demo · Sofia → Zlatnite Mostove',
    geometry: buildRouteGeometry(coords, elevationM),
    steps: [],
  };
}
