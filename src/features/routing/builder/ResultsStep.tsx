import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useRouteDraft } from '@/state/routeDraft';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

import { CandidateCard } from './CandidateCard';

export function ResultsStep() {
  const router = useRouter();
  const candidates = useRouteDraft((s) => s.candidates);
  const candidate = useRouteDraft((s) => s.candidate);
  const selectCandidate = useRouteDraft((s) => s.selectCandidate);

  if (candidates.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>No candidates yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        {candidates.length} route{candidates.length === 1 ? '' : 's'}
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {candidates.map((item) => (
          <CandidateCard
            key={item.id}
            candidate={item}
            selected={candidate?.id === item.id}
            onPress={() => selectCandidate(item.id)}
          />
        ))}
      </ScrollView>
      <Button
        label="Preview co-driver calls"
        variant="ghost"
        disabled={!candidate}
        onPress={() => router.push('/dev/notes?draft=1')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  heading: { color: colors.text, fontWeight: '700', fontSize: type.body },
  carousel: { gap: space.sm, paddingVertical: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
});
