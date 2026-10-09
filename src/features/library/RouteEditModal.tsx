import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { canMutateLibrary } from '@/core/safety';
import { deleteRoutePack } from '@/features/maps/offlinePacks';
import {
  deleteRoute,
  duplicateRoute,
  getRoute,
  renameRoute,
  setRouteNote,
} from '@/features/storage';
import { useSession } from '@/state/session';
import { colors, space, type } from '@/ui/theme';

import { RouteMetaEditor } from './RouteMetaEditor';

type FormProps = {
  routeId: string;
  onClose: () => void;
  onDeleted?: () => void;
  onDuplicated?: (copyId: string) => void;
  onChangeRoad?: () => void;
};

export function RouteEditForm({
  routeId,
  onClose,
  onDeleted,
  onDuplicated,
  onChangeRoad,
}: FormProps) {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const locked = !canMutateLibrary(useSession((s) => s.status));
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

  const changeRoad =
    onChangeRoad ??
    (() => {
      onClose();
      router.push(`/route/new?editId=${routeId}`);
    });

  const afterDuplicate =
    onDuplicated ??
    ((copyId: string) => {
      onClose();
      router.push(`/route/${copyId}`);
    });

  const afterDelete =
    onDeleted ??
    (() => {
      router.replace('/');
    });

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Close edit"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={[styles.card, { maxHeight: height * 0.78 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit route</Text>
            <Pressable
              accessibilityLabel="Done"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.done}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: height * 0.78 - 64 }}
            contentContainerStyle={styles.body}
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
                    if (copyId) afterDuplicate(copyId);
                  });
                }}
                onChangeRoad={changeRoad}
                onDelete={() => {
                  if (locked) return;
                  Alert.alert('Delete route', `Delete ${name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        void deleteRoutePack(routeId);
                        void deleteRoute(routeId).then(() => afterDelete());
                      },
                    },
                  ]);
                }}
              />
            ) : error ? null : (
              <Text style={styles.loading}>Loading…</Text>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type ModalProps = {
  routeId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export function RouteEditModal({ routeId, onClose, onDeleted }: ModalProps) {
  const router = useRouter();

  return (
    <Modal
      visible={routeId != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {routeId ? (
        <RouteEditForm
          key={routeId}
          routeId={routeId}
          onClose={onClose}
          onDeleted={onDeleted}
          onDuplicated={(copyId) => {
            onClose();
            router.push(`/route/${copyId}`);
          }}
          onChangeRoad={() => {
            const id = routeId;
            onClose();
            router.push(`/route/new?editId=${id}`);
          }}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: type.body,
    fontWeight: '700',
  },
  done: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  doneText: { color: colors.accent, fontSize: type.body, fontWeight: '700' },
  body: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md },
  loading: { color: colors.muted, fontSize: type.body },
  error: { color: colors.danger, fontSize: type.body },
});
