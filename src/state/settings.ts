import { create } from 'zustand';

import type { RoutingProviderId } from '@/core/routing';
import { readTtsEnv, type TtsProviderId } from '@/features/voice/registry';

const ttsEnv = readTtsEnv();

type SettingsState = {
  providerId: RoutingProviderId;
  ttsProviderId: TtsProviderId;
  voiceId: string;
  duckOthers: boolean;
  voiceVolume: number;
  spellOutDistances: boolean;
  setProviderId: (id: RoutingProviderId) => void;
  setTtsProviderId: (id: TtsProviderId) => void;
  setVoiceId: (id: string) => void;
  setDuckOthers: (duck: boolean) => void;
  setVoiceVolume: (volume: number) => void;
  setSpellOutDistances: (value: boolean) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  providerId: 'ors',
  ttsProviderId: ttsEnv.provider,
  voiceId: ttsEnv.voiceId,
  duckOthers: true,
  voiceVolume: 1,
  spellOutDistances: false,
  setProviderId: (providerId) => set({ providerId }),
  setTtsProviderId: (ttsProviderId) => set({ ttsProviderId }),
  setVoiceId: (voiceId) => set({ voiceId }),
  setDuckOthers: (duckOthers) => set({ duckOthers }),
  setVoiceVolume: (voiceVolume) => set({ voiceVolume }),
  setSpellOutDistances: (spellOutDistances) => set({ spellOutDistances }),
}));
