import { mapPool } from '@/features/routing/pool';
import {
  LIVE_CLIP_URI,
  PREPARE_CONCURRENCY,
  planRouteClips,
  voiceCacheMaterial,
  type ClipPlan,
} from '@/core/voice';
import type { NoteFilterOptions, PaceNote } from '@/core/types';

import type { TtsProvider } from './TtsProvider';
import { rowToLocalFile, type VoiceCache } from './voiceCache';

export type PrepareProgress = {
  done: number;
  total: number;
  bytes: number;
  live: boolean;
};

export type PreparedClip = {
  text: string;
  uri: string;
  bytes: number;
  live: boolean;
  hash: string;
};

export type PrepareResult = {
  clips: PreparedClip[];
  plan: ClipPlan;
  live: boolean;
  bytes: number;
};

export async function prepareRouteClips(input: {
  rawNotes: PaceNote[];
  filter: NoteFilterOptions;
  provider: TtsProvider;
  voiceId: string;
  cache: VoiceCache;
  hash: (value: string) => Promise<string>;
  concurrency?: number;
  onProgress?: (progress: PrepareProgress) => void;
  cancelled?: () => boolean;
}): Promise<PrepareResult> {
  const plan = planRouteClips(input.rawNotes, input.filter);
  const total = plan.uniqueTexts.length;
  const live = !input.provider.canPrerender;
  let done = 0;
  let bytes = 0;

  const report = () => {
    input.onProgress?.({ done, total, bytes, live });
  };
  report();

  const worker = async (text: string): Promise<PreparedClip> => {
    const material = voiceCacheMaterial(text, input.provider.id, input.voiceId);
    const hash = await input.hash(material);
    const cached = await input.cache.get(hash);
    if (cached) {
      const file = rowToLocalFile(cached);
      bytes += file.bytes;
      done += 1;
      report();
      return { text, uri: file.uri, bytes: file.bytes, live: file.live, hash };
    }
    const file = await input.provider.synthesize(text, input.voiceId);
    await input.cache.put({
      textHash: hash,
      providerId: input.provider.id,
      voiceId: input.voiceId,
      filePath: file.live ? LIVE_CLIP_URI : file.uri,
      bytes: file.bytes,
      live: file.live,
    });
    bytes += file.bytes;
    done += 1;
    report();
    return { text, uri: file.uri, bytes: file.bytes, live: file.live, hash };
  };

  if (live) {
    const clips: PreparedClip[] = [];
    for (const text of plan.uniqueTexts) {
      if (input.cancelled?.()) {
        break;
      }
      clips.push(await worker(text));
    }
    return { clips, plan, live: true, bytes };
  }

  const settled = await mapPool(
    plan.uniqueTexts,
    input.concurrency ?? PREPARE_CONCURRENCY,
    async (text) => {
      if (input.cancelled?.()) {
        throw new Error('cancelled');
      }
      return worker(text);
    },
  );

  const clips: PreparedClip[] = [];
  const failures: unknown[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      clips.push(result.value);
    } else {
      failures.push(result.reason);
    }
  }
  if (failures.length > 0 && clips.length === 0) {
    const first = failures[0];
    throw first instanceof Error ? first : new Error('Voice prepare failed');
  }
  return { clips, plan, live: false, bytes };
}

export function clipLookup(clips: PreparedClip[]): Map<string, PreparedClip> {
  return new Map(clips.map((clip) => [clip.text, clip]));
}
