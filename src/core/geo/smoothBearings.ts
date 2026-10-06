import type { LatLng } from '@/core/types';

import { bearingDeg } from './bearing';
import { cumulativeDistancesM } from './cumulative';

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function hannWeight(ds: number, windowM: number): number {
  const t = windowM === 0 ? 0 : ds / windowM;
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

function vertexBearingsDeg(coords: LatLng[]): number[] {
  if (coords.length === 0) {
    return [];
  }
  if (coords.length === 1) {
    return [0];
  }
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
 * Circular moving average of vertex bearings.
 * Window is metres along-track on each side. Hann weights. Does not invent samples.
 * Cumulative distance is monotonic, so each vertex only visits neighbours inside the window.
 */
export function smoothBearings(coords: LatLng[], windowM: number): number[] {
  const raw = vertexBearingsDeg(coords);
  if (raw.length <= 2 || windowM <= 0) {
    return raw;
  }
  const cum = cumulativeDistancesM(coords);
  const out = new Array<number>(raw.length);
  let left = 0;

  for (let i = 0; i < raw.length; i += 1) {
    while (cum[i] - cum[left] > windowM) {
      left += 1;
    }
    let right = i;
    while (right + 1 < raw.length && cum[right + 1] - cum[i] <= windowM) {
      right += 1;
    }
    let sumSin = 0;
    let sumCos = 0;
    let weightSum = 0;
    for (let j = left; j <= right; j += 1) {
      const ds = Math.abs(cum[j] - cum[i]);
      const w = hannWeight(ds, windowM);
      const rad = (raw[j] * Math.PI) / 180;
      sumSin += w * Math.sin(rad);
      sumCos += w * Math.cos(rad);
      weightSum += w;
    }
    if (weightSum === 0) {
      out[i] = raw[i];
    } else {
      out[i] = wrap360((Math.atan2(sumSin, sumCos) * 180) / Math.PI);
    }
  }
  return out;
}
