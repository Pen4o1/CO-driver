import { probeLink, probeOnline } from '../connectivity';

describe('probeLink', () => {
  it('is online when the probe responds quickly', async () => {
    const fetchImpl = jest.fn(async () => ({ status: 204 }) as Response);
    await expect(probeLink(fetchImpl, 1000, 500)).resolves.toBe('online');
    await expect(probeOnline(fetchImpl, 1000, 500)).resolves.toBe(true);
  });

  it('is weak when the radio answers too slowly to load a map', async () => {
    const fetchImpl = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve({ status: 204 } as Response), 40);
        }),
    );
    await expect(probeLink(fetchImpl, 1000, 10)).resolves.toBe('weak');
    await expect(probeOnline(fetchImpl, 1000, 10)).resolves.toBe(false);
  });

  it('is offline when the probe throws', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('network down');
    });
    await expect(probeLink(fetchImpl, 1000)).resolves.toBe('offline');
    await expect(probeOnline(fetchImpl, 1000)).resolves.toBe(false);
  });
});
