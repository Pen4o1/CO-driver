import { useEffect } from 'react';

import { isAppError } from '@/core/errors';
import { getRoutingProvider } from '@/features/routing';
import { useRouteDraft } from '@/state/routeDraft';
import { useSettings } from '@/state/settings';

export function usePreviewRoute() {
  const start = useRouteDraft((s) => s.start);
  const end = useRouteDraft((s) => s.end);
  const setCandidate = useRouteDraft((s) => s.setCandidate);
  const setErrorMessage = useRouteDraft((s) => s.setErrorMessage);
  const setIsRouting = useRouteDraft((s) => s.setIsRouting);
  const providerId = useSettings((s) => s.providerId);

  useEffect(() => {
    if (!start || !end) {
      setCandidate(null);
      return;
    }
    let cancelled = false;
    setIsRouting(true);
    setErrorMessage(null);
    const provider = getRoutingProvider(providerId);
    provider
      .route({
        waypoints: [start, end],
        profileId: 'balanced',
      })
      .then((candidates) => {
        if (!cancelled) {
          setCandidate(candidates[0] ?? null);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        setCandidate(null);
        setErrorMessage(
          isAppError(caught) ? caught.message : 'Routing failed.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsRouting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, providerId, setCandidate, setErrorMessage, setIsRouting]);
}
