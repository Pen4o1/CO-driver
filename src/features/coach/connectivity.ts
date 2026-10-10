import { isAppError } from '@/core/errors';

const PROBE_URL = 'https://connectivitycheck.gstatic.com/generate_204';

export const OFFLINE_PACK_TEXT = 'No cellular. Using your downloaded pack.';
export const OFFLINE_LOCAL_TEXT = 'No cellular. Calls stay on this phone.';
export const REROUTE_KEPT_TEXT = 'Off the route. Staying on the saved line.';

export function isOfflineError(caught: unknown): boolean {
  return isAppError(caught) && caught.code === 'offline';
}

/** True when a request gets any response. A throw or abort means no cellular. */
export async function probeOnline(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(PROBE_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
