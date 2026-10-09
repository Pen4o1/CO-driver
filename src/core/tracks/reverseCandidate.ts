import { buildRouteGeometry, deriveAscentDescent } from '@/core/geo';
import type { RouteCandidate } from '@/core/types';

/**
 * Flip a saved line for the drive home. No router.
 *
 * Assumptions:
 * 1. Vertex order is the direction of travel. Reversing it reverses the drive.
 * 2. elevationM is index-aligned with coords, so it reverses with them.
 * 3. Cumulative distance is rebuilt from the new order. Length is unchanged.
 * 4. Signed curvature flips, so a right becomes a left when notes are derived.
 * 5. Ascent and descent swap. With elevation they are recomputed from the
 *    reversed profile, not copied, so smoothing stays consistent.
 * 6. Router steps are outbound maneuvers. They are dropped so "turn left" from
 *    the way out is not spoken on the way home. Notes come from the line.
 * 7. Score, hairpins, shares, and duration describe the same pavement and stay.
 *    elevationVariationM follows the new ascent.
 */

const REVERSED_SUFFIX = ' reversed';

export function reversedRouteName(name: string): string {
  if (name.endsWith(REVERSED_SUFFIX)) {
    return name.slice(0, -REVERSED_SUFFIX.length);
  }
  return `${name}${REVERSED_SUFFIX}`;
}

export function reversedCandidateId(id: string): string {
  const prefix = 'rev_';
  if (id.startsWith(prefix)) return id.slice(prefix.length);
  return `${prefix}${id}`;
}

function reversedElevation(
  elevationM: Float64Array | null,
  coordCount: number,
): Float64Array | null {
  if (elevationM === null || elevationM.length !== coordCount) return null;
  const copy = new Float64Array(elevationM.length);
  for (let i = 0; i < elevationM.length; i += 1) {
    copy[i] = elevationM[elevationM.length - 1 - i];
  }
  return copy;
}

export function reverseCandidate(candidate: RouteCandidate): RouteCandidate {
  const coords = [...candidate.geometry.coords].reverse();
  const elevationM = reversedElevation(
    candidate.geometry.elevationM,
    candidate.geometry.coords.length,
  );
  const geometry = buildRouteGeometry(coords, elevationM);
  const climb = deriveAscentDescent(elevationM, geometry.cumulative);
  const ascentM = climb?.ascentM ?? candidate.descentM;
  const descentM = climb?.descentM ?? candidate.ascentM;
  return {
    ...candidate,
    id: reversedCandidateId(candidate.id),
    geometry,
    steps: [],
    waypointsUsed: [...candidate.waypointsUsed].reverse(),
    ascentM,
    descentM,
    breakdown: {
      ...candidate.breakdown,
      elevationVariationM: ascentM,
    },
  };
}
