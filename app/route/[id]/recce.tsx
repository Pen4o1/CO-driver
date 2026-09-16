import * as Battery from 'expo-battery';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SAFETY_DISCLAIMER_BG_EU } from '@/core/safety';
import { currentFix, gpsBand } from '@/features/coach';
import { loadDriveBundle } from '@/features/coach/loadDriveBundle';
import { acceptDisclaimer, disclaimerAccepted } from '@/features/storage';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

function bandColor(band: 'good' | 'ok' | 'poor'): string {
  if (band === 'good') return colors.grade5;
  if (band === 'ok') return colors.grade3;
  return colors.danger;
}

export default function RecceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gps, setGps] = useState<'good' | 'ok' | 'poor'>('poor');
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [clips, setClips] = useState({ ready: 0, notes: 0 });
  const [legal, setLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const accepted = await disclaimerAccepted();
      if (!cancelled) setLegal(accepted);
      const fix = await currentFix();
      if (fix && !cancelled) {
        const acc = fix.coords.accuracy ?? 999;
        setAccuracyM(acc);
        setGps(gpsBand(acc));
      }
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (!cancelled && level >= 0) setBattery(Math.round(level * 100));
      } catch {
        if (!cancelled) setBattery(null);
      }
      if (id) {
        const bundle = await loadDriveBundle(id);
        if (!cancelled && bundle) {
          setClips({ ready: bundle.clipCount, notes: bundle.notes.length });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const start = async () => {
    if (!legal) {
      await acceptDisclaimer();
      setLegal(true);
    }
    if (!id) {
      setError('Missing route');
      return;
    }
    router.replace(`/drive/${id}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recce</Text>
      <Row
        label="GPS"
        value={accuracyM === null ? gps : `${gps} · ${Math.round(accuracyM)} m`}
        color={bandColor(gps)}
      />
      <Row
        label="Voice clips"
        value={`${clips.ready} / ${clips.notes}`}
        color={
          clips.ready >= clips.notes && clips.notes > 0
            ? colors.grade5
            : colors.grade3
        }
      />
      <Row
        label="Battery"
        value={battery === null ? 'unknown' : `${battery}%`}
        color={battery !== null && battery < 20 ? colors.danger : colors.grade5}
      />
      <Text style={styles.body}>
        Keep-awake will lock on START. Enable Do Not Disturb.
      </Text>
      {!legal ? (
        <Pressable
          accessibilityLabel="Acknowledge safety disclaimer"
          onPress={() => {
            void acceptDisclaimer().then(() => setLegal(true));
          }}
          style={styles.legal}
        >
          <Text style={styles.legalText}>{SAFETY_DISCLAIMER_BG_EU}</Text>
          <Text style={styles.ack}>Tap to acknowledge (once per install)</Text>
        </Pressable>
      ) : (
        <Text style={styles.body}>Safety acknowledgment recorded.</Text>
      )}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Button
        label="Prepare voice"
        variant="secondary"
        onPress={() => router.push(`/route/${id}/prepare`)}
      />
      <Button label="START" onPress={() => void start()} disabled={!legal} />
    </View>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
    gap: space.md,
    justifyContent: 'center',
  },
  title: { fontSize: type.title, fontWeight: '800', color: colors.text },
  body: { color: colors.muted, fontSize: type.body },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  label: { color: colors.text, fontWeight: '700', width: 110 },
  value: { color: colors.muted, flex: 1 },
  legal: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  legalText: { color: colors.text, fontSize: type.caption },
  ack: { color: colors.accent, fontWeight: '700' },
  err: { color: colors.danger },
});
