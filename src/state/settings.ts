import { create } from 'zustand';

import {
  DEFAULT_PERSISTED_SETTINGS,
  filterFromPersisted,
  type PersistedSettings,
} from '@/core/settings';
import type { NoteFilterOptions } from '@/core/types';
import { readTtsEnv } from '@/features/voice/registry';

const ttsEnv = readTtsEnv();

type SettingsState = PersistedSettings & {
  hydrate: (next: PersistedSettings) => void;
  patch: (partial: Partial<PersistedSettings>) => void;
  noteFilter: () => NoteFilterOptions;
};

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT_PERSISTED_SETTINGS,
  ttsProviderId: ttsEnv.provider,
  voiceId: ttsEnv.voiceId,
  hydrate: (next) => set(next),
  patch: (partial) => set(partial),
  noteFilter: () => filterFromPersisted(get()),
}));
