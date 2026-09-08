import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Cached so logout can unregister the same token without needing to trigger
// a whole new registration round-trip (and possible permission re-prompt)
// just to find out what the current token is.
let currentDeviceToken: string | null = null;

// Registers this device for push notifications (Firebase Cloud Messaging)
// and sends the resulting token to the backend, which uses it to push
// notices/events to this resident (see societyone-backend/src/services/
// pushNotifications.ts and routes/deviceTokens.ts).
//
// A complete no-op when running as a plain website (Capacitor.isNativePlatform()
// is false there) — this only does anything inside the packaged Android app.
export async function initializePushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permissionStatus = await PushNotifications.requestPermissions();
    if (permissionStatus.receive !== 'granted') {
      console.warn('[Push] Notification permission not granted; skipping registration.');
      return;
    }

    // The 'registration' listener fires once register() successfully gets a
    // token from FCM. Set it up before calling register() so we don't miss it.
    await PushNotifications.addListener('registration', async (token) => {
      currentDeviceToken = token.value;
      try {
        await fetch('/api/device-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.value, platform: 'android' })
        });
      } catch (err) {
        console.warn('[Push] Failed to register device token with backend:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[Push] Registration error:', err);
    });

    await PushNotifications.register();
  } catch (err) {
    console.warn('[Push] Failed to initialize push notifications:', err);
  }
}

// Called on logout so this device stops receiving push notifications meant
// for the account that just signed out (e.g. a shared/family device).
export async function unregisterPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    if (currentDeviceToken) {
      await fetch(`/api/device-tokens/${encodeURIComponent(currentDeviceToken)}`, { method: 'DELETE' });
    }
    await PushNotifications.unregister();
    currentDeviceToken = null;
  } catch (err) {
    console.warn('[Push] Failed to unregister device token:', err);
  }
}
