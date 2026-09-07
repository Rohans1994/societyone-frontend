// Central event bus for auth/session problems detected outside of React —
// in apiClient.ts's patched fetch (backend calls) and supabaseClient.ts's
// auth state listener (Supabase's own session refresh failures). Lets
// root-level UI (components/GlobalErrorModal.tsx) and App.tsx (which owns
// currentUser and the actual sign-out) react to the same events without
// those modules needing to import each other.

type Listener = () => void;
type ErrorListener = (message: string) => void;

// --- Session expired: token missing/invalid/expired (401), or Supabase's
// own client decided the session is no longer valid. Always means: sign the
// user out and send them back to the login screen. ---
const sessionExpiredListeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function triggerSessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener());
}

// Supabase's onAuthStateChange fires a SIGNED_OUT event both when a session
// naturally becomes invalid AND when the app calls supabase.auth.signOut()
// itself (e.g. the user clicking "Logout"). This flag lets a deliberate,
// app-initiated sign-out skip the "session expired" flow below.
let manualSignOutInProgress = false;

export function markManualSignOut() {
  manualSignOutInProgress = true;
  // Only needs to cover the brief window in which supabase.auth.signOut()
  // fires its own SIGNED_OUT event.
  setTimeout(() => {
    manualSignOutInProgress = false;
  }, 500);
}

export function isManualSignOutInProgress(): boolean {
  return manualSignOutInProgress;
}

// --- Generic backend error: network failure or unexpected 5xx. The user's
// session is still valid — just show a message, don't log them out. ---
const apiErrorListeners = new Set<ErrorListener>();

export function onApiError(listener: ErrorListener): () => void {
  apiErrorListeners.add(listener);
  return () => {
    apiErrorListeners.delete(listener);
  };
}

export function triggerApiError(message: string) {
  apiErrorListeners.forEach((listener) => listener(message));
}
