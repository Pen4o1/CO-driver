import { isAppError } from '@/core/errors';

const PROBE_URL = 'https://connectivitycheck.gstatic.com/generate_204';

export const OFFLINE_PACK_TEXT = 'No cellular. Using your downloaded pack.';
export const OFFLINE_LOCAL_TEXT = 'No cellular. Calls stay on this phone.';
export const WEAK_PACK_TEXT =
  'Signal is too weak to load the map. Using your downloaded pack.';
export const WEAK_LOCAL_TEXT =
  'Signal is too weak to load the map. Calls stay on this phone.';
export const REROUTE_KEPT_TEXT = 'Off the route. Staying on the saved line.';

export type LinkState = 'online' | 'weak' | 'offline';

export function isOfflineError(caught: unknown): boolean {
  return isAppError(caught) && caught.code === 'offline';
}

/**
 * A bar of signal is not a working link. `online` means a small check came
 * back quickly. `weak` means it answered too slowly to load a map. `offline`
 * means it never answered.
 */
export async function probeLink(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500,
  weakAfterMs = 1200,
): Promise<LinkState> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(PROBE_URL, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!(response.status > 0 && response.status < 500)) {
      return 'offline';
    }
    return Date.now() - started >= weakAfterMs ? 'weak' : 'online';
  } catch {
    return 'offline';
  } finally {
    clearTimeout(timer);
  }
}

/** True only when the link can actually load. A slow answer is not online. */
export async function probeOnline(
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2500,
  weakAfterMs = 1200,
): Promise<boolean> {
  return (await probeLink(fetchImpl, timeoutMs, weakAfterMs)) === 'online';
}
