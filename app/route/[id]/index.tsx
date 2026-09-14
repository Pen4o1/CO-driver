import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { RouteCandidate } from '@/core/types';
import { RouteMap } from '@/features/maps/RouteMap';
import { getRoute } from '@/features/storage';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

export default function RouteDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('Route');
  const [candidate, setCandidate] = useState<RouteCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      return;
    }
    let cancelled = false;
    getRoute(id)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setError('Route not found');
          return;
        }
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.body}>
          Map preview needs the native dev client.
        </Text>
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
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>{error ?? 'Loading…'}</Text>
        </View>
      )}
      {candidate ? (
        <View style={styles.banner}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>
            {(candidate.geometry.lengthM / 1000).toFixed(1)} km · score{' '}
            {Math.round(candidate.breakdown.score)}
          </Text>
          <Button
            label="Preview co-driver calls"
            variant="secondary"
            onPress={() => router.push(`/dev/notes?routeId=${id}`)}
          />
          <Button
            label="Prepare voice"
            onPress={() => router.push(`/route/${id}/prepare`)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  banner: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    top: space.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
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
