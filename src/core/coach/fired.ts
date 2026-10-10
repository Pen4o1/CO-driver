import { REARM_BEHIND_M } from './constants';
import type { FiredKind, FiredRecord } from './types';

export function firedKey(noteId: string, kind: FiredKind): string {
  return `${noteId}:${kind}`;
}

export function isFired(
  fired: Readonly<Record<string, FiredRecord>>,
  noteId: string,
  kind: FiredKind,
): boolean {
  return fired[firedKey(noteId, kind)] !== undefined;
}

export function withFired(
  fired: Readonly<Record<string, FiredRecord>>,
  record: FiredRecord,
): Record<string, FiredRecord> {
  return { ...fired, [firedKey(record.noteId, record.kind)]: record };
}

/** Undo fired marks when the player dropped the utterance, so the call can retry. */
export function releaseFired(
  fired: Readonly<Record<string, FiredRecord>>,
  rejected: readonly { noteId: string; kind: FiredKind }[],
): Record<string, FiredRecord> {
  if (rejected.length === 0) {
    return { ...fired };
  }
  const drop = new Set(
    rejected.map((item) => firedKey(item.noteId, item.kind)),
  );
  const next: Record<string, FiredRecord> = {};
  for (const [key, record] of Object.entries(fired)) {
    if (!drop.has(key)) {
      next[key] = record;
    }
  }
  return next;
}

/**
 * Re-arm a note only after the car reverses more than 50 m behind where that
 * call actually fired. Being still on the approach must not clear it — the
 * lead point is often more than 50 m before the apex.
 */
export function rearmFired(
  fired: Readonly<Record<string, FiredRecord>>,
  notes: { id: string; atDistance: number }[],
  distanceAlongM: number,
): Record<string, FiredRecord> {
  const drop = new Set<string>();
  for (const note of notes) {
    const primary = fired[firedKey(note.id, 'primary')];
    if (primary && distanceAlongM < primary.atDistanceM - REARM_BEHIND_M) {
      drop.add(note.id);
    }
  }
  if (drop.size === 0) {
    return { ...fired };
  }
  const next: Record<string, FiredRecord> = {};
  for (const [key, record] of Object.entries(fired)) {
    if (!drop.has(record.noteId)) {
      next[key] = record;
    }
  }
  return next;
}
