import { create } from 'zustand';

import type { DriveSessionStatus } from '@/core/types';

type SessionState = {
  status: DriveSessionStatus;
  setStatus: (status: DriveSessionStatus) => void;
};

export const useSession = create<SessionState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
