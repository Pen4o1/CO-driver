import { LIVE_CLIP_URI } from '@/core/voice';
import {
  completePlaying,
  emptyQueue,
  offerUtterance,
  type QueueState,
} from '@/core/voice';
import type { VoiceAction } from '@/core/types';

import type { ClipPool } from './clipPool';
import type { DeviceSpeechApi } from './DeviceTtsProvider';
import { holdOtherAudio, releaseOtherAudio } from './otherAudioHold';
import type { PreparedClip } from './prepareRoute';

export type CoDriverVoiceOpts = {
  pool: ClipPool;
  live: DeviceSpeechApi;
  voiceId: string;
  clips?: Map<string, PreparedClip>;
  volume?: number;
};

/**
 * Drive-time player. Only plays cached clips (or live device TTS).
 * Never synthesizes on the hot path.
 */
export class CoDriverVoice {
  private queue: QueueState = emptyQueue();
  private muted = false;
  private volume: number;
  private disposed = false;
  private interrupted = false;
  private generation = 0;
  private playbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly clips: Map<string, PreparedClip>;

  constructor(private readonly opts: CoDriverVoiceOpts) {
    this.volume = opts.volume ?? 1;
    this.clips = opts.clips ?? new Map();
    this.opts.pool.setVolume(this.volume);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      void this.stop();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.opts.pool.setVolume(this.volume);
  }

  preloadUpcoming(texts: string[]): void {
    const uris = texts
      .map((text) => this.clips.get(text)?.uri)
      .filter((uri): uri is string => Boolean(uri) && uri !== LIVE_CLIP_URI);
    this.opts.pool.preload(uris);
  }

  /** False when the utterance was dropped and should be retried. */
  enqueue(action: VoiceAction): boolean {
    if (this.disposed) {
      return false;
    }
    if (this.muted || this.interrupted) {
      return true;
    }
    if (action.kind === 'stop') {
      void this.stop();
      return true;
    }
    if (action.kind === 'duck') {
      return true;
    }
    const offered = offerUtterance(this.queue, {
      id: action.noteId,
      text: action.text,
      priority: action.priority,
      clipId: action.clipId,
    });
    this.queue = offered.state;
    if (offered.dropped) {
      return false;
    }
    if (offered.interrupt) {
      this.haltCurrent();
    }
    if (this.queue.playing?.id === action.noteId) {
      this.startCurrent();
    }
    return true;
  }

  async stop(): Promise<void> {
    this.queue = emptyQueue();
    this.haltCurrent();
  }

  /** Phone / Siri / route change: stop, do not replay. Phase 5 re-syncs. */
  async handleInterruption(): Promise<void> {
    this.interrupted = true;
    await this.stop();
  }

  handleResume(): void {
    this.interrupted = false;
  }

  dispose(): void {
    this.disposed = true;
    this.clearPlaybackTimer();
    void this.stop();
    this.opts.pool.release();
  }

  private clearPlaybackTimer(): void {
    if (this.playbackTimer) {
      clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private haltCurrent(): void {
    this.generation += 1;
    this.clearPlaybackTimer();
    this.opts.pool.stopAll();
    void this.opts.live.stop();
    releaseOtherAudio();
  }

  private startCurrent(): void {
    const current = this.queue.playing;
    if (!current || this.muted || this.interrupted) {
      return;
    }
    void holdOtherAudio();
    const clip = this.clips.get(current.text);
    const live = !clip || clip.live || clip.uri === LIVE_CLIP_URI;
    const gen = this.generation;
    let settled = false;
    const onDone = () => {
      if (settled || this.generation !== gen || this.disposed) {
        return;
      }
      settled = true;
      this.clearPlaybackTimer();
      this.queue = completePlaying(this.queue);
      if (this.queue.playing) {
        this.startCurrent();
        return;
      }
      releaseOtherAudio();
    };
    // Live speech often never calls onDone once cellular drops. Unstick the
    // queue so later turns still get called from the saved clips.
    const watchdogMs = Math.min(15_000, 6_000 + current.text.length * 70);
    this.clearPlaybackTimer();
    this.playbackTimer = setTimeout(onDone, watchdogMs);
    if (live) {
      try {
        this.opts.live.speak(current.text, {
          voice: this.opts.voiceId,
          volume: this.volume,
          onDone,
          onStopped: onDone,
          onError: onDone,
        });
      } catch {
        onDone();
      }
      return;
    }
    this.opts.pool.play(clip.uri, onDone);
  }
}
