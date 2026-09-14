import { frechetDistanceM } from '@/core/geo';
import { derivePaceNotesDetailed } from '@/core/pacenotes';
import type { NoteFilterOptions, PaceNote, RouteGeometry } from '@/core/types';
import { getRoutingProvider } from '@/features/routing';

export type RerouteResult = {
  geometry: RouteGeometry;
  notes: PaceNote[];
  changed: boolean;
};

export function pathChangedMaterially(
  previous: RouteGeometry,
  next: RouteGeometry,
): boolean {
  const shorter = Math.min(previous.lengthM, next.lengthM);
  if (Math.abs(previous.lengthM - next.lengthM) > 0.15 * shorter) {
    return true;
  }
  return frechetDistanceM(previous.coords, next.coords) > 200;
}

/** Off-route: re-request A→B from here to the original destination. */
export async function rerouteFromHere(input: {
  providerId: string;
  here: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  via: { lat: number; lng: number }[];
  previous: RouteGeometry;
  filter: NoteFilterOptions;
}): Promise<RerouteResult> {
  const provider = getRoutingProvider(input.providerId);
  const waypoints = [input.here, ...input.via.slice(0, 3), input.destination];
  const candidates = await provider.route({
    waypoints,
    profileId: 'balanced',
  });
  const next = candidates[0];
  if (!next) {
    return { geometry: input.previous, notes: [], changed: false };
  }
  const changed = pathChangedMaterially(input.previous, next.geometry);
  const derived = derivePaceNotesDetailed(
    next.geometry,
    next.steps,
    input.filter,
  );
  return { geometry: next.geometry, notes: derived.notes, changed };
}
