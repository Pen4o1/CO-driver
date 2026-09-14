import type {
  LatLng,
  RouteCandidate,
  RouteGeometry,
  RouteStyle,
} from '@/core/types';

export type RoundTripRequest = {
  lengthM: number;
  points: number;
  seed: number;
};

export type RouteRequest = {
  waypoints: LatLng[];
  profileId: RouteStyle;
  providerParams?: Record<string, unknown>;
  alternatives?: boolean;
  roundTrip?: RoundTripRequest;
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
