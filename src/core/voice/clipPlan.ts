import { filterNotes } from '@/core/pacenotes/filterNotes';
import { notesToScript } from '@/core/pacenotes/script';
import type { NoteFilterOptions, PaceNote } from '@/core/types';

import { BYTES_PER_CHAR_ESTIMATE, CHAIN_VARIANTS_M } from './constants';
import { speakLikeCoDriver, type SpeakLikeOptions } from './normalizeSpeech';

export type PlannedClip = {
  text: string;
  noteIds: string[];
  atDistance: number;
  chainRadius: number;
};

export type ClipPlan = {
  clips: PlannedClip[];
  uniqueTexts: string[];
  estimatedBytes: number;
};

/**
 * Dedupe spoken texts across the top-3 chainRadius variants so a filter
 * change in the car still has audio. Raw notes in; filtered scripts out.
 */
export function planRouteClips(
  rawNotes: PaceNote[],
  filter: NoteFilterOptions,
  speakOpts: SpeakLikeOptions = {},
  variants: readonly number[] = CHAIN_VARIANTS_M,
): ClipPlan {
  const byText = new Map<string, PlannedClip>();
  for (const chainRadius of variants) {
    const filtered = filterNotes(rawNotes, { ...filter, chainRadius });
    const script = notesToScript(filtered, {
      verbosity: filter.verbosity,
      chainRadius,
    });
    for (const utterance of script) {
      const text = speakLikeCoDriver(utterance.text, speakOpts);
      if (text.length === 0 || byText.has(text)) {
        continue;
      }
      byText.set(text, {
        text,
        noteIds: utterance.noteIds,
        atDistance: utterance.atDistance,
        chainRadius,
      });
    }
  }
  const clips = [...byText.values()];
  const uniqueTexts = clips.map((clip) => clip.text);
  const estimatedBytes = uniqueTexts.reduce(
    (sum, text) => sum + Math.max(8_000, text.length * BYTES_PER_CHAR_ESTIMATE),
    0,
  );
  return { clips, uniqueTexts, estimatedBytes };
}

const VERBOSITY_VARIANTS: readonly NoteFilterOptions['verbosity'][] = [
  'full',
  'standard',
  'terse',
];

/**
 * Every phrase the checklist can ask for after a call-length change.
 * Chain distance is already expanded inside planRouteClips. Call length
 * rewrites the words, so Full / Standard / Terse are recorded together.
 */
export function planRouteClipVariants(
  rawNotes: PaceNote[],
  filter: NoteFilterOptions,
  speakOpts: SpeakLikeOptions = {},
): ClipPlan {
  const byText = new Map<string, PlannedClip>();
  for (const verbosity of VERBOSITY_VARIANTS) {
    const plan = planRouteClips(rawNotes, { ...filter, verbosity }, speakOpts);
    for (const clip of plan.clips) {
      if (!byText.has(clip.text)) byText.set(clip.text, clip);
    }
  }
  const clips = [...byText.values()];
  const uniqueTexts = clips.map((clip) => clip.text);
  const estimatedBytes = uniqueTexts.reduce(
    (sum, text) => sum + Math.max(8_000, text.length * BYTES_PER_CHAR_ESTIMATE),
    0,
  );
  return { clips, uniqueTexts, estimatedBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
