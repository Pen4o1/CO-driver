import * as Battery from 'expo-battery';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { planRouteClips } from '@/core/voice';
import { disclaimerAccepted } from '@/features/storage';

import { gpsBand } from './geoFix';
import { filterFromSettings, loadDriveBundle } from './loadDriveBundle';
import { lastKnownFix, watchRecceFix } from './location';
import { countPreparedCalls, type RecceClipCounts } from './recceGate';

const BATTERY_REFRESH_MS = 10_000;

export function useRecceSnapshot(routeId: string | undefined) {
  const [gps, setGps] = useState<ReturnType<typeof gpsBand>>('poor');
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [clips, setClips] = useState<RecceClipCounts | null>(null);
  const [legal, setLegal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const observe = useCallback(() => {
    let cancelled = false;
    let gpsSub: Awaited<ReturnType<typeof watchRecceFix>> = null;

    const applyFix = (fix: { coords: { accuracy: number | null } }) => {
      const acc = fix.coords.accuracy ?? 999;
      setAccuracyM(acc);
      setGps(gpsBand(acc));
    };

    const readBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (!cancelled && level >= 0) setBattery(Math.round(level * 100));
      } catch {
        // Keep the last reading. The first failure stays on "Unavailable".
      }
    };

    const readClips = async () => {
      if (!routeId) {
        if (!cancelled) setLoadError('Missing route');
        return;
      }
      try {
        const filter = filterFromSettings();
        const bundle = await loadDriveBundle(routeId, filter);
        if (cancelled) return;
        if (!bundle) {
          setClips(null);
          setLoadError('Missing route');
          return;
        }
        const planned = planRouteClips(bundle.rawNotes, filter).uniqueTexts;
        setClips(countPreparedCalls(planned, new Set(bundle.clips.keys())));
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError('Could not read voice clips');
      }
    };

    void disclaimerAccepted()
      .then((accepted) => {
        if (!cancelled) setLegal(accepted);
      })
      .catch(() => {
        // Leave the disclaimer unacknowledged if storage cannot be read.
      });
    void readBattery();
    void readClips();

    const batterySub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      if (!cancelled && batteryLevel >= 0) {
        setBattery(Math.round(batteryLevel * 100));
      }
    });
    const batteryTimer = setInterval(() => {
      void readBattery();
    }, BATTERY_REFRESH_MS);

    if (Platform.OS !== 'web') {
      void (async () => {
        try {
          const last = await lastKnownFix();
          if (cancelled) return;
          if (last) applyFix(last);
          const sub = await watchRecceFix((fix) => {
            if (!cancelled) applyFix(fix);
          });
          if (cancelled) {
            sub?.remove();
            return;
          }
          gpsSub = sub;
        } catch {
          // Stay on "Waiting for a fix" until the next focus.
        }
      })();
    }

    return () => {
      cancelled = true;
      clearInterval(batteryTimer);
      batterySub.remove();
      gpsSub?.remove();
    };
  }, [routeId]);

  return {
    gps,
    accuracyM,
    battery,
    clips,
    legal,
    setLegal,
    loadError,
    observe,
  };
}
