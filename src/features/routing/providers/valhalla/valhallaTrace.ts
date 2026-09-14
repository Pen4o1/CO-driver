import { appError } from '@/core/errors';
import { buildRouteGeometry } from '@/core/geo';
import type { LatLng, RouteGeometry } from '@/core/types';

import { coordsFromValhallaTrip } from './valhallaMapper';
import { valhallaDirectionsSchema } from './valhallaSchema';

/** MAPS-FREE-STACK Phase 5: voice-recce / GPS match uses Valhalla /trace_route. */
export function valhallaTraceBody(locs: LatLng[]): Record<string, unknown> {
  return {
    shape: locs.map((p) => ({ lat: p.lat, lon: p.lng })),
    costing: 'auto',
    shape_match: 'map_snap',
    shape_format: 'polyline6',
  };
}

export function geometryFromTrace(raw: unknown): RouteGeometry {
  const parsed = valhallaDirectionsSchema.safeParse(raw);
  if (!parsed.success) {
    throw appError(
      'invalid-response',
      `Valhalla trace_route failed validation: ${parsed.error.message}`,
    );
  }
  const coords = coordsFromValhallaTrip(parsed.data.trip);
  if (coords.length < 2) {
    throw appError('no-route', 'Valhalla trace_route returned an empty shape.');
  }
  return buildRouteGeometry(coords, null);
}
