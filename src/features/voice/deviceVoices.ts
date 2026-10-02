import type { Voice, VoiceQuality } from './TtsProvider';

const QUALITY_RANK: Record<VoiceQuality, number> = {
  premium: 0,
  enhanced: 1,
  default: 2,
};

/**
 * iOS reports Premium as Default in expo-speech, so the identifier is the
 * reliable signal. Downloaded voices use `premium` or `enhanced` in the id.
 */
export function classifyDeviceVoice(input: {
  identifier: string;
  quality?: string | null;
}): VoiceQuality {
  const id = input.identifier.toLowerCase();
  const quality = (input.quality ?? '').toLowerCase();
  if (id.includes('premium') || quality === 'premium') return 'premium';
  if (id.includes('enhanced') || quality === 'enhanced') return 'enhanced';
  return 'default';
}

export function voiceQualityLabel(
  quality: VoiceQuality | undefined,
): string | null {
  if (quality === 'premium') return 'Premium';
  if (quality === 'enhanced') return 'Enhanced';
  return null;
}

/** English first, then downloaded Premium and Enhanced, then name. */
export function sortVoicesForPicker(
  voices: Voice[],
  preferredPrefix = 'en',
): Voice[] {
  const prefix = preferredPrefix.toLowerCase();
  return [...voices].sort((a, b) => {
    const aLang = a.language.toLowerCase().startsWith(prefix) ? 0 : 1;
    const bLang = b.language.toLowerCase().startsWith(prefix) ? 0 : 1;
    if (aLang !== bLang) return aLang - bLang;
    const byQuality =
      QUALITY_RANK[a.quality ?? 'default'] -
      QUALITY_RANK[b.quality ?? 'default'];
    if (byQuality !== 0) return byQuality;
    const byLanguage = a.language.localeCompare(b.language);
    if (byLanguage !== 0) return byLanguage;
    return a.name.localeCompare(b.name);
  });
}
