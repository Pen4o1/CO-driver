export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T, E>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<T, E>(error: E): Result<T, E> {
  return { ok: false, error };
}

export async function fromPromise<T, E>(
  run: () => Promise<T>,
  onThrow: (caught: unknown) => E,
): Promise<Result<T, E>> {
  try {
    return ok(await run());
  } catch (caught) {
    return err(onThrow(caught));
  }
}
