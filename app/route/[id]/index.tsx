import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { derivePaceNotes } from '@/core/pacenotes';
import {
  callCardSummary,
  voiceForRoute,
  type RouteVoiceCard,
} from '@/core/settings';
import type { PaceNote, RouteCandidate } from '@/core/types';
import { RouteEditModal } from '@/features/library/RouteEditModal';
import { RoutePreviewDock } from '@/features/library/RoutePreviewDock';
import { RouteMap } from '@/features/maps/RouteMap';
import { getRoute, getVoicePrepare } from '@/features/storage';
import { clipLookup, type PreparedClip } from '@/features/voice/prepareRoute';
import { useSettings } from '@/state/settings';
import { leave, NavRow } from '@/ui/navigation';
import { colors, space, type } from '@/ui/theme';

export default function RouteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettings();
  const units = settings.unitSystem;
  const [name, setName] = useState('Route');
  const [candidate, setCandidate] = useState<RouteCandidate | null>(null);
  const [voiceCard, setVoiceCard] = useState<RouteVoiceCard | null>(null);
  const [clips, setClips] = useState<Map<string, PreparedClip>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const [editing, setEditing] = useState(false);

  const reload = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    let cancelled = false;
    Promise.all([getRoute(id), getVoicePrepare(id)])
      .then(([row, prepared]) => {
        if (cancelled) return;
        if (!row) {
          setError('Route not found');
          setCandidate(null);
          return;
        }
        setError(null);
        setName(row.name);
        setCandidate(row.candidate);
        setVoiceCard(row.voiceCard);
        setClips(prepared ? clipLookup(prepared.clips) : new Map());
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Load failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useFocusEffect(reload);

  const routeId = typeof id === 'string' ? id : '';
  const voice = useMemo(
    () => voiceForRoute(voiceCard, settings),
    [voiceCard, settings],
  );
  const notes = useMemo<PaceNote[]>(() => {
    if (!candidate) return [];
    return derivePaceNotes(candidate.geometry, candidate.steps, voice.filter);
  }, [candidate, voice]);

  const dock = candidate ? (
    <RoutePreviewDock
      name={name}
      candidate={candidate}
      units={units}
      notes={notes}
      clips={clips}
      callSummary={callCardSummary(voice.card)}
      routeId={routeId}
      overlay={Platform.OS !== 'web'}
      paddingBottom={Math.max(insets.bottom, space.md)}
      onEdit={() => setEditing(true)}
      onPrepare={() => router.push(`/route/${routeId}/prepare`)}
      onChecklist={() => router.push(`/route/${routeId}/recce`)}
      onLayoutHeight={(next) =>
        setDockHeight((prev) => (prev === next ? prev : next))
      }
    />
  ) : null;

  const screen = (
    <View style={Platform.OS === 'web' ? styles.webScreen : styles.screen}>
      {candidate && Platform.OS !== 'web' ? (
        <RouteMap
          start={candidate.geometry.coords[0] ?? null}
          end={
            candidate.geometry.coords[candidate.geometry.coords.length - 1] ??
            null
          }
          geometry={candidate.geometry}
          heat
          interactivePins={false}
          bottomInset={dockHeight > 0 ? dockHeight : undefined}
        />
      ) : null}
      {candidate ? (
        dock
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>{error ?? 'Loading…'}</Text>
          <NavRow onBack={() => leave(router)} />
        </View>
      )}
      <RouteEditModal
        routeId={editing ? routeId : null}
        onClose={() => {
          setEditing(false);
          reload();
        }}
        onDeleted={() => router.replace('/')}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.web}>
        {screen}
      </ScrollView>
    );
  }
  return screen;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  webScreen: { backgroundColor: colors.bg, minHeight: '100%' },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  body: { color: colors.muted, fontSize: type.caption },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.bg,
  },
  web: { flexGrow: 1 },
});
