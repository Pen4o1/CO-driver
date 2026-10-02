import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/ui/navigation';

export default function RouteLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="new" options={{ title: 'New route' }} />
      <Stack.Screen
        name="[id]"
        options={{ headerShown: false, title: 'Route' }}
      />
    </Stack>
  );
}
