import * as Speech from 'expo-speech';

import { createCloudTtsProvider } from './CloudTtsProvider';
import { createDeviceTtsProvider } from './DeviceTtsProvider';
import { fetchBinary } from './fetchBinary';
import { createDocumentFileStore } from './fileStore';
import { sha256Hex } from './hash';
import type { TtsProvider } from './TtsProvider';

export type TtsProviderId = 'device' | 'http';

export type TtsEnv = {
  provider: TtsProviderId;
  baseUrl: string;
  model: string;
  voiceId: string;
  apiKey: string;
};

export function readTtsEnv(): TtsEnv {
  const raw =
    process.env.EXPO_PUBLIC_TTS_PROVIDER ??
    process.env.TTS_PROVIDER ??
    'device';
  const provider: TtsProviderId =
    raw === 'http' || raw === 'piper' ? 'http' : 'device';
  return {
    provider,
    baseUrl: process.env.EXPO_PUBLIC_TTS_BASE_URL ?? '',
    model: process.env.EXPO_PUBLIC_TTS_MODEL ?? 'tts-1',
    voiceId: process.env.EXPO_PUBLIC_TTS_VOICE_ID ?? 'en_US-lessac-medium',
    apiKey: process.env.EXPO_PUBLIC_TTS_API_KEY ?? '',
  };
}

export function createTtsProvider(
  id: TtsProviderId,
  env: TtsEnv = readTtsEnv(),
): TtsProvider {
  if (id === 'http') {
    return createCloudTtsProvider({
      baseUrl: env.baseUrl,
      model: env.model,
      voiceId: env.voiceId,
      apiKey: env.apiKey || undefined,
      fetchBinary,
      files: createDocumentFileStore(),
      hash: sha256Hex,
    });
  }
  return createDeviceTtsProvider(Speech);
}

export async function resolveTtsProvider(
  preferred: TtsProviderId,
  env: TtsEnv = readTtsEnv(),
): Promise<TtsProvider> {
  const primary = createTtsProvider(preferred, env);
  if (await primary.isAvailable()) {
    return primary;
  }
  return createTtsProvider('device', env);
}
