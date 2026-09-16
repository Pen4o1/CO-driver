import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import * as Speech from 'expo-speech';

import { DEFAULT_NOTE_FILTER, derivePaceNotes } from '@/core/pacenotes';
import type { NoteFilterOptions } from '@/core/types';
import { NoteCard } from '@/features/pacenotes/NoteCard';
import { NotesFilterPanel } from '@/features/pacenotes/NotesFilterPanel';
import { sofiaDemoGeometry } from '@/features/pacenotes/sofiaDemo';
import { useSettings } from '@/state/settings';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

export function PacenoteSandbox() {
  const voiceId = useSettings((s) => s.voiceId);
  const voiceVolume = useSettings((s) => s.voiceVolume);
  const [filter, setFilter] = useState<NoteFilterOptions>(DEFAULT_NOTE_FILTER);
  const demo = useMemo(() => sofiaDemoGeometry(), []);
  const notes = useMemo(
    () => derivePaceNotes(demo.geometry, demo.steps, filter),
    [demo, filter],
  );

  const preview = notes
    .slice(0, 4)
    .map((n) => n.spokenShort || n.spokenFull)
    .filter((t) => t.length > 0)
    .join('. ');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pacenote sandbox</Text>
      <Text style={styles.body}>{demo.name}</Text>
      <Text style={styles.hint}>
        Change the filter and hear the first few calls. This is live device TTS
        — not the driving hot path.
      </Text>
      <NotesFilterPanel
        filter={filter}
        onChange={setFilter}
        noteCount={notes.length}
      />
      <Button
        label="Hear this filter"
        onPress={() => {
          void Speech.stop();
          Speech.speak(preview || 'No notes at this filter.', {
            voice: voiceId || undefined,
            volume: voiceVolume,
          });
        }}
      />
      {notes.slice(0, 12).map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: 48, gap: space.sm },
  title: { color: colors.text, fontSize: type.title, fontWeight: '700' },
  body: { color: colors.text, fontSize: type.body },
  hint: { color: colors.muted, fontSize: type.caption },
});
