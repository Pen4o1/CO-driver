import { StyleSheet, Text, View } from 'react-native';

import type { PaceNote } from '@/core/types';
import { DirectionArrow } from '@/ui/DirectionArrow';
import { GradeBadge } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

type Props = {
  notes: PaceNote[];
  compact?: boolean;
};

export function HudUpcoming({ notes, compact = false }: Props) {
  const rows = notes.slice(0, 3);
  return (
    <View style={[styles.list, compact && styles.listCompact]}>
      {compact ? null : <Text style={styles.kicker}>Up next</Text>}
      {rows.length === 0 ? (
        <Text style={styles.empty}>Nothing else</Text>
      ) : (
        rows.map((note) => (
          <View key={note.id} style={styles.row}>
            {note.grade ? <GradeBadge grade={note.grade} size="md" /> : null}
            <DirectionArrow direction={note.direction} size="md" />
            <Text style={styles.text} numberOfLines={1}>
              {note.spokenShort.replace(/\.$/, '')}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.xs,
  },
  listCompact: { paddingVertical: space.xs },
  kicker: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    fontSize: type.body,
    minHeight: 44,
    textAlignVertical: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  text: {
    color: colors.text,
    fontSize: type.body,
    flex: 1,
    fontWeight: '700',
  },
});
