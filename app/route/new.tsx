import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { PinsStep } from '@/features/routing/builder/PinsStep';
import { ResultsStep } from '@/features/routing/builder/ResultsStep';
import { StyleStep } from '@/features/routing/builder/StyleStep';
import { runCandidateSearch } from '@/features/routing/runCandidateSearch';
import { RouteMap } from '@/features/maps/RouteMap';
import { useRouteDraft } from '@/state/routeDraft';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { colors, space } from '@/ui/theme';

export default function NewRouteScreen() {
  const start = useRouteDraft((s) => s.start);
  const end = useRouteDraft((s) => s.end);
  const step = useRouteDraft((s) => s.step);
  const mode = useRouteDraft((s) => s.mode);
  const candidate = useRouteDraft((s) => s.candidate);
  const errorMessage = useRouteDraft((s) => s.errorMessage);
  const isRouting = useRouteDraft((s) => s.isRouting);
  const setStart = useRouteDraft((s) => s.setStart);
  const setEnd = useRouteDraft((s) => s.setEnd);
  const setStep = useRouteDraft((s) => s.setStep);
  const placeOnMap = useRouteDraft((s) => s.placeOnMap);
  const setProfileId = useRouteDraft((s) => s.setProfileId);
  const defaultProfileId = useSettings((s) => s.defaultProfileId);

  useEffect(() => {
    setProfileId(defaultProfileId);
  }, [defaultProfileId, setProfileId]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          MapLibre needs the iOS or Android dev client. Expo Go and web are not
          supported. See MAP_SETUP.md.
        </Text>
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
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.steps}>
          <Chip
            label="1 Pins"
            selected={step === 1}
            onPress={() => setStep(1)}
          />
          <Chip
            label="2 Style"
            selected={step === 2}
            onPress={() => canContinuePins && setStep(2)}
          />
          <Chip
            label="3 Results"
            selected={step === 3}
            onPress={() => undefined}
          />
        </View>
        {step === 1 ? <PinsStep /> : null}
        {step === 2 ? <StyleStep /> : null}
        {step === 3 ? <ResultsStep /> : null}
        {step === 1 ? (
          <Button
            label="Next · style"
            disabled={!canContinuePins}
            onPress={() => setStep(2)}
          />
        ) : null}
        {step === 2 ? (
          <Button
            label={isRouting ? 'Generating…' : 'Find routes'}
            disabled={isRouting}
            onPress={() => {
              void runCandidateSearch();
            }}
          />
        ) : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  overlay: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    top: space.sm,
    gap: space.sm,
  },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  error: { color: colors.danger },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  fallbackText: { color: colors.text, textAlign: 'center' },
});
