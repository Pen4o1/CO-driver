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

export function formatSpeed(speedMps: number, units: UnitSystem): string {
  if (units === 'imperial') {
    return `${Math.round(speedMps * 2.236936)} mph`;
  }
  return `${Math.round(speedMps * 3.6)} km/h`;
}
