import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RouteCandidate } from '@/core/types';
import { formatDistanceKm, formatDuration } from '@/core/units';
import { RouteEditModal } from '@/features/library/RouteEditModal';
import { OfflinePackCard } from '@/features/maps/OfflinePackCard';
import { RouteMap } from '@/features/maps/RouteMap';
import { getRoute } from '@/features/storage';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { leave, NavRow } from '@/ui/navigation';
import { colors, space, type } from '@/ui/theme';

export default function RouteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useSettings((s) => s.unitSystem);
  const [name, setName] = useState('Route');
  const [candidate, setCandidate] = useState<RouteCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dockHeight, setDockHeight] = useState(0);
  const [editing, setEditing] = useState(false);

  const reload = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    let cancelled = false;
    getRoute(id)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setError('Route not found');
          setCandidate(null);
          return;
        }
        setError(null);
        setName(row.name);
        setCandidate(row.candidate);
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.body}>
          Map preview needs the native dev client.
        </Text>
        <NavRow
          onBack={() => leave(router)}
          onForward={() => router.push(`/route/${routeId}/recce`)}
          forwardLabel="Checklist"
          forwardDisabled={!routeId}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {candidate ? (
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
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>{error ?? 'Loading…'}</Text>
          <NavRow onBack={() => leave(router)} />
        </View>
      )}
      {candidate ? (
        <View
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.height);
            setDockHeight((prev) => (prev === next ? prev : next));
          }}
          style={[
            styles.dock,
            { paddingBottom: Math.max(insets.bottom, space.md) },
          ]}
        >
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {formatDistanceKm(candidate.geometry.lengthM, units)}
              {candidate.breakdown.durationS > 0
                ? ` · est. ${formatDuration(candidate.breakdown.durationS)}`
                : ''}
              {candidate.providerId === 'gpx'
                ? ' · Uploaded track'
                : ` · score ${Math.round(candidate.breakdown.score)}`}
            </Text>
          </View>
          <OfflinePackCard routeId={routeId} bbox={candidate.geometry.bbox} />
          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="secondary"
              accessibilityLabel="Edit route"
              onPress={() => setEditing(true)}
              style={styles.action}
            />
            <Button
              label="Prepare voice"
              variant="secondary"
              onPress={() => router.push(`/route/${routeId}/prepare`)}
              style={styles.action}
            />
          </View>
          <Button
            label="Checklist"
            disabled={!routeId}
            onPress={() => router.push(`/route/${routeId}/recce`)}
          />
        </View>
      ) : null}
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
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    gap: space.md,
  },
  head: { gap: 2 },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
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
});
