import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LeadTimePreset, NoteFilterOptions } from '@/core/types';
import { NotesFilterPanel } from '@/features/pacenotes/NotesFilterPanel';
import { useSettings } from '@/state/settings';
import { Chip } from '@/ui/Chip';
import { colors, space, type } from '@/ui/theme';

const PRESETS: { id: LeadTimePreset; label: string }[] = [
  { id: 'early', label: 'Early' },
  { id: 'normal', label: 'Normal' },
  { id: 'late', label: 'Late' },
];

export function CallSettingsPanel() {
  const leadPreset = useSettings((s) => s.leadPreset);
  const patch = useSettings((s) => s.patch);
  const minGradeToCall = useSettings((s) => s.minGradeToCall);
  const includeJunctions = useSettings((s) => s.includeJunctions);
  const includeCrests = useSettings((s) => s.includeCrests);
  const includeStraights = useSettings((s) => s.includeStraights);
  const includeCareNotes = useSettings((s) => s.includeCareNotes);
  const includeFinish = useSettings((s) => s.includeFinish);
  const verbosity = useSettings((s) => s.verbosity);
  const chainRadius = useSettings((s) => s.chainRadius);
  const confirmCalls = useSettings((s) => s.confirmCalls);

  const filter: NoteFilterOptions = useMemo(
    () => ({
      minGradeToCall,
      includeJunctions,
      includeCrests,
      includeStraights,
      includeCareNotes,
      includeFinish,
      verbosity,
      chainRadius,
      confirmCalls,
    }),
    [
      minGradeToCall,
      includeJunctions,
      includeCrests,
      includeStraights,
      includeCareNotes,
      includeFinish,
      verbosity,
      chainRadius,
      confirmCalls,
    ],
  );

  return (
    <View style={styles.block}>
      <Text style={styles.body}>Lead time</Text>
      <View style={styles.row}>
        {PRESETS.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={leadPreset === p.id}
            onPress={() => patch({ leadPreset: p.id })}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Scales call timing. Early = more braking room. Late = calls closer to
        the apex.
      </Text>
      <NotesFilterPanel
        filter={filter}
        onChange={(next) =>
          patch({
            minGradeToCall: next.minGradeToCall,
            includeJunctions: next.includeJunctions,
            includeCrests: next.includeCrests,
            includeStraights: next.includeStraights,
            includeCareNotes: next.includeCareNotes,
            includeFinish: next.includeFinish,
            verbosity: next.verbosity,
            chainRadius: next.chainRadius,
            confirmCalls: next.confirmCalls,
          })
        }
        noteCount={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  body: { color: colors.muted, fontSize: type.body, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  hint: { color: colors.muted, fontSize: type.caption },
});
