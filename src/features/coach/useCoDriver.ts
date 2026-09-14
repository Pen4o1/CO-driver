import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import {
  driveStats,
  engineFrom,
  pauseEngine,
  replaceRoute,
  updateEngine,
  type EngineOutput,
  type EngineState,
  type TimingSettings,
} from '@/core/coach';
import type {
  GeoFix,
  LatLng,
  NoteFilterOptions,
  PaceNote,
  RouteGeometry,
} from '@/core/types';
import { appendDriveFix, createDrive, finishDrive } from '@/features/storage';
import { attachVoiceInterruptions } from '@/features/voice';
import type { PreparedClip } from '@/features/voice/prepareRoute';

import { setLocationTaskListener } from './backgroundTask';
import { geoFixFromLocation } from './geoFix';
import {
  requestDrivePermissions,
  startBackgroundUpdates,
  stopBackgroundUpdates,
  watchForeground,
} from './location';
import { rerouteFromHere } from './reroute';
import { applyEngineOutput, createDriveVoice } from './voiceBridge';

const AWAKE_TAG = 'apex-drive';

export type UseCoDriverInput = {
  routeId: string;
  geometry: RouteGeometry;
  notes: PaceNote[];
  filter: NoteFilterOptions;
  timing: TimingSettings;
  clips: Map<string, PreparedClip>;
  voiceId: string;
  volume: number;
  providerId: string;
  destination: LatLng;
  waypoints: LatLng[];
};

export function useCoDriver(input: UseCoDriverInput) {
  const [output, setOutput] = useState<EngineOutput | null>(null);
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveId, setDriveId] = useState<string | null>(null);
  const engineRef = useRef<EngineState | null>(null);
  const voiceRef = useRef<ReturnType<typeof createDriveVoice> | null>(null);
  const rerouting = useRef(false);
  const inputRef = useRef(input);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const pushFix = useCallback(
    (fix: GeoFix) => {
      const engine = engineRef.current;
      const voice = voiceRef.current;
      if (!engine || !voice) return;
      const result = updateEngine(engine, fix, fix.timestampMs);
      engineRef.current = result.state;
      setOutput(result.output);
      applyEngineOutput(voice, result.output);
      const id = driveId;
      if (id) {
        void appendDriveFix(id, fix);
      }
      if (result.output.status === 'off-route' && !rerouting.current) {
        rerouting.current = true;
        const cfg = inputRef.current;
        void rerouteFromHere({
          providerId: cfg.providerId,
          here: { lat: fix.lat, lng: fix.lng },
          destination: cfg.destination,
          via: cfg.waypoints,
          previous: result.state.geometry,
          filter: cfg.filter,
        })
          .then((rerouted) => {
            if (!engineRef.current || !rerouted.changed) return;
            engineRef.current = replaceRoute(
              engineRef.current,
              rerouted.geometry,
              rerouted.notes,
            );
          })
          .finally(() => {
            rerouting.current = false;
          });
      }
    },
    [driveId],
  );

  const start = useCallback(async () => {
    setError(null);
    const cfg = inputRef.current;
    engineRef.current = engineFrom(
      cfg.geometry,
      cfg.notes,
      cfg.filter,
      cfg.timing,
    );
    const voice = createDriveVoice({
      clips: cfg.clips,
      voiceId: cfg.voiceId,
      volume: cfg.volume,
    });
    voiceRef.current = voice;
    const detach = attachVoiceInterruptions(voice);
    const id = await createDrive(cfg.routeId, Date.now());
    setDriveId(id);
    setRunning(true);
    void activateKeepAwakeAsync(AWAKE_TAG);
    if (Platform.OS === 'web') {
      unsubRef.current = detach;
      return;
    }
    const perms = await requestDrivePermissions();
    if (!perms.foreground) {
      setError('Location permission is required to drive.');
      unsubRef.current = detach;
      return;
    }
    setLocationTaskListener(pushFix);
    const sub = await watchForeground((loc) =>
      pushFix(geoFixFromLocation(loc)),
    );
    if (perms.background) {
      await startBackgroundUpdates();
    }
    unsubRef.current = () => {
      detach();
      sub.remove();
    };
  }, [pushFix]);

  const stop = useCallback(async () => {
    setRunning(false);
    unsubRef.current?.();
    unsubRef.current = null;
    const engine = engineRef.current;
    engineRef.current = engine ? pauseEngine(engine, true) : null;
    await voiceRef.current?.stop();
    voiceRef.current?.dispose();
    voiceRef.current = null;
    setLocationTaskListener(null);
    await stopBackgroundUpdates();
    void deactivateKeepAwake(AWAKE_TAG);
    const id = driveId;
    const ended = engineRef.current ?? engine;
    if (ended && id) {
      const stats = driveStats(ended, Date.now());
      await finishDrive({ id, endedAt: Date.now(), stats });
    }
  }, [driveId]);

  const mute = useCallback((next: boolean) => {
    setMuted(next);
    voiceRef.current?.setMuted(next);
  }, []);

  useEffect(() => {
    return () => {
      void stopBackgroundUpdates();
      void deactivateKeepAwake(AWAKE_TAG);
      voiceRef.current?.dispose();
    };
  }, []);

  return { output, muted, running, error, driveId, start, stop, mute, pushFix };
}
