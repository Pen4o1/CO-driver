import { useWindowDimensions, StyleSheet, Text, View } from 'react-native';

import type { PaceNote, RouteCandidate } from '@/core/types';
import {
  formatClimbM,
  formatDistanceKm,
  formatDuration,
  type UnitSystem,
} from '@/core/units';
import { OfflinePackCard } from '@/features/maps/OfflinePackCard';
import { GradeHeatStrip } from '@/features/maps/GradeHeatStrip';
import { RouteNoteList } from '@/features/pacenotes/RouteNoteList';
import { useNotePreview } from '@/features/pacenotes/useNotePreview';
import type { PreparedClip } from '@/features/voice/prepareRoute';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

type Props = {
  name: string;
  candidate: RouteCandidate;
  units: UnitSystem;
  notes: PaceNote[];
  clips: Map<string, PreparedClip>;
  callSummary: string;
  routeId: string;
  overlay: boolean;
  paddingBottom: number;
  onEdit: () => void;
  onPrepare: () => void;
  onChecklist: () => void;
  onLayoutHeight?: (height: number) => void;
};

export function RoutePreviewDock({
  name,
  candidate,
  units,
  notes,
  clips,
  callSummary,
  routeId,
  overlay,
  paddingBottom,
  onEdit,
  onPrepare,
  onChecklist,
  onLayoutHeight,
}: Props) {
  const { height } = useWindowDimensions();
  const { play, playingId } = useNotePreview(clips);
  const sheetHeight = Math.max(120, Math.min(180, Math.round(height * 0.22)));
  const ascent = candidate.ascentM ?? candidate.breakdown.elevationVariationM;
  const climb = formatClimbM(ascent, units);
  const hairpins = candidate.breakdown.hairpinCount;
  const hairpinLabel = hairpins === 1 ? '1 hairpin' : `${hairpins} hairpins`;
  const uploaded = candidate.providerId === 'gpx';

  return (
    <View
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.height);
        onLayoutHeight?.(next);
      }}
      style={[styles.dock, overlay && styles.overlay, { paddingBottom }]}
    >
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {formatDistanceKm(candidate.geometry.lengthM, units)}
          {candidate.breakdown.durationS > 0
            ? ` · est. ${formatDuration(candidate.breakdown.durationS)}`
            : ''}
          {uploaded
            ? ' · Uploaded track'
            : ` · score ${Math.round(candidate.breakdown.score)}`}
        </Text>
        <Text style={styles.body}>
          {climb ? `${climb} ascent` : 'No elevation'} · {hairpinLabel}
        </Text>
      </View>
      <GradeHeatStrip geometry={candidate.geometry} />
      <View style={styles.notesHead}>
        <Text style={styles.notesTitle}>Notes</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {callSummary}. Tap a note to hear it.
        </Text>
      </View>
      <RouteNoteList
        notes={notes}
        units={units}
        playingId={playingId}
        height={sheetHeight}
        onPlay={play}
      />
      <OfflinePackCard routeId={routeId} bbox={candidate.geometry.bbox} />
      <View style={styles.actions}>
        <Button
          label="Edit"
          variant="secondary"
          accessibilityLabel="Edit route"
          onPress={onEdit}
          style={styles.action}
        />
        <Button
          label="Prepare voice"
          variant="secondary"
          onPress={onPrepare}
          style={styles.action}
        />
      </View>
      <Button label="Checklist" disabled={!routeId} onPress={onChecklist} />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    gap: space.md,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  head: { gap: 2 },
  notesHead: { gap: 2 },
  notesTitle: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: type.caption },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  body: { color: colors.muted, fontSize: type.caption },
});
