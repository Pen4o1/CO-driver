import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RouteCandidate } from '@/core/types';
import { formatDistanceKm } from '@/core/units';
import { OfflinePackCard } from '@/features/maps/OfflinePackCard';
import { RouteMap } from '@/features/maps/RouteMap';
import { getRoute } from '@/features/storage';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { colors, space, type } from '@/ui/theme';

export default function RouteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useSettings((s) => s.unitSystem);
  const [name, setName] = useState('Route');
  const [candidate, setCandidate] = useState<RouteCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.body}>
          Map preview needs the native dev client.
        </Text>
      </View>
    );
  }

  const routeId = typeof id === 'string' ? id : '';

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
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>{error ?? 'Loading…'}</Text>
        </View>
      )}
      {candidate ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, space.sm) },
          ]}
        >
          <Sheet>
            <View style={styles.head}>
              <View style={styles.headText}>
                <Text style={styles.title} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.body}>
                  {formatDistanceKm(candidate.geometry.lengthM, units)} · score{' '}
                  {Math.round(candidate.breakdown.score)}
                </Text>
              </View>
              <Button
                label="Edit"
                variant="ghost"
                accessibilityLabel="Edit route"
                onPress={() => router.push(`/route/${routeId}/edit`)}
              />
            </View>
            <Button
              label="Recce"
              onPress={() => router.push(`/route/${routeId}/recce`)}
            />
            <Button
              label="Prepare voice"
              variant="secondary"
              onPress={() => router.push(`/route/${routeId}/prepare`)}
            />
            <OfflinePackCard routeId={routeId} bbox={candidate.geometry.bbox} />
          </Sheet>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  headText: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  body: { color: colors.muted, fontSize: type.caption },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    backgroundColor: colors.bg,
  },
});
