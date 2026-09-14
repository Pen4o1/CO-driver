/**
 * MapLibre RN v11 removed `setAccessToken` (verified in 11.3.10).
 * OpenFreeMap tiles need no token. Call this once at startup anyway so the
 * hook exists if a future release reintroduces token plumbing.
 */
export function initMapLibre(): void {
  return;
}
