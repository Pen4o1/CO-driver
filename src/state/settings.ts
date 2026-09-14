import { create } from 'zustand';

import type { RoutingProviderId } from '@/core/routing';

type SettingsState = {
  providerId: RoutingProviderId;
  setProviderId: (id: RoutingProviderId) => void;
};

export const useSettings = create<SettingsState>((set) => ({
  providerId: 'ors',
  setProviderId: (providerId) => set({ providerId }),
}));
