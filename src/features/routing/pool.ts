export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function runOne(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        const value = await worker(items[index]);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length)) },
    () => runOne(),
  );
  await Promise.all(workers);
  return results;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/**
 * Run workers with a wall-clock deadline. In-flight work still finishes and
 * is kept; new items are not started after `timeoutMs`. Partial success is
 * the intended outcome for candidate search.
 */
export async function collectJobs<T, R>(
  items: T[],
  opts: { concurrency: number; timeoutMs: number; now?: () => number },
  worker: (item: T) => Promise<R>,
): Promise<{ values: R[]; errors: unknown[] }> {
  const values: R[] = [];
  const errors: unknown[] = [];
  const now = opts.now ?? Date.now;
  const startedAt = now();
  let next = 0;

  async function runOne(): Promise<void> {
    while (next < items.length) {
      if (now() - startedAt >= opts.timeoutMs) {
        return;
      }
      const index = next;
      next += 1;
      try {
        values.push(await worker(items[index]));
      } catch (reason) {
        errors.push(reason);
      }
    }
  }

  const workerCount = Math.max(1, Math.min(opts.concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runOne()));
  return { values, errors };
}
