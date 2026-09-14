import { create } from 'zustand';

import type { RoutingProviderId } from '@/core/routing';
import type { LeadTimePreset, TurnGrade } from '@/core/types';
import { readTtsEnv, type TtsProviderId } from '@/features/voice/registry';

const ttsEnv = readTtsEnv();

type SettingsState = {
  providerId: RoutingProviderId;
  ttsProviderId: TtsProviderId;
  voiceId: string;
  duckOthers: boolean;
  voiceVolume: number;
  spellOutDistances: boolean;
  leadPreset: LeadTimePreset;
  confirmCalls: boolean;
  chainRadius: number;
  minGradeToCall: TurnGrade;
  setProviderId: (id: RoutingProviderId) => void;
  setTtsProviderId: (id: TtsProviderId) => void;
  setVoiceId: (id: string) => void;
  setDuckOthers: (duck: boolean) => void;
  setVoiceVolume: (volume: number) => void;
  setSpellOutDistances: (value: boolean) => void;
  setLeadPreset: (preset: LeadTimePreset) => void;
  setConfirmCalls: (value: boolean) => void;
  setChainRadius: (value: number) => void;
  setMinGradeToCall: (value: TurnGrade) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  providerId: 'ors',
  ttsProviderId: ttsEnv.provider,
  voiceId: ttsEnv.voiceId,
  duckOthers: true,
  voiceVolume: 1,
  spellOutDistances: false,
  leadPreset: 'normal',
  confirmCalls: true,
  chainRadius: 60,
  minGradeToCall: 6,
  setProviderId: (providerId) => set({ providerId }),
  setTtsProviderId: (ttsProviderId) => set({ ttsProviderId }),
  setVoiceId: (voiceId) => set({ voiceId }),
  setDuckOthers: (duckOthers) => set({ duckOthers }),
  setVoiceVolume: (voiceVolume) => set({ voiceVolume }),
  setSpellOutDistances: (spellOutDistances) => set({ spellOutDistances }),
  setLeadPreset: (leadPreset) => set({ leadPreset }),
  setConfirmCalls: (confirmCalls) => set({ confirmCalls }),
  setChainRadius: (chainRadius) => set({ chainRadius }),
  setMinGradeToCall: (minGradeToCall) => set({ minGradeToCall }),
}));
