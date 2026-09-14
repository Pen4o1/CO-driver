import { bearingDeltaDeg } from '@/core/geo/bearing';
import { resamplePolyline } from '@/core/geo/interpolate';
import { smoothBearings } from '@/core/geo/smoothBearings';
import type { LatLng, RouteGeometry, TurnGrade } from '@/core/types';

import { HEAT_MERGE_MIN_M, SCORE_RESAMPLE_M } from './constants';
import { gradeFromRadiusM } from './gradeFromRadius';

export type GradeSegment = {
  coords: LatLng[];
  grade: TurnGrade;
};

/**
 * Colour the polyline by local corner grade.
 * Local radius from |dθ| / ds over one resample step; merge short runs.
 */
export function gradeHeatSegments(geometry: RouteGeometry): GradeSegment[] {
  const samples = resamplePolyline(geometry.coords, SCORE_RESAMPLE_M);
  if (samples.length < 2) {
    return [];
  }
  const bearings = smoothBearings(samples, 15);
  const grades: TurnGrade[] = [];
  for (let i = 0; i < samples.length - 1; i += 1) {
    const dTheta = Math.abs(bearingDeltaDeg(bearings[i], bearings[i + 1]));
    const ds = SCORE_RESAMPLE_M;
    const angleRad = dTheta * (Math.PI / 180);
    const radiusM = angleRad < 1e-6 ? 10_000 : ds / angleRad;
    grades.push(gradeFromRadiusM(radiusM));
  }

  const segments: GradeSegment[] = [];
  let start = 0;
  for (let i = 1; i <= grades.length; i += 1) {
    const ended = i === grades.length || grades[i] !== grades[start];
    if (!ended) {
      continue;
    }
    const coords = samples.slice(start, i + 1);
    const lengthM = (i - start) * SCORE_RESAMPLE_M;
    const last = segments[segments.length - 1];
    if (last && lengthM < HEAT_MERGE_MIN_M) {
      last.coords = last.coords.concat(coords.slice(1));
    } else {
      segments.push({ coords, grade: grades[start] });
    }
    start = i;
  }
  return segments;
}
