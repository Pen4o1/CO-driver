import { emptyBreakdown } from '@/core/routing';
import { buildRouteGeometry, decodePolyline } from '@/core/geo';
import type {
  LatLng,
  RoadShares,
  RouteCandidate,
  RouteStep,
  RouteStyle,
} from '@/core/types';

import type {
  ValhallaDirections,
  ValhallaManeuver,
  ValhallaTrip,
} from './valhallaSchema';

const MANEUVER: Record<number, { type: string; modifier?: string }> = {
  1: { type: 'depart' },
  4: { type: 'arrive' },
  8: { type: 'continue', modifier: 'straight' },
  9: { type: 'turn', modifier: 'slight right' },
  10: { type: 'turn', modifier: 'right' },
  11: { type: 'turn', modifier: 'sharp right' },
  14: { type: 'turn', modifier: 'sharp left' },
  15: { type: 'turn', modifier: 'left' },
  16: { type: 'turn', modifier: 'slight left' },
  23: { type: 'keep', modifier: 'right' },
  24: { type: 'keep', modifier: 'left' },
  26: { type: 'roundabout' },
  27: { type: 'exit roundabout' },
};

function lengthToMetres(length: number, units: string | undefined): number {
  if (units === 'miles') {
    return length * 1609.34;
  }
  return length * 1000;
}

function decodeShape(shape: unknown): LatLng[] {
  if (typeof shape === 'string') {
    return decodePolyline(shape, 1e6);
  }
  if (
    typeof shape === 'object' &&
    shape !== null &&
    'coordinates' in shape &&
    Array.isArray((shape as { coordinates: unknown }).coordinates)
  ) {
    const coords = (shape as { coordinates: unknown[] }).coordinates;
    const out: LatLng[] = [];
    for (const item of coords) {
      if (
        Array.isArray(item) &&
        typeof item[0] === 'number' &&
        typeof item[1] === 'number'
      ) {
        out.push({ lng: item[0], lat: item[1] });
      }
    }
    return out;
  }
  return [];
}

export function coordsFromValhallaTrip(trip: ValhallaTrip): LatLng[] {
  const fromLeg = trip.legs[0]?.shape;
  if (fromLeg) {
    const decoded = decodeShape(fromLeg);
    if (decoded.length >= 2) {
      return decoded;
    }
  }
  const asRecord = trip as unknown as { shape?: unknown };
  return decodeShape(asRecord.shape);
}

function mapManeuver(maneuver: ValhallaManeuver, coords: LatLng[]): RouteStep {
  const mapped = MANEUVER[maneuver.type] ?? { type: 'turn' };
  const idx = Math.min(
    maneuver.begin_shape_index ?? 0,
    Math.max(0, coords.length - 1),
  );
  return {
    distanceM: lengthToMetres(maneuver.length, 'kilometers'),
    durationS: maneuver.time,
    roadName: maneuver.street_names?.[0],
    maneuver: {
      type: mapped.type,
      modifier: mapped.modifier,
      instruction: maneuver.instruction,
      location: coords[idx] ?? coords[0],
    },
  };
}

function roadSharesFromTrip(trip: ValhallaTrip): RoadShares {
  const flag = trip.summary.has_highway;
  return {
    motorwayShare: flag === undefined ? null : flag ? 1 : 0,
    lowSpeedRoadShare: null,
    streetShare: null,
    unpavedShare: null,
  };
}

function mapTrip(
  trip: ValhallaTrip,
  index: number,
  profileId: RouteStyle,
  waypointsUsed: LatLng[],
  fastestDurationS: number,
): RouteCandidate {
  const coords = coordsFromValhallaTrip(trip);
  const geometry = buildRouteGeometry(coords, null);
  const durationS = trip.summary.time;
  const steps = trip.legs.flatMap((leg) =>
    leg.maneuvers.map((m) => mapManeuver(m, coords)),
  );
  const roadShares = roadSharesFromTrip(trip);
  return {
    id: `valhalla-${index}`,
    providerId: 'valhalla',
    geometry,
    steps,
    breakdown: emptyBreakdown(
      geometry.lengthM,
      durationS,
      null,
      roadShares.motorwayShare,
      roadShares.lowSpeedRoadShare,
    ),
    fastestDurationS,
    profileId,
    waypointsUsed,
    ascentM: null,
    descentM: null,
    roadShares,
  };
}

export function mapValhallaDirections(
  data: ValhallaDirections,
  profileId: RouteStyle,
  waypointsUsed: LatLng[],
): RouteCandidate[] {
  const trips: ValhallaTrip[] = [
    data.trip,
    ...(data.alternates ?? []).map((alt) => alt.trip),
  ];
  const fastestDurationS = Math.min(...trips.map((t) => t.summary.time));
  return trips
    .map((trip, index) =>
      mapTrip(trip, index, profileId, waypointsUsed, fastestDurationS),
    )
    .filter((c) => c.geometry.coords.length >= 2);
}
