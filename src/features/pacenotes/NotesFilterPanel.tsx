import { StyleSheet, View } from 'react-native';

import type { NoteFilterOptions, TurnGrade } from '@/core/types';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Slider } from '@/ui/Slider';
import { colors, space } from '@/ui/theme';

type Props = {
  filter: NoteFilterOptions;
  onChange: (next: NoteFilterOptions) => void;
  noteCount: number;
};

const GRADES: TurnGrade[] = [1, 2, 3, 4, 5, 6];

export function NotesFilterPanel({ filter, onChange, noteCount }: Props) {
  const toggle = (key: keyof NoteFilterOptions, value: boolean) => {
    onChange({ ...filter, [key]: value });
  };

  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        {GRADES.map((g) => (
          <Chip
            key={g}
            label={`≤${g}`}
            selected={filter.minGradeToCall === g}
            onPress={() => onChange({ ...filter, minGradeToCall: g })}
          />
        ))}
      </View>
      <View style={styles.row}>
        {(['full', 'standard', 'terse'] as const).map((v) => (
          <Chip
            key={v}
            label={v}
            selected={filter.verbosity === v}
            onPress={() => onChange({ ...filter, verbosity: v })}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Chip
          label="Junctions"
          selected={filter.includeJunctions}
          onPress={() => toggle('includeJunctions', !filter.includeJunctions)}
        />
        <Chip
          label="Straights"
          selected={filter.includeStraights}
          onPress={() => toggle('includeStraights', !filter.includeStraights)}
        />
        <Chip
          label="Crests"
          selected={filter.includeCrests}
          onPress={() => toggle('includeCrests', !filter.includeCrests)}
        />
        <Chip
          label="Finish"
          selected={filter.includeFinish}
          onPress={() => toggle('includeFinish', !filter.includeFinish)}
        />
        <Chip
          label="Confirm calls"
          selected={filter.confirmCalls}
          onPress={() => toggle('confirmCalls', !filter.confirmCalls)}
        />
      </View>
      <Slider
        label={`Chain radius (${noteCount} notes)`}
        value={filter.chainRadius}
        min={0}
        max={200}
        step={10}
        onChange={(chainRadius) => onChange({ ...filter, chainRadius })}
      />
      <Button
        label="Reset filters"
        variant="ghost"
        onPress={() =>
          onChange({
            minGradeToCall: 6,
            includeJunctions: true,
            includeCrests: true,
            includeStraights: true,
            includeCareNotes: true,
            includeFinish: true,
            verbosity: 'standard',
            chainRadius: 60,
            confirmCalls: true,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
});
