import { StyleSheet, Text, View } from 'react-native';

import type { CallLogEntry, UpcomingCall } from '@/core/coach';
import { colors, space, type } from '@/ui/theme';

type Props = {
  distanceAlongM: number;
  speedMps: number;
  upcoming: UpcomingCall[];
  log: CallLogEntry[];
  status: string;
  crossTrackM: number;
};

export function SimOverlay({
  distanceAlongM,
  speedMps,
  upcoming,
  log,
  status,
  crossTrackM,
}: Props) {
  return (
    <View style={styles.box} pointerEvents="none">
      <Text style={styles.line}>
        {Math.round(distanceAlongM)} m · {Math.round(speedMps * 3.6)} km/h ·{' '}
        {status} · xt {Math.round(crossTrackM)} m
      </Text>
      {upcoming.map((item) => (
        <Text key={`${item.noteId}:${item.kind}`} style={styles.line}>
          {item.kind} {item.noteId} in {Math.round(item.fireInM)} m
        </Text>
      ))}
      {log.slice(-6).map((entry) => (
        <Text key={`${entry.noteId}:${entry.atMs}`} style={styles.call}>
          @{Math.round(entry.atDistanceM)}m {entry.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: 'rgba(11,13,16,0.88)',
    borderRadius: 12,
    padding: space.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: {
    color: colors.text,
    fontSize: type.caption,
    fontVariant: ['tabular-nums'],
  },
  call: { color: colors.accent, fontSize: type.caption },
});
