import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import { formatDistanceKm } from '@/core/units';
import { DriveHistoryCard } from '@/features/library/DriveHistoryCard';
import { RouteLibraryCard } from '@/features/library/RouteLibraryCard';
import { deleteRoutePack } from '@/features/maps/offlinePacks';
import {
  deleteDrive,
  deleteRoute,
  listDriveHistory,
  listRoutes,
  setRouteFavourite,
  type DriveHistoryRow,
  type RouteSummary,
} from '@/features/storage';
import { importGpxTrack } from '@/features/tracks/importGpx';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { ListMenu } from '@/ui/ListMenu';
import { colors, space, type } from '@/ui/theme';

const PREVIEW = 3;
const PAGE = 15;

function matchesQuery(query: string, haystack: string): boolean {
  const q = query.trim().toLowerCase();
  return q.length === 0 || haystack.toLowerCase().includes(q);
}

export default function HomeScreen() {
  const router = useRouter();
  const units = useSettings((s) => s.unitSystem);
  const locked = !canMutateLibrary(useSession((s) => s.status));
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [drives, setDrives] = useState<DriveHistoryRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [browser, setBrowser] = useState<'routes' | 'drives' | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(PAGE);

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

  const filteredRoutes = useMemo(
    () =>
      routes.filter((route) =>
        matchesQuery(query, `${route.name} ${route.profileId}`),
      ),
    [routes, query],
  );
  const filteredDrives = useMemo(
    () =>
      drives.filter((drive) =>
        matchesQuery(
          query,
          `${drive.routeName} ${new Date(drive.startedAt).toISOString()}`,
        ),
      ),
    [drives, query],
  );
  const routePreview =
    routes.length > PREVIEW ? routes.slice(0, PREVIEW) : routes;
  const drivePreview =
    drives.length > PREVIEW ? drives.slice(0, PREVIEW) : drives;

  const openBrowser = (which: 'routes' | 'drives') => {
    setQuery('');
    setPage(PAGE);
    setBrowser(which);
  };

  const onQuery = (value: string) => {
    setQuery(value);
    setPage(PAGE);
  };

  const confirmDeleteRoute = (route: RouteSummary) => {
    if (locked) return;
    Alert.alert('Delete route', `Delete ${route.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteRoutePack(route.id);
          void deleteRoute(route.id).then(reload);
        },
      },
    ]);
  };

  const confirmDeleteDrive = (drive: DriveHistoryRow) => {
    if (locked) return;
    Alert.alert('Delete drive', `Delete this drive of ${drive.routeName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteDrive(drive.id).then(reload);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Apex</Text>
      <Text style={styles.body}>
        Build a road, or upload a GPX track, then drive with pace notes.
      </Text>
      <Button label="New route" onPress={() => router.push('/route/new')} />
      <Button
        label={importing ? 'Opening…' : 'Upload GPX'}
        variant="secondary"
        disabled={importing}
        onPress={() => {
          setImporting(true);
          setImportError(null);
          void importGpxTrack()
            .then((id) => {
              if (id) router.push(`/route/${id}`);
            })
            .catch((caught: unknown) => {
              setImportError(
                caught instanceof Error ? caught.message : 'Upload failed',
              );
            })
            .finally(() => setImporting(false));
        }}
      />
      {importError ? <Text style={styles.error}>{importError}</Text> : null}
      <Text style={styles.heading}>Library · {routes.length}</Text>
      {routes.length === 0 ? (
        <Text style={styles.body}>No saved routes yet.</Text>
      ) : (
        routePreview.map((route) => (
          <RouteLibraryCard
            key={route.id}
            route={route}
            units={units}
            onOpen={() => router.push(`/route/${route.id}`)}
            onFavourite={() => {
              void setRouteFavourite(route.id, !route.favourite).then(reload);
            }}
            onDelete={() => confirmDeleteRoute(route)}
          />
        ))
      )}
      {routes.length > PREVIEW ? (
        <Pressable
          accessibilityLabel={`Browse all ${routes.length} routes`}
          accessibilityRole="button"
          onPress={() => openBrowser('routes')}
          style={styles.browse}
        >
          <Text style={styles.browseText}>Browse all {routes.length}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.heading}>History · {drives.length}</Text>
      {drives.length === 0 ? (
        <Text style={styles.body}>No drives recorded yet.</Text>
      ) : (
        drivePreview.map((drive) => (
          <DriveHistoryCard
            key={drive.id}
            drive={drive}
            units={units}
            onOpen={() =>
              router.push(`/drive/${drive.routeId}/summary?driveId=${drive.id}`)
            }
            onDelete={() => confirmDeleteDrive(drive)}
          />
        ))
      )}
      {drives.length > PREVIEW ? (
        <Pressable
          accessibilityLabel={`Browse all ${drives.length} drives`}
          accessibilityRole="button"
          onPress={() => openBrowser('drives')}
          style={styles.browse}
        >
          <Text style={styles.browseText}>Browse all {drives.length}</Text>
        </Pressable>
      ) : null}
      <ListMenu
        visible={browser === 'routes'}
        title={`Routes · ${routes.length}`}
        query={query}
        onQueryChange={onQuery}
        searchPlaceholder="Search routes"
        onClose={() => setBrowser(null)}
      >
        {filteredRoutes.length === 0 ? (
          <Text style={styles.body}>No routes match.</Text>
        ) : (
          filteredRoutes.slice(0, page).map((route) => (
            <RouteLibraryCard
              key={route.id}
              route={route}
              units={units}
              onOpen={() => {
                setBrowser(null);
                router.push(`/route/${route.id}`);
              }}
              onFavourite={() => {
                void setRouteFavourite(route.id, !route.favourite).then(reload);
              }}
              onDelete={() => confirmDeleteRoute(route)}
            />
          ))
        )}
        {filteredRoutes.length > page ? (
          <Pressable
            accessibilityLabel="Show more routes"
            accessibilityRole="button"
            onPress={() => setPage((count) => count + PAGE)}
            style={styles.browse}
          >
            <Text style={styles.browseText}>
              Show more · {filteredRoutes.length - page} left
            </Text>
          </Pressable>
        ) : null}
      </ListMenu>
      <ListMenu
        visible={browser === 'drives'}
        title={`History · ${drives.length}`}
        query={query}
        onQueryChange={onQuery}
        searchPlaceholder="Search drives"
        onClose={() => setBrowser(null)}
      >
        {filteredDrives.length === 0 ? (
          <Text style={styles.body}>No drives match.</Text>
        ) : (
          filteredDrives.slice(0, page).map((drive) => (
            <DriveHistoryCard
              key={drive.id}
              drive={drive}
              units={units}
              onOpen={() => {
                setBrowser(null);
                router.push(
                  `/drive/${drive.routeId}/summary?driveId=${drive.id}`,
                );
              }}
              onDelete={() => confirmDeleteDrive(drive)}
            />
          ))
        )}
        {filteredDrives.length > page ? (
          <Pressable
            accessibilityLabel="Show more drives"
            accessibilityRole="button"
            onPress={() => setPage((count) => count + PAGE)}
            style={styles.browse}
          >
            <Text style={styles.browseText}>
              Show more · {filteredDrives.length - page} left
            </Text>
          </Pressable>
        ) : null}
      </ListMenu>
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
  error: { color: colors.danger },
  meta: { color: colors.muted, fontSize: type.caption },
  browse: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseText: { color: colors.accent, fontSize: type.body, fontWeight: '700' },
});
