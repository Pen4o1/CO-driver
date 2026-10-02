import { BUILTIN_PROFILES } from '@/core/routing';
import type { RouteStyle } from '@/core/types';
import { useSettings } from '@/state/settings';
import { SettingChoice, SettingGroup } from '@/ui/SettingGroup';

export function ProfileSettingsPanel() {
  const defaultProfileId = useSettings((s) => s.defaultProfileId);
  const patch = useSettings((s) => s.patch);

  return (
    <SettingGroup title="Default style">
      {BUILTIN_PROFILES.map((profile) => (
        <SettingChoice
          key={profile.id}
          label={profile.label}
          detail={profile.description}
          selected={defaultProfileId === profile.id}
          onPress={() => patch({ defaultProfileId: profile.id as RouteStyle })}
        />
      ))}
    </SettingGroup>
  );
}
