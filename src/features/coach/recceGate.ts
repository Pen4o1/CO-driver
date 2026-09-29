export type RecceClipCounts = {
  ready: number;
  needed: number;
};

/** How many planned calls already have a cached clip. */
export function countPreparedCalls(
  plannedTexts: readonly string[],
  preparedTexts: ReadonlySet<string>,
): RecceClipCounts {
  let ready = 0;
  for (const text of plannedTexts) {
    if (preparedTexts.has(text)) ready += 1;
  }
  return { ready, needed: plannedTexts.length };
}

/**
 * START stays off until the disclaimer is acknowledged and every planned
 * call has a clip. Unknown counts are not "missing" — they are still loading.
 */
export function canStartDrive(input: {
  legal: boolean;
  clips: RecceClipCounts | null;
}): { enabled: boolean; clipsMissing: boolean } {
  const clipsMissing =
    input.clips !== null &&
    input.clips.needed > 0 &&
    input.clips.ready < input.clips.needed;
  return {
    clipsMissing,
    enabled: input.legal && input.clips !== null && !clipsMissing,
  };
}
