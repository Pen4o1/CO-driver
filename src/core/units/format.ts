export type UnitSystem = 'metric' | 'imperial';

const METRES_PER_MILE = 1609.344;
const METRES_PER_YARD = 0.9144;
const METRES_PER_FOOT = 0.3048;

export function metresToKm(distanceM: number): number {
  return distanceM / 1000;
}

export function metresToMiles(distanceM: number): number {
  return distanceM / METRES_PER_MILE;
}

export function metresToYards(distanceM: number): number {
  return distanceM / METRES_PER_YARD;
}

export function formatDistanceKm(distanceM: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${metresToMiles(distanceM).toFixed(1)} mi`;
  }
  return `${metresToKm(distanceM).toFixed(1)} km`;
}

/** Share of the planned route that was actually driven, capped at 100. */
export function routeCompletionPercent(
  distanceM: number,
  routeLengthM: number | null | undefined,
): number | null {
  if (
    routeLengthM == null ||
    !Number.isFinite(routeLengthM) ||
    routeLengthM <= 0
  ) {
    return null;
  }
  if (!Number.isFinite(distanceM) || distanceM < 0) return null;
  return Math.min(100, Math.round((distanceM / routeLengthM) * 100));
}

/**
 * Driven distance plus how much of the route that covers.
 * A short finish reads as "18.2 km · 74%" instead of a short route.
 */
export function formatDrivenDistance(
  distanceM: number,
  routeLengthM: number | null | undefined,
  units: UnitSystem,
): string {
  const distance = formatDistanceKm(distanceM, units);
  const pct = routeCompletionPercent(distanceM, routeLengthM);
  if (pct == null) return distance;
  return `${distance} · ${pct}%`;
}

export function formatClimbM(
  heightM: number | null,
  units: UnitSystem,
): string | null {
  if (heightM == null || !Number.isFinite(heightM)) return null;
  if (units === 'imperial') {
    return `${Math.round(heightM / METRES_PER_FOOT)} ft`;
  }
  return `${Math.round(heightM)} m`;
}

export function formatLengthM(distanceM: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round(metresToYards(distanceM))} yd`;
  }
  return `${Math.round(distanceM)} m`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remain = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return remain > 0 ? `${minutes}m ${remain}s` : `${minutes}m`;
  return `${remain}s`;
}

export function formatSpeed(speedMps: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round(speedMps * 2.236936)} mph`;
  }
  return `${Math.round(speedMps * 3.6)} km/h`;
}
