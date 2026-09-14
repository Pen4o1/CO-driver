import * as Speech from 'expo-speech';

import { CoDriverVoice } from '@/features/voice/CoDriverVoice';
import { ClipPool } from '@/features/voice/clipPool';
import { createNativeClipPlayer } from '@/features/voice/nativePlayer';
import { createDeviceTtsProvider } from '@/features/voice/DeviceTtsProvider';
import type { PreparedClip } from '@/features/voice/prepareRoute';
import type { EngineOutput } from '@/core/coach';

export function createDriveVoice(input: {
  clips: Map<string, PreparedClip>;
  voiceId: string;
  volume: number;
}): CoDriverVoice {
  const live = createDeviceTtsProvider(Speech);
  return new CoDriverVoice({
    pool: new ClipPool(createNativeClipPlayer),
    live: live.speech,
    voiceId: input.voiceId,
    clips: input.clips,
    volume: input.volume,
  });
}

export function applyEngineOutput(
  voice: CoDriverVoice,
  output: EngineOutput,
): void {
  for (const action of output.actions) {
    voice.enqueue(action);
  }
  voice.preloadUpcoming(
    output.nextNotes.map((note) => note.spokenShort || note.spokenFull),
  );
}
