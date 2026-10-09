import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

import { speakLikeCoDriver, LIVE_CLIP_URI } from '@/core/voice';
import type { PaceNote } from '@/core/types';
import { createNativeClipPlayer } from '@/features/voice/nativePlayer';
import type { ClipPlayer } from '@/features/voice/clipPool';
import type { PreparedClip } from '@/features/voice/prepareRoute';
import { useSettings } from '@/state/settings';

function phrase(note: PaceNote, spellOutDistances: boolean): string {
  const raw = note.spokenShort.length > 0 ? note.spokenShort : note.spokenFull;
  return speakLikeCoDriver(raw.replace(/\.$/, ''), { spellOutDistances });
}

export function useNotePreview(clips: Map<string, PreparedClip>) {
  const voiceId = useSettings((s) => s.voiceId);
  const volume = useSettings((s) => s.voiceVolume);
  const spellOutDistances = useSettings((s) => s.spellOutDistances);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const playerRef = useRef<ClipPlayer | null>(null);
  const playingRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    void Speech.stop();
    playerRef.current?.stop();
    playingRef.current = null;
    setPlayingId(null);
  }, []);

  useEffect(() => {
    return () => {
      void Speech.stop();
      unsubRef.current?.();
      unsubRef.current = null;
      playerRef.current?.release();
      playerRef.current = null;
    };
  }, []);

  const ensurePlayer = useCallback((): ClipPlayer | null => {
    if (playerRef.current) return playerRef.current;
    try {
      const player = createNativeClipPlayer();
      unsubRef.current = player.onFinished(() => {
        playingRef.current = null;
        setPlayingId(null);
      });
      playerRef.current = player;
      return player;
    } catch {
      return null;
    }
  }, []);

  const play = useCallback(
    (note: PaceNote) => {
      if (playingRef.current === note.id) {
        stop();
        return;
      }
      stop();
      const text = phrase(note, spellOutDistances);
      const clip = clips.get(text);
      const file =
        clip && !clip.live && clip.uri !== LIVE_CLIP_URI ? clip.uri : null;
      const player = file ? ensurePlayer() : null;
      if (file && player) {
        player.setVolume(volume);
        player.replace(file);
        player.play();
        playingRef.current = note.id;
        setPlayingId(note.id);
        return;
      }
      playingRef.current = note.id;
      setPlayingId(note.id);
      Speech.speak(text, {
        voice: voiceId || undefined,
        volume,
        onDone: () => {
          if (playingRef.current === note.id) {
            playingRef.current = null;
            setPlayingId(null);
          }
        },
        onStopped: () => {
          if (playingRef.current === note.id) {
            playingRef.current = null;
            setPlayingId(null);
          }
        },
      });
    },
    [clips, ensurePlayer, spellOutDistances, stop, voiceId, volume],
  );

  return { play, playingId, stop };
}
