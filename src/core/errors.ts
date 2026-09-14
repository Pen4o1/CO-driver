export type AppErrorCode =
  | 'bad-key'
  | 'forbidden'
  | 'rate-limited'
  | 'no-route'
  | 'offline'
  | 'invalid-response'
  | 'not-implemented'
  | 'unknown';

export type AppError = {
  code: AppErrorCode;
  message: string;
  retryAfterMs?: number;
  cause?: unknown;
};

export function appError(
  code: AppErrorCode,
  message: string,
  extras: Pick<AppError, 'retryAfterMs' | 'cause'> = {},
): AppError {
  return { code, message, ...extras };
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as AppError).code === 'string' &&
    typeof (value as AppError).message === 'string'
  );
}
