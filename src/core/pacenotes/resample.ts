import { bearingDeltaDeg, bearingDeg } from '@/core/geo/bearing';
import { cumulativeDistancesM, polylineLengthM } from '@/core/geo/cumulative';
import { resamplePolyline } from '@/core/geo/interpolate';
import { smoothBearings } from '@/core/geo/smoothBearings';
import type { LatLng, RouteGeometry } from '@/core/types';

import { BEARING_WINDOW_M, RESAMPLE_M } from './constants';
import type { Centreline } from './types';

function unsmoothedBearings(coords: LatLng[]): number[] {
  if (coords.length === 0) return [];
  if (coords.length === 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < coords.length; i += 1) {
    if (i === coords.length - 1) {
      out.push(bearingDeg(coords[i - 1], coords[i]));
    } else {
      out.push(bearingDeg(coords[i], coords[i + 1]));
    }
  }
  return out;
}

/**
 * Fit a 5 m centreline, Hann-smooth bearings, compute signed curvature.
 *
 * k[i] = bearingDelta(i-1, i+1) / (2 * ds) in rad/m (SPEC §4).
 * Endpoints use a one-sided Δθ / ds.
 */
export function resampleCentreline(geometry: RouteGeometry): Centreline {
  const coords = resamplePolyline(geometry.coords, RESAMPLE_M);
  const cumulative = cumulativeDistancesM(coords);
  const lengthM = polylineLengthM(cumulative);
  const bearingsDeg = smoothBearings(coords, BEARING_WINDOW_M);
  const rawBearingsDeg = unsmoothedBearings(coords);
  const n = coords.length;
  const dThetaDeg = new Float64Array(n);
  const rawDThetaDeg = new Float64Array(n);
  const curvaturePerM = new Float64Array(n);

  for (let i = 0; i < n - 1; i += 1) {
    dThetaDeg[i] = bearingDeltaDeg(bearingsDeg[i], bearingsDeg[i + 1]);
    rawDThetaDeg[i] = bearingDeltaDeg(rawBearingsDeg[i], rawBearingsDeg[i + 1]);
  }

  for (let i = 0; i < n; i += 1) {
    if (i === 0) {
      const ds = Math.max(cumulative[1] - cumulative[0], 1e-6);
      curvaturePerM[0] = (dThetaDeg[0] * Math.PI) / 180 / ds;
    } else if (i === n - 1) {
      const ds = Math.max(cumulative[i] - cumulative[i - 1], 1e-6);
      curvaturePerM[i] = (dThetaDeg[i - 1] * Math.PI) / 180 / ds;
    } else {
      const ds = Math.max(cumulative[i + 1] - cumulative[i - 1], 1e-6);
      const dTheta = bearingDeltaDeg(bearingsDeg[i - 1], bearingsDeg[i + 1]);
      curvaturePerM[i] = (dTheta * Math.PI) / 180 / ds;
    }
  }

  return {
    coords,
    cumulative,
    bearingsDeg,
    dThetaDeg,
    rawDThetaDeg,
    curvaturePerM,
    dsM: RESAMPLE_M,
    lengthM,
  };
}
