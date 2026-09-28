import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { saveRoute } from '@/features/storage';
import { useRouteDraft } from '@/state/routeDraft';
import { Button } from '@/ui/Button';
import { colors, space, type } from '@/ui/theme';

import { CandidateCard } from './CandidateCard';

export function ResultsStep() {
  const router = useRouter();
  const candidates = useRouteDraft((s) => s.candidates);
  const candidate = useRouteDraft((s) => s.candidate);
  const selectCandidate = useRouteDraft((s) => s.selectCandidate);
  const startLabel = useRouteDraft((s) => s.startLabel);
  const endLabel = useRouteDraft((s) => s.endLabel);
  const mode = useRouteDraft((s) => s.mode);
  const loopDistanceKm = useRouteDraft((s) => s.loopDistanceKm);
  const setStep = useRouteDraft((s) => s.setStep);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>No candidates yet.</Text>
        <Button
          label="Back to style"
          variant="secondary"
          onPress={() => setStep(2)}
        />
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
        label={saving ? 'Saving…' : 'Save route'}
        disabled={!candidate || saving}
        onPress={async () => {
          if (!candidate) return;
          setSaving(true);
          setSaveError(null);
          try {
            const name =
              mode === 'loop'
                ? `Loop ${loopDistanceKm} km`
                : `${startLabel ?? 'Start'} → ${endLabel ?? 'End'}`;
            const id = await saveRoute({ name, candidate });
            router.push(`/route/${id}`);
          } catch (caught) {
            setSaveError(
              caught instanceof Error ? caught.message : 'Save failed',
            );
          } finally {
            setSaving(false);
          }
        }}
      />
      <Button
        label="Preview co-driver calls"
        variant="ghost"
        disabled={!candidate}
        onPress={() => router.push('/dev/notes?draft=1')}
      />
      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  heading: { color: colors.text, fontWeight: '700', fontSize: type.body },
  carousel: { gap: space.sm, paddingVertical: space.xs },
  hint: { color: colors.muted, fontSize: type.caption },
  error: { color: colors.danger },
});
