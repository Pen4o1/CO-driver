import { appError, isAppError, type AppError } from '@/core/errors';

export type HttpGet = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export function parseRetryAfterMs(
  header: string | null,
  nowMs: number,
): number | undefined {
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - nowMs);
  }
  return undefined;
}

export function errorFromHttpStatus(
  service: string,
  status: number,
  bodyText: string,
  retryAfterMs?: number,
): AppError {
  if (status === 401) {
    return appError('bad-key', `${service} rejected the API key.`);
  }
  if (status === 403) {
    return appError('forbidden', `${service} forbade this request.`);
  }
  if (status === 429) {
    return appError('rate-limited', `${service} rate-limited the request.`, {
      retryAfterMs,
    });
  }
  if (status === 404 || status === 2010) {
    return appError('no-route', 'No route found between these points.');
  }
  if (bodyText.toLowerCase().includes('could not find routable')) {
    return appError('no-route', 'No routable point near the pins.');
  }
  return appError(
    'unknown',
    `${service} error ${status}: ${bodyText.slice(0, 180)}`,
  );
}

export function errorFromUnknown(caught: unknown): AppError {
  if (isAppError(caught)) {
    return caught;
  }
  if (caught instanceof TypeError) {
    return appError('offline', 'Network unavailable.', { cause: caught });
  }
  if (
    caught instanceof Error &&
    /network|fetch|offline/i.test(caught.message)
  ) {
    return appError('offline', caught.message, { cause: caught });
  }
  if (caught instanceof Error) {
    return appError('unknown', caught.message, { cause: caught });
  }
  return appError('unknown', 'Routing failed.', { cause: caught });
}
