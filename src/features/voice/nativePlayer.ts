import { createAudioPlayer } from 'expo-audio';

import type { ClipPlayer } from './clipPool';
import { holdOtherAudio } from './otherAudioHold';

export function createNativeClipPlayer(): ClipPlayer {
  const player = createAudioPlayer(null, { keepAudioSessionActive: true });
  return {
    replace(uri) {
      player.replace({ uri });
    },
    play() {
      void holdOtherAudio().then(() => player.play());
    },
    pause() {
      player.pause();
    },
    stop() {
      player.pause();
      void player.seekTo(0);
    },
    setVolume(volume) {
      player.volume = volume;
    },
    isPlaying() {
      return player.playing;
    },
    onFinished(cb) {
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          cb();
        }
      });
      return () => sub.remove();
    },
    release() {
      player.release();
    },
  };
}
