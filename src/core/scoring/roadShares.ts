export type IndexTriple = [number, number, number];

/** Metres of polyline whose extra value matches `predicate`. */
export function metresWhere(
  values: IndexTriple[],
  cumulative: Float64Array,
  predicate: (value: number) => boolean,
): number {
  let metres = 0;
  for (const [startIdx, endIdx, value] of values) {
    if (!predicate(value)) {
      continue;
    }
    const start = Math.max(0, Math.min(startIdx, cumulative.length - 1));
    const end = Math.max(0, Math.min(endIdx, cumulative.length - 1));
    const a = cumulative[Math.min(start, end)];
    const b = cumulative[Math.max(start, end)];
    metres += Math.max(0, b - a);
  }
  return metres;
}

export function shareWhere(
  values: IndexTriple[] | undefined,
  cumulative: Float64Array,
  lengthM: number,
  predicate: (value: number) => boolean,
): number | null {
  if (!values || values.length === 0 || lengthM <= 0) {
    return null;
  }
  return metresWhere(values, cumulative, predicate) / lengthM;
}
