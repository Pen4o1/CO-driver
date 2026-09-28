import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatDistanceKm } from '@/core/units';
import { DriveHistoryCard } from '@/features/library/DriveHistoryCard';
import { RouteLibraryCard } from '@/features/library/RouteLibraryCard';
import {
  listDriveHistory,
  listRoutes,
  setRouteFavourite,
  type DriveHistoryRow,
  type RouteSummary,
} from '@/features/storage';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const units = useSettings((s) => s.unitSystem);
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [drives, setDrives] = useState<DriveHistoryRow[]>([]);

  const reload = useCallback(() => {
    listRoutes()
      .then(setRoutes)
      .catch(() => setRoutes([]));
    listDriveHistory()
      .then(setDrives)
      .catch(() => setDrives([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Apex</Text>
      <Text style={styles.body}>
        Build a road, pick how twisty, drive with pace notes.
      </Text>
      <Button label="New route" onPress={() => router.push('/route/new')} />
      <Text style={styles.heading}>Library · {routes.length}</Text>
      {routes.length === 0 ? (
        <Text style={styles.body}>No saved routes yet.</Text>
      ) : (
        routes.map((route) => (
          <RouteLibraryCard
            key={route.id}
            route={route}
            units={units}
            onOpen={() => router.push(`/route/${route.id}`)}
            onFavourite={() => {
              void setRouteFavourite(route.id, !route.favourite).then(reload);
            }}
          />
        ))
      )}
      <Text style={styles.heading}>History · {drives.length}</Text>
      {drives.length === 0 ? (
        <Text style={styles.body}>No drives recorded yet.</Text>
      ) : (
        drives.map((drive) => (
          <DriveHistoryCard
            key={drive.id}
            drive={drive}
            units={units}
            onOpen={() =>
              router.push(`/drive/${drive.routeId}/summary?driveId=${drive.id}`)
            }
          />
        ))
      )}
      <View>
        <Text style={styles.meta}>
          {routes.length} routes ·{' '}
          {formatDistanceKm(
            drives.reduce((sum, d) => sum + d.distanceM, 0),
            units,
          )}{' '}
          driven
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.lg,
    gap: space.md,
    paddingBottom: 48,
  },
  title: { fontSize: type.title, fontWeight: '700', color: colors.text },
  heading: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '700',
    marginTop: space.sm,
  },
  body: { color: colors.muted },
  meta: { color: colors.muted, fontSize: type.caption },
});
