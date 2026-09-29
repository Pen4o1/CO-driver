import * as Location from 'expo-location';

import { LOCATION_TASK_NAME } from './backgroundTask';

export const LOCATION_WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: 5,
  timeInterval: 500,
};

export async function requestDrivePermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { foreground: false, background: false };
  }
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg.status === 'granted' };
}

export async function startBackgroundUpdates(): Promise<void> {
  const started =
    await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    return;
  }
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,
    timeInterval: 500,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Apex',
      notificationBody: 'Apex is calling your route',
      notificationColor: '#E8F07A',
    },
  });
}

export async function stopBackgroundUpdates(): Promise<void> {
  const started =
    await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function watchForeground(
  onFix: (location: Location.LocationObject) => void,
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(LOCATION_WATCH_OPTIONS, onFix);
}

export async function currentFix(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
  } catch {
    return Location.getLastKnownPositionAsync();
  }
}

/** Recent fix only. A stale last-known position must not look like a live recce fix. */
export async function lastKnownFix(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getLastKnownPositionAsync({
      maxAge: 20_000,
      requiredAccuracy: 100,
    });
  } catch {
    return null;
  }
}

/**
 * Checklist watch. Distance interval 0 so accuracy can improve while the
 * phone is still — the drive watch waits for movement.
 */
export async function watchRecceFix(
  onFix: (location: Location.LocationObject) => void,
): Promise<Location.LocationSubscription | null> {
  const current = await Location.getForegroundPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Location.requestForegroundPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return null;
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 0,
      timeInterval: 1000,
    },
    onFix,
  );
}
