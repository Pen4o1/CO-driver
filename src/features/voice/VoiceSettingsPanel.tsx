import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Speech from 'expo-speech';

import { SAMPLE_PHRASE } from '@/core/voice';
import {
  configureCoDriverAudio,
  createTtsProvider,
  voiceQualityLabel,
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
import { TextField } from '@/ui/TextField';
import { space } from '@/ui/theme';

const ENGINES: { id: TtsProviderId; label: string }[] = [
  { id: 'device', label: 'Device TTS' },
  { id: 'http', label: 'Piper' },
];

type VoiceScope = 'english' | 'all';

function languageLabel(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function voiceDetail(voice: Voice): string {
  const quality = voiceQualityLabel(voice.quality);
  const language = languageLabel(voice.language);
  return quality ? `${language} · ${quality}` : language;
}

export function VoiceSettingsPanel() {
  const ttsProviderId = useSettings((s) => s.ttsProviderId);
  const voiceId = useSettings((s) => s.voiceId);
  const duckOthers = useSettings((s) => s.duckOthers);
  const voiceVolume = useSettings((s) => s.voiceVolume);
  const patch = useSettings((s) => s.patch);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [scope, setScope] = useState<VoiceScope>('english');
  const [query, setQuery] = useState('');

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

  const hasOtherLanguages = voices.some(
    (voice) => !voice.language.toLowerCase().startsWith('en'),
  );
  const downloaded = voices.filter(
    (voice) => voice.quality === 'premium' || voice.quality === 'enhanced',
  ).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return voices.filter((voice) => {
      if (
        scope === 'english' &&
        !voice.language.toLowerCase().startsWith('en')
      ) {
        return false;
      }
      if (!q) return true;
      const haystack =
        `${voice.name} ${voice.language} ${voiceDetail(voice)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [voices, scope, query]);

  const availability = available
    ? provider.canPrerender
      ? 'Clips are cached after a recce, then play offline.'
      : 'Speaks live on this phone. No setup.'
    : 'Not available. Set EXPO_PUBLIC_TTS_BASE_URL for Piper, or use Device TTS.';

  const voiceFooter =
    ttsProviderId === 'device'
      ? downloaded > 0
        ? 'Premium and Enhanced are the voices you download in iPhone Settings → Accessibility → Spoken Content → Voices.'
        : 'Download a Premium or Enhanced voice in iPhone Settings → Accessibility → Spoken Content → Voices, then reopen this screen.'
      : undefined;

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
      <SettingGroup title="Voice" footer={voiceFooter}>
        {voices.length > 0 &&
        (hasOtherLanguages || ttsProviderId === 'device') ? (
          <View style={styles.filter}>
            {hasOtherLanguages ? (
              <Segmented
                bare
                accessibilityLabel="Voice languages"
                value={scope}
                options={[
                  { id: 'english', label: 'English' },
                  { id: 'all', label: 'All' },
                ]}
                onChange={setScope}
              />
            ) : null}
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search voices"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
        ) : null}
        {shown.length === 0 ? (
          <SettingText label="No voices match." />
        ) : (
          shown.map((voice) => (
            <SettingChoice
              key={voice.id}
              label={voice.name}
              detail={
                ttsProviderId === 'device' ? voiceDetail(voice) : undefined
              }
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

const styles = StyleSheet.create({
  filter: {
    padding: space.md,
    gap: space.sm,
  },
});
