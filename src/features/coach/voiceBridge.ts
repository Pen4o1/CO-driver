import * as Speech from 'expo-speech';

import { CoDriverVoice } from '@/features/voice/CoDriverVoice';
import { ClipPool } from '@/features/voice/clipPool';
import { createNativeClipPlayer } from '@/features/voice/nativePlayer';
import { createDeviceTtsProvider } from '@/features/voice/DeviceTtsProvider';
import type { PreparedClip } from '@/features/voice/prepareRoute';
import {
  releaseFired,
  type EngineOutput,
  type EngineState,
} from '@/core/coach';
import type { FiredKind } from '@/core/coach/types';

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

export type RejectedCall = { noteId: string; kind: FiredKind };

function rejectedFrom(action: EngineOutput['actions'][number]): RejectedCall[] {
  if (action.kind !== 'speak') {
    return [];
  }
  const kind: FiredKind = action.noteId.endsWith(':confirm')
    ? 'confirm'
    : 'primary';
  const ids = action.coveredNoteIds ?? [action.noteId.replace(/:confirm$/, '')];
  return ids
    .filter((noteId) => noteId !== 'offroute' && noteId !== 'offline')
    .map((noteId) => ({ noteId, kind }));
}

export function applyEngineOutput(
  voice: CoDriverVoice,
  output: EngineOutput,
): RejectedCall[] {
  const rejected: RejectedCall[] = [];
  for (const action of output.actions) {
    const accepted = voice.enqueue(action);
    if (!accepted) {
      rejected.push(...rejectedFrom(action));
    }
  }
  voice.preloadUpcoming(
    output.nextNotes.map((note) => note.spokenShort || note.spokenFull),
  );
  return rejected;
}

export function withoutRejectedCalls(
  state: EngineState,
  rejected: RejectedCall[],
): EngineState {
  if (rejected.length === 0) {
    return state;
  }
  return { ...state, fired: releaseFired(state.fired, rejected) };
}
