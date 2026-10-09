import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initMapLibre } from '@/features/maps';
import { FirstRunDisclaimer } from '@/features/safety/FirstRunDisclaimer';
import {
  hydrateSettings,
  watchSettingsPersist,
} from '@/features/settings/persist';
import { disclaimerAccepted } from '@/features/storage';
import { configureCoDriverAudio } from '@/features/voice';
import '@/features/coach/backgroundTask';
import { stackScreenOptions } from '@/ui/navigation';

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const [legal, setLegal] = useState(true);

  useEffect(() => {
    initMapLibre();
    let unsub: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      await hydrateSettings();
      if (cancelled) return;
      await configureCoDriverAudio({ background: true });
      if (cancelled) return;
      unsub = watchSettingsPersist();
      const accepted = await disclaimerAccepted();
      if (cancelled) return;
      setLegal(accepted);
      setBooted(true);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  if (!booted) {
    return null;
  }

  if (!legal) {
    return (
      <>
        <StatusBar style="light" />
        <FirstRunDisclaimer onAccepted={() => setLegal(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, title: 'Home' }}
        />
        <Stack.Screen
          name="route"
          options={{ headerShown: false, title: 'Route' }}
        />
        <Stack.Screen
          name="drive"
          options={{ headerShown: false, title: 'Drive' }}
        />
        <Stack.Screen
          name="dev"
          options={{ headerShown: false, title: 'Dev' }}
        />
      </Stack>
    </>
  );
}
