import { LIVE_CLIP_URI } from '@/core/voice';

import { createDeviceTtsProvider } from '../DeviceTtsProvider';
import { memoryVoiceCache } from '../voiceCache';
import { prepareRouteClips } from '../prepareRoute';
import { DEFAULT_NOTE_FILTER } from '@/core/pacenotes/filterNotes';
import { makeArc } from '@/core/pacenotes/__fixtures__/builders';
import { derivePaceNotesDetailed } from '@/core/pacenotes/pipeline';

describe('createDeviceTtsProvider', () => {
  it('cannot prerender and returns a live sentinel', async () => {
    const speech = {
      getAvailableVoicesAsync: async () => [
        { identifier: 'en-US', name: 'Samantha', language: 'en-US' },
      ],
      speak: jest.fn(),
      stop: async () => undefined,
      isSpeakingAsync: async () => false,
    };
    const provider = createDeviceTtsProvider(speech);
    expect(provider.canPrerender).toBe(false);
    expect(provider.requiresNetwork).toBe(false);
    const file = await provider.synthesize('In 50, left four.', 'en-US');
    expect(file.uri).toBe(LIVE_CLIP_URI);
    expect(file.live).toBe(true);
    const voices = await provider.listVoices();
    expect(voices[0]?.offline).toBe(true);
  });
});

describe('prepareRouteClips', () => {
  it('reuses cached hashes (resumable recce)', async () => {
    const { rawNotes } = derivePaceNotesDetailed(
      makeArc({ radiusM: 35, sweepDeg: 180 }),
      [],
      { ...DEFAULT_NOTE_FILTER, includeStraights: false },
    );
    const cache = memoryVoiceCache();
    const synthesize = jest.fn(async () => ({
      uri: LIVE_CLIP_URI,
      bytes: 0,
      live: true as const,
    }));
    const provider = {
      id: 'device',
      name: 'Device',
      description: 'test',
      requiresNetwork: false,
      canPrerender: false,
      listVoices: async () => [],
      isAvailable: async () => true,
      synthesize,
    };
    const hash = async (value: string) => `h_${value.slice(0, 12)}`;
    await prepareRouteClips({
      rawNotes,
      filter: { ...DEFAULT_NOTE_FILTER, includeStraights: false },
      provider,
      voiceId: 'v',
      cache,
      hash,
    });
    const firstCalls = synthesize.mock.calls.length;
    expect(firstCalls).toBeGreaterThan(0);
    synthesize.mockClear();
    await prepareRouteClips({
      rawNotes,
      filter: { ...DEFAULT_NOTE_FILTER, includeStraights: false },
      provider,
      voiceId: 'v',
      cache,
      hash,
    });
    expect(synthesize).not.toHaveBeenCalled();
  });
});
