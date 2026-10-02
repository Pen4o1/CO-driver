import { LIVE_CLIP_URI, speakLikeCoDriver } from '@/core/voice';

import { classifyDeviceVoice, sortVoicesForPicker } from './deviceVoices';
import type {
  LocalFile,
  SynthesizeOpts,
  TtsProvider,
  Voice,
} from './TtsProvider';

export type DeviceSpeechApi = {
  getAvailableVoicesAsync(): Promise<
    {
      identifier: string;
      name: string;
      language: string;
      quality?: string;
    }[]
  >;
  speak(
    text: string,
    options?: {
      voice?: string;
      volume?: number;
      rate?: number;
      onDone?: () => void;
      onStopped?: () => void;
      onError?: () => void;
    },
  ): void;
  stop(): Promise<void>;
  isSpeakingAsync(): Promise<boolean>;
};

export function createDeviceTtsProvider(
  speech: DeviceSpeechApi,
): TtsProvider & { speech: DeviceSpeechApi } {
  return {
    id: 'device',
    name: 'Device TTS',
    description: 'Robotic, but works anywhere with no setup.',
    requiresNetwork: false,
    canPrerender: false,
    speech,
    async listVoices(): Promise<Voice[]> {
      const voices = await speech.getAvailableVoicesAsync();
      if (voices.length === 0) {
        return [
          {
            id: 'default',
            name: 'System default',
            language: 'en',
            offline: true,
          },
        ];
      }
      return sortVoicesForPicker(
        voices.map((voice) => ({
          id: voice.identifier,
          name: voice.name,
          language: voice.language,
          offline: true,
          quality: classifyDeviceVoice({
            identifier: voice.identifier,
            quality: voice.quality,
          }),
        })),
      );
    },
    async synthesize(
      text: string,
      _voiceId: string,
      opts?: SynthesizeOpts,
    ): Promise<LocalFile> {
      speakLikeCoDriver(text, opts);
      return { uri: LIVE_CLIP_URI, bytes: 0, live: true };
    },
    async isAvailable(): Promise<boolean> {
      return true;
    },
  };
}
