import { setAudioModeAsync } from 'expo-audio';

export type AudioSessionOpts = {
  background: boolean;
};

/**
 * Music ducks while a call is playing. The session is released when the
 * call ends, so other audio comes back. SDK 57 names (verified):
 * playsInSilentMode, shouldPlayInBackground, interruptionMode 'duckOthers'.
 */
export async function configureCoDriverAudio(
  opts: AudioSessionOpts,
): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: opts.background,
    interruptionMode: 'duckOthers',
  });
}
