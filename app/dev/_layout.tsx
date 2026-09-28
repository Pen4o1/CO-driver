import { Stack } from 'expo-router';

import { stackHeader } from '@/ui/theme';

export default function DevLayout() {
  return (
    <Stack screenOptions={stackHeader}>
      <Stack.Screen name="sandbox" options={{ title: 'Pacenote sandbox' }} />
      <Stack.Screen name="notes" options={{ title: 'Pace notes' }} />
      <Stack.Screen name="sim" options={{ title: 'Sim Drive' }} />
    </Stack>
  );
}
