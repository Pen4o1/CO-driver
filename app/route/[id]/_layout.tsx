import { Stack } from 'expo-router';

import { stackHeader } from '@/ui/theme';

export default function RouteIdLayout() {
  return (
    <Stack screenOptions={stackHeader}>
      <Stack.Screen name="index" options={{ title: 'Route' }} />
      <Stack.Screen name="edit" options={{ title: 'Edit route' }} />
      <Stack.Screen name="recce" options={{ title: 'Recce' }} />
      <Stack.Screen name="prepare" options={{ title: 'Prepare voice' }} />
    </Stack>
  );
}
