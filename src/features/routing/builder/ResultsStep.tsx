import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { vsFastestLabel } from '@/core/scoring';
import { useRouteDraft } from '@/state/routeDraft';
import { Button } from '@/ui/Button';
import { ListMenu } from '@/ui/ListMenu';
import { colors, space, type } from '@/ui/theme';

import { CandidateCard } from './CandidateCard';

function candidateLabel(index: number, score: number): string {
  return `Route ${index + 1} · ${Math.round(score)}`;
}

export function ResultsStep() {
  const router = useRouter();
  const candidates = useRouteDraft((s) => s.candidates);
  const candidate = useRouteDraft((s) => s.candidate);
  const selectCandidate = useRouteDraft((s) => s.selectCandidate);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const index = Math.max(
    0,
    candidates.findIndex((item) => item.id === candidate?.id),
  );
  const shown = candidates[index] ?? null;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .map((item, itemIndex) => {
        const km = (item.geometry.lengthM / 1000).toFixed(1);
        const minutes = Math.round(item.breakdown.durationS / 60);
        return {
          id: item.id,
          label: candidateLabel(itemIndex, item.breakdown.score),
          detail: `${km} km · ${minutes} min · ${vsFastestLabel(item)}`,
        };
      })
      .filter((row) => {
        if (!q) return true;
        return `${row.label} ${row.detail}`.toLowerCase().includes(q);
      });
  }, [candidates, query]);

  if (candidates.length === 0 || !shown) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>No candidates yet.</Text>
      </View>
    );
  }

  const openMenu = () => {
    setQuery('');
    setMenuOpen(true);
  };

  return (
    <View style={styles.wrap}>
      {candidates.length > 1 ? (
        <View style={styles.pager}>
          <Pressable
            accessibilityLabel="Previous route"
            accessibilityRole="button"
            disabled={index <= 0}
            onPress={() => {
              const previous = candidates[index - 1];
              if (previous) selectCandidate(previous.id);
            }}
            style={styles.step}
          >
            <Text style={[styles.stepText, index <= 0 && styles.stepOff]}>
              ‹
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Choose a route, ${index + 1} of ${candidates.length}`}
            accessibilityRole="button"
            onPress={openMenu}
            style={styles.choose}
          >
            <Text style={styles.heading}>
              {index + 1} of {candidates.length}
            </Text>
            <Text style={styles.chooseHint}>Choose</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Next route"
            accessibilityRole="button"
            disabled={index >= candidates.length - 1}
            onPress={() => {
              const next = candidates[index + 1];
              if (next) selectCandidate(next.id);
            }}
            style={styles.step}
          >
            <Text
              style={[
                styles.stepText,
                index >= candidates.length - 1 && styles.stepOff,
              ]}
            >
              ›
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.heading}>1 route</Text>
      )}
      <CandidateCard
        candidate={shown}
        selected
        onPress={() => {
          if (candidates.length > 1) openMenu();
        }}
      />
      <Button
        label="Preview co-driver calls"
        variant="ghost"
        disabled={!candidate}
        onPress={() => router.push('/dev/notes?draft=1')}
      />
      <ListMenu
        visible={menuOpen}
        title={`${candidates.length} routes`}
        query={candidates.length > 6 ? query : undefined}
        onQueryChange={candidates.length > 6 ? setQuery : undefined}
        searchPlaceholder="Search routes"
        rows={rows}
        selectedId={shown.id}
        onClose={() => setMenuOpen(false)}
        onSelect={(id) => {
          selectCandidate(id);
          setMenuOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  pager: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.accent, fontSize: 28, fontWeight: '700' },
  stepOff: { opacity: 0.35 },
  choose: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.text, fontWeight: '700', fontSize: type.body },
  chooseHint: {
    color: colors.accent,
    fontSize: type.caption,
    fontWeight: '700',
  },
  hint: { color: colors.muted, fontSize: type.caption },
});
