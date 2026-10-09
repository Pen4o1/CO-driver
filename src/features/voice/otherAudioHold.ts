import { setIsAudioActiveAsync } from 'expo-audio';

const RELEASE_MS = 400;

/**
 * iOS ducks other audio for the whole time the session stays active.
 * Hold it while a call is speaking, then release so music comes back.
 * Changes are applied in order so a late release cannot undo a new call.
 */
export function createOtherAudioHold(
  setActive: (active: boolean) => Promise<void>,
  releaseMs: number = RELEASE_MS,
) {
  let generation = 0;
  let pending: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | null = null;

  function enqueue(active: boolean, gen: number): Promise<void> {
    const run = pending.then(async () => {
      if (gen !== generation) return;
      await setActive(active);
    });
    pending = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  return {
    hold(): Promise<void> {
      generation += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      return enqueue(true, generation).then(
        () => undefined,
        () => undefined,
      );
    },
    release(): void {
      const gen = generation;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (gen !== generation) return;
        generation += 1;
        void enqueue(false, generation);
      }, releaseMs);
      const timeout = timer as { unref?: () => void };
      timeout.unref?.();
    },
  };
}

const session = createOtherAudioHold((active) => setIsAudioActiveAsync(active));

export function holdOtherAudio(): Promise<void> {
  return session.hold();
}

export function releaseOtherAudio(): void {
  session.release();
}
