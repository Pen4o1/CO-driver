import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_NOTE_FILTER, derivePaceNotesDetailed } from '@/core/pacenotes';
import { formatBytes, planRouteClips } from '@/core/voice';
import {
  createTtsProvider,
  prepareRouteClips,
  sha256Hex,
  sqliteVoiceCache,
  type PrepareProgress,
} from '@/features/voice';
import { getDb, getRoute, saveVoicePrepare } from '@/features/storage';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { leave, NavRow } from '@/ui/navigation';
import { colors, space, type } from '@/ui/theme';

export default function PrepareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ttsProviderId = useSettings((s) => s.ttsProviderId);
  const voiceId = useSettings((s) => s.voiceId);
  const cancelled = useRef(false);

  const [name, setName] = useState('Route');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PrepareProgress | null>(null);
  const [doneBytes, setDoneBytes] = useState<number | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [estimate, setEstimate] = useState(0);

  const provider = useMemo(
    () => createTtsProvider(ttsProviderId),
    [ttsProviderId],
  );

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    let gone = false;
    getRoute(id)
      .then((row) => {
        if (gone || !row) {
          if (!gone) setError('Route not found');
          return;
        }
        setName(row.name);
        const derived = derivePaceNotesDetailed(
          row.candidate.geometry,
          row.candidate.steps,
          DEFAULT_NOTE_FILTER,
        );
        const plan = planRouteClips(derived.rawNotes, DEFAULT_NOTE_FILTER);
        setNoteCount(plan.uniqueTexts.length);
        setEstimate(plan.estimatedBytes);
      })
      .catch((caught: unknown) => {
        if (!gone) {
          setError(caught instanceof Error ? caught.message : 'Load failed');
        }
      });
    return () => {
      gone = true;
    };
  }, [id]);

  const runPrepare = async (forceLive: boolean) => {
    if (!id || typeof id !== 'string') return;
    setBusy(true);
    setError(null);
    try {
      const row = await getRoute(id);
      if (!row) throw new Error('Route not found');
      const derived = derivePaceNotesDetailed(
        row.candidate.geometry,
        row.candidate.steps,
        DEFAULT_NOTE_FILTER,
      );
      const active = forceLive ? createTtsProvider('device') : provider;
      const result = await prepareRouteClips({
        rawNotes: derived.rawNotes,
        filter: DEFAULT_NOTE_FILTER,
        provider: active,
        voiceId,
        cache: sqliteVoiceCache(getDb),
        hash: sha256Hex,
        onProgress: setProgress,
        cancelled: () => cancelled.current,
      });
      await saveVoicePrepare({
        routeId: id,
        providerId: active.id,
        voiceId,
        clipCount: result.clips.length,
        bytes: result.bytes,
        live: result.live,
        clips: result.clips,
      });
      setDoneBytes(result.bytes);
      setLiveMode(result.live);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Prepare failed');
    } finally {
      setBusy(false);
    }
  };

  const ratio =
    progress && progress.total > 0 ? progress.done / progress.total : 0;

  const routeId = typeof id === 'string' ? id : '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Prepare voice</Text>
        <Text style={styles.body}>{name}</Text>
        <Text style={styles.hint}>
          {noteCount} unique calls across chain-radius 0 / 60 / 200 m. Estimated{' '}
          {formatBytes(estimate)}.
        </Text>
        <Text style={styles.hint}>{provider.description}</Text>
        {progress ? (
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
          </View>
        ) : null}
        <Text style={styles.body}>
          {busy && progress
            ? `Recording pacenotes… ${progress.done}/${progress.total}`
            : doneBytes !== null
              ? liveMode
                ? 'Prepared for live device TTS. Airplane-mode clips need Piper HTTP.'
                : `Cached ${formatBytes(doneBytes)}. Drive plays clips only.`
              : 'Notes are known before the drive. We render audio once, then only play clips.'}
        </Text>
        <Button
          label={busy ? 'Recording…' : 'Prepare route'}
          disabled={busy}
          onPress={() => void runPrepare(false)}
        />
        <Button
          label="Prepare later (device TTS)"
          variant="secondary"
          disabled={busy}
          onPress={() => void runPrepare(true)}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, space.md) },
        ]}
      >
        <NavRow
          onBack={() => leave(router)}
          onForward={() => router.navigate(`/route/${routeId}/recce`)}
          forwardLabel="Checklist"
          forwardDisabled={!routeId || busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    padding: space.lg,
    gap: space.md,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  title: { color: colors.text, fontSize: type.title, fontWeight: '700' },
  body: { color: colors.text, fontSize: type.body },
  hint: { color: colors.muted, fontSize: type.caption },
  error: { color: colors.danger, fontSize: type.caption },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  barFill: { height: 10, backgroundColor: colors.accent },
});
