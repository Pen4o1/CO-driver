import { create } from 'zustand';

import { haversineM } from '@/core/geo';
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
  /** Set while changing a route that is already in the library. */
  editingId: string | null;
  /** Bumped whenever the draft is cleared or replaced, so in-flight searches can bail out. */
  revision: number;
  setStart: (point: LatLng, label?: string) => void;
  setEnd: (point: LatLng, label?: string) => void;
  clearStart: () => void;
  clearEnd: () => void;
  swapPins: () => void;
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
  loadForEdit: (input: { id: string; candidate: RouteCandidate }) => void;
  reset: () => void;
};

const LOOP_CLOSE_M = 100;

function nearestLoopKm(lengthM: number): 30 | 60 | 100 {
  const km = lengthM / 1000;
  if (km < 45) return 30;
  if (km < 80) return 60;
  return 100;
}

function blankDraft(revision: number) {
  return {
    start: null,
    end: null,
    startLabel: null,
    endLabel: null,
    activePin: 'start' as const,
    step: 1 as const,
    mode: 'ab' as const,
    loopDistanceKm: 60 as const,
    profileId: 'twist' as const,
    custom: DEFAULT_CUSTOM,
    candidate: null,
    candidates: [] as RouteCandidate[],
    errorMessage: null,
    isRouting: false,
    editingId: null,
    revision,
  };
}

export function draftIsDirty(state: {
  editingId: string | null;
  start: LatLng | null;
  candidates: readonly RouteCandidate[];
}): boolean {
  return Boolean(state.editingId || state.start || state.candidates.length > 0);
}

export const useRouteDraft = create<RouteDraftState>((set, get) => ({
  ...blankDraft(0),
  setStart: (start, startLabel) =>
    set({ start, startLabel: startLabel ?? null }),
  setEnd: (end, endLabel) => set({ end, endLabel: endLabel ?? null }),
  clearStart: () => set({ start: null, startLabel: null }),
  clearEnd: () => set({ end: null, endLabel: null }),
  swapPins: () => {
    const { start, end, startLabel, endLabel } = get();
    set({
      start: end,
      end: start,
      startLabel: endLabel,
      endLabel: startLabel,
    });
  },
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
  loadForEdit: ({ id, candidate }) => {
    const coords = candidate.geometry.coords;
    const start = coords[0] ?? null;
    const end = coords[coords.length - 1] ?? null;
    const loop = Boolean(start && end && haversineM(start, end) < LOOP_CLOSE_M);
    set({
      ...blankDraft(get().revision + 1),
      editingId: id,
      start,
      end: loop ? null : end,
      step: start ? 3 : 1,
      mode: loop ? 'loop' : 'ab',
      loopDistanceKm: nearestLoopKm(candidate.geometry.lengthM),
      profileId: candidate.profileId,
      candidate,
      candidates: [candidate],
    });
  },
  reset: () => set(blankDraft(get().revision + 1)),
  placeOnMap: (point) => {
    const { activePin, mode } = get();
    if (activePin === 'start' || mode === 'loop') {
      set({ start: point, startLabel: null, activePin: 'end' });
    } else {
      set({ end: point, endLabel: null });
    }
  },
}));
