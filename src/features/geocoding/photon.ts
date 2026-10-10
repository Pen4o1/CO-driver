import { APP_USER_AGENT } from '@/core/config';
import { appError, type AppError } from '@/core/errors';
import { err, ok, type Result } from '@/core/result';
import type { LatLng } from '@/core/types';
import { hashKey, type StringCache } from '@/features/storage/kvCache';

import {
  errorFromHttpStatus,
  errorFromUnknown,
  parseRetryAfterMs,
  type HttpGet,
} from '../routing/httpErrors';
import {
  normalizeAddressQuery,
  photonSearchUrl,
  presentPhotonHits,
  type PhotonPlace,
} from './photonHits';
import { photonResponseSchema, type PhotonHit } from './photonSchema';

const HOT_MAX = 40;
const hotCache = new Map<string, string>();

export type PhotonQuery = {
  bias?: LatLng;
  /** Only de, en, and fr are sent. Anything else is omitted. */
  lang?: string;
  signal?: AbortSignal;
};

export function clearPhotonHotCache(): void {
  hotCache.clear();
}

function rememberHot(key: string, value: string) {
  hotCache.delete(key);
  hotCache.set(key, value);
  while (hotCache.size > HOT_MAX) {
    const oldest = hotCache.keys().next().value;
    if (oldest === undefined) break;
    hotCache.delete(oldest);
  }
}

function cacheKey(
  query: string,
  lang: string | undefined,
  bias?: LatLng,
): string {
  const lat = bias ? bias.lat.toFixed(1) : '-';
  const lng = bias ? bias.lng.toFixed(1) : '-';
  return hashKey(`${query.toLocaleLowerCase()}|${lang ?? ''}|${lat}|${lng}`);
}

function isAbortError(caught: unknown): boolean {
  if (typeof caught !== 'object' || caught === null) return false;
  const name =
    'name' in caught ? String((caught as { name: unknown }).name) : '';
  const message =
    'message' in caught ? String((caught as { message: unknown }).message) : '';
  return name === 'AbortError' || /aborted/i.test(message);
}

async function readCached(
  cache: StringCache | undefined,
  key: string,
): Promise<string | null> {
  const hot = hotCache.get(key);
  if (hot !== undefined) return hot;
  if (!cache) return null;
  const stored = await cache.get(key);
  if (stored !== null) rememberHot(key, stored);
  return stored;
}

function placesFrom(
  features: {
    properties: PhotonPlace;
    geometry: { coordinates: [number, number] };
  }[],
): { place: PhotonPlace; lat: number; lng: number }[] {
  return features.map((feature) => ({
    place: feature.properties,
    lng: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1],
  }));
}

export async function searchPhoton(
  query: string,
  deps: { fetchImpl: HttpGet; cache?: StringCache },
  options: PhotonQuery = {},
): Promise<Result<PhotonHit[], AppError>> {
  const normalized = normalizeAddressQuery(query);
  if (normalized.trim().length < 3) return ok([]);
  const lang =
    options.lang === 'de' || options.lang === 'en' || options.lang === 'fr'
      ? options.lang
      : undefined;
  const key = cacheKey(normalized, lang, options.bias);
  try {
    const cached = await readCached(deps.cache, key);
    let parsed: ReturnType<typeof photonResponseSchema.safeParse> | null = null;
    if (cached) {
      try {
        const fromCache = photonResponseSchema.safeParse(JSON.parse(cached));
        if (fromCache.success) parsed = fromCache;
      } catch {
        parsed = null;
      }
    }
    if (!parsed?.success) {
      if (options.signal?.aborted) return ok([]);
      const response = await deps.fetchImpl(
        photonSearchUrl(normalized, { lang, bias: options.bias }),
        {
          method: 'GET',
          headers: {
            'User-Agent': APP_USER_AGENT,
            Accept: 'application/json',
          },
          signal: options.signal,
        },
      );
      if (!response.ok) {
        if (response.status === 400) {
          return err(
            appError(
              'invalid-response',
              'Search could not understand that. Try the place and the city.',
            ),
          );
        }
        const bodyText = await response.text();
        return err(
          errorFromHttpStatus(
            'Photon',
            response.status,
            bodyText,
            parseRetryAfterMs(response.headers.get('retry-after'), Date.now()),
          ),
        );
      }
      const json: unknown = await response.json();
      const fresh = photonResponseSchema.safeParse(json);
      if (!fresh.success) {
        return err(
          appError('invalid-response', 'Search returned an unexpected result.'),
        );
      }
      const encoded = JSON.stringify(json);
      rememberHot(key, encoded);
      if (deps.cache) await deps.cache.set(key, encoded);
      parsed = fresh;
    }
    if (!parsed?.success) {
      return err(
        appError('invalid-response', 'Search returned an unexpected result.'),
      );
    }
    return ok(
      presentPhotonHits(
        placesFrom(parsed.data.features),
        normalized,
        options.bias,
      ),
    );
  } catch (caught) {
    if (isAbortError(caught) || options.signal?.aborted) return ok([]);
    return err(errorFromUnknown(caught));
  }
}
