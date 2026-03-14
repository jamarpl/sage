import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { userAPI } from '../services/api';

// Lazily import expo-notifications so the missing native module doesn't crash
// the app when running in Expo Go (which doesn't bundle the native push module).
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  // Configure foreground notification behaviour — only when module is available
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // expo-notifications native module not available (Expo Go or missing prebuild)
}

async function requestPermissionsAndGetToken(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#28B873',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch {
    return null;
  }
}

/**
 * Registers for push notifications on mount.
 * Safe to call even when the native module is unavailable (Expo Go).
 */
export function usePushNotifications(onNotificationTap?: (notification: any) => void) {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Notifications) return;

    requestPermissionsAndGetToken().then((token) => {
      tokenRef.current = token ?? null;
      if (token) {
        userAPI.savePushToken(token).catch(() => {});
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      onNotificationTap?.(response.notification);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { getToken: () => tokenRef.current };
}

/**
 * Schedule a 3-day inactivity reminder.
 * No-ops silently if the native module isn't available.
 */
export async function scheduleContributionReminder(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your community needs you 📍',
        body: "You haven't added a pin in a while. Help others by sharing a spot nearby!",
        data: { type: 'contribution_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60 * 24 * 3,
        repeats: true,
      },
    });
  } catch {
    // Silently ignore — push is non-critical
  }
}

/**
 * Cancel the contribution reminder — call after user adds a pin.
 * No-ops silently if the native module isn't available.
 */
export async function cancelContributionReminder(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Silently ignore
  }
}
