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
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Offline map pack</Text>
      <Text style={styles.body}>
        OpenFreeMap tiles, corridor +2 km, up to zoom 16 · about{' '}
        {formatBytes(estimate.bytes)} ({estimate.vectorTiles} vector tiles).
        Terrarium DEM is ambient-cached after an online view — it is not in the
        style pack.
      </Text>
      {progress ? (
        <Text style={styles.body}>
          {Math.round(progress.percentage)}% · {progress.state}
        </Text>
      ) : null}
      <Text style={ready ? styles.ok : styles.body}>
        {ready ? 'Pack on device' : 'Not downloaded'}
      </Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button
        label={busy ? 'Downloading…' : 'Download offline pack'}
        onPress={() => void download()}
        disabled={locked || busy}
      />
      {ready ? (
        <Button
          label="Delete pack"
          variant="secondary"
          disabled={locked || busy}
          onPress={() => {
            void deleteRoutePack(routeId).then(() => {
              setReady(false);
              setProgress(null);
            });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  title: { color: colors.text, fontWeight: '700', fontSize: type.body },
  body: { color: colors.muted, fontSize: type.caption },
  ok: { color: colors.accent, fontWeight: '700' },
  err: { color: colors.danger },
});
