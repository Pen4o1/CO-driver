import { create } from 'zustand';

import type { LatLng, RouteCandidate } from '@/core/types';

type PinTarget = 'start' | 'end';

type RouteDraftState = {
  start: LatLng | null;
  end: LatLng | null;
  startLabel: string | null;
  endLabel: string | null;
  activePin: PinTarget;
  candidate: RouteCandidate | null;
  errorMessage: string | null;
  isRouting: boolean;
  setStart: (point: LatLng, label?: string) => void;
  setEnd: (point: LatLng, label?: string) => void;
  setActivePin: (pin: PinTarget) => void;
  setCandidate: (candidate: RouteCandidate | null) => void;
  setErrorMessage: (message: string | null) => void;
  setIsRouting: (isRouting: boolean) => void;
  placeOnMap: (point: LatLng) => void;
};

export const useRouteDraft = create<RouteDraftState>((set, get) => ({
  start: null,
  end: null,
  startLabel: null,
  endLabel: null,
  activePin: 'start',
  candidate: null,
  errorMessage: null,
  isRouting: false,
  setStart: (start, startLabel) =>
    set({ start, startLabel: startLabel ?? null }),
  setEnd: (end, endLabel) => set({ end, endLabel: endLabel ?? null }),
  setActivePin: (activePin) => set({ activePin }),
  setCandidate: (candidate) => set({ candidate }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setIsRouting: (isRouting) => set({ isRouting }),
  placeOnMap: (point) => {
    const { activePin } = get();
    if (activePin === 'start') {
      set({ start: point, startLabel: null, activePin: 'end' });
    } else {
      set({ end: point, endLabel: null });
    }
  },
}));
