/** Voice / recce constants. Drive-time timing lives in Phase 5. */

export const CHAIN_VARIANTS_M = [0, 60, 200] as const;

export const PREPARE_CONCURRENCY = 4;

export const MAX_QUEUED_UTTERANCES = 2;

export const PRELOAD_AHEAD = 2;

export const PLAYER_POOL_SIZE = 3;

/** ~4–8 MB for a 120-note route → roughly 50 kB/clip. */
export const BYTES_PER_CHAR_ESTIMATE = 800;

export const SAMPLE_PHRASE = 'In 150, left four, tightens, into right six.';

export const LIVE_CLIP_URI = 'live://device-tts';
