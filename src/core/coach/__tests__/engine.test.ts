import { destinationPoint, pointAtDistance } from '@/core/geo';

import { OFF_ROUTE_TEXT } from '../constants';
import { engineFrom, pauseEngine, seekEngine, updateEngine } from '../engine';
import { confirmTriggerM, primaryTriggerM } from '../timing';
import { cornerNote, FILTER, fixAt, straightGeometry } from './helpers';

const SPEED = 100 / 3.6;

describe('co-driver engine', () => {
  const geometry = straightGeometry(2000);
  const note = cornerNote('c1', 1000, 2);

  function warm(distanceM: number, nowMs: number) {
    return updateEngine(
      engineFrom(geometry, [note], FILTER),
      fixAt(geometry, distanceM, SPEED, nowMs),
      nowMs,
    ).state;
  }

  it('fires the grade-2 primary at exactly 139 m before the entry', () => {
    const trigger = primaryTriggerM(note, SPEED);
    expect(trigger).toBe(note.entryDistance - 139);
    let state = warm(trigger - 20, 1);
    let firedAt: number | null = null;
    for (let d = trigger - 19; d <= trigger + 2; d += 1) {
      const result = updateEngine(
        state,
        fixAt(geometry, d, SPEED, 100 + d),
        100 + d,
      );
      state = result.state;
      const speak = result.output.actions.find(
        (a) => a.kind === 'speak' && a.noteId === 'c1',
      );
      if (speak) {
        firedAt = Math.round(result.output.positionAlongRoute);
        break;
      }
    }
    expect(firedAt).toBe(trigger);
  });

  it('never repeats a call unless the car reverses more than 50 m', () => {
    const trigger = primaryTriggerM(note, SPEED);
    let state = warm(trigger - 5, 1);
    const first = updateEngine(
      state,
      fixAt(geometry, trigger, SPEED, 1000),
      1000,
    );
    expect(first.output.actions.some((a) => a.kind === 'speak')).toBe(true);
    const second = updateEngine(
      first.state,
      fixAt(geometry, trigger + 10, SPEED, 2000),
      2000,
    );
    expect(
      second.output.actions.filter(
        (a) => a.kind === 'speak' && a.noteId === 'c1',
      ),
    ).toHaveLength(0);
    state = updateEngine(
      second.state,
      fixAt(geometry, trigger - 60, SPEED, 3000),
      3000,
    ).state;
    const again = updateEngine(
      state,
      fixAt(geometry, trigger, SPEED, 4000),
      4000,
    );
    expect(again.output.actions.some((a) => a.kind === 'speak')).toBe(true);
  });

  it('coalesces two notes within chainRadius into one utterance', () => {
    const a = cornerNote('a', 1000, 3, {
      chain: 'into',
      spokenShort: 'left three',
    });
    const b = cornerNote('b', 1030, 4, {
      direction: 'right',
      spokenShort: 'right four',
    });
    const trigger = primaryTriggerM(a, SPEED);
    let state = engineFrom(geometry, [a, b], { ...FILTER, chainRadius: 60 });
    state = updateEngine(
      state,
      fixAt(geometry, trigger - 10, SPEED, 1),
      1,
    ).state;
    const result = updateEngine(
      state,
      fixAt(geometry, trigger, SPEED, 1000),
      1000,
    );
    const speaks = result.output.actions.filter((x) => x.kind === 'speak');
    expect(speaks).toHaveLength(1);
    if (speaks[0].kind === 'speak') {
      expect(speaks[0].text.toLowerCase()).toContain('three');
      expect(speaks[0].text.toLowerCase()).toContain('four');
    }
  });

  it('skips confirm if the primary fired less than 3 s ago', () => {
    const primaryAt = primaryTriggerM(note, SPEED);
    let state = warm(primaryAt - 5, 1);
    state = updateEngine(
      state,
      fixAt(geometry, primaryAt, SPEED, 5000),
      5000,
    ).state;
    const soon = updateEngine(
      state,
      fixAt(geometry, confirmTriggerM(note), SPEED, 6000),
      6000,
    );
    expect(
      soon.output.actions.filter(
        (a) => a.kind === 'speak' && a.noteId.includes('confirm'),
      ),
    ).toHaveLength(0);
  });

  it('seek pauses without replaying past calls', () => {
    const trigger = primaryTriggerM(note, SPEED);
    let state = warm(trigger - 5, 1);
    state = updateEngine(state, fixAt(geometry, trigger, SPEED, 2), 2).state;
    state = seekEngine(state, 400);
    const result = updateEngine(
      pauseEngine(state, true),
      fixAt(geometry, 400, SPEED, 3),
      3,
    );
    expect(result.output.status).toBe('paused');
    expect(result.output.actions).toHaveLength(0);
  });
});

describe('off-route detection', () => {
  const geometry = straightGeometry(2000);
  const note = cornerNote('c1', 1000, 2);

  it('trips after 3 credible 60 m offsets spanning 5 s', () => {
    let state = engineFrom(geometry, [note], FILTER);
    state = updateEngine(state, fixAt(geometry, 100, 10, 0), 0).state;
    const on = pointAtDistance(geometry.coords, 200, geometry.cumulative);
    const off = destinationPoint(on, 90, 60);
    let outputStatus = 'on-route';
    let actions: { kind: string; text?: string }[] = [];
    for (let i = 0; i < 3; i += 1) {
      const now = 1000 + i * 2500;
      const result = updateEngine(
        state,
        {
          lat: off.lat,
          lng: off.lng,
          speedMps: 10,
          headingDeg: 0,
          accuracyM: 5,
          timestampMs: now,
        },
        now,
      );
      state = result.state;
      outputStatus = result.output.status;
      actions = result.output.actions;
    }
    expect(outputStatus).toBe('off-route');
    expect(
      actions.some((a) => a.kind === 'speak' && a.text === OFF_ROUTE_TEXT),
    ).toBe(true);
  });

  it('ignores poor-accuracy tunnel glitches', () => {
    let state = engineFrom(geometry, [note], FILTER);
    state = updateEngine(state, fixAt(geometry, 100, 10, 0), 0).state;
    const on = pointAtDistance(geometry.coords, 200, geometry.cumulative);
    const off = destinationPoint(on, 90, 60);
    for (let i = 0; i < 3; i += 1) {
      const now = 1000 + i * 2500;
      const result = updateEngine(
        state,
        {
          lat: off.lat,
          lng: off.lng,
          speedMps: 10,
          headingDeg: 0,
          accuracyM: 80,
          timestampMs: now,
        },
        now,
      );
      state = result.state;
      expect(result.output.status).toBe('on-route');
    }
  });
});
