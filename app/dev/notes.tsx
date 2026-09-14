import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_NOTE_FILTER, derivePaceNotes } from '@/core/pacenotes';
import type { NoteFilterOptions, RouteGeometry, RouteStep } from '@/core/types';
import { NoteCard } from '@/features/pacenotes/NoteCard';
import { NotesFilterPanel } from '@/features/pacenotes/NotesFilterPanel';
import { sofiaDemoGeometry } from '@/features/pacenotes/sofiaDemo';
import { getRoute, listRoutes } from '@/features/storage';
import { useRouteDraft } from '@/state/routeDraft';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

type Source = {
  id: string;
  name: string;
  geometry: RouteGeometry;
  steps: RouteStep[];
};

type SavedSource = Source;

export default function DevNotesScreen() {
  const params = useLocalSearchParams<{ routeId?: string; draft?: string }>();
  const draftCandidate = useRouteDraft((s) => s.candidate);
  const [filter, setFilter] = useState<NoteFilterOptions>(DEFAULT_NOTE_FILTER);
  const [saved, setSaved] = useState<SavedSource[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listRoutes()
      .then((rows) =>
        Promise.all(
          rows.map((row) => getRoute(row.id).then((full) => ({ row, full }))),
        ),
      )
      .then((loaded) => {
        if (cancelled) return;
        setSaved(
          loaded.flatMap(({ full }) =>
            full
              ? [
                  {
                    id: full.id,
                    name: full.name,
                    geometry: full.candidate.geometry,
                    steps: full.candidate.steps,
                  },
                ]
              : [],
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setSaved([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const source: Source = useMemo(() => {
    if (pickedId === 'draft' || (pickedId === null && params.draft === '1')) {
      if (draftCandidate) {
        return {
          id: 'draft',
          name: 'Draft candidate',
          geometry: draftCandidate.geometry,
          steps: draftCandidate.steps,
        };
      }
    }
    const routeId =
      pickedId ?? (typeof params.routeId === 'string' ? params.routeId : null);
    const savedMatch = saved.find((row) => row.id === routeId);
    if (savedMatch) {
      return savedMatch;
    }
    const demo = sofiaDemoGeometry();
    return {
      id: 'demo',
      name: demo.name,
      geometry: demo.geometry,
      steps: demo.steps,
    };
  }, [pickedId, params.draft, params.routeId, draftCandidate, saved]);

  const notes = useMemo(
    () => derivePaceNotes(source.geometry, source.steps, filter),
    [source, filter],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Pace notes</Text>
      <Text style={styles.sub}>{source.name}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          <Chip
            label="Demo"
            selected={source.id === 'demo'}
            onPress={() => setPickedId('demo')}
          />
          {draftCandidate ? (
            <Chip
              label="Draft"
              selected={source.id === 'draft'}
              onPress={() => setPickedId('draft')}
            />
          ) : null}
          {saved.map((row) => (
            <Chip
              key={row.id}
              label={row.name}
              selected={source.id === row.id}
              onPress={() => setPickedId(row.id)}
            />
          ))}
        </View>
      </ScrollView>
      <NotesFilterPanel
        filter={filter}
        onChange={setFilter}
        noteCount={notes.length}
      />
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md, paddingBottom: 48, gap: space.sm },
  title: { color: colors.text, fontSize: type.title, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: type.caption },
  row: { flexDirection: 'row', gap: space.xs, paddingVertical: space.xs },
});
