jest.mock('expo-audio', () => ({
  setIsAudioActiveAsync: jest.fn(async () => undefined),
}));

import { ClipPool, type ClipPlayer } from '../clipPool';
import { CoDriverVoice } from '../CoDriverVoice';
import type { DeviceSpeechApi } from '../DeviceTtsProvider';

function fakePlayer(): ClipPlayer & {
  uri: string | null;
  finished: () => void;
} {
  let finished: () => void = () => undefined;
  const player: ClipPlayer & { uri: string | null; finished: () => void } = {
    uri: null,
    replace(uri) {
      this.uri = uri;
    },
    play() {},
    pause() {},
    stop() {},
    setVolume() {},
    isPlaying() {
      return false;
    },
    onFinished(cb) {
      finished = cb;
      return () => undefined;
    },
    release() {},
    finished() {
      finished();
    },
  };
  return player;
}

function liveSpeech(): DeviceSpeechApi & { spoken: string[] } {
  const spoken: string[] = [];
  return {
    spoken,
    getAvailableVoicesAsync: async () => [],
    speak(text, options) {
      spoken.push(text);
      options?.onDone?.();
    },
    stop: async () => undefined,
    isSpeakingAsync: async () => false,
  };
}

describe('CoDriverVoice', () => {
  it('plays live device TTS and does not synthesize', () => {
    const live = liveSpeech();
    const voice = new CoDriverVoice({
      pool: new ClipPool(() => fakePlayer(), 3),
      live,
      voiceId: 'en',
    });
    voice.enqueue({
      kind: 'speak',
      noteId: 'n1',
      text: 'In 150, left four.',
      priority: 'normal',
    });
    expect(live.spoken).toEqual(['In 150, left four.']);
    voice.dispose();
  });

  it('drops INFO while speaking a file clip', () => {
    const player = fakePlayer();
    const live = liveSpeech();
    const voice = new CoDriverVoice({
      pool: new ClipPool(() => player, 1),
      live,
      voiceId: 'en',
      clips: new Map([
        [
          'hairpin left',
          {
            text: 'hairpin left',
            uri: 'file://a.mp3',
            bytes: 10,
            live: false,
            hash: 'a',
          },
        ],
      ]),
    });
    voice.enqueue({
      kind: 'speak',
      noteId: 'u',
      text: 'hairpin left',
      priority: 'urgent',
    });
    expect(live.spoken).toHaveLength(0);
    voice.enqueue({
      kind: 'speak',
      noteId: 'i',
      text: 'long straight',
      priority: 'info',
    });
    expect(live.spoken).toHaveLength(0);
    voice.dispose();
  });
});
