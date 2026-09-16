import { canMutateLibrary, isDriveLocked } from './guard';

describe('drive lock', () => {
  it('blocks library mutation while driving', () => {
    expect(isDriveLocked('driving')).toBe(true);
    expect(isDriveLocked('off-route')).toBe(true);
    expect(canMutateLibrary('driving')).toBe(false);
    expect(canMutateLibrary('idle')).toBe(true);
    expect(canMutateLibrary('finished')).toBe(true);
  });
});
