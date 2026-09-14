import { deriveAscentDescent } from '@/core/geo/elevation';
import { emptyBreakdown } from '@/core/routing';
import type { LatLng, RouteCandidate, RouteStyle } from '@/core/types';
import { buildRouteGeometry } from '@/core/geo/buildGeometry';

import { extraBlockByKeys } from './orsExtras';
import { roadSharesFromOrsExtras } from './orsRoadShares';
import type { OrsCoord, OrsDirections, OrsFeature } from './orsSchema';
import { mapOrsSteps } from './orsSteps';

function splitCoords(raw: OrsCoord[]): {
  coords: LatLng[];
  elevationM: Float64Array | null;
} {
  const coords: LatLng[] = [];
  const hasZ = raw.some((c) => c.length === 3);
  const elevationM = hasZ ? new Float64Array(raw.length) : null;
  for (let i = 0; i < raw.length; i += 1) {
    const tuple = raw[i];
    coords.push({ lng: tuple[0], lat: tuple[1] });
    if (elevationM) {
      elevationM[i] = tuple.length === 3 ? tuple[2] : Number.NaN;
    }
  }
  return { coords, elevationM };
}

function mapFeature(
  feature: OrsFeature,
  index: number,
  providerId: string,
  profileId: RouteStyle,
  waypointsUsed: LatLng[],
  fastestDurationS: number,
): RouteCandidate {
  const { coords, elevationM } = splitCoords(feature.geometry.coordinates);
  const geometry = buildRouteGeometry(coords, elevationM);
  const derived = deriveAscentDescent(elevationM, geometry.cumulative);
  const extras = feature.properties.extras;
  const wayType = extraBlockByKeys(extras, ['waytype', 'waytypes']);
  const surface = extraBlockByKeys(extras, ['surface', 'surfaces']);
  const durationS = feature.properties.summary.duration;
  return {
    id: `${providerId}-${index}`,
    providerId,
    geometry,
    steps: mapOrsSteps(feature, coords, wayType, surface),
    breakdown: emptyBreakdown(
      geometry.lengthM,
      durationS,
      derived?.ascentM ?? null,
    ),
    fastestDurationS,
    profileId,
    waypointsUsed,
    ascentM: derived?.ascentM ?? null,
    descentM: derived?.descentM ?? null,
    roadShares: roadSharesFromOrsExtras(
      extras,
      geometry.cumulative,
      geometry.lengthM,
    ),
  };
}

export function mapOrsDirections(
  data: OrsDirections,
  providerId: string,
  profileId: RouteStyle,
  waypointsUsed: LatLng[],
): RouteCandidate[] {
  const fastestDurationS = Math.min(
    ...data.features.map((f) => f.properties.summary.duration),
  );
  return data.features.map((feature, index) =>
    mapFeature(
      feature,
      index,
      providerId,
      profileId,
      waypointsUsed,
      fastestDurationS,
    ),
  );
}
