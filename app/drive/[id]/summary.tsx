import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DriveStats } from '@/core/coach';
import type { GeoFix, RouteGeometry } from '@/core/types';
import { DriveSummaryCard } from '@/features/coach/DriveSummaryCard';
import { getDrive, getRoute, listDriveFixes } from '@/features/storage';
import { useSettings } from '@/state/settings';
import { NavRow } from '@/ui/navigation';
import { colors, space, type } from '@/ui/theme';

const EMPTY: DriveStats = {
  distanceM: 0,
  durationS: 0,
  movingTimeS: 0,
  cornersByGrade: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  hairpinsHit: 0,
  avgSpeedMps: 0,
};

export default function DriveSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const units = useSettings((s) => s.unitSystem);
  const { id, driveId } = useLocalSearchParams<{
    id: string;
    driveId?: string;
  }>();
  const [geometry, setGeometry] = useState<RouteGeometry | null>(null);
  const [stats, setStats] = useState<DriveStats>(EMPTY);
  const [fixes, setFixes] = useState<GeoFix[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const route = await getRoute(id);
      if (!cancelled && route) setGeometry(route.candidate.geometry);
      if (driveId) {
        const [drive, trace] = await Promise.all([
          getDrive(driveId),
          listDriveFixes(driveId),
        ]);
        if (cancelled) return;
        if (drive?.stats) setStats(drive.stats);
        setFixes(trace);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, driveId]);

  const routeId = typeof id === 'string' ? id : '';

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, space.lg) },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>Drive summary</Text>
        <DriveSummaryCard
          geometry={geometry}
          stats={stats}
          units={units}
          fixes={fixes}
        />
      </ScrollView>
      <NavRow
        onBack={() => router.replace(routeId ? `/route/${routeId}` : '/')}
        backLabel="Route"
        onForward={() => router.replace('/')}
        forwardLabel="Home"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.md,
  },
  scroll: { flex: 1 },
  content: { gap: space.md, paddingBottom: space.md },
  kicker: { color: colors.muted, fontSize: type.caption, fontWeight: '700' },
});
