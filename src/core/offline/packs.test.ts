import { isRoutePack, packMetadata } from './packs';

describe('offline pack metadata', () => {
  it('matches the route it was built for', () => {
    const meta = packMetadata('rt_abc');
    expect(isRoutePack(meta, 'rt_abc')).toBe(true);
    expect(isRoutePack(meta, 'rt_other')).toBe(false);
    expect(isRoutePack({ routeId: 'rt_abc' }, 'rt_abc')).toBe(false);
  });
});
