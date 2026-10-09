import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  callCardSummary,
  patchActiveCallCard,
  selectVoicePreset,
  voiceForRoute,
  type RouteVoiceCard,
} from '@/core/settings';
import type { NoteFilterOptions, TurnGrade } from '@/core/types';
import { getRoute, setRouteVoiceCard } from '@/features/storage';
import { useSettings } from '@/state/settings';
import { Segmented } from '@/ui/Segmented';
import { SettingSwitch } from '@/ui/SettingGroup';
import { colors, space, type } from '@/ui/theme';

const PRESETS = [
  { id: 'bike' as const, label: 'Bike' },
  { id: 'car' as const, label: 'Car' },
];

const LEADS = [
  { id: 'early' as const, label: 'Early' },
  { id: 'normal' as const, label: 'Normal' },
  { id: 'late' as const, label: 'Late' },
];

const GRADES: TurnGrade[] = [1, 2, 3, 4, 5, 6];

const VERBOSITY: { id: NoteFilterOptions['verbosity']; label: string }[] = [
  { id: 'full', label: 'Full' },
  { id: 'standard', label: 'Standard' },
  { id: 'terse', label: 'Terse' },
];

type Props = {
  routeId: string;
  onSaved: () => void;
};

export function RouteCallCardPanel({ routeId, onSaved }: Props) {
  const settings = useSettings();
  const [stored, setStored] = useState<RouteVoiceCard | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRoute(routeId)
      .then((row) => {
        if (!cancelled) setStored(row?.voiceCard ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('Could not read the call card');
      });
    return () => {
      cancelled = true;
    };
  }, [routeId]);

  if (stored === undefined) {
    return <Text style={styles.loading}>Reading the call card…</Text>;
  }

  const card = stored ?? voiceForRoute(null, settings).card;
  const active = card[card.active];

  const persist = (next: RouteVoiceCard) => {
    setStored(next);
    setError(null);
    void setRouteVoiceCard(routeId, next)
      .then(() => onSaved())
      .catch(() => setError('Could not save the call card'));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Calls for this road</Text>
      <Text style={styles.summary}>
        {callCardSummary(card)}
        {stored === null ? ' · starts from Settings' : ''}
      </Text>
      <Segmented
        bare
        accessibilityLabel="Bike or car call card"
        value={card.active}
        options={PRESETS}
        onChange={(activePreset) =>
          persist(selectVoicePreset(card, activePreset))
        }
      />
      <Text style={styles.label}>Lead time</Text>
      <Segmented
        bare
        accessibilityLabel="Lead time for this road"
        value={active.leadPreset}
        options={LEADS}
        onChange={(leadPreset) =>
          persist(patchActiveCallCard(card, { leadPreset }))
        }
      />
      <Text style={styles.label}>Tightest grade</Text>
      <Segmented
        bare
        accessibilityLabel="Tightest corner to call on this road"
        value={active.minGradeToCall}
        options={GRADES.map((grade) => ({
          id: grade,
          label: `≤${grade}`,
          accessibilityLabel: `Up to grade ${grade}`,
        }))}
        onChange={(minGradeToCall) =>
          persist(patchActiveCallCard(card, { minGradeToCall }))
        }
      />
      <Text style={styles.label}>How much to say</Text>
      <Segmented
        bare
        accessibilityLabel="Call length for this road"
        value={active.verbosity}
        options={VERBOSITY}
        onChange={(verbosity) =>
          persist(patchActiveCallCard(card, { verbosity }))
        }
      />
      <SettingSwitch
        label="Confirm calls"
        detail="Say the corner again as you reach it."
        value={active.confirmCalls}
        onValueChange={(confirmCalls) =>
          persist(patchActiveCallCard(card, { confirmCalls }))
        }
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: space.sm,
  },
  title: { color: colors.text, fontWeight: '700', fontSize: type.body },
  summary: { color: colors.muted, fontSize: type.caption },
  label: {
    color: colors.muted,
    fontSize: type.caption,
    fontWeight: '700',
    marginTop: space.xs,
  },
  loading: { color: colors.muted, fontSize: type.caption },
  error: { color: colors.danger, fontSize: type.caption },
});
