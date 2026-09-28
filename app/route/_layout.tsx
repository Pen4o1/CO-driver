import { Stack } from 'expo-router';

import { stackHeader } from '@/ui/theme';

export default function RouteLayout() {
  return (
    <Stack screenOptions={stackHeader}>
      <Stack.Screen name="new" options={{ title: 'New route' }} />
      <Stack.Screen
        name="[id]"
        options={{ headerShown: false, title: 'Route' }}
      />
    </Stack>
  );
}
