/** Distances always round DOWN so the call is never optimistic (SPEC §5). */

export function roundDistanceM(distanceM: number): number {
  if (distanceM <= 0) {
    return 0;
  }
  if (distanceM < 100) {
    return Math.floor(distanceM / 10) * 10;
  }
  return Math.floor(distanceM / 50) * 50;
}

export function spokenDistanceM(distanceM: number): number {
  const rounded = roundDistanceM(distanceM);
  if (distanceM > 0 && rounded === 0) {
    return 10;
  }
  return rounded;
}
