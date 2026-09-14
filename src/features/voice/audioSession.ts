import { setAudioModeAsync, type InterruptionMode } from 'expo-audio';

export type AudioSessionOpts = {
  duck: boolean;
  background: boolean;
};

/**
 * SDK 57 names (verified): playsInSilentMode, shouldPlayInBackground,
 * interruptionMode 'duckOthers' | 'doNotMix' | 'mixWithOthers'.
 * Maps the Phase 4 brief's expo-av field names onto expo-audio.
 */
export async function configureCoDriverAudio(
  opts: AudioSessionOpts,
): Promise<void> {
  const interruptionMode: InterruptionMode = opts.duck
    ? 'duckOthers'
    : 'doNotMix';
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: opts.background,
    interruptionMode,
  });
}
