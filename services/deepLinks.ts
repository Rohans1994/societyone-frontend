import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Handles societyone://visitor-respond?requestId=...&decision=... links —
// produced by the native Approve/Deny action buttons on the visitor-request
// notification (see android/app/.../VisitorMessagingService.java) and by a
// plain tap on that notification (decision omitted in that case). Native
// code never touches auth tokens or makes network calls itself; it just
// opens the app with these params, and this is where the actual
// already-authenticated API call happens.
export interface VisitorDeepLink {
  requestId: string;
  decision?: 'Approved' | 'Denied';
}

function parseVisitorRespondUrl(url: string): VisitorDeepLink | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'societyone:' || parsed.hostname !== 'visitor-respond') return null;
    const requestId = parsed.searchParams.get('requestId');
    if (!requestId) return null;
    const decisionParam = parsed.searchParams.get('decision');
    const decision = decisionParam === 'Approved' || decisionParam === 'Denied' ? decisionParam : undefined;
    return { requestId, decision };
  } catch {
    return null;
  }
}

interface DeepLinkHandlers {
  onVisitorRespond: (link: VisitorDeepLink) => void;
}

// Covers both ways a deep link can reach the app: appUrlOpen fires when the
// app process is already alive and a new intent arrives (tapping the action
// while backgrounded); getLaunchUrl() covers a cold start where the tap
// itself launched the process fresh, so there's no "new intent" event to
// listen for — only the launch intent that was already there on mount.
// Returns an unsubscribe function for cleanup.
export function initializeDeepLinks(handlers: DeepLinkHandlers): () => void {
  let listenerHandle: { remove: () => void } | null = null;

  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  App.getLaunchUrl().then((result) => {
    if (result?.url) {
      const link = parseVisitorRespondUrl(result.url);
      if (link) handlers.onVisitorRespond(link);
    }
  }).catch(() => {});

  App.addListener('appUrlOpen', (data) => {
    const link = parseVisitorRespondUrl(data.url);
    if (link) handlers.onVisitorRespond(link);
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}
