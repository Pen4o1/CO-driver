import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PaceNote } from '@/core/types';
import { formatLengthM, type UnitSystem } from '@/core/units';
import { DirectionArrow } from '@/ui/DirectionArrow';
import { GradeBadge } from '@/ui/GradeBadge';
import { colors, space, type } from '@/ui/theme';

type Props = {
  notes: PaceNote[];
  units: UnitSystem;
  playingId: string | null;
  height: number;
  onPlay: (note: PaceNote) => void;
};

export function RouteNoteList({
  notes,
  units,
  playingId,
  height,
  onPlay,
}: Props) {
  if (notes.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No calls at this card.</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={notes}
      keyExtractor={(note) => note.id}
      style={{ height }}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <NoteRow
          note={item}
          units={units}
          playing={playingId === item.id}
          onPlay={onPlay}
        />
      )}
    />
  );
}

function NoteRow({
  note,
  units,
  playing,
  onPlay,
}: {
  note: PaceNote;
  units: UnitSystem;
  playing: boolean;
  onPlay: (note: PaceNote) => void;
}) {
  const spoken =
    note.spokenShort.length > 0 ? note.spokenShort : note.spokenFull;
  const distance = formatLengthM(note.distanceFromPrevious, units);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${spoken}`}
      onPress={() => onPlay(note)}
      style={[styles.row, playing && styles.playing]}
    >
      {note.grade ? (
        <GradeBadge grade={note.grade} size="md" />
      ) : (
        <View style={styles.kind}>
          <Text style={styles.kindText}>{note.type}</Text>
        </View>
      )}
      <DirectionArrow direction={note.direction} size="md" />
      <View style={styles.copy}>
        <Text style={styles.distance}>{distance}</Text>
        <Text numberOfLines={2} style={styles.spoken}>
          {spoken}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.xs, paddingBottom: space.xs },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, fontSize: type.caption },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
  },
  playing: { borderWidth: 1, borderColor: colors.accent },
  copy: { flex: 1, gap: 2 },
  distance: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
  },
  spoken: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  kind: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
