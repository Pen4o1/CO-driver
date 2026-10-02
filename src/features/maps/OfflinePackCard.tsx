import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { BBox } from '@/core/geo/bufferBbox';
import { canMutateLibrary } from '@/core/safety';
import {
  deleteRoutePack,
  downloadRoutePack,
  estimateRoutePack,
  findRoutePack,
  formatBytes,
  type PackProgress,
} from '@/features/maps/offlinePacks';
import { useSession } from '@/state/session';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

type Props = {
  routeId: string;
  bbox: BBox;
};

function progressLabel(progress: PackProgress): string {
  const pct = Math.round(progress.percentage);
  if (progress.state === 'active') return `Downloading · ${pct}%`;
  if (progress.state === 'inactive') return `Paused · ${pct}%`;
  return `Finishing · ${pct}%`;
}

export function OfflinePackCard({ routeId, bbox }: Props) {
  const status = useSession((s) => s.status);
  const locked = !canMutateLibrary(status);
  const estimate = estimateRoutePack(bbox);
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void findRoutePack(routeId)
      .then((pack) => {
        if (!cancelled) setReady(pack !== null);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadRoutePack(
        routeId,
        bbox,
        (next) => setProgress(next),
        (message) => setError(message),
      );
      setReady(true);
      setProgress(null);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  const detail = error
    ? error
    : progress && !ready
      ? progressLabel(progress)
      : ready
        ? 'Saved on this phone'
        : `Not saved · about ${formatBytes(estimate.bytes)}`;

  const actionLabel = busy ? 'Downloading…' : ready ? 'Remove' : 'Download';

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>Offline maps</Text>
        <Text style={error ? styles.err : ready ? styles.ok : styles.body}>
          {detail}
        </Text>
        {progress && !ready ? (
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(100, Math.max(0, progress.percentage))}%`,
                },
              ]}
            />
          </View>
        ) : null}
      </View>
      <Button
        label={actionLabel}
        variant="ghost"
        accessibilityLabel={
          ready ? 'Remove offline maps' : 'Download offline maps'
        }
        disabled={locked || busy}
        onPress={() => {
          if (ready) {
            void deleteRoutePack(routeId).then(() => {
              setReady(false);
              setProgress(null);
              setError(null);
            });
            return;
          }
          void download();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.xs,
  },
  copy: { flex: 1, gap: 2, paddingVertical: space.xs },
  title: { color: colors.text, fontWeight: '700', fontSize: type.body },
  body: { color: colors.muted, fontSize: type.caption },
  ok: { color: colors.accent, fontSize: type.caption, fontWeight: '600' },
  err: { color: colors.danger, fontSize: type.caption },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: space.xs,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
