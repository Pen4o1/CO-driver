import type { LatLng, RouteStep } from '@/core/types';

import { extraValueAtIndex } from './orsExtras';
import type { OrsExtraBlock, OrsFeature } from './orsSchema';

const ORS_MANEUVER_TYPE: Record<number, { type: string; modifier?: string }> = {
  0: { type: 'turn', modifier: 'left' },
  1: { type: 'turn', modifier: 'right' },
  2: { type: 'turn', modifier: 'sharp left' },
  3: { type: 'turn', modifier: 'sharp right' },
  4: { type: 'turn', modifier: 'slight left' },
  5: { type: 'turn', modifier: 'slight right' },
  6: { type: 'continue', modifier: 'straight' },
  7: { type: 'roundabout' },
  8: { type: 'exit roundabout' },
  9: { type: 'uturn' },
  10: { type: 'arrive' },
  11: { type: 'depart' },
  12: { type: 'keep', modifier: 'left' },
  13: { type: 'keep', modifier: 'right' },
};

export function mapOrsSteps(
  feature: OrsFeature,
  coords: LatLng[],
  wayType: OrsExtraBlock | undefined,
  surface: OrsExtraBlock | undefined,
): RouteStep[] {
  const steps: RouteStep[] = [];
  for (const segment of feature.properties.segments) {
    for (const step of segment.steps) {
      const startIdx = step.way_points?.[0] ?? 0;
      const location =
        coords[Math.min(startIdx, coords.length - 1)] ?? coords[0];
      const mapped = ORS_MANEUVER_TYPE[step.type ?? -1] ?? {
        type: 'turn',
      };
      const wayTypeValue = wayType
        ? extraValueAtIndex(wayType.values, startIdx)
        : undefined;
      const surfaceValue = surface
        ? extraValueAtIndex(surface.values, startIdx)
        : undefined;
      steps.push({
        distanceM: step.distance,
        durationS: step.duration,
        roadName: step.name,
        wayType: wayTypeValue,
        surface: surfaceValue === undefined ? undefined : String(surfaceValue),
        maneuver: {
          type: mapped.type,
          modifier: mapped.modifier,
          instruction: step.instruction,
          location,
        },
      });
    }
  }
  return steps;
}
