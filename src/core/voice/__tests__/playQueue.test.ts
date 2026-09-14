import { completePlaying, emptyQueue, offerUtterance } from '../playQueue';
import type { QueuedUtterance } from '../playQueue';

function item(
  id: string,
  priority: QueuedUtterance['priority'],
): QueuedUtterance {
  return { id, text: id, priority };
}

describe('offerUtterance', () => {
  it('starts immediately when idle', () => {
    const result = offerUtterance(emptyQueue(), item('a', 'normal'));
    expect(result.state.playing?.id).toBe('a');
    expect(result.dropped).toBe(false);
  });

  it('drops INFO while something is speaking', () => {
    const playing = offerUtterance(emptyQueue(), item('a', 'normal')).state;
    const result = offerUtterance(playing, item('b', 'info'));
    expect(result.dropped).toBe(true);
    expect(result.state.playing?.id).toBe('a');
  });

  it('URGENT interrupts and never queues more than 2', () => {
    let state = offerUtterance(emptyQueue(), item('a', 'normal')).state;
    state = offerUtterance(state, item('b', 'normal')).state;
    state = offerUtterance(state, item('c', 'normal')).state;
    const full = offerUtterance(state, item('d', 'normal'));
    expect(full.dropped).toBe(true);
    expect(full.state.pending).toHaveLength(2);

    const urgent = offerUtterance(full.state, item('hairpin', 'urgent'));
    expect(urgent.interrupt).toBe(true);
    expect(urgent.state.playing?.id).toBe('hairpin');
    expect(urgent.state.pending.length).toBeLessThanOrEqual(2);
  });

  it('completePlaying advances the pending queue', () => {
    let state = offerUtterance(emptyQueue(), item('a', 'normal')).state;
    state = offerUtterance(state, item('b', 'normal')).state;
    state = completePlaying(state);
    expect(state.playing?.id).toBe('b');
    expect(state.pending).toHaveLength(0);
  });
});
