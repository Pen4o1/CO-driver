import { appError } from '@/core/errors';
import { buildRouteGeometry, resamplePolyline } from '@/core/geo';
import { emptyBreakdown } from '@/core/routing';
import type { RouteRequest, RoutingProvider } from '@/core/routing';
import type { LatLng, RouteCandidate, RouteGeometry } from '@/core/types';

function straightCandidate(
  waypoints: LatLng[],
  profileId: RouteRequest['profileId'],
): RouteCandidate {
  const coords =
    waypoints.length === 2 ? resamplePolyline(waypoints, 200) : waypoints;
  const geometry = buildRouteGeometry(coords, null);
  return {
    id: 'mock-0',
    providerId: 'mock',
    geometry,
    steps: [
      {
        distanceM: geometry.lengthM,
        durationS: geometry.lengthM / 13.9,
        roadName: 'Mock road',
        maneuver: {
          type: 'depart',
          instruction: 'Mock straight line',
          location: coords[0],
        },
      },
    ],
    breakdown: emptyBreakdown(geometry.lengthM, geometry.lengthM / 13.9, null),
    fastestDurationS: geometry.lengthM / 13.9,
    profileId,
    waypointsUsed: waypoints,
    ascentM: null,
    descentM: null,
  };
}

export function createMockProvider(): RoutingProvider {
  return {
    id: 'mock',
    async route(req: RouteRequest) {
      if (req.waypoints.length < 2) {
        throw appError('no-route', 'Need a start and an end pin.');
      }
      return [straightCandidate(req.waypoints, req.profileId)];
    },
    async match(locs: LatLng[]): Promise<RouteGeometry> {
      if (locs.length === 0) {
        throw appError('no-route', 'Need points to match.');
      }
      return buildRouteGeometry(locs, null);
    },
  };
}
