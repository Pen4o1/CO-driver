import { useRouter, type Href } from 'expo-router';

import { useSettings } from '@/state/settings';
import { SettingChoice, SettingGroup, SettingLink } from '@/ui/SettingGroup';

const PROVIDERS = [
  {
    id: 'ors',
    label: 'OpenRouteService',
    detail: 'Needs EXPO_PUBLIC_ORS_API_KEY.',
  },
  { id: 'valhalla', label: 'Valhalla', detail: 'No key.' },
  { id: 'mock', label: 'Mock', detail: 'Offline. Nothing leaves the phone.' },
] as const;

export function SetupSettingsPanel() {
  const router = useRouter();
  const providerId = useSettings((s) => s.providerId);
  const patch = useSettings((s) => s.patch);

  return (
    <>
      <SettingGroup
        title="Routing"
        footer="Mock stays on this phone and needs no key. Otherwise a new route asks both services and ranks what comes back. If you leave the road, rerouting uses the one selected here."
      >
        {PROVIDERS.map((provider) => (
          <SettingChoice
            key={provider.id}
            label={provider.label}
            detail={provider.detail}
            selected={providerId === provider.id}
            onPress={() => patch({ providerId: provider.id })}
          />
        ))}
      </SettingGroup>
      <SettingGroup title="Developer">
        <SettingLink
          label="Pace note sandbox"
          onPress={() => router.push('/dev/sandbox' as Href)}
        />
        <SettingLink
          label="Pace notes"
          onPress={() => router.push('/dev/notes')}
        />
        <SettingLink
          label="Sim drive"
          onPress={() => router.push('/dev/sim')}
        />
      </SettingGroup>
    </>
  );
}
