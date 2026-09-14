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

/** Re-arm a note if the car reversed more than 50 m behind its apex. */
export function rearmFired(
  fired: Readonly<Record<string, FiredRecord>>,
  notes: { id: string; atDistance: number }[],
  distanceAlongM: number,
): Record<string, FiredRecord> {
  const drop = new Set<string>();
  for (const note of notes) {
    if (distanceAlongM < note.atDistance - REARM_BEHIND_M) {
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
