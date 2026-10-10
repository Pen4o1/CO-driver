import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { DEFAULT_MAP_CENTER } from '@/core/config';
import type { LatLng } from '@/core/types';

let remembered: LatLng | null = null;

/** Keep a fix the user just granted, before the OS last-known cache updates. */
export function noteSearchFix(point: LatLng): void {
  remembered = point;
}

/**
 * Bias for address search. Uses a pin the caller cares about, otherwise the
 * last known device fix, otherwise the map centre. Never prompts for permission.
 */
export function useSearchBias(preferred: LatLng | null, revision = 0): LatLng {
  const [device, setDevice] = useState<LatLng | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled || permission.status !== 'granted') return;
        const fix = await Location.getLastKnownPositionAsync();
        if (cancelled || !fix) return;
        const point = {
          lat: fix.coords.latitude,
          lng: fix.coords.longitude,
        };
        remembered = point;
        if (!cancelled) setDevice(point);
      } catch {
        // The map centre stays the bias.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [revision]);

  return preferred ?? remembered ?? device ?? DEFAULT_MAP_CENTER;
}
