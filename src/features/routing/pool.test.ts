import { collectJobs, mapPool } from './pool';

describe('collectJobs', () => {
  it('keeps finished work when the deadline hits', async () => {
    let now = 0;
    const { values, errors } = await collectJobs(
      [25, 50, 50],
      { concurrency: 1, timeoutMs: 20, now: () => now },
      async (ms) => {
        now += ms;
        return ms;
      },
    );
    expect(values).toEqual([25]);
    expect(errors).toEqual([]);
  });

  it('records worker failures without dropping siblings', async () => {
    const { values, errors } = await collectJobs(
      [1, 2, 3],
      { concurrency: 3, timeoutMs: 1000 },
      async (n) => {
        if (n === 2) {
          throw new Error('boom');
        }
        return n;
      },
    );
    expect(values.sort()).toEqual([1, 3]);
    expect(errors).toHaveLength(1);
  });
});

describe('mapPool', () => {
  it('preserves order of settled results', async () => {
    const settled = await mapPool([1, 2], 2, async (n) => n * 2);
    expect(
      settled.map((item) => (item.status === 'fulfilled' ? item.value : 0)),
    ).toEqual([2, 4]);
  });
});
