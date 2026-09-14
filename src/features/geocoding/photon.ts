import { APP_USER_AGENT, PHOTON_SEARCH_URL } from '@/core/config';
import { appError } from '@/core/errors';
import { err, ok, type Result } from '@/core/result';
import type { AppError } from '@/core/errors';
import { hashKey, type StringCache } from '@/features/storage/kvCache';

import { errorFromUnknown, type HttpGet } from '../routing/httpErrors';
import { photonResponseSchema, type PhotonHit } from './photonSchema';

function labelOf(properties: {
  name?: string;
  city?: string;
  country?: string;
  street?: string;
  housenumber?: string;
}): string {
  const parts = [
    [properties.housenumber, properties.street].filter(Boolean).join(' '),
    properties.name,
    properties.city,
    properties.country,
  ].filter((part) => part && part.length > 0);
  return [...new Set(parts)].join(', ');
}

export async function searchPhoton(
  query: string,
  deps: { fetchImpl: HttpGet; cache?: StringCache },
): Promise<Result<PhotonHit[], AppError>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return ok([]);
  }
  const cacheKey = hashKey(trimmed.toLowerCase());
  try {
    const cached = deps.cache ? await deps.cache.get(cacheKey) : null;
    const raw: unknown = cached
      ? (JSON.parse(cached) as unknown)
      : await (async () => {
          const url = `${PHOTON_SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=5`;
          const response = await deps.fetchImpl(url, {
            method: 'GET',
            headers: {
              'User-Agent': APP_USER_AGENT,
              Accept: 'application/json',
            },
          });
          if (!response.ok) {
            throw appError('unknown', `Photon error ${response.status}`);
          }
          const json: unknown = await response.json();
          if (deps.cache) {
            await deps.cache.set(cacheKey, JSON.stringify(json));
          }
          return json;
        })();
    const parsed = photonResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return err(
        appError(
          'invalid-response',
          `Photon response failed validation: ${parsed.error.message}`,
        ),
      );
    }
    return ok(
      parsed.data.features.map((feature) => ({
        label: labelOf(feature.properties) || 'Unknown place',
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
      })),
    );
  } catch (caught) {
    return err(errorFromUnknown(caught));
  }
}
