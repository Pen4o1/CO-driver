import { isAppError } from '@/core/errors';
import { generateCandidates } from '@/features/routing/generateCandidates';
import { getProviderRegistry, getRoadSnapper } from '@/features/routing';
import { useRouteDraft } from '@/state/routeDraft';
import { useSettings } from '@/state/settings';

export async function runCandidateSearch(): Promise<void> {
  const draft = useRouteDraft.getState();
  const revision = draft.revision;
  if (!draft.start) {
    draft.setErrorMessage('Set a start pin first.');
    return;
  }
  if (draft.mode === 'ab' && !draft.end) {
    draft.setErrorMessage('Set an end pin first.');
    return;
  }
  const request = {
    start: draft.start,
    end: draft.end,
    mode: draft.mode,
    loopDistanceKm: draft.loopDistanceKm,
    profileId: draft.profileId,
    custom: draft.custom,
    preferId: useSettings.getState().providerId,
  };
  draft.setIsRouting(true);
  draft.setErrorMessage(null);
  const stillCurrent = () => useRouteDraft.getState().revision === revision;
  try {
    const registry = getProviderRegistry();
    const candidates = await generateCandidates(request, {
      ors: registry.get('ors'),
      valhalla: registry.get('valhalla'),
      mock: registry.get('mock'),
      snap: getRoadSnapper(),
    });
    const latest = useRouteDraft.getState();
    if (latest.revision !== revision) return;
    latest.setCandidates(candidates);
    latest.setStep(3);
  } catch (caught) {
    const latest = useRouteDraft.getState();
    if (latest.revision !== revision) return;
    latest.setCandidates([]);
    latest.setErrorMessage(
      isAppError(caught) ? caught.message : 'Routing failed.',
    );
  } finally {
    if (!stillCurrent()) return;
    useRouteDraft.getState().setIsRouting(false);
  }
}
