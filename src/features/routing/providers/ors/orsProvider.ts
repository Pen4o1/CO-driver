import { APP_USER_AGENT, ORS_DIRECTIONS_URL } from '@/core/config';
import { appError } from '@/core/errors';
import { buildRouteGeometry } from '@/core/geo';
import type {
  RoundTripRequest,
  RouteRequest,
  RoutingProvider,
} from '@/core/routing';
import type { LatLng, RouteGeometry } from '@/core/types';

import {
  errorFromHttpStatus,
  errorFromUnknown,
  parseRetryAfterMs,
  type HttpGet,
} from '../../httpErrors';
import { hashKey, type StringCache } from '../../../storage/kvCache';
import { mapOrsDirections } from './orsMapper';
import { orsDirectionsSchema } from './orsSchema';

const AVOID_FEATURES = ['highways', 'tollways', 'ferries', 'fords'] as const;

export type OrsProviderDeps = {
  fetchImpl: HttpGet;
  getApiKey: () => string | undefined;
  cache?: StringCache;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onRawResponse?: (raw: unknown) => void;
};

function toOrsCoordinates(waypoints: LatLng[]): [number, number][] {
  return waypoints.map((p) => [p.lng, p.lat]);
}

function avoidFeaturesFrom(
  params: Record<string, unknown> | undefined,
): string[] {
  const raw = params?.avoidFeatures;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (item): item is (typeof AVOID_FEATURES)[number] =>
      typeof item === 'string' &&
      (AVOID_FEATURES as readonly string[]).includes(item),
  );
}

function orsPreference(
  params: Record<string, unknown> | undefined,
): 'recommended' | 'fastest' | 'shortest' {
  const raw = params?.orsPreference;
  if (raw === 'fastest' || raw === 'shortest' || raw === 'recommended') {
    return raw;
  }
  return 'recommended';
}

function buildOptions(req: RouteRequest): Record<string, unknown> | undefined {
  const avoid = avoidFeaturesFrom(req.providerParams);
  const roundTrip = req.roundTrip;
  if (avoid.length === 0 && !roundTrip) {
    return undefined;
  }
  return {
    ...(avoid.length > 0 ? { avoid_features: avoid } : {}),
    ...(roundTrip
      ? {
          round_trip: {
            length: roundTrip.lengthM,
            points: roundTrip.points,
            seed: roundTrip.seed,
          },
        }
      : {}),
  };
}

export function orsRequestBody(req: RouteRequest): Record<string, unknown> {
  const options = buildOptions(req);
  return {
    coordinates: toOrsCoordinates(req.waypoints),
    preference: orsPreference(req.providerParams),
    elevation: true,
    extra_info: ['waytype', 'waycategory', 'steepness', 'surface'],
    units: 'm',
    language: 'en',
    instructions: true,
    ...(req.alternatives && !req.roundTrip
      ? {
          alternative_routes: {
            target_count: 3,
            weight_factor: 1.6,
            share_factor: 0.6,
          },
        }
      : {}),
    ...(options ? { options } : {}),
  };
}

export type { RoundTripRequest };

export function createOrsProvider(deps: OrsProviderDeps): RoutingProvider {
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = deps.now ?? (() => Date.now());

  async function requestDirections(
    req: RouteRequest,
    didRetry: boolean,
  ): Promise<unknown> {
    const apiKey = deps.getApiKey();
    if (!apiKey) {
      throw appError(
        'bad-key',
        'Missing EXPO_PUBLIC_ORS_API_KEY. Get a free key at openrouteservice.org.',
      );
    }
    const body = orsRequestBody(req);
    const cacheKey = hashKey(JSON.stringify(body));
    const cached = deps.cache ? await deps.cache.get(cacheKey) : null;
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const response = await deps.fetchImpl(ORS_DIRECTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
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
      return requestDirections(req, true);
    }

    if (!response.ok) {
      const text = await response.text();
      throw errorFromHttpStatus(
        'OpenRouteService',
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
    id: 'ors',
    async route(req) {
      const minPoints = req.roundTrip ? 1 : 2;
      if (req.waypoints.length < minPoints) {
        throw appError('no-route', 'Need a start pin.');
      }
      try {
        const raw = await requestDirections(req, false);
        deps.onRawResponse?.(raw);
        const parsed = orsDirectionsSchema.safeParse(raw);
        if (!parsed.success) {
          throw appError(
            'invalid-response',
            `ORS response failed validation: ${parsed.error.message}`,
          );
        }
        return mapOrsDirections(
          parsed.data,
          'ors',
          req.profileId,
          req.waypoints,
        );
      } catch (caught) {
        throw errorFromUnknown(caught);
      }
    },
    async match(locs: LatLng[]): Promise<RouteGeometry> {
      if (locs.length < 2) {
        throw appError('no-route', 'Need at least two points to match.');
      }
      return buildRouteGeometry(locs, null);
    },
  };
}
