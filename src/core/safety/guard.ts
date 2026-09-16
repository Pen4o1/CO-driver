import type { DriveSessionStatus } from '@/core/types';

const LOCKED: ReadonlySet<DriveSessionStatus> = new Set([
  'driving',
  'paused',
  'off-route',
]);

export function isDriveLocked(status: DriveSessionStatus): boolean {
  return LOCKED.has(status);
}

/** Destructive or config-changing actions are unreachable while driving. */
export function canMutateLibrary(status: DriveSessionStatus): boolean {
  return !isDriveLocked(status);
}
