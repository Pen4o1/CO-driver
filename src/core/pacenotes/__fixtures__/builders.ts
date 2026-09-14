import { destinationPoint } from '@/core/geo/destination';
import { buildRouteGeometry } from '@/core/geo/buildGeometry';
import type { LatLng, RouteGeometry } from '@/core/types';

const ORIGIN: LatLng = { lat: 42.7, lng: 23.32 };

function walkArc(
  start: LatLng,
  headingDeg: number,
  radiusM: number,
  sweepDeg: number,
  direction: 'left' | 'right',
  stepM: number,
): { coords: LatLng[]; headingDeg: number } {
  const sign = direction === 'right' ? 1 : -1;
  const arcM = radiusM * (Math.abs(sweepDeg) * (Math.PI / 180));
  const n = Math.max(8, Math.round(arcM / stepM));
  const ds = arcM / n;
  const dHeading = (sign * Math.abs(sweepDeg)) / n;
  const coords: LatLng[] = [];
  let pos = start;
  let heading = headingDeg;
  for (let i = 0; i < n; i += 1) {
    pos = destinationPoint(pos, heading, ds);
    heading += dHeading;
    coords.push(pos);
  }
  return { coords, headingDeg: heading };
}

function walkStraight(
  start: LatLng,
  headingDeg: number,
  lengthM: number,
  stepM: number,
): LatLng[] {
  const n = Math.max(2, Math.round(lengthM / stepM));
  const ds = lengthM / n;
  const coords: LatLng[] = [];
  let pos = start;
  for (let i = 0; i < n; i += 1) {
    pos = destinationPoint(pos, headingDeg, ds);
    coords.push(pos);
  }
  return coords;
}

/**
 * Perfect circular arc with straight lead-in / lead-out so hysteresis can close.
 */
export function makeArc(input: {
  radiusM: number;
  sweepDeg: number;
  direction?: 'left' | 'right';
  leadM?: number;
  stepM?: number;
  start?: LatLng;
  headingDeg?: number;
}): RouteGeometry {
  const direction = input.direction ?? 'right';
  const leadM = input.leadM ?? 80;
  const stepM = input.stepM ?? 2;
  const start = input.start ?? ORIGIN;
  const heading0 = input.headingDeg ?? 0;
  const lead = walkStraight(start, heading0, leadM, stepM);
  const lastLead = lead[lead.length - 1] ?? start;
  const arc = walkArc(
    lastLead,
    heading0,
    input.radiusM,
    input.sweepDeg,
    direction,
    stepM,
  );
  const lastArc = arc.coords[arc.coords.length - 1] ?? lastLead;
  const tail = walkStraight(lastArc, arc.headingDeg, leadM, stepM);
  return buildRouteGeometry([start, ...lead, ...arc.coords, ...tail], null);
}

/** Left-right-left chicane with ~15 m gaps (into-chain). */
export function makeChicane(input?: {
  radiusM?: number;
  sweepDeg?: number;
  gapM?: number;
  leadM?: number;
}): RouteGeometry {
  const radiusM = input?.radiusM ?? 35;
  const sweepDeg = input?.sweepDeg ?? 80;
  const gapM = input?.gapM ?? 15;
  const leadM = input?.leadM ?? 60;
  const stepM = 2;
  const start = ORIGIN;
  let heading = 0;
  let pos = start;
  const coords: LatLng[] = [start];

  const append = (pts: LatLng[]) => {
    coords.push(...pts);
    pos = pts[pts.length - 1] ?? pos;
  };

  append(walkStraight(pos, heading, leadM, stepM));
  for (const dir of ['left', 'right', 'left'] as const) {
    const arc = walkArc(pos, heading, radiusM, sweepDeg, dir, stepM);
    append(arc.coords);
    heading = arc.headingDeg;
    append(walkStraight(pos, heading, gapM, stepM));
  }
  append(walkStraight(pos, heading, leadM, stepM));
  return buildRouteGeometry(coords, null);
}

export function makeClosedCircle(radiusM: number, stepM = 2): RouteGeometry {
  const start = ORIGIN;
  const heading0 = 0;
  const arc = walkArc(start, heading0, radiusM, 360, 'right', stepM);
  return buildRouteGeometry([start, ...arc.coords, start], null);
}

export function geometryFromLngLat(
  tuples: [number, number][] | [number, number, number][],
): RouteGeometry {
  const coords: LatLng[] = tuples.map((t) => ({ lng: t[0], lat: t[1] }));
  const hasZ = tuples.some((t) => t.length === 3);
  const elevationM = hasZ
    ? Float64Array.from(tuples.map((t) => (t.length === 3 ? t[2] : Number.NaN)))
    : null;
  return buildRouteGeometry(coords, elevationM);
}
