import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { routeCruiseSpeedMps } from '@/core/coach';
import { SimOverlay } from '@/features/coach/SimOverlay';
import {
  filterFromSettings,
  loadDriveBundle,
  timingFromSettings,
  type DriveBundle,
} from '@/features/coach/loadDriveBundle';
import { useSimDrive } from '@/features/coach/useSimDrive';
import { listDriveFixes, listDrives, listRoutes } from '@/features/storage';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Slider } from '@/ui/Slider';
import { colors, space, type } from '@/ui/theme';

const MULTIPLIERS = [1, 2, 4, 8] as const;

export default function SimDriveScreen() {
  useKeepAwake('apex-sim');
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  const [bundle, setBundle] = useState<DriveBundle | null>(null);

  useEffect(() => {
    void listRoutes().then((rows) =>
      setRoutes(rows.map((r) => ({ id: r.id, name: r.name }))),
    );
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadDriveBundle(selectedId, filterFromSettings()).then(setBundle);
  }, [selectedId]);

  if (!bundle) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Sim Drive</Text>
        <Text style={styles.body}>Pick a saved route.</Text>
        {routes.map((route) => (
          <Button
            key={route.id}
            variant="secondary"
            label={route.name}
            onPress={() => setSelectedId(route.id)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <SimSession
      bundle={bundle}
      routeId={selectedId ?? ''}
      onBack={() => {
        setBundle(null);
        setSelectedId(null);
      }}
    />
  );
}

function SimSession({
  bundle,
  routeId,
  onBack,
}: {
  bundle: DriveBundle;
  routeId: string;
  onBack: () => void;
}) {
  const speedMps = routeCruiseSpeedMps(
    bundle.candidate.geometry,
    bundle.candidate.breakdown.durationS,
  );
  const sim = useSimDrive({
    geometry: bundle.candidate.geometry,
    notes: bundle.notes,
    filter: filterFromSettings(),
    timing: timingFromSettings(),
    clips: bundle.clips,
    speedMps,
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sim Drive</Text>
      <Text style={styles.body}>{bundle.name}</Text>
      <View style={styles.row}>
        {MULTIPLIERS.map((m) => (
          <Chip
            key={m}
            label={`${m}x`}
            selected={sim.multiplier === m}
            onPress={() => sim.setMultiplier(m)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Button
          label={sim.playing ? 'Pause' : 'Play'}
          onPress={sim.playing ? sim.pause : sim.play}
        />
        <Button
          label="Preview here"
          variant="secondary"
          onPress={sim.previewHere}
        />
      </View>
      <Slider
        label="Time travel (m)"
        value={Math.round(sim.output?.positionAlongRoute ?? 0)}
        min={0}
        max={Math.max(1, Math.round(bundle.candidate.geometry.lengthM))}
        step={10}
        onChange={(value) => sim.seek(value)}
      />
      <Slider
        label="Lateral offset (m)"
        value={sim.lateralOffsetM}
        min={-80}
        max={80}
        step={5}
        onChange={sim.setLateralOffsetM}
      />
      <Button
        label="Off-route +60 m"
        variant="secondary"
        onPress={() => sim.setLateralOffsetM(60)}
      />
      <Button
        label="Replay last recorded drive"
        variant="secondary"
        onPress={() => {
          void listDrives().then(async (rows) => {
            const last = rows.find((row) => row.routeId === routeId);
            if (!last) return;
            const fixes = await listDriveFixes(last.id);
            if (fixes.length > 0) sim.replay(fixes);
          });
        }}
      />
      <SimOverlay
        distanceAlongM={sim.output?.positionAlongRoute ?? 0}
        speedMps={sim.output?.debug.speedMps ?? speedMps}
        upcoming={sim.output?.debug.upcoming ?? []}
        log={sim.output?.debug.callLog ?? []}
        status={sim.output?.status ?? 'paused'}
        crossTrackM={sim.output?.crossTrackM ?? 0}
      />
      <Button label="Change route" variant="ghost" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    gap: space.md,
  },
  title: { fontSize: type.title, fontWeight: '800', color: colors.text },
  body: { color: colors.muted },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
});
