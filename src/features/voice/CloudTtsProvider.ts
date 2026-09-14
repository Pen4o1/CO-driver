import { appError } from '@/core/errors';
import { speakLikeCoDriver, voiceCacheMaterial } from '@/core/voice';

import type {
  LocalFile,
  SynthesizeOpts,
  TtsProvider,
  Voice,
} from './TtsProvider';
import type { VoiceFileStore } from './fileStore';

export type FetchBinary = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  },
) => Promise<{
  status: number;
  ok: boolean;
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
}>;

export type CloudTtsConfig = {
  baseUrl: string;
  model: string;
  voiceId: string;
  apiKey?: string;
  fetchBinary: FetchBinary;
  files: VoiceFileStore;
  hash: (value: string) => Promise<string>;
  spellOutDistances?: boolean;
};

/**
 * OpenAI-compatible HTTP TTS. Point `baseUrl` at a local Piper/Kokoro
 * proxy (`http://lan-ip:port/v1`). No vendor is hardcoded.
 */
export function createCloudTtsProvider(config: CloudTtsConfig): TtsProvider {
  const endpoint = `${config.baseUrl.replace(/\/$/, '')}/audio/speech`;

  return {
    id: 'http',
    name: 'Local / HTTP voice',
    description:
      'Natural voice via OpenAI-compatible HTTP (Piper/Kokoro). Cached clips play offline.',
    requiresNetwork: true,
    canPrerender: true,
    async listVoices(): Promise<Voice[]> {
      if (!config.baseUrl) {
        return [];
      }
      return [
        {
          id: config.voiceId,
          name: config.voiceId,
          language: 'en',
          offline: false,
        },
      ];
    },
    async isAvailable(): Promise<boolean> {
      return config.baseUrl.trim().length > 0;
    },
    async synthesize(
      text: string,
      voiceId: string,
      opts?: SynthesizeOpts,
    ): Promise<LocalFile> {
      if (!config.baseUrl.trim()) {
        throw appError('unknown', 'HTTP TTS base URL is not configured.');
      }
      const spoken = speakLikeCoDriver(text, {
        spellOutDistances: opts?.spellOutDistances ?? config.spellOutDistances,
      });
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'User-Agent': 'ApexRallyCoDriver/1.0',
      };
      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }
      const response = await config.fetchBinary(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          input: spoken,
          voice: voiceId || config.voiceId,
          response_format: 'mp3',
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw appError(
          'unknown',
          `TTS HTTP ${response.status}: ${body.slice(0, 160)}`,
        );
      }
      const bytes = await response.bytes();
      if (bytes.byteLength === 0) {
        throw appError('unknown', 'TTS returned an empty audio body.');
      }
      const hash = await config.hash(
        voiceCacheMaterial(spoken, 'http', voiceId || config.voiceId),
      );
      return config.files.writeMp3(`${hash}.mp3`, bytes);
    },
  };
}
