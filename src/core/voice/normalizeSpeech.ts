const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const;

function belowHundred(n: number): string {
  if (n < 20) {
    return ONES[n];
  }
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) {
    return TENS[tens];
  }
  return `${TENS[tens]} ${ONES[ones]}`;
}

/**
 * 350 → "three fifty", 150 → "one fifty", 20 → "twenty".
 * Used only when a voice reads digits badly (Phase 4). SPEC default is digits.
 */
export function spellOutNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) {
    return String(n);
  }
  const whole = Math.floor(n);
  if (whole < 20) {
    return ONES[whole];
  }
  if (whole < 100) {
    return belowHundred(whole);
  }
  if (whole < 1000) {
    const hundreds = Math.floor(whole / 100);
    const rest = whole % 100;
    if (rest === 0) {
      return `${ONES[hundreds]} hundred`;
    }
    return `${ONES[hundreds]} ${belowHundred(rest)}`;
  }
  return String(whole);
}

export type SpeakLikeOptions = {
  /** Default false: SPEC §6, digits as digits. */
  spellOutDistances?: boolean;
};

/**
 * Normalise note text for TTS. Prepends nothing.
 * Distances stay numeric unless the provider opts into spelled numbers.
 */
export function speakLikeCoDriver(
  text: string,
  opts: SpeakLikeOptions = {},
): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!opts.spellOutDistances) {
    return trimmed;
  }
  return trimmed.replace(/\b\d+\b/g, (match) => spellOutNumber(Number(match)));
}

export function voiceCacheMaterial(
  text: string,
  providerId: string,
  voiceId: string,
): string {
  return `${text}\n${providerId}\n${voiceId}`;
}
