import { AppState, type NativeEventSubscription } from 'react-native';

import type { CoDriverVoice } from './CoDriverVoice';

/**
 * Phone calls, Siri, and backgrounding stop playback.
 * On resume we do not replay — the Phase 5 engine re-syncs position.
 */
export function attachVoiceInterruptions(voice: CoDriverVoice): () => void {
  const sub: NativeEventSubscription = AppState.addEventListener(
    'change',
    (next) => {
      // `inactive` = incoming call / Siri. `background` = screen off; keep playing.
      if (next === 'inactive') {
        void voice.handleInterruption();
        return;
      }
      if (next === 'active') {
        voice.handleResume();
      }
    },
  );
  return () => sub.remove();
}
