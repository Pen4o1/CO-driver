import type { TurnGrade } from '@/core/types';

/** SPEC §5 radius table, without the hairpin angle extra-condition. */
export function gradeFromRadiusM(radiusM: number): TurnGrade {
  if (radiusM <= 20) return 1;
  if (radiusM <= 40) return 2;
  if (radiusM <= 80) return 3;
  if (radiusM <= 150) return 4;
  if (radiusM <= 300) return 5;
  return 6;
}

export function isHairpin(radiusM: number, totalAngleDeg: number): boolean {
  return radiusM <= 20 && Math.abs(totalAngleDeg) >= 120;
}
