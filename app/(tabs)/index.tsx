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

type LibraryList = 'routes' | 'drives';

function matchesQuery(query: string, haystack: string): boolean {
  const q = query.trim().toLowerCase();
  return q.length === 0 || haystack.toLowerCase().includes(q);
}

function toggleIds(current: ReadonlySet<string>, ids: string[]): Set<string> {
  const next = new Set(current);
  const allOn = ids.length > 0 && ids.every((id) => next.has(id));
  for (const id of ids) {
    if (allOn) next.delete(id);
    else next.add(id);
  }
  return next;
}

export default function HomeScreen() {
  const router = useRouter();
  const units = useSettings((s) => s.unitSystem);
  const locked = !canMutateLibrary(useSession((s) => s.status));
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [drives, setDrives] = useState<DriveHistoryRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [browser, setBrowser] = useState<LibraryList | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(PAGE);
  const [picking, setPicking] = useState<LibraryList | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

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

  const openBrowser = (which: LibraryList) => {
    setQuery('');
    setPage(PAGE);
    setBrowser(which);
  };

  const onQuery = (value: string) => {
    setQuery(value);
    setPage(PAGE);
  };

  const stopPicking = () => {
    setPicking(null);
    setSelected(new Set());
  };

  const beginPicking = (which: LibraryList) => {
    if (locked) return;
    setSelected(new Set());
    setPicking(which);
  };

  const confirmDeleteSelected = () => {
    if (locked || !picking || selected.size === 0) return;
    const ids = [...selected];
    const kind = picking === 'routes' ? 'route' : 'drive';
    const title =
      ids.length === 1 ? `Delete ${kind}` : `Delete ${ids.length} ${kind}s`;
    Alert.alert(title, `${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const removingRoutes = picking === 'routes';
          const remove = async () => {
            for (const id of ids) {
              if (removingRoutes) {
                void deleteRoutePack(id);
                await deleteRoute(id);
              } else {
                await deleteDrive(id);
              }
            }
          };
          void remove().finally(() => {
            stopPicking();
            reload();
          });
        },
      },
    ]);
  };

  const listIds = (which: LibraryList, inBrowser: boolean): string[] => {
    if (which === 'routes') {
      const rows = inBrowser ? filteredRoutes : routePreview;
      return rows.map((route) => route.id);
    }
    const rows = inBrowser ? filteredDrives : drivePreview;
    return rows.map((drive) => drive.id);
  };

  const pickBar = (which: LibraryList, inBrowser: boolean) => {
    if (picking !== which) return null;
    const ids = listIds(which, inBrowser);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    const count = selected.size;
    const noun = which === 'routes' ? 'routes' : 'drives';
    return (
      <View style={styles.pickBar}>
        <Pressable
          accessibilityLabel="Cancel selection"
          accessibilityRole="button"
          onPress={stopPicking}
          style={styles.sectionAction}
        >
          <Text style={styles.browseText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={allOn ? `Clear ${noun}` : `Select all ${noun}`}
          accessibilityRole="button"
          onPress={() =>
            setSelected((current) =>
              allOn ? new Set() : toggleIds(current, ids),
            )
          }
          style={styles.sectionAction}
        >
          <Text style={styles.browseText}>{allOn ? 'None' : 'All'}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={count === 0 ? 'Delete' : `Delete ${count}`}
          accessibilityRole="button"
          disabled={count === 0}
          onPress={confirmDeleteSelected}
          style={styles.sectionAction}
        >
          <Text style={[styles.deleteText, count === 0 && styles.dimmed]}>
            {count === 0 ? 'Delete' : `Delete ${count}`}
          </Text>
        </Pressable>
      </View>
    );
  };

  const selectButton = (which: LibraryList) => {
    const count = which === 'routes' ? routes.length : drives.length;
    if (locked || count === 0 || picking === which) return null;
    const noun = which === 'routes' ? 'routes' : 'drives';
    return (
      <Pressable
        accessibilityLabel={`Select ${noun}`}
        accessibilityRole="button"
        onPress={() => beginPicking(which)}
        style={styles.sectionAction}
      >
        <Text style={styles.browseText}>Select</Text>
      </Pressable>
    );
  };

  const listToolbar = (which: LibraryList) => {
    if (locked || (which === 'routes' ? routes.length : drives.length) === 0) {
      return undefined;
    }
    if (picking === which) return pickBar(which, true);
    return <View style={styles.selectRow}>{selectButton(which)}</View>;
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
      <View style={styles.sectionHead}>
        <Text style={styles.heading}>Library · {routes.length}</Text>
        {selectButton('routes')}
      </View>
      {pickBar('routes', false)}
      {routes.length === 0 ? (
        <Text style={styles.body}>No saved routes yet.</Text>
      ) : (
        routePreview.map((route) => (
          <RouteLibraryCard
            key={route.id}
            route={route}
            units={units}
            selecting={picking === 'routes'}
            selected={selected.has(route.id)}
            onToggle={() =>
              setSelected((current) => toggleIds(current, [route.id]))
            }
            onOpen={() => router.push(`/route/${route.id}`)}
            onEdit={() => router.push(`/route/${route.id}/edit`)}
            onFavourite={() => {
              void setRouteFavourite(route.id, !route.favourite).then(reload);
            }}
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
      <View style={styles.sectionHead}>
        <Text style={styles.heading}>History · {drives.length}</Text>
        {selectButton('drives')}
      </View>
      {pickBar('drives', false)}
      {drives.length === 0 ? (
        <Text style={styles.body}>No drives recorded yet.</Text>
      ) : (
        drivePreview.map((drive) => (
          <DriveHistoryCard
            key={drive.id}
            drive={drive}
            units={units}
            selecting={picking === 'drives'}
            selected={selected.has(drive.id)}
            onToggle={() =>
              setSelected((current) => toggleIds(current, [drive.id]))
            }
            onOpen={() =>
              router.push(`/drive/${drive.routeId}/summary?driveId=${drive.id}`)
            }
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
        toolbar={listToolbar('routes')}
      >
        {filteredRoutes.length === 0 ? (
          <Text style={styles.body}>No routes match.</Text>
        ) : (
          filteredRoutes.slice(0, page).map((route) => (
            <RouteLibraryCard
              key={route.id}
              route={route}
              units={units}
              selecting={picking === 'routes'}
              selected={selected.has(route.id)}
              onToggle={() =>
                setSelected((current) => toggleIds(current, [route.id]))
              }
              onOpen={() => {
                setBrowser(null);
                router.push(`/route/${route.id}`);
              }}
              onEdit={() => {
                setBrowser(null);
                router.push(`/route/${route.id}/edit`);
              }}
              onFavourite={() => {
                void setRouteFavourite(route.id, !route.favourite).then(reload);
              }}
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
        toolbar={listToolbar('drives')}
      >
        {filteredDrives.length === 0 ? (
          <Text style={styles.body}>No drives match.</Text>
        ) : (
          filteredDrives.slice(0, page).map((drive) => (
            <DriveHistoryCard
              key={drive.id}
              drive={drive}
              units={units}
              selecting={picking === 'drives'}
              selected={selected.has(drive.id)}
              onToggle={() =>
                setSelected((current) => toggleIds(current, [drive.id]))
              }
              onOpen={() => {
                setBrowser(null);
                router.push(
                  `/drive/${drive.routeId}/summary?driveId=${drive.id}`,
                );
              }}
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  heading: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '700',
  },
  sectionAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  pickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  deleteText: {
    color: colors.danger,
    fontSize: type.body,
    fontWeight: '700',
  },
  dimmed: { opacity: 0.45 },
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
