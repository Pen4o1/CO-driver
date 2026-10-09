import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canMutateLibrary } from '@/core/safety';
import { RouteMetaEditor } from '@/features/library/RouteMetaEditor';
import { deleteRoutePack } from '@/features/maps/offlinePacks';
import {
  deleteRoute,
  duplicateRoute,
  getRoute,
  renameRoute,
  setRouteNote,
} from '@/features/storage';
import { useSession } from '@/state/session';
import { leave, NavRow } from '@/ui/navigation';
import { colors, space, type } from '@/ui/theme';

export default function EditRouteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locked = !canMutateLibrary(useSession((s) => s.status));
  const routeId = typeof id === 'string' ? id : '';
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    getRoute(routeId)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setError('Route not found');
          return;
        }
        setName(row.name);
        setNote(row.note ?? '');
        setReady(true);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Load failed');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {ready ? (
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
            onChangeRoad={() => {
              router.push(`/route/new?editId=${routeId}`);
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
        ) : error ? null : (
          <View>
            <Text style={styles.body}>Loading…</Text>
          </View>
        )}
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, space.md) },
        ]}
      >
        <NavRow
          onBack={() => leave(router)}
          onForward={() => leave(router)}
          forwardLabel="Done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.md },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  body: { color: colors.muted, fontSize: type.body },
  error: { color: colors.danger, fontSize: type.body },
});
