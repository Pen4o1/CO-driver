import { useEffect, useMemo, useState } from 'react';
import * as Speech from 'expo-speech';

import { SAMPLE_PHRASE } from '@/core/voice';
import {
  configureCoDriverAudio,
  createTtsProvider,
  type TtsProviderId,
  type Voice,
} from '@/features/voice';
import { useSettings } from '@/state/settings';
import { Segmented } from '@/ui/Segmented';
import {
  SettingAction,
  SettingChoice,
  SettingGroup,
  SettingText,
} from '@/ui/SettingGroup';
import { Slider } from '@/ui/Slider';

const ENGINES: { id: TtsProviderId; label: string }[] = [
  { id: 'device', label: 'Device TTS' },
  { id: 'http', label: 'Piper' },
];

export function VoiceSettingsPanel() {
  const ttsProviderId = useSettings((s) => s.ttsProviderId);
  const voiceId = useSettings((s) => s.voiceId);
  const duckOthers = useSettings((s) => s.duckOthers);
  const voiceVolume = useSettings((s) => s.voiceVolume);
  const patch = useSettings((s) => s.patch);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const provider = useMemo(
    () => createTtsProvider(ttsProviderId),
    [ttsProviderId],
  );

  useEffect(() => {
    let cancelled = false;
    const current = createTtsProvider(ttsProviderId);
    void (async () => {
      const ok = await current.isAvailable();
      const listed = ok ? await current.listVoices() : [];
      if (cancelled) return;
      setAvailable(ok);
      setVoices(listed);
      const stored = useSettings.getState().voiceId;
      const first = listed[0];
      if (first && !listed.some((v) => v.id === stored)) {
        patch({ voiceId: first.id });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ttsProviderId, patch]);

  const shown = voices.slice(0, 8);
  const availability = available
    ? provider.canPrerender
      ? 'Clips are cached after a recce, then play offline.'
      : 'Speaks live on this phone. No setup.'
    : 'Not available. Set EXPO_PUBLIC_TTS_BASE_URL for Piper, or use Device TTS.';

  return (
    <>
      <SettingGroup
        title="Engine"
        footer={`${provider.description} ${availability}`}
        inset="tight"
      >
        <Segmented
          bare
          accessibilityLabel="Speech engine"
          value={ttsProviderId}
          options={ENGINES}
          onChange={(id) => {
            patch({ ttsProviderId: id });
            setStatus(null);
          }}
        />
      </SettingGroup>
      <SettingGroup
        title="Voice"
        footer={
          voices.length > shown.length
            ? 'First 8 voices on this device.'
            : undefined
        }
      >
        {shown.length === 0 ? (
          <SettingText label="No voices available." />
        ) : (
          shown.map((voice) => (
            <SettingChoice
              key={voice.id}
              label={voice.name}
              selected={voiceId === voice.id}
              onPress={() => patch({ voiceId: voice.id })}
            />
          ))
        )}
      </SettingGroup>
      <SettingGroup
        title="Other audio"
        footer="Duck lowers other audio while a call plays. Pause stops it."
        inset="tight"
      >
        <Segmented
          bare
          accessibilityLabel="Other audio"
          value={duckOthers ? 'duck' : 'pause'}
          options={[
            { id: 'duck', label: 'Duck' },
            { id: 'pause', label: 'Pause' },
          ]}
          onChange={(id) => {
            const duck = id === 'duck';
            patch({ duckOthers: duck });
            void configureCoDriverAudio({ duck, background: true });
          }}
        />
      </SettingGroup>
      <SettingGroup
        title={`Volume · ${Math.round(voiceVolume * 10)}`}
        inset="regular"
      >
        <Slider
          label="Voice volume"
          visibleLabel={false}
          track="bar"
          value={Math.round(voiceVolume * 10)}
          min={0}
          max={10}
          step={1}
          onChange={(v) => patch({ voiceVolume: v / 10 })}
        />
      </SettingGroup>
      <SettingGroup title="Preview" footer={status ?? SAMPLE_PHRASE}>
        <SettingAction
          label="Play test phrase"
          onPress={() => {
            void Speech.stop();
            Speech.speak(SAMPLE_PHRASE, {
              voice: voiceId,
              volume: voiceVolume,
              onError: () => setStatus('Could not play the sample.'),
              onDone: () => setStatus(null),
            });
            setStatus('Playing…');
          }}
        />
      </SettingGroup>
    </>
  );
}
