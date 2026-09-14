import { StyleSheet, Text, View } from 'react-native';

import type { PaceNote } from '@/core/types';
import { DirectionArrow } from '@/ui/DirectionArrow';
import { GradeBadge } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

type Props = {
  notes: PaceNote[];
};

export function HudUpcoming({ notes }: Props) {
  return (
    <View style={styles.list}>
      {notes.slice(0, 3).map((note) => (
        <View key={note.id} style={styles.row}>
          {note.grade ? <GradeBadge grade={note.grade} size="md" /> : null}
          <DirectionArrow direction={note.direction} size="md" />
          <Text style={styles.text} numberOfLines={1}>
            {note.spokenShort.replace(/\.$/, '')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  text: { color: colors.text, fontSize: type.body, flex: 1, fontWeight: '600' },
});
