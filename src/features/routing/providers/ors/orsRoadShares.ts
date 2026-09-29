import { shareWhere } from '@/core/scoring/roadShares';
import type { RoadShares } from '@/core/types';

import type { OrsExtraBlock } from './orsSchema';
import { extraBlockByKeys } from './orsExtras';

/** ORS extra_info.surface IDs treated as unpaved. */
const UNPAVED_SURFACE_IDS = new Set([2, 8, 9, 10, 11, 12, 15, 16, 17]);

export function roadSharesFromOrsExtras(
  extras: Record<string, OrsExtraBlock> | undefined,
  cumulative: Float64Array,
  lengthM: number,
): RoadShares {
  const wayType = extraBlockByKeys(extras, ['waytype', 'waytypes']);
  const wayCategory = extraBlockByKeys(extras, [
    'waycategory',
    'waycategories',
  ]);
  const surface = extraBlockByKeys(extras, ['surface', 'surfaces']);
  return {
    motorwayShare: shareWhere(
      wayCategory?.values,
      cumulative,
      lengthM,
      (value) => (value & 1) === 1,
    ),
    // Waytype 2 is secondary/tertiary/unclassified (country road), 5 is track.
    // Waytype 3 is a city street — counted separately so loops can drop it.
    lowSpeedRoadShare: shareWhere(
      wayType?.values,
      cumulative,
      lengthM,
      (value) => value === 2 || value === 5,
    ),
    streetShare: shareWhere(
      wayType?.values,
      cumulative,
      lengthM,
      (value) => value === 3,
    ),
    unpavedShare: shareWhere(surface?.values, cumulative, lengthM, (value) =>
      UNPAVED_SURFACE_IDS.has(value),
    ),
  };
}
