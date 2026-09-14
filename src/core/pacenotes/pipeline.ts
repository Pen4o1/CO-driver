import type {
  NoteFilterOptions,
  PaceNote,
  RouteGeometry,
  RouteStep,
} from '@/core/types';

import {
  applyCornerAttributes,
  detectGentleCorners,
  detectStraights,
  dropTightPairs,
} from './attributes';
import { buildNotes } from './buildNotes';
import { detectCornerSpans } from './detectCorners';
import { DEFAULT_NOTE_FILTER, filterNotes } from './filterNotes';
import { gradeCorners } from './grade';
import { mergeJunctions } from './mergeJunctions';
import { resampleCentreline } from './resample';
import type { GradeDisagreement } from './types';

export type DeriveResult = {
  notes: PaceNote[];
  disagreements: GradeDisagreement[];
};

export function derivePaceNotes(
  geometry: RouteGeometry,
  steps: RouteStep[] = [],
  filter: NoteFilterOptions = DEFAULT_NOTE_FILTER,
): PaceNote[] {
  return derivePaceNotesDetailed(geometry, steps, filter).notes;
}

export function derivePaceNotesDetailed(
  geometry: RouteGeometry,
  steps: RouteStep[] = [],
  filter: NoteFilterOptions = DEFAULT_NOTE_FILTER,
): DeriveResult {
  const line = resampleCentreline(geometry);
  const spans = detectCornerSpans(line);
  const gentle = detectGentleCorners(line, spans);
  const combined = dropTightPairs(
    [...spans, ...gentle].sort((a, b) => a.apexDistance - b.apexDistance),
  );
  const attributed = applyCornerAttributes(line, combined);
  const graded = gradeCorners(attributed);
  const merged = mergeJunctions(geometry, graded, steps);
  const straights = detectStraights(line, merged.corners);
  const raw = buildNotes(
    merged.corners,
    straights,
    merged.junctions,
    line.lengthM,
  );
  return {
    notes: filterNotes(raw, filter),
    disagreements: merged.disagreements,
  };
}
