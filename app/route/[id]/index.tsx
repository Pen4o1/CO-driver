import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RouteCandidate } from '@/core/types';
import { canMutateLibrary } from '@/core/safety';
import { formatDistanceKm } from '@/core/units';
import { RouteMetaEditor } from '@/features/library/RouteMetaEditor';
import { OfflinePackCard } from '@/features/maps/OfflinePackCard';
import { RouteMap } from '@/features/maps/RouteMap';
import {
  deleteRoute,
  duplicateRoute,
  getRoute,
  renameRoute,
  setRouteNote,
} from '@/features/storage';
import { deleteRoutePack } from '@/features/maps/offlinePacks';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { colors, space, type } from '@/ui/theme';

export default function RouteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useSettings((s) => s.unitSystem);
  const locked = !canMutateLibrary(useSession((s) => s.status));
  const [name, setName] = useState('Route');
  const [note, setNote] = useState('');
  const [candidate, setCandidate] = useState<RouteCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    let cancelled = false;
    getRoute(id)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setError('Route not found');
          return;
        }
        setName(row.name);
        setNote(row.note ?? '');
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
          <Sheet maxHeight={height * 0.48}>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.body}>
              {formatDistanceKm(candidate.geometry.lengthM, units)} · score{' '}
              {Math.round(candidate.breakdown.score)}
            </Text>
            <Button
              label="Recce / Start"
              onPress={() => router.push(`/route/${id}/recce`)}
            />
            <View style={styles.row}>
              <Button
                label="Prepare voice"
                variant="secondary"
                style={styles.flexBtn}
                onPress={() => router.push(`/route/${id}/prepare`)}
              />
              <Button
                label="Preview calls"
                variant="secondary"
                style={styles.flexBtn}
                onPress={() => router.push(`/dev/notes?routeId=${id}`)}
              />
            </View>
            <Button
              label="Sim Drive"
              variant="ghost"
              onPress={() => router.push(`/dev/sim?routeId=${id}`)}
            />
            <OfflinePackCard routeId={routeId} bbox={candidate.geometry.bbox} />
            <RouteMetaEditor
              name={name}
              note={note}
              onRename={(next) => {
                void renameRoute(routeId, next).then(() => setName(next));
              }}
              onNote={(next) => {
                void setRouteNote(routeId, next).then(() => setNote(next));
              }}
              onDuplicate={() => {
                void duplicateRoute(routeId).then((copyId) => {
                  if (copyId) router.replace(`/route/${copyId}`);
                });
              }}
              onDelete={() => {
                if (locked) return;
                Alert.alert('Delete route', `Delete ${name}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      void deleteRoutePack(routeId);
                      void deleteRoute(routeId).then(() => router.replace('/'));
                    },
                  },
                ]);
              }}
            />
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
  row: { flexDirection: 'row', gap: space.sm },
  flexBtn: { flex: 1 },
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
