import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { twistinessSoFar } from '@/core/coach';
import { formatDistanceKm, formatSpeed } from '@/core/units';
import { DriveLockControls } from '@/features/coach/DriveLockControls';
import { HudNextCard } from '@/features/coach/HudNextCard';
import { HudUpcoming } from '@/features/coach/HudUpcoming';
import {
  filterFromSettings,
  loadDriveBundle,
  timingFromSettings,
} from '@/features/coach/loadDriveBundle';
import { useCoDriver } from '@/features/coach/useCoDriver';
import { useSettings } from '@/state/settings';
import { colors, space, type } from '@/ui/theme';

export default function DriveHudScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const voiceId = useSettings((s) => s.voiceId);
  const volume = useSettings((s) => s.voiceVolume);
  const providerId = useSettings((s) => s.providerId);
  const units = useSettings((s) => s.unitSystem);
  const [ready, setReady] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [bundle, setBundle] =
    useState<Awaited<ReturnType<typeof loadDriveBundle>>>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadDriveBundle(id, filterFromSettings())
      .then((row) => {
        if (!cancelled) {
          if (!row) setBundleError('Route not found');
          setBundle(row);
          setReady(true);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setBundleError(
            caught instanceof Error ? caught.message : 'Load failed',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dest = bundle?.candidate.geometry.coords[
    bundle.candidate.geometry.coords.length - 1
  ] ?? {
    lat: 0,
    lng: 0,
  };
  const coach = useCoDriver({
    routeId: id ?? '',
    geometry: bundle?.candidate.geometry ?? {
      coords: [],
      cumulative: new Float64Array(),
      lengthM: 0,
      bbox: [0, 0, 0, 0],
      elevationM: null,
    },
    notes: bundle?.notes ?? [],
    filter: filterFromSettings(),
    timing: timingFromSettings(),
    clips: bundle?.clips ?? new Map(),
    voiceId,
    volume,
    providerId,
    destination: dest,
    waypoints: bundle?.candidate.waypointsUsed ?? [],
  });

  useEffect(() => {
    if (!ready || !bundle) return;
    void coach.start();
    return () => {
      void coach.stop();
    };
    // Start once the bundle is in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, bundle?.candidate.id]);

  useEffect(() => {
    if (coach.output?.status === 'finished' && coach.driveId) {
      router.replace(`/drive/${id}/summary?driveId=${coach.driveId}`);
    }
  }, [coach.output?.status, coach.driveId, id, router]);

  const next = coach.output?.nextNotes[0] ?? null;
  const metres = coach.output?.debug.upcoming[0]?.fireInM ?? null;
  const remainingM = bundle
    ? Math.max(
        0,
        bundle.candidate.geometry.lengthM -
          (coach.output?.positionAlongRoute ?? 0),
      )
    : 0;
  const twist = useMemo(
    () =>
      twistinessSoFar(
        bundle?.notes ?? [],
        coach.output?.positionAlongRoute ?? 0,
      ),
    [bundle?.notes, coach.output?.positionAlongRoute],
  );

  const onStop = () => {
    const driveId = coach.driveId;
    void coach.stop().then(() => {
      router.replace(
        `/drive/${id}/summary${driveId ? `?driveId=${driveId}` : ''}`,
      );
    });
  };

  return (
    <View style={styles.screen}>
      <HudNextCard note={next} metresToCall={metres} units={units} />
      <HudUpcoming notes={coach.output?.nextNotes.slice(1) ?? []} />
      <View style={styles.meta}>
        <Text style={styles.stat}>
          {formatSpeed(coach.output?.debug.speedMps ?? 0, units)}
        </Text>
        <Text style={styles.stat}>
          {formatDistanceKm(remainingM, units)} left
        </Text>
      </View>
      <View style={styles.twistTrack}>
        <View
          style={[styles.twistFill, { width: `${Math.round(twist * 100)}%` }]}
        />
      </View>
      {coach.error ? <Text style={styles.err}>{coach.error}</Text> : null}
      {bundleError ? <Text style={styles.err}>{bundleError}</Text> : null}
      <DriveLockControls
        muted={coach.muted}
        onMute={() => coach.mute(!coach.muted)}
        onStop={onStop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    gap: space.md,
    justifyContent: 'space-between',
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: colors.text, fontSize: type.hud, fontWeight: '800' },
  twistTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  twistFill: { height: 10, backgroundColor: colors.accent },
  err: { color: colors.danger },
});
