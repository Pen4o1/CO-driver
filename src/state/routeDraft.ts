import { create } from 'zustand';

import type { CustomProfileInput } from '@/core/routing';
import type { LatLng, RouteCandidate, RouteStyle } from '@/core/types';

export type BuilderStep = 1 | 2 | 3;
export type RouteMode = 'ab' | 'loop';
export type PinTarget = 'start' | 'end';

export const DEFAULT_CUSTOM: CustomProfileInput = {
  curviness: 5,
  maxSharpness: 3,
  avoidMotorway: false,
  avoidToll: true,
  avoidFerry: true,
  avoidUnpaved: false,
  maxDetourRatio: 1.35,
};

type RouteDraftState = {
  start: LatLng | null;
  end: LatLng | null;
  startLabel: string | null;
  endLabel: string | null;
  activePin: PinTarget;
  step: BuilderStep;
  mode: RouteMode;
  loopDistanceKm: 30 | 60 | 100;
  profileId: RouteStyle;
  custom: CustomProfileInput;
  candidate: RouteCandidate | null;
  candidates: RouteCandidate[];
  errorMessage: string | null;
  isRouting: boolean;
  setStart: (point: LatLng, label?: string) => void;
  setEnd: (point: LatLng, label?: string) => void;
  setActivePin: (pin: PinTarget) => void;
  setStep: (step: BuilderStep) => void;
  setMode: (mode: RouteMode) => void;
  setLoopDistanceKm: (km: 30 | 60 | 100) => void;
  setProfileId: (id: RouteStyle) => void;
  setCustom: (custom: CustomProfileInput) => void;
  setCandidate: (candidate: RouteCandidate | null) => void;
  setCandidates: (candidates: RouteCandidate[]) => void;
  selectCandidate: (id: string) => void;
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
  step: 1,
  mode: 'ab',
  loopDistanceKm: 60,
  profileId: 'twist',
  custom: DEFAULT_CUSTOM,
  candidate: null,
  candidates: [],
  errorMessage: null,
  isRouting: false,
  setStart: (start, startLabel) =>
    set({ start, startLabel: startLabel ?? null }),
  setEnd: (end, endLabel) => set({ end, endLabel: endLabel ?? null }),
  setActivePin: (activePin) => set({ activePin }),
  setStep: (step) => set({ step }),
  setMode: (mode) => set({ mode }),
  setLoopDistanceKm: (loopDistanceKm) => set({ loopDistanceKm }),
  setProfileId: (profileId) => set({ profileId }),
  setCustom: (custom) => set({ custom }),
  setCandidate: (candidate) => set({ candidate }),
  setCandidates: (candidates) =>
    set({ candidates, candidate: candidates[0] ?? null }),
  selectCandidate: (id) => {
    const found = get().candidates.find((c) => c.id === id) ?? null;
    set({ candidate: found });
  },
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setIsRouting: (isRouting) => set({ isRouting }),
  placeOnMap: (point) => {
    const { activePin, mode } = get();
    if (activePin === 'start' || mode === 'loop') {
      set({ start: point, startLabel: null, activePin: 'end' });
    } else {
      set({ end: point, endLabel: null });
    }
  },
}));
