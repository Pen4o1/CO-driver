import {
  parsePersistedSettings,
  type PersistedSettings,
} from '@/core/settings';
import { getMeta, setMeta } from '@/features/storage/metaRepo';
import { useSettings } from '@/state/settings';

const KEY = 'settings';

function snapshot(): PersistedSettings {
  const s = useSettings.getState();
  return parsePersistedSettings({
    providerId: s.providerId,
    ttsProviderId: s.ttsProviderId,
    voiceId: s.voiceId,
    voiceVolume: s.voiceVolume,
    spellOutDistances: s.spellOutDistances,
    leadPreset: s.leadPreset,
    confirmCalls: s.confirmCalls,
    chainRadius: s.chainRadius,
    minGradeToCall: s.minGradeToCall,
    includeJunctions: s.includeJunctions,
    includeCrests: s.includeCrests,
    includeStraights: s.includeStraights,
    includeCareNotes: s.includeCareNotes,
    includeFinish: s.includeFinish,
    verbosity: s.verbosity,
    defaultProfileId: s.defaultProfileId,
    unitSystem: s.unitSystem,
    keepScreenOn: s.keepScreenOn,
  });
}

export async function hydrateSettings(): Promise<void> {
  const raw = await getMeta(KEY);
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return;
  }
  useSettings.getState().hydrate(parsePersistedSettings(parsed));
}

export async function persistSettings(): Promise<void> {
  await setMeta(KEY, JSON.stringify(snapshot()));
}

export function watchSettingsPersist(): () => void {
  return useSettings.subscribe(() => {
    void persistSettings();
  });
}
