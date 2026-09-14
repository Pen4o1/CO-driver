import { Pressable, StyleSheet, Text, View } from 'react-native';

import { vsFastestLabel } from '@/core/scoring';
import type { RouteCandidate } from '@/core/types';
import { colors, space, type } from '@/ui/theme';

import { RouteSparkline } from './RouteSparkline';

type Props = {
  candidate: RouteCandidate;
  selected: boolean;
  onPress: () => void;
};

export function CandidateCard({ candidate, selected, onPress }: Props) {
  const km = candidate.geometry.lengthM / 1000;
  const minutes = Math.round(candidate.breakdown.durationS / 60);
  return (
    <Pressable
      accessibilityLabel={`Candidate score ${Math.round(candidate.breakdown.score)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={styles.row}>
        <Text style={styles.score}>
          {Math.round(candidate.breakdown.score)}
        </Text>
        <RouteSparkline coords={candidate.geometry.coords} />
      </View>
      <Text style={styles.meta}>
        {km.toFixed(1)} km · {minutes} min · {vsFastestLabel(candidate)}
      </Text>
      <Text style={styles.meta}>
        {candidate.breakdown.hairpinCount} hairpins · {candidate.providerId}
      </Text>
      <View style={styles.tags}>
        {candidate.breakdown.tags.map((tag) => (
          <Text key={tag} style={styles.tag}>
            {tag}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.xs,
  },
  selected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  score: {
    color: colors.accent,
    fontSize: type.title,
    fontWeight: '800',
  },
  meta: { color: colors.text, fontSize: type.caption },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: {
    color: colors.muted,
    fontSize: type.caption,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
});
