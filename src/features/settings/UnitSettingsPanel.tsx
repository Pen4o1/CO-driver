import type { UnitSystem } from '@/core/units';
import { useSettings } from '@/state/settings';
import { Segmented } from '@/ui/Segmented';
import { SettingGroup, SettingSwitch } from '@/ui/SettingGroup';

const UNITS: { id: UnitSystem; label: string }[] = [
  { id: 'metric', label: 'km / m' },
  { id: 'imperial', label: 'mi / yards' },
];

export function UnitSettingsPanel() {
  const unitSystem = useSettings((s) => s.unitSystem);
  const keepScreenOn = useSettings((s) => s.keepScreenOn);
  const patch = useSettings((s) => s.patch);

  return (
    <>
      <SettingGroup
        title="Distance"
        footer="Route length and the distances spoken in calls."
        inset="tight"
      >
        <Segmented
          bare
          accessibilityLabel="Distance units"
          value={unitSystem}
          options={UNITS}
          onChange={(unitSystemNext) => patch({ unitSystem: unitSystemNext })}
        />
      </SettingGroup>
      <SettingGroup
        title="Screen"
        footer="Stays awake while a drive is running."
      >
        <SettingSwitch
          label="Keep screen on"
          value={keepScreenOn}
          onValueChange={(next) => patch({ keepScreenOn: next })}
        />
      </SettingGroup>
    </>
  );
}
