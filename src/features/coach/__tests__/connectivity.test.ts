import { probeOnline } from '../connectivity';

describe('probeOnline', () => {
  it('is online when the probe responds', async () => {
    const fetchImpl = jest.fn(async () => ({ status: 204 }) as Response);
    await expect(probeOnline(fetchImpl, 1000)).resolves.toBe(true);
  });

  it('is offline when the probe throws', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network down');
    });
    await expect(probeOnline(fetchImpl, 1000)).resolves.toBe(false);
  });
});
