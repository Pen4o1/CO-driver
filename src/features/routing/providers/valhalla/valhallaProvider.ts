import { APP_USER_AGENT, VALHALLA_DEFAULT_URL } from '@/core/config';
import { appError } from '@/core/errors';
import type { RouteRequest, RoutingProvider } from '@/core/routing';
import type { LatLng, RouteGeometry } from '@/core/types';

import {
  errorFromHttpStatus,
  errorFromUnknown,
  parseRetryAfterMs,
  type HttpGet,
} from '../../httpErrors';
import { hashKey, type StringCache } from '../../../storage/kvCache';
import { mapValhallaDirections } from './valhallaMapper';
import { valhallaDirectionsSchema } from './valhallaSchema';
import { geometryFromTrace, valhallaTraceBody } from './valhallaTrace';

export type ValhallaProviderDeps = {
  fetchImpl: HttpGet;
  getBaseUrl?: () => string | undefined;
  cache?: StringCache;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onRawResponse?: (raw: unknown) => void;
};

function numParam(
  params: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  const raw = params?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

export function valhallaRequestBody(
  req: RouteRequest,
): Record<string, unknown> {
  const useHighways = numParam(req.providerParams, 'useHighways', 0.5);
  const useTrails = numParam(req.providerParams, 'useTrails', 0);
  const useLivingStreets = numParam(
    req.providerParams,
    'useLivingStreets',
    0.5,
  );
  const servicePenalty = numParam(req.providerParams, 'servicePenalty', 0);
  const twoPoint = req.waypoints.length === 2 && !req.roundTrip;
  return {
    locations: req.waypoints.map((p) => ({ lat: p.lat, lon: p.lng })),
    costing: 'motorcycle',
    costing_options: {
      motorcycle: {
        use_highways: useHighways,
        use_trails: useTrails,
        use_living_streets: useLivingStreets,
        ...(servicePenalty > 0 ? { service_penalty: servicePenalty } : {}),
      },
    },
    ...(twoPoint && req.alternatives ? { alternates: 2 } : {}),
    shape_format: 'polyline6',
    directions_options: { units: 'kilometers', language: 'en-US' },
  };
}

export function createValhallaProvider(
  deps: ValhallaProviderDeps,
): RoutingProvider {
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = deps.now ?? (() => Date.now());

  async function requestJson(
    path: '/route' | '/trace_route',
    body: unknown,
    didRetry: boolean,
  ): Promise<unknown> {
    const base = (deps.getBaseUrl?.() ?? VALHALLA_DEFAULT_URL).replace(
      /\/$/,
      '',
    );
    const url = `${base}${path}`;
    const cacheKey = hashKey(`valhalla:${path}:${JSON.stringify(body)}`);
    const cached = deps.cache ? await deps.cache.get(cacheKey) : null;
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const response = await deps.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': APP_USER_AGENT,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && !didRetry) {
      const retryAfterMs =
        parseRetryAfterMs(response.headers.get('retry-after'), now()) ?? 1000;
      await sleep(retryAfterMs);
      return requestJson(path, body, true);
    }

    if (!response.ok) {
      const text = await response.text();
      throw errorFromHttpStatus(
        'Valhalla',
        response.status,
        text,
        parseRetryAfterMs(response.headers.get('retry-after'), now()),
      );
    }

    const json: unknown = await response.json();
    if (deps.cache) {
      await deps.cache.set(cacheKey, JSON.stringify(json));
    }
    return json;
  }

  return {
    id: 'valhalla',
    async route(req) {
      if (req.waypoints.length < 2) {
        throw appError('no-route', 'Need a start and an end pin.');
      }
      try {
        const raw = await requestJson(
          '/route',
          valhallaRequestBody(req),
          false,
        );
        deps.onRawResponse?.(raw);
        const parsed = valhallaDirectionsSchema.safeParse(raw);
        if (!parsed.success) {
          throw appError(
            'invalid-response',
            `Valhalla response failed validation: ${parsed.error.message}`,
          );
        }
        const mapped = mapValhallaDirections(
          parsed.data,
          req.profileId,
          req.waypoints,
        );
        if (mapped.length === 0) {
          throw appError('no-route', 'Valhalla returned an empty shape.');
        }
        return mapped;
      } catch (caught) {
        throw errorFromUnknown(caught);
      }
    },
    async match(locs: LatLng[]): Promise<RouteGeometry> {
      if (locs.length < 2) {
        throw appError('no-route', 'Need at least two points to match.');
      }
      try {
        const raw = await requestJson(
          '/trace_route',
          valhallaTraceBody(locs),
          false,
        );
        deps.onRawResponse?.(raw);
        return geometryFromTrace(raw);
      } catch (caught) {
        throw errorFromUnknown(caught);
      }
    },
  };
}
