import { isAppError } from '@/core/errors';
import { generateCandidates } from '@/features/routing/generateCandidates';
import { getProviderRegistry, getRoadSnapper } from '@/features/routing';
import { useRouteDraft } from '@/state/routeDraft';

export async function runCandidateSearch(): Promise<void> {
  const draft = useRouteDraft.getState();
  if (!draft.start) {
    draft.setErrorMessage('Set a start pin first.');
    return;
  }
  if (draft.mode === 'ab' && !draft.end) {
    draft.setErrorMessage('Set an end pin first.');
    return;
  }
  draft.setIsRouting(true);
  draft.setErrorMessage(null);
  try {
    const registry = getProviderRegistry();
    const candidates = await generateCandidates(
      {
        start: draft.start,
        end: draft.end,
        mode: draft.mode,
        loopDistanceKm: draft.loopDistanceKm,
        profileId: draft.profileId,
        custom: draft.custom,
      },
      {
        ors: registry.get('ors'),
        valhalla: registry.get('valhalla'),
        snap: getRoadSnapper(),
      },
    );
    draft.setCandidates(candidates);
    draft.setStep(3);
  } catch (caught) {
    draft.setCandidates([]);
    draft.setErrorMessage(
      isAppError(caught) ? caught.message : 'Routing failed.',
    );
  } finally {
    draft.setIsRouting(false);
  }
}
