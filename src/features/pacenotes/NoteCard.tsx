import { StyleSheet, Text, View } from 'react-native';

import type { PaceNote } from '@/core/types';
import { Card } from '@/ui/Card';
import { DirectionArrow } from '@/ui/DirectionArrow';
import { GradeBadge } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

type Props = { note: PaceNote };

export function NoteCard({ note }: Props) {
  const spoken =
    note.spokenShort.length > 0 ? note.spokenShort : note.spokenFull;
  return (
    <Card
      accessibilityLabel={`${note.type} ${note.grade ?? ''} ${spoken}`}
      style={styles.card}
    >
      <View style={styles.row}>
        {note.grade ? (
          <GradeBadge grade={note.grade} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.kind}>{note.type}</Text>
          </View>
        )}
        <DirectionArrow direction={note.direction} />
        <View style={styles.body}>
          <Text style={styles.distance}>
            {Math.round(note.distanceFromPrevious)} m
          </Text>
          <Text style={styles.spoken}>{spoken}</Text>
          {note.chain ? <Text style={styles.meta}>{note.chain}</Text> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  body: { flex: 1, gap: 2 },
  distance: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
  },
  spoken: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  meta: { color: colors.accent, fontSize: type.caption },
  placeholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kind: { color: colors.muted, fontWeight: '700', fontSize: type.caption },
});
