import { projectOnPolyline } from '@/core/geo/project';
import type { RouteGeometry, RouteStep } from '@/core/types';

import { JUNCTION_NEAR_M, NOTE_MIN_SEPARATION_M } from './constants';
import { impliedRouterGrade } from './grade';
import type { GradeDisagreement, GradedCorner } from './types';

export type JunctionHit = {
  atDistance: number;
  instruction: string;
  type: string;
  modifier?: string;
  roadName?: string;
};

export type MergeResult = {
  corners: GradedCorner[];
  junctions: JunctionHit[];
  disagreements: GradeDisagreement[];
};

function isIgnorable(step: RouteStep): boolean {
  const type = step.maneuver.type.toLowerCase();
  return (
    type === 'depart' ||
    type === 'arrive' ||
    type === 'continue' ||
    type.includes('new name')
  );
}

function isJunctionManeuver(step: RouteStep): boolean {
  const type = step.maneuver.type.toLowerCase();
  const instruction = step.maneuver.instruction.toLowerCase();
  return (
    type.includes('roundabout') ||
    type.includes('merge') ||
    type.includes('fork') ||
    type.includes('on ramp') ||
    type.includes('off ramp') ||
    type.includes('end of road') ||
    instruction.includes('roundabout') ||
    instruction.includes('exit') ||
    instruction.includes('keep left') ||
    instruction.includes('keep right')
  );
}

/**
 * Overlay router maneuvers. A hit inside a corner becomes junctionInstruction
 * on that corner. A hit > 100 m from every corner is its own JUNCTION note.
 * Geometry grade always wins; disagreements are returned, not logged.
 */
export function mergeJunctions(
  geometry: RouteGeometry,
  corners: GradedCorner[],
  steps: RouteStep[],
): MergeResult {
  const disagreements: GradeDisagreement[] = [];
  const annotated = corners.map((c) => ({ ...c }));
  const junctions: JunctionHit[] = [];

  for (const step of steps) {
    if (isIgnorable(step)) {
      continue;
    }
    const projected = projectOnPolyline(
      step.maneuver.location,
      geometry.coords,
    );
    const at = projected.distanceAlongM;
    let nearest: GradedCorner | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const corner of annotated) {
      const inside =
        at >= corner.entryDistance - 15 && at <= corner.exitDistance + 15;
      const d = Math.abs(at - corner.apexDistance);
      if (inside && d < nearestDist) {
        nearest = corner;
        nearestDist = d;
      }
    }
    const routerGrade = impliedRouterGrade(step.maneuver.modifier);
    if (nearest && routerGrade !== null) {
      if (Math.abs(nearest.grade - routerGrade) > 1) {
        disagreements.push({
          apexDistance: nearest.apexDistance,
          geometryGrade: nearest.grade,
          routerGrade,
          instruction: step.maneuver.instruction,
        });
      }
    }
    if (nearest && isJunctionManeuver(step)) {
      nearest.roadName = nearest.roadName ?? step.roadName;
      nearest.junctionInstruction = step.maneuver.instruction;
      continue;
    }
    if (nearest) {
      continue;
    }
    const far = annotated.every(
      (c) => Math.abs(at - c.apexDistance) > JUNCTION_NEAR_M,
    );
    if (far && isJunctionManeuver(step)) {
      junctions.push({
        atDistance: at,
        instruction: step.maneuver.instruction,
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        roadName: step.roadName,
      });
    }
  }

  const culledJunctions: JunctionHit[] = [];
  for (const hit of junctions.sort((a, b) => a.atDistance - b.atDistance)) {
    const prev = culledJunctions[culledJunctions.length - 1];
    if (prev && hit.atDistance - prev.atDistance < NOTE_MIN_SEPARATION_M) {
      continue;
    }
    const tooCloseToCorner = annotated.some(
      (c) => Math.abs(c.apexDistance - hit.atDistance) < NOTE_MIN_SEPARATION_M,
    );
    if (!tooCloseToCorner) {
      culledJunctions.push(hit);
    }
  }

  return { corners: annotated, junctions: culledJunctions, disagreements };
}
