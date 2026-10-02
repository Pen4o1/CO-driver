import { DEFAULT_NOTE_FILTER } from '@/core/pacenotes';
import type {
  LeadTimePreset,
  NoteFilterOptions,
  TurnGrade,
} from '@/core/types';
import { formatLengthM } from '@/core/units';
import { useSettings } from '@/state/settings';
import { GradeLegend } from '@/ui/GradeBadge';
import { Segmented } from '@/ui/Segmented';
import { SettingAction, SettingGroup, SettingSwitch } from '@/ui/SettingGroup';
import { Slider } from '@/ui/Slider';

const PRESETS: { id: LeadTimePreset; label: string }[] = [
  { id: 'early', label: 'Early' },
  { id: 'normal', label: 'Normal' },
  { id: 'late', label: 'Late' },
];

const GRADES: TurnGrade[] = [1, 2, 3, 4, 5, 6];

const VERBOSITY: { id: NoteFilterOptions['verbosity']; label: string }[] = [
  { id: 'full', label: 'Full' },
  { id: 'standard', label: 'Standard' },
  { id: 'terse', label: 'Terse' },
];

export function CallSettingsPanel() {
  const leadPreset = useSettings((s) => s.leadPreset);
  const units = useSettings((s) => s.unitSystem);
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

  const apply = (next: Partial<NoteFilterOptions>) => patch(next);

  return (
    <>
      <SettingGroup
        title="Lead time"
        footer="Early leaves more room to brake. Late calls closer to the corner."
        inset="tight"
      >
        <Segmented
          bare
          accessibilityLabel="Lead time"
          value={leadPreset}
          options={PRESETS}
          onChange={(lead) => patch({ leadPreset: lead })}
        />
      </SettingGroup>
      <SettingGroup
        title="Corners to call"
        footer="1 is a hairpin. 6 calls every corner."
        inset="tight"
      >
        <Segmented
          bare
          accessibilityLabel="Tightest corner to call"
          value={minGradeToCall}
          options={GRADES.map((grade) => ({
            id: grade,
            label: `≤${grade}`,
            accessibilityLabel: `Up to grade ${grade}`,
          }))}
          onChange={(grade) => apply({ minGradeToCall: grade })}
        />
      </SettingGroup>
      <SettingGroup
        title="How much to say"
        footer="Full uses the long phrase. Terse is grade and direction."
        inset="tight"
      >
        <Segmented
          bare
          accessibilityLabel="Call length"
          value={verbosity}
          options={VERBOSITY}
          onChange={(next) => apply({ verbosity: next })}
        />
      </SettingGroup>
      <SettingGroup title="Also call">
        <SettingSwitch
          label="Junctions"
          value={includeJunctions}
          onValueChange={(includeJunctionsNext) =>
            apply({ includeJunctions: includeJunctionsNext })
          }
        />
        <SettingSwitch
          label="Straights"
          value={includeStraights}
          onValueChange={(includeStraightsNext) =>
            apply({ includeStraights: includeStraightsNext })
          }
        />
        <SettingSwitch
          label="Crests"
          value={includeCrests}
          onValueChange={(includeCrestsNext) =>
            apply({ includeCrests: includeCrestsNext })
          }
        />
        <SettingSwitch
          label="Care notes"
          value={includeCareNotes}
          onValueChange={(includeCareNotesNext) =>
            apply({ includeCareNotes: includeCareNotesNext })
          }
        />
        <SettingSwitch
          label="Finish"
          value={includeFinish}
          onValueChange={(includeFinishNext) =>
            apply({ includeFinish: includeFinishNext })
          }
        />
        <SettingSwitch
          label="Confirm calls"
          detail="Say the corner again as you reach it."
          value={confirmCalls}
          onValueChange={(confirmCallsNext) =>
            apply({ confirmCalls: confirmCallsNext })
          }
        />
      </SettingGroup>
      <SettingGroup
        title={`Chain distance · ${formatLengthM(chainRadius, units)}`}
        footer="Notes closer than this are spoken as one call."
        inset="regular"
      >
        <Slider
          label="Chain distance"
          visibleLabel={false}
          track="bar"
          value={chainRadius}
          min={0}
          max={200}
          step={10}
          onChange={(next) => apply({ chainRadius: next })}
        />
      </SettingGroup>
      <SettingGroup
        title="Grade shapes"
        footer="1 hairpin, 2 very tight, 3 tight, 4 medium, 5 fast, 6 flat. Squarer and redder means tighter."
        inset="regular"
      >
        <GradeLegend />
      </SettingGroup>
      <SettingGroup>
        <SettingAction
          label="Reset call options"
          onPress={() =>
            patch({ ...DEFAULT_NOTE_FILTER, leadPreset: 'normal' })
          }
        />
      </SettingGroup>
    </>
  );
}
