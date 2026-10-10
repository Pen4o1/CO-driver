import type { LatLng } from '@/core/types';

import { cumulativeDistancesM } from './cumulative';
import { haversineM } from './haversine';

export type PolylineProjection = {
  point: LatLng;
  distanceAlongM: number;
  crossTrackM: number;
  segmentIndex: number;
};

function dot(ax: number, ay: number, bx: number, by: number): number {
  return ax * bx + ay * by;
}

/**
 * Metres of along-track gap that count as much as one metre of cross-track.
 * Keeps a nearer later leg of a hairpin from stealing progress.
 */
const ALONG_WEIGHT = 0.3;

function progressScore(hit: PolylineProjection, expectedM: number): number {
  return (
    hit.crossTrackM + ALONG_WEIGHT * Math.abs(hit.distanceAlongM - expectedM)
  );
}

function projectionsOnPolyline(
  point: LatLng,
  coords: LatLng[],
  minM: number,
  maxM: number,
): PolylineProjection[] {
  const cum = cumulativeDistancesM(coords);
  const origin = coords[0];
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  const toXY = (p: LatLng): { x: number; y: number } => ({
    x: (p.lng - origin.lng) * metersPerDegLng,
    y: (p.lat - origin.lat) * metersPerDegLat,
  });
  const target = toXY(point);
  const hits: PolylineProjection[] = [];

  for (let i = 0; i < coords.length - 1; i += 1) {
    if (cum[i + 1] < minM || cum[i] > maxM) {
      continue;
    }
    const a = toXY(coords[i]);
    const b = toXY(coords[i + 1]);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abLenSq = abx * abx + aby * aby;
    const t =
      abLenSq === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              dot(target.x - a.x, target.y - a.y, abx, aby) / abLenSq,
            ),
          );
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    const dx = target.x - px;
    const dy = target.y - py;
    const alongSegM = Math.sqrt(abLenSq) * t;
    const distanceAlongM = cum[i] + alongSegM;
    if (distanceAlongM < minM - 1 || distanceAlongM > maxM + 1) {
      continue;
    }
    hits.push({
      point: {
        lat: coords[i].lat + t * (coords[i + 1].lat - coords[i].lat),
        lng: coords[i].lng + t * (coords[i + 1].lng - coords[i].lng),
      },
      distanceAlongM,
      crossTrackM: Math.hypot(dx, dy),
      segmentIndex: i,
    });
  }
  return hits;
}

/**
 * Closest point on the polyline to `point`.
 *
 * Local projection is done in a local ENU approximation around the segment
 * start (metres), then converted back to lat/lng. Fine for road-scale segments.
 */
export function projectOnPolyline(
  point: LatLng,
  coords: LatLng[],
): PolylineProjection {
  if (coords.length === 0) {
    throw new Error('projectOnPolyline: empty polyline');
  }
  if (coords.length === 1) {
    return {
      point: coords[0],
      distanceAlongM: 0,
      crossTrackM: haversineM(point, coords[0]),
      segmentIndex: 0,
    };
  }

  const hits = projectionsOnPolyline(
    point,
    coords,
    0,
    Number.POSITIVE_INFINITY,
  );
  return hits.reduce((best, hit) =>
    hit.crossTrackM < best.crossTrackM ? hit : best,
  );
}

export type ProgressQuery = {
  point: LatLng;
  coords: LatLng[];
  /** Last accepted distance along the route. Null searches the whole line. */
  hintM: number | null;
  /** Where the car should be now, usually hint + speed × dt. */
  expectedM: number | null;
  backM: number;
  aheadM: number;
};

/**
 * Follow progress along a route.
 *
 * The geographically closest vertex can be a later leg of a hairpin. That
 * snap skips every turn in between and can land on the finish. Search only
 * the window around the last accepted distance. A later leg only wins when it
 * is close to where the car should be, not merely closer on the map.
 */
export function projectProgress(query: ProgressQuery): PolylineProjection {
  if (query.hintM == null || query.coords.length < 2) {
    return projectOnPolyline(query.point, query.coords);
  }
  const minM = Math.max(0, query.hintM - query.backM);
  const maxM = query.hintM + query.aheadM;
  const expected = query.expectedM ?? query.hintM;
  const hits = projectionsOnPolyline(query.point, query.coords, minM, maxM);
  if (hits.length === 0) {
    const global = projectOnPolyline(query.point, query.coords);
    if (global.distanceAlongM < minM || global.distanceAlongM > maxM) {
      return { ...global, distanceAlongM: query.hintM };
    }
    return global;
  }
  return hits.reduce((best, hit) =>
    progressScore(hit, expected) < progressScore(best, expected) ? hit : best,
  );
}
