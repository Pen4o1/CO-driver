import type {
  LatLng,
  RouteCandidate,
  RouteGeometry,
  RouteStyle,
} from '@/core/types';

export type RouteRequest = {
  waypoints: LatLng[];
  profileId: RouteStyle;
  providerParams?: Record<string, unknown>;
  alternatives?: boolean;
};

export type RoutingProvider = {
  id: string;
  route(req: RouteRequest): Promise<RouteCandidate[]>;
  match(locs: LatLng[]): Promise<RouteGeometry>;
};

export const ROUTING_PROVIDER_IDS = [
  'ors',
  'valhalla',
  'osrm',
  'mock',
] as const;

export type RoutingProviderId = (typeof ROUTING_PROVIDER_IDS)[number];
