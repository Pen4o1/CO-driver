import { clamp } from '@/core/geo/clamp';
import { gradeFromRadiusM, isHairpin } from '@/core/scoring/gradeFromRadius';
import type { TurnGrade } from '@/core/types';

import {
  GRADE6_MIN_ANGLE_DEG,
  HAIRPIN_ANGLE_DEG,
  HAIRPIN_RADIUS_M,
  SHORT_ARC_M,
} from './constants';
import type { DetectedCorner, GradedCorner } from './types';

/**
 * SPEC §5. Hairpin requires r ≤ 20 m AND |angle| ≥ 120°.
 * A tight-radius shallow sweep is grade 2, not a hairpin.
 * Grade 6 needs |angle| ≥ 20°; shallower kinks are dropped.
 */
export function gradeCorner(corner: DetectedCorner): GradedCorner | null {
  const angle = Math.abs(corner.totalAngleDeg);
  if (corner.radiusM > 300 && angle < GRADE6_MIN_ANGLE_DEG) {
    return null;
  }
  let grade: TurnGrade = gradeFromRadiusM(corner.radiusM);
  if (grade === 1 && !isHairpin(corner.radiusM, corner.totalAngleDeg)) {
    grade = 2;
  }
  if (
    grade === 1 &&
    (corner.radiusM > HAIRPIN_RADIUS_M || angle < HAIRPIN_ANGLE_DEG)
  ) {
    grade = 2;
  }
  const severity = clamp(
    ((7 - grade) / 6) * 0.7 + Math.min(angle / 180, 1) * 0.3,
    0,
    1,
  );
  const isShort =
    corner.arcLengthM < SHORT_ARC_M && grade > 1 && !corner.isLong;
  return { ...corner, grade, severity, isShort };
}

export function gradeCorners(corners: DetectedCorner[]): GradedCorner[] {
  const out: GradedCorner[] = [];
  for (const corner of corners) {
    const graded = gradeCorner(corner);
    if (graded) {
      out.push(graded);
    }
  }
  return out;
}

/** SPEC §5 implied router grades. 3.5 is comparison-only, not a TurnGrade. */
export function impliedRouterGrade(
  modifier: string | undefined,
): number | null {
  if (!modifier) {
    return null;
  }
  const m = modifier.toLowerCase();
  if (m.includes('sharp')) {
    return 2;
  }
  if (m.includes('slight')) {
    return 5;
  }
  if (m === 'left' || m === 'right') {
    return 3.5;
  }
  return null;
}
