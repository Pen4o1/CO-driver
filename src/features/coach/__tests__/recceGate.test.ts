import { canStartDrive, countPreparedCalls } from '../recceGate';

describe('countPreparedCalls', () => {
  it('counts planned calls that already have a clip', () => {
    expect(
      countPreparedCalls(['left 3', 'right 4'], new Set(['left 3'])),
    ).toEqual({ ready: 1, needed: 2 });
  });
});

describe('canStartDrive', () => {
  const ready = { ready: 2, needed: 2 };

  it('stays off until the disclaimer is acknowledged', () => {
    expect(canStartDrive({ legal: false, clips: ready })).toEqual({
      enabled: false,
      clipsMissing: false,
    });
  });

  it('stays off while clip counts are still loading', () => {
    expect(canStartDrive({ legal: true, clips: null })).toEqual({
      enabled: false,
      clipsMissing: false,
    });
  });

  it('asks for Prepare voice when calls have no clips', () => {
    expect(
      canStartDrive({ legal: true, clips: { ready: 0, needed: 4 } }),
    ).toEqual({ enabled: false, clipsMissing: true });
  });

  it('asks for Prepare voice when only some calls are cached', () => {
    expect(
      canStartDrive({ legal: true, clips: { ready: 1, needed: 4 } }),
    ).toEqual({ enabled: false, clipsMissing: true });
  });

  it('enables START when there is nothing to speak', () => {
    expect(
      canStartDrive({ legal: true, clips: { ready: 0, needed: 0 } }),
    ).toEqual({ enabled: true, clipsMissing: false });
  });

  it('enables START once every planned call is cached', () => {
    expect(canStartDrive({ legal: true, clips: ready })).toEqual({
      enabled: true,
      clipsMissing: false,
    });
  });
});
