import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';

import { SAMPLE_PHRASE } from '@/core/voice';
import {
  configureCoDriverAudio,
  createTtsProvider,
  type TtsProviderId,
  type Voice,
} from '@/features/voice';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Slider } from '@/ui/Slider';
import { colors, space, type } from '@/ui/theme';

export function VoiceSettingsPanel() {
  const ttsProviderId = useSettings((s) => s.ttsProviderId);
  const voiceId = useSettings((s) => s.voiceId);
  const duckOthers = useSettings((s) => s.duckOthers);
  const voiceVolume = useSettings((s) => s.voiceVolume);
  const setTtsProviderId = useSettings((s) => s.setTtsProviderId);
  const setVoiceId = useSettings((s) => s.setVoiceId);
  const setDuckOthers = useSettings((s) => s.setDuckOthers);
  const setVoiceVolume = useSettings((s) => s.setVoiceVolume);

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
      if (listed.length > 0 && !listed.some((v) => v.id === voiceId)) {
        setVoiceId(listed[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ttsProviderId, voiceId, setVoiceId]);

  const pick = (id: TtsProviderId) => {
    setTtsProviderId(id);
    setStatus(null);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.body}>Voice</Text>
      <View style={styles.row}>
        <Chip
          label="Device TTS"
          selected={ttsProviderId === 'device'}
          onPress={() => pick('device')}
        />
        <Chip
          label="Local Piper HTTP"
          selected={ttsProviderId === 'http'}
          onPress={() => pick('http')}
        />
      </View>
      <Text style={styles.hint}>{provider.description}</Text>
      <Text style={styles.hint}>
        {available
          ? provider.canPrerender
            ? 'Offline after recce — clips are cached on disk.'
            : 'Offline-capable now. Live synthesis, robotic, no setup.'
          : 'Not available. Set EXPO_PUBLIC_TTS_BASE_URL for Piper, or use Device TTS.'}
      </Text>
      <View style={styles.row}>
        {voices.slice(0, 8).map((voice) => (
          <Chip
            key={voice.id}
            label={voice.name}
            selected={voiceId === voice.id}
            onPress={() => setVoiceId(voice.id)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Chip
          label="Duck music"
          selected={duckOthers}
          onPress={() => {
            const next = !duckOthers;
            setDuckOthers(next);
            void configureCoDriverAudio({ duck: next, background: true });
          }}
        />
        <Chip
          label="Pause music"
          selected={!duckOthers}
          onPress={() => {
            setDuckOthers(false);
            void configureCoDriverAudio({ duck: false, background: true });
          }}
        />
      </View>
      <Slider
        label="Voice volume"
        value={Math.round(voiceVolume * 10)}
        min={0}
        max={10}
        step={1}
        onChange={(v) => setVoiceVolume(v / 10)}
      />
      <Button
        label="Play test phrase"
        variant="secondary"
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
      {status ? <Text style={styles.hint}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  body: { color: colors.muted, fontSize: type.body, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: type.caption },
});
