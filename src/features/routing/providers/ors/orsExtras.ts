import type { OrsExtraBlock } from './orsSchema';

export type IndexTriple = [number, number, number];

export function extraBlockByKeys(
  extras: Record<string, OrsExtraBlock> | undefined,
  keys: string[],
): OrsExtraBlock | undefined {
  if (!extras) {
    return undefined;
  }
  for (const key of keys) {
    const block = extras[key];
    if (block) {
      return block;
    }
  }
  return undefined;
}

/** ORS extras: value applies to geometry coords in [startIdx, endIdx]. */
export function extraValueAtIndex(
  values: IndexTriple[],
  index: number,
): number | undefined {
  for (const [startIdx, endIdx, value] of values) {
    if (index >= startIdx && index <= endIdx) {
      return value;
    }
  }
  return undefined;
}
