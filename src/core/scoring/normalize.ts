export function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (max === min) {
    return values.map(() => 0.5);
  }
  return values.map((value) => (value - min) / (max - min));
}

/** Missing metrics become 0.5 and their weight is skipped in the denominator. */
export function normalizeNullable(values: (number | null)[]): number[] {
  const present = values.map((v) => (v === null ? 0 : v));
  const flags = values.map((v) => v !== null);
  if (!flags.some(Boolean)) {
    return values.map(() => 0.5);
  }
  const filled = present.map((v, i) => (flags[i] ? v : Number.NaN));
  const known = filled.filter((v) => Number.isFinite(v));
  const normKnown = minMaxNormalize(known);
  let k = 0;
  return filled.map((v, i) => {
    if (!flags[i]) {
      return 0.5;
    }
    const n = normKnown[k];
    k += 1;
    return n;
  });
}
