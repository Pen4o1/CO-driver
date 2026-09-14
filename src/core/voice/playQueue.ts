import { MAX_QUEUED_UTTERANCES } from './constants';
import type { PlayPriority } from './priority';

export type QueuedUtterance = {
  id: string;
  text: string;
  priority: PlayPriority;
  clipId?: string;
};

export type QueueState = {
  playing: QueuedUtterance | null;
  pending: QueuedUtterance[];
};

export function emptyQueue(): QueueState {
  return { playing: null, pending: [] };
}

export type OfferResult = {
  state: QueueState;
  interrupt: boolean;
  dropped: boolean;
};

/**
 * Drive-time queue. Never more than `maxPending` waiting behind the current clip.
 * INFO is dropped if something is already speaking. URGENT interrupts.
 */
export function offerUtterance(
  state: QueueState,
  incoming: QueuedUtterance,
  maxPending: number = MAX_QUEUED_UTTERANCES,
): OfferResult {
  if (state.playing === null) {
    return {
      state: { playing: incoming, pending: state.pending },
      interrupt: false,
      dropped: false,
    };
  }

  if (incoming.priority === 'info') {
    return { state, interrupt: false, dropped: true };
  }

  if (incoming.priority === 'urgent') {
    const pending = state.pending
      .filter((item) => item.priority !== 'info')
      .slice(0, maxPending);
    return {
      state: { playing: incoming, pending },
      interrupt: true,
      dropped: false,
    };
  }

  if (state.pending.length >= maxPending) {
    return { state, interrupt: false, dropped: true };
  }

  return {
    state: {
      playing: state.playing,
      pending: [...state.pending, incoming],
    },
    interrupt: false,
    dropped: false,
  };
}

export function completePlaying(state: QueueState): QueueState {
  if (state.pending.length === 0) {
    return { playing: null, pending: [] };
  }
  const [next, ...rest] = state.pending;
  return { playing: next, pending: rest };
}
