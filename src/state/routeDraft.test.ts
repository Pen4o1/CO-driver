import { makeCandidate, straightLine } from '@/core/scoring/testGeometry';

import { draftIsDirty, useRouteDraft } from './routeDraft';

function pointLoop() {
  const start = { lat: 42.7, lng: 23.3 };
  const mid = { lat: 42.8, lng: 23.4 };
  return makeCandidate({
    id: 'loop',
    coords: [start, mid, { ...start }],
    durationS: 1800,
    profileId: 'cruise',
  });
}

describe('route draft', () => {
  beforeEach(() => {
    useRouteDraft.getState().reset();
  });

  it('starts clean so an abandoned route is not waiting', () => {
    const state = useRouteDraft.getState();
    expect(draftIsDirty(state)).toBe(false);
    expect(state.editingId).toBeNull();
    expect(state.step).toBe(1);
  });

  it('clears pins and candidates on reset', () => {
    useRouteDraft.getState().setStart({ lat: 1, lng: 2 }, 'Here');
    useRouteDraft
      .getState()
      .setCandidates([
        makeCandidate({ id: 'a', coords: straightLine(1000), durationS: 60 }),
      ]);
    expect(draftIsDirty(useRouteDraft.getState())).toBe(true);
    useRouteDraft.getState().reset();
    const state = useRouteDraft.getState();
    expect(state.start).toBeNull();
    expect(state.candidates).toEqual([]);
    expect(state.editingId).toBeNull();
    expect(draftIsDirty(state)).toBe(false);
  });

  it('loads a saved point-to-point route for editing', () => {
    const candidate = makeCandidate({
      id: 'ab',
      coords: straightLine(50_000),
      durationS: 2400,
      profileId: 'balanced',
    });
    useRouteDraft.getState().loadForEdit({ id: 'rt_1', candidate });
    const state = useRouteDraft.getState();
    expect(state.editingId).toBe('rt_1');
    expect(state.mode).toBe('ab');
    expect(state.step).toBe(3);
    expect(state.profileId).toBe('balanced');
    expect(state.end).toEqual(candidate.geometry.coords.at(-1));
    expect(state.candidate?.id).toBe('ab');
    expect(draftIsDirty(state)).toBe(true);
  });

  it('swaps start and finish with their names', () => {
    useRouteDraft.getState().setStart({ lat: 1, lng: 2 }, 'Alpha');
    useRouteDraft.getState().setEnd({ lat: 3, lng: 4 }, 'Beta');
    useRouteDraft.getState().swapPins();
    const state = useRouteDraft.getState();
    expect(state.start).toEqual({ lat: 3, lng: 4 });
    expect(state.end).toEqual({ lat: 1, lng: 2 });
    expect(state.startLabel).toBe('Beta');
    expect(state.endLabel).toBe('Alpha');
  });

  it('clears one stop and leaves the other', () => {
    useRouteDraft.getState().setStart({ lat: 1, lng: 2 }, 'Alpha');
    useRouteDraft.getState().setEnd({ lat: 3, lng: 4 }, 'Beta');
    useRouteDraft.getState().clearEnd();
    const state = useRouteDraft.getState();
    expect(state.end).toBeNull();
    expect(state.endLabel).toBeNull();
    expect(state.start).toEqual({ lat: 1, lng: 2 });
    expect(state.startLabel).toBe('Alpha');
  });

  it('loads a closed route as a loop', () => {
    useRouteDraft.getState().loadForEdit({
      id: 'rt_loop',
      candidate: pointLoop(),
    });
    const state = useRouteDraft.getState();
    expect(state.mode).toBe('loop');
    expect(state.end).toBeNull();
    expect(state.loopDistanceKm).toBe(30);
  });
});
