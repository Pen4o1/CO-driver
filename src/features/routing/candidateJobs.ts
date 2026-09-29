import { destinationPoint } from '@/core/geo';
import {
  planWaypointVariants,
  withEndpoints,
  type RouteRequest,
  type RoutingProvider,
} from '@/core/routing';
import type { LatLng, RouteProfile, RouteStyle } from '@/core/types';

import type { RoadSnapper } from './snap/osrmSnapper';

export const MAX_COORDS = 25;

export type Job = {
  label: string;
  provider: RoutingProvider;
  request: RouteRequest;
};

export function primaryFirst(profileId: RouteStyle): 'valhalla' | 'ors' {
  if (profileId === 'cruise' || profileId === 'balanced') {
    return 'ors';
  }
  return 'valhalla';
}

export function abJobs(
  start: LatLng,
  end: LatLng,
  profile: RouteProfile,
  ors: RoutingProvider,
  valhalla: RoutingProvider,
): Job[] {
  const first = primaryFirst(profile.id);
  const base: RouteRequest = {
    waypoints: [start, end],
    profileId: profile.id,
    providerParams: profile.providerParams,
    alternatives: true,
  };
  if (first === 'valhalla') {
    return [
      { label: 'valhalla-primary', provider: valhalla, request: base },
      { label: 'ors-fallback', provider: ors, request: base },
    ];
  }
  return [
    { label: 'ors-primary', provider: ors, request: base },
    { label: 'valhalla-fallback', provider: valhalla, request: base },
  ];
}

/**
 * Loop searches should leave the street grid. Valhalla can down-rank living
 * streets and service roads; ORS has no street-avoid flag, so those loops are
 * filtered after they come back.
 */
export function countryLoopParams(
  profile: RouteProfile,
): Record<string, unknown> {
  const highways = profile.providerParams.useHighways;
  const capHighways = profile.id !== 'cruise' && typeof highways === 'number';
  return {
    ...profile.providerParams,
    ...(capHighways ? { useHighways: Math.min(highways, 0.15) } : {}),
    useLivingStreets: 0,
    servicePenalty: 30,
  };
}

export function loopJobs(
  start: LatLng,
  profile: RouteProfile,
  lengthM: number,
  ors: RoutingProvider,
): Job[] {
  const providerParams = countryLoopParams(profile);
  return [1, 2, 3].map((seed) => ({
    label: `ors-loop-${seed}`,
    provider: ors,
    request: {
      waypoints: [start],
      profileId: profile.id,
      providerParams,
      alternatives: false,
      roundTrip: { lengthM, points: 4, seed },
    },
  }));
}

/**
 * Second loop search around the same radius. Valhalla snaps these vertices
 * onto roads with living streets turned down, so a city-centre pin can still
 * reach a country road. Seed rotates the square so the three tries differ.
 * Driven length will not match lengthM exactly.
 */
export function loopViaPoints(
  start: LatLng,
  lengthM: number,
  seed: number,
): LatLng[] {
  const radiusM = lengthM / (2 * Math.PI);
  const offsetDeg = seed * 40;
  const via = [0, 90, 180, 270].map((bearing) =>
    destinationPoint(start, bearing + offsetDeg, radiusM),
  );
  return [start, ...via, start];
}

export function loopViaJobs(
  start: LatLng,
  profile: RouteProfile,
  lengthM: number,
  valhalla: RoutingProvider,
): Job[] {
  return [1, 2, 3].map((seed) => ({
    label: `valhalla-loop-${seed}`,
    provider: valhalla,
    request: {
      waypoints: loopViaPoints(start, lengthM, seed),
      profileId: profile.id,
      providerParams: countryLoopParams(profile),
      alternatives: false,
    },
  }));
}

export function mockJobs(
  start: LatLng,
  end: LatLng | null,
  profile: RouteProfile,
  lengthM: number,
  mode: 'ab' | 'loop',
  mock: RoutingProvider,
): Job[] {
  if (mode === 'loop') {
    return [
      {
        label: 'mock-loop',
        provider: mock,
        request: {
          waypoints: [start],
          profileId: profile.id,
          providerParams: profile.providerParams,
          alternatives: false,
          roundTrip: { lengthM, points: 4, seed: 1 },
        },
      },
    ];
  }
  if (!end) {
    return [];
  }
  return [
    {
      label: 'mock-ab',
      provider: mock,
      request: {
        waypoints: [start, end],
        profileId: profile.id,
        providerParams: profile.providerParams,
        alternatives: false,
      },
    },
  ];
}

export async function snapVariant(
  start: LatLng,
  end: LatLng,
  raw: LatLng[],
  snap: RoadSnapper,
): Promise<LatLng[]> {
  const snapped = (
    await Promise.all(raw.map((point) => snap.snap(point)))
  ).filter((point): point is LatLng => point !== null);
  return withEndpoints(start, end, snapped, MAX_COORDS);
}

export async function waypointJobs(
  start: LatLng,
  end: LatLng,
  profile: RouteProfile,
  ors: RoutingProvider,
  snap: RoadSnapper,
): Promise<Job[]> {
  const variants = planWaypointVariants(start, end, profile.waypointStrategy);
  const jobs = await Promise.all(
    variants.map(async (variant) => {
      const waypoints = await snapVariant(start, end, variant.rawPoints, snap);
      if (waypoints.length < 3) {
        return null;
      }
      const job: Job = {
        label: `ors-via-${variant.id}`,
        provider: ors,
        request: {
          waypoints,
          profileId: profile.id,
          providerParams: profile.providerParams,
          alternatives: false,
        },
      };
      return job;
    }),
  );
  return jobs.filter((job): job is Job => job !== null);
}
