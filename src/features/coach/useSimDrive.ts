import { useEffect, useRef, useState } from 'react';

import {
  SIM_TICK_S,
  advanceCursor,
  driveStats,
  engineFrom,
  mulberry32,
  pauseEngine,
  seekEngine,
  syntheticFix,
  updateEngine,
  type DriveStats,
  type EngineOutput,
  type EngineState,
  type TimingSettings,
} from '@/core/coach';
import type {
  GeoFix,
  NoteFilterOptions,
  PaceNote,
  RouteGeometry,
} from '@/core/types';
import { attachVoiceInterruptions } from '@/features/voice';
import type { PreparedClip } from '@/features/voice/prepareRoute';
import { useSettings } from '@/state/settings';

import { applyEngineOutput, createDriveVoice } from './voiceBridge';

type Input = {
  geometry: RouteGeometry;
  notes: PaceNote[];
  filter: NoteFilterOptions;
  timing: TimingSettings;
  clips: Map<string, PreparedClip>;
  speedMps: number;
};

export function useSimDrive(input: Input) {
  const voiceId = useSettings((s) => s.voiceId);
  const volume = useSettings((s) => s.voiceVolume);
  const [output, setOutput] = useState<EngineOutput | null>(null);
  const [playing, setPlaying] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [lateralOffsetM, setLateralOffsetM] = useState(0);
  const [stats, setStats] = useState<DriveStats | null>(null);
  const engineRef = useRef<EngineState | null>(null);
  const cursorRef = useRef({ distanceAlongM: 0, lastHeadingDeg: 0 });
  const voiceRef = useRef<ReturnType<typeof createDriveVoice> | null>(null);
  const rngRef = useRef(mulberry32(1));
  const nowRef = useRef(0);
  const replayRef = useRef<GeoFix[] | null>(null);
  const replayIndex = useRef(0);
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  const ensure = () => {
    if (!engineRef.current) {
      engineRef.current = engineFrom(
        input.geometry,
        input.notes,
        input.filter,
        input.timing,
      );
    }
    if (!voiceRef.current) {
      const voice = createDriveVoice({
        clips: input.clips,
        voiceId,
        volume,
      });
      attachVoiceInterruptions(voice);
      voiceRef.current = voice;
    }
  };

  const applyFix = (fix: GeoFix, nowMs: number) => {
    const engine = engineRef.current;
    const voice = voiceRef.current;
    if (!engine || !voice) return;
    const result = updateEngine(engine, fix, nowMs);
    engineRef.current = result.state;
    setOutput(result.output);
    applyEngineOutput(voice, result.output);
    if (result.output.status === 'finished') {
      setPlaying(false);
      setStats(driveStats(result.state, nowMs));
    }
  };

  const tick = () => {
    const cfg = inputRef.current;
    ensure();
    const engine = engineRef.current;
    const voice = voiceRef.current;
    if (!engine || !voice) return;
    const replay = replayRef.current;
    if (replay) {
      const fix = replay[replayIndex.current];
      if (!fix) {
        setPlaying(false);
        return;
      }
      replayIndex.current += 1;
      applyFix(fix, fix.timestampMs);
      return;
    }
    nowRef.current += SIM_TICK_S * 1000;
    cursorRef.current = advanceCursor(
      cursorRef.current,
      cfg.geometry,
      cfg.speedMps,
      SIM_TICK_S,
    );
    const { fix, headingDeg } = syntheticFix({
      geometry: cfg.geometry,
      distanceAlongM: cursorRef.current.distanceAlongM,
      speedMps: cfg.speedMps,
      nowMs: nowRef.current,
      lastHeadingDeg: cursorRef.current.lastHeadingDeg,
      lateralOffsetM,
      rng: rngRef.current,
    });
    cursorRef.current.lastHeadingDeg = headingDeg;
    applyFix(fix, nowRef.current);
  };

  useEffect(() => {
    if (!playing) return;
    const ms = 1000 / multiplier;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
    // tick reads refs; offset/multiplier restart the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, multiplier, lateralOffsetM]);

  useEffect(() => {
    return () => {
      voiceRef.current?.dispose();
    };
  }, []);

  const play = () => {
    replayRef.current = null;
    ensure();
    engineRef.current = pauseEngine(engineRef.current!, false);
    setPlaying(true);
  };

  const replay = (fixes: GeoFix[]) => {
    replayRef.current = fixes;
    replayIndex.current = 0;
    engineRef.current = engineFrom(
      inputRef.current.geometry,
      inputRef.current.notes,
      inputRef.current.filter,
      inputRef.current.timing,
    );
    cursorRef.current = { distanceAlongM: 0, lastHeadingDeg: 0 };
    ensure();
    engineRef.current = pauseEngine(engineRef.current, false);
    setPlaying(true);
  };

  const pause = () => setPlaying(false);

  const seek = (distanceAlongM: number) => {
    ensure();
    engineRef.current = seekEngine(engineRef.current!, distanceAlongM);
    cursorRef.current = {
      distanceAlongM,
      lastHeadingDeg: cursorRef.current.lastHeadingDeg,
    };
    setOutput((prev) =>
      prev
        ? { ...prev, positionAlongRoute: distanceAlongM, status: 'paused' }
        : prev,
    );
  };

  const previewHere = () => {
    ensure();
    engineRef.current = pauseEngine(engineRef.current!, false);
    tick();
    engineRef.current = pauseEngine(engineRef.current!, true);
  };

  return {
    output,
    playing,
    multiplier,
    setMultiplier,
    lateralOffsetM,
    setLateralOffsetM,
    stats,
    play,
    pause,
    seek,
    previewHere,
    replay,
  };
}
