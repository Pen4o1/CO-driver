import { z } from 'zod';

import { APP_USER_AGENT, OSRM_NEAREST_URL } from '@/core/config';
import type { LatLng } from '@/core/types';

import type { HttpGet } from '../httpErrors';
import { type StringCache } from '../../storage/kvCache';

export type RoadSnapper = {
  snap(point: LatLng): Promise<LatLng | null>;
};

const osrmNearestSchema = z.object({
  code: z.string(),
  waypoints: z
    .array(
      z.object({
        location: z.tuple([z.number(), z.number()]),
        distance: z.number().optional(),
      }),
    )
    .optional(),
});

export function gridCellId(point: LatLng): string {
  return `${Math.round(point.lat * 1000)}_${Math.round(point.lng * 1000)}`;
}

export function createOsrmSnapper(deps: {
  fetchImpl: HttpGet;
  cache?: StringCache;
}): RoadSnapper {
  return {
    async snap(point) {
      const cell = gridCellId(point);
      const cached = deps.cache ? await deps.cache.get(`snap:${cell}`) : null;
      if (cached) {
        const parsed = JSON.parse(cached) as LatLng;
        return parsed;
      }
      const url = `${OSRM_NEAREST_URL}/${point.lng},${point.lat}?number=1`;
      try {
        const response = await deps.fetchImpl(url, {
          method: 'GET',
          headers: { 'User-Agent': APP_USER_AGENT, Accept: 'application/json' },
        });
        if (!response.ok) {
          return null;
        }
        const json: unknown = await response.json();
        const parsed = osrmNearestSchema.safeParse(json);
        const loc = parsed.data?.waypoints?.[0]?.location;
        if (!parsed.success || !loc) {
          return null;
        }
        const snapped: LatLng = { lng: loc[0], lat: loc[1] };
        if (deps.cache) {
          await deps.cache.set(`snap:${cell}`, JSON.stringify(snapped));
        }
        return snapped;
      } catch {
        return null;
      }
    },
  };
}

export function identitySnapper(): RoadSnapper {
  return {
    async snap(point) {
      return point;
    },
  };
}
