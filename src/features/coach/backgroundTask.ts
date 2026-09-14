import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';

import type { GeoFix } from '@/core/types';

import { geoFixFromLocation } from './geoFix';

export const LOCATION_TASK_NAME = 'apex-co-driver-location';

type Listener = (fix: GeoFix) => void;

let listener: Listener | null = null;

export function setLocationTaskListener(next: Listener | null): void {
  listener = next;
}

TaskManager.defineTask<{ locations?: LocationObject[] }>(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error || !data?.locations) {
      return;
    }
    for (const location of data.locations) {
      listener?.(geoFixFromLocation(location));
    }
  },
);
