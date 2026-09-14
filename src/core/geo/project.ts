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

  const cum = cumulativeDistancesM(coords);
  const origin = coords[0];
  const metersPerDegLat = 111_320;
  const metersPerDegLng = 111_320 * Math.cos((origin.lat * Math.PI) / 180);

  const toXY = (p: LatLng): { x: number; y: number } => ({
    x: (p.lng - origin.lng) * metersPerDegLng,
    y: (p.lat - origin.lat) * metersPerDegLat,
  });

  const target = toXY(point);
  let bestDistSq = Number.POSITIVE_INFINITY;
  let best: PolylineProjection = {
    point: coords[0],
    distanceAlongM: 0,
    crossTrackM: 0,
    segmentIndex: 0,
  };

  for (let i = 0; i < coords.length - 1; i += 1) {
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
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      const alongSegM = Math.sqrt(abLenSq) * t;
      best = {
        point: {
          lat: coords[i].lat + t * (coords[i + 1].lat - coords[i].lat),
          lng: coords[i].lng + t * (coords[i + 1].lng - coords[i].lng),
        },
        distanceAlongM: cum[i] + alongSegM,
        crossTrackM: Math.sqrt(distSq),
        segmentIndex: i,
      };
    }
  }

  return best;
}
