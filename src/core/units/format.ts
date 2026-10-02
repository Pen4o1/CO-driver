export type UnitSystem = 'metric' | 'imperial';

const METRES_PER_MILE = 1609.344;
const METRES_PER_YARD = 0.9144;

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
