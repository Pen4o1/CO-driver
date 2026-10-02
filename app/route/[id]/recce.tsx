import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SAFETY_DISCLAIMER_BG_EU } from '@/core/safety';
import { canStartDrive } from '@/features/coach/recceGate';
import { useRecceSnapshot } from '@/features/coach/useRecceSnapshot';
import { acceptDisclaimer } from '@/features/storage';
import { Button } from '@/ui/Button';
import { leave, NavRow } from '@/ui/navigation';
import { colors, space, type } from '@/ui/theme';

type Tone = 'good' | 'ok' | 'poor';

function toneColor(tone: Tone): string {
  if (tone === 'good') return colors.grade5;
  if (tone === 'ok') return colors.grade3;
  return colors.danger;
}

export default function RecceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = typeof id === 'string' ? id : undefined;
  const {
    gps,
    accuracyM,
    battery,
    clips,
    legal,
    setLegal,
    loadError,
    observe,
  } = useRecceSnapshot(routeId);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(observe);

  const { enabled: canStart, clipsMissing } = canStartDrive({ legal, clips });
  const needed = clips?.needed ?? 0;
  const ready = clips?.ready ?? 0;

  const start = () => {
    if (!canStart) return;
    if (!routeId) {
      setError('Missing route');
      return;
    }
    router.replace(`/drive/${routeId}`);
  };

  const openPrepare = () => {
    if (!routeId) return;
    router.push(`/route/${routeId}/prepare`);
  };

  const clipsTone: Tone =
    !clips || needed === 0
      ? 'ok'
      : clipsMissing
        ? ready === 0
          ? 'poor'
          : 'ok'
        : 'good';
  const batteryTone: Tone =
    battery === null ? 'ok' : battery < 20 ? 'poor' : 'good';
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          {clipsMissing
            ? 'Voice is not ready yet. Prepare it, or go back to the route.'
            : 'Check the fix, the clips, and the battery. Start begins the drive.'}
        </Text>
        <Check
          label="GPS"
          value={gps === 'good' ? 'Good' : gps === 'ok' ? 'Fair' : 'Weak'}
          detail={
            accuracyM === null
              ? 'Waiting for a fix'
              : `${Math.round(accuracyM)} m`
          }
          tone={gps}
        />
        <Check
          label="Voice clips"
          value={clips ? `${ready} / ${needed}` : '…'}
          detail={
            !clips
              ? 'Checking clips'
              : needed === 0
                ? 'No notes on this route'
                : clipsMissing
                  ? 'Prepare voice before you roll'
                  : 'Cached for offline'
          }
          tone={clipsTone}
        />
        <Check
          label="Battery"
          value={battery === null ? '—' : `${battery}%`}
          detail={
            battery === null ? 'Unavailable' : battery < 20 ? 'Low' : 'OK'
          }
          tone={batteryTone}
        />
        <Text style={styles.hint}>
          Keep-awake locks on START. Turn on Do Not Disturb.
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
            <Text style={styles.ack}>Tap to acknowledge</Text>
          </Pressable>
        ) : (
          <Check
            label="Safety"
            value="OK"
            detail="Acknowledged for this install"
            tone="good"
          />
        )}
        {error || loadError ? (
          <Text style={styles.err}>{error ?? loadError}</Text>
        ) : null}
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, space.md) },
        ]}
      >
        {!clipsMissing ? (
          <Button label="Prepare voice" variant="ghost" onPress={openPrepare} />
        ) : null}
        <NavRow
          onBack={() => leave(router)}
          onForward={clipsMissing ? openPrepare : start}
          forwardLabel={clipsMissing ? 'Prepare voice' : 'Start'}
          forwardDisabled={clipsMissing ? !routeId : !canStart}
        />
      </View>
    </View>
  );
}

function Check({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  const color = toneColor(tone);
  return (
    <View
      accessibilityLabel={`${label}. ${value}. ${detail}`}
      style={styles.check}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.checkCopy}>
        <Text style={styles.checkLabel}>{label}</Text>
        <Text style={styles.checkDetail}>{detail}</Text>
      </View>
      <Text style={[styles.checkValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.lg,
    gap: space.sm,
    paddingBottom: space.md,
  },
  lead: { color: colors.muted, fontSize: type.body, marginBottom: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 64,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  checkCopy: { flex: 1, gap: 2 },
  checkLabel: { color: colors.text, fontWeight: '700', fontSize: type.body },
  checkDetail: { color: colors.muted, fontSize: type.caption },
  checkValue: { fontSize: type.hud, fontWeight: '800' },
  legal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: space.sm,
    minHeight: 44,
  },
  legalText: { color: colors.text, fontSize: type.caption },
  ack: { color: colors.accent, fontWeight: '700' },
  err: { color: colors.danger },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
