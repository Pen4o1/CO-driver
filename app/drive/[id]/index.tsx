import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const { id } = useLocalSearchParams<{ id: string }>();
  const voiceId = useSettings((s) => s.voiceId);
  const volume = useSettings((s) => s.voiceVolume);
  const providerId = useSettings((s) => s.providerId);
  const units = useSettings((s) => s.unitSystem);
  const [ready, setReady] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [bundle, setBundle] =
    useState<Awaited<ReturnType<typeof loadDriveBundle>>>(null);
  const openedSummary = useRef(false);

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
    if (openedSummary.current) return;
    if (coach.output?.status !== 'finished' || !coach.driveId) return;
    openedSummary.current = true;
    const savedId = coach.driveId;
    void coach.stop().finally(() => {
      router.replace(`/drive/${id}/summary?driveId=${savedId}`);
    });
  }, [coach.output?.status, coach.driveId, coach.stop, id, router]);

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
  const twistPct = Math.round(twist * 100);
  const status = coach.output?.status;
  const statusLabel =
    status === 'off-route'
      ? 'Off route'
      : status === 'paused'
        ? 'Paused'
        : null;

  const onStop = () => {
    const driveId = coach.driveId;
    void coach.stop().then(() => {
      router.replace(
        `/drive/${id}/summary${driveId ? `?driveId=${driveId}` : ''}`,
      );
    });
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + space.sm,
          paddingBottom: Math.max(insets.bottom, space.sm),
          paddingLeft: Math.max(insets.left, space.md),
          paddingRight: Math.max(insets.right, space.md),
        },
      ]}
    >
      <View style={[styles.body, landscape && styles.bodyLand]}>
        <View style={[styles.hero, landscape && styles.heroLand]}>
          <HudNextCard
            note={next}
            metresToCall={metres}
            units={units}
            layout={landscape ? 'row' : 'stack'}
          />
        </View>
        <View style={[styles.side, landscape && styles.sideLand]}>
          <HudUpcoming
            notes={coach.output?.nextNotes.slice(1) ?? []}
            compact={landscape}
          />
          <View style={styles.meta}>
            <Text style={styles.stat}>
              {formatSpeed(coach.output?.debug.speedMps ?? 0, units)}
            </Text>
            <Text style={styles.stat}>
              {formatDistanceKm(remainingM, units)} left
            </Text>
          </View>
          <View
            accessibilityLabel={`Twistiness ${twistPct} percent`}
            style={styles.twistRow}
          >
            <Text style={styles.twistLabel}>Twist {twistPct}</Text>
            <View style={styles.twistTrack}>
              <View style={[styles.twistFill, { width: `${twistPct}%` }]} />
            </View>
          </View>
        </View>
      </View>
      {statusLabel ? <Text style={styles.status}>{statusLabel}</Text> : null}
      {coach.error ? <Text style={styles.err}>{coach.error}</Text> : null}
      {bundleError ? <Text style={styles.err}>{bundleError}</Text> : null}
      <View style={styles.controls}>
        <DriveLockControls
          muted={coach.muted}
          onMute={() => coach.mute(!coach.muted)}
          onStop={onStop}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    gap: space.sm,
  },
  body: { flex: 1, gap: space.sm },
  bodyLand: { flexDirection: 'row', alignItems: 'stretch' },
  hero: { flex: 1.4 },
  heroLand: { flex: 1.2 },
  side: { gap: space.sm, justifyContent: 'flex-end' },
  sideLand: { flex: 1, justifyContent: 'center' },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  stat: { color: colors.text, fontSize: type.hud, fontWeight: '800' },
  twistRow: { gap: 4 },
  twistLabel: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
  },
  twistTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  twistFill: { height: 10, backgroundColor: colors.accent },
  status: { color: colors.danger, fontSize: type.hud, fontWeight: '800' },
  err: { color: colors.danger, fontSize: type.body },
  controls: { flexShrink: 0 },
});
