import { App } from '@capacitor/app';
import { supabase } from '../supabaseClient';

// Refreshes the Supabase session and re-fetches app data every time the app
// returns to the foreground — including when opened by tapping a push
// notification. Two related problems this fixes:
//
// 1. Stale data: simply resuming a backgrounded WebView doesn't re-run the
//    app's initial data-fetch (that only happens once, on login) — so a
//    newly-received notice/event wasn't showing up even though the app was
//    "open" again.
// 2. False "session expired": Android throttles/pauses JS timers (including
//    Supabase's own auto-refresh) in a backgrounded WebView to save battery.
//    If the access token's short lifetime elapses while backgrounded, the
//    first API call after resuming uses a stale token and gets a real 401 —
//    proactively refreshing the session on resume, before that first call,
//    avoids hitting this.
//
// Returns an unsubscribe function for cleanup.
export function initializeAppLifecycleRefresh(onResume: () => void): () => void {
  let listenerHandle: { remove: () => void } | null = null;

  App.addListener('resume', async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (err) {
      // If the refresh token itself is invalid/expired (not just the short-
      // lived access token), supabaseClient.ts's own onAuthStateChange
      // listener will correctly trigger the real "session expired" flow —
      // nothing extra needed here for that case.
      console.warn('[AppLifecycle] Session refresh on resume failed:', err);
    }
    onResume();
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}
