import { PLAYER_POOL_SIZE, PRELOAD_AHEAD } from '@/core/voice';

export type ClipPlayer = {
  replace(uri: string): void;
  play(): void;
  pause(): void;
  stop(): void;
  setVolume(volume: number): void;
  isPlaying(): boolean;
  onFinished(cb: () => void): () => void;
  release(): void;
};

type Slot = {
  player: ClipPlayer;
  uri: string | null;
  busy: boolean;
  unsubscribe: () => void;
};

export class ClipPool {
  private readonly slots: Slot[] = [];

  constructor(createPlayer: () => ClipPlayer, size: number = PLAYER_POOL_SIZE) {
    for (let i = 0; i < size; i += 1) {
      this.slots.push({
        player: createPlayer(),
        uri: null,
        busy: false,
        unsubscribe: () => undefined,
      });
    }
  }

  setVolume(volume: number): void {
    for (const slot of this.slots) {
      slot.player.setVolume(volume);
    }
  }

  preload(uris: string[]): void {
    const next = uris.slice(0, PRELOAD_AHEAD);
    let index = 0;
    for (const slot of this.slots) {
      if (slot.busy) continue;
      const uri = next[index];
      if (!uri) break;
      if (slot.uri !== uri) {
        slot.player.replace(uri);
        slot.uri = uri;
      }
      index += 1;
    }
  }

  play(uri: string, onFinished: () => void): ClipPlayer {
    const ready = this.slots.find((slot) => !slot.busy && slot.uri === uri);
    const idle = this.slots.find((slot) => !slot.busy);
    const slot = ready ?? idle ?? this.slots[0];
    slot.unsubscribe();
    if (slot.uri !== uri) {
      slot.player.replace(uri);
      slot.uri = uri;
    }
    slot.busy = true;
    slot.unsubscribe = slot.player.onFinished(() => {
      slot.busy = false;
      onFinished();
    });
    slot.player.play();
    return slot.player;
  }

  stopAll(): void {
    for (const slot of this.slots) {
      slot.player.stop();
      slot.busy = false;
    }
  }

  release(): void {
    this.stopAll();
    for (const slot of this.slots) {
      slot.unsubscribe();
      slot.player.release();
    }
  }
}
