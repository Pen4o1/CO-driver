import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/ui/navigation';

export default function DevLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="sandbox" options={{ title: 'Pacenote sandbox' }} />
      <Stack.Screen name="notes" options={{ title: 'Pace notes' }} />
      <Stack.Screen name="sim" options={{ title: 'Sim Drive' }} />
    </Stack>
  );
}
