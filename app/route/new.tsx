import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinsStep } from '@/features/routing/builder/PinsStep';
import { ResultsStep } from '@/features/routing/builder/ResultsStep';
import { StyleStep } from '@/features/routing/builder/StyleStep';
import { runCandidateSearch } from '@/features/routing/runCandidateSearch';
import { RouteMap } from '@/features/maps/RouteMap';
import { getRoute, saveRoute, updateRoute } from '@/features/storage';
import { draftIsDirty, useRouteDraft } from '@/state/routeDraft';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { HeaderBack, leave, NavRow } from '@/ui/navigation';
import { Sheet } from '@/ui/Sheet';
import { colors, space } from '@/ui/theme';

function oneParam(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export default function NewRouteScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const editId = oneParam(useLocalSearchParams<{ editId?: string }>().editId);
  const start = useRouteDraft((s) => s.start);
  const end = useRouteDraft((s) => s.end);
  const step = useRouteDraft((s) => s.step);
  const mode = useRouteDraft((s) => s.mode);
  const candidate = useRouteDraft((s) => s.candidate);
  const candidates = useRouteDraft((s) => s.candidates);
  const errorMessage = useRouteDraft((s) => s.errorMessage);
  const isRouting = useRouteDraft((s) => s.isRouting);
  const editingId = useRouteDraft((s) => s.editingId);
  const setStart = useRouteDraft((s) => s.setStart);
  const setEnd = useRouteDraft((s) => s.setEnd);
  const setStep = useRouteDraft((s) => s.setStep);
  const placeOnMap = useRouteDraft((s) => s.placeOnMap);
  const setProfileId = useRouteDraft((s) => s.setProfileId);
  const defaultProfileId = useSettings((s) => s.defaultProfileId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const leavingRef = useRef(false);
  const closedRef = useRef(false);

  useEffect(() => {
    if (editId) return;
    useRouteDraft.getState().reset();
  }, [editId]);

  useEffect(() => {
    if (editId || useRouteDraft.getState().editingId) return;
    setProfileId(defaultProfileId);
  }, [defaultProfileId, editId, setProfileId]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    getRoute(editId)
      .then((row) => {
        if (cancelled || closedRef.current) return;
        if (!row) {
          setSaveError('Route not found');
          return;
        }
        useRouteDraft.getState().loadForEdit({
          id: row.id,
          candidate: row.candidate,
        });
      })
      .catch((caught: unknown) => {
        if (cancelled || closedRef.current) return;
        setSaveError(caught instanceof Error ? caught.message : 'Load failed');
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      if (leavingRef.current) return;
      const draft = useRouteDraft.getState();
      if (!draftIsDirty(draft)) {
        closedRef.current = true;
        draft.reset();
        return;
      }
      event.preventDefault();
      Alert.alert(
        draft.editingId ? 'Discard changes?' : 'Discard this route?',
        draft.editingId
          ? 'The saved route stays as it is.'
          : 'It will not be added to your library.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              leavingRef.current = true;
              closedRef.current = true;
              useRouteDraft.getState().reset();
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: editId ? 'Edit route' : 'New route',
      headerLeft: () => (
        <HeaderBack
          accessibilityLabel={editId ? 'Cancel editing' : 'Back to home'}
          onPress={() => leave(router)}
        />
      ),
    });
  }, [navigation, editId, router]);

  const save = async () => {
    const current = useRouteDraft.getState();
    if (!current.candidate) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (current.editingId) {
        const id = current.editingId;
        await updateRoute(id, { candidate: current.candidate });
        leavingRef.current = true;
        closedRef.current = true;
        useRouteDraft.getState().reset();
        router.dismissTo(`/route/${id}`);
        return;
      }
      const name =
        current.mode === 'loop'
          ? `Loop ${current.loopDistanceKm} km`
          : `${current.startLabel ?? 'Start'} → ${current.endLabel ?? 'End'}`;
      const id = await saveRoute({ name, candidate: current.candidate });
      leavingRef.current = true;
      closedRef.current = true;
      useRouteDraft.getState().reset();
      router.replace(`/route/${id}`);
    } catch (caught) {
      leavingRef.current = false;
      closedRef.current = false;
      setSaveError(caught instanceof Error ? caught.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const exitLabel = editId ? 'Cancel' : 'Home';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          MapLibre needs the iOS or Android dev client. Expo Go and web are not
          supported. See MAP_SETUP.md.
        </Text>
        <NavRow onBack={() => leave(router)} backLabel={exitLabel} />
      </View>
    );
  }

  const canContinuePins =
    mode === 'loop' ? Boolean(start) : Boolean(start && end);

  return (
    <View style={styles.screen}>
      <RouteMap
        start={start}
        end={mode === 'loop' ? null : end}
        geometry={candidate?.geometry ?? null}
        heat={step === 3}
        interactivePins={step !== 3}
        onStartChange={(point) => setStart(point)}
        onEndChange={(point) => setEnd(point)}
        onMapPress={step === 1 ? placeOnMap : undefined}
      />
      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: insets.top + space.xs }]}
      >
        <View style={styles.steps}>
          <Chip label="Pins" selected={step === 1} onPress={() => setStep(1)} />
          <Chip
            label="Style"
            selected={step === 2}
            onPress={() => canContinuePins && setStep(2)}
          />
          <Chip
            label="Routes"
            selected={step === 3}
            onPress={() => candidates.length > 0 && setStep(3)}
          />
        </View>
      </View>
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.bottom,
          { paddingBottom: Math.max(insets.bottom, space.sm) },
        ]}
      >
        <Sheet
          maxHeight={height * (step === 1 ? 0.6 : step === 3 ? 0.5 : 0.44)}
          footer={
            <>
              {errorMessage ? (
                <Text style={styles.error}>{errorMessage}</Text>
              ) : null}
              {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
              {step > 1 ? (
                <Button
                  label={exitLabel}
                  variant="ghost"
                  onPress={() => leave(router)}
                />
              ) : null}
              {step === 1 ? (
                <NavRow
                  onBack={() => leave(router)}
                  backLabel={exitLabel}
                  onForward={() => setStep(2)}
                  forwardLabel="Style"
                  forwardDisabled={!canContinuePins}
                />
              ) : null}
              {step === 2 ? (
                <NavRow
                  onBack={() => setStep(1)}
                  onForward={() => {
                    void runCandidateSearch();
                  }}
                  forwardLabel={isRouting ? 'Generating…' : 'Find routes'}
                  forwardDisabled={isRouting}
                />
              ) : null}
              {step === 3 ? (
                <NavRow
                  onBack={() => setStep(2)}
                  onForward={() => {
                    void save();
                  }}
                  forwardLabel={
                    saving
                      ? 'Saving…'
                      : editingId
                        ? 'Save changes'
                        : 'Save route'
                  }
                  forwardDisabled={!candidate || saving}
                />
              ) : null}
            </>
          }
        >
          {step === 1 ? <PinsStep /> : null}
          {step === 2 ? <StyleStep /> : null}
          {step === 3 ? <ResultsStep /> : null}
        </Sheet>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  error: { color: colors.danger },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    gap: space.md,
  },
  fallbackText: { color: colors.text, textAlign: 'center' },
});
