jest.mock('expo-audio', () => ({
  setIsAudioActiveAsync: jest.fn(async () => undefined),
}));

import { createOtherAudioHold } from '../otherAudioHold';

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('other audio hold', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores music after the call finishes', async () => {
    const settled: boolean[] = [];
    const hold = createOtherAudioHold(async (next) => {
      settled.push(next);
    }, 400);

    await hold.hold();
    hold.release();
    jest.advanceTimersByTime(400);
    await flush();

    expect(settled).toEqual([true, false]);
  });

  it('keeps music down when the next call starts before the release', async () => {
    const settled: boolean[] = [];
    const hold = createOtherAudioHold(async (next) => {
      settled.push(next);
    }, 400);

    await hold.hold();
    hold.release();
    await hold.hold();
    jest.advanceTimersByTime(400);
    await flush();

    expect(settled).toEqual([true, true]);
  });
});
