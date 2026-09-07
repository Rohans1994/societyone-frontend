import { createClient } from '@supabase/supabase-js';
import { triggerSessionExpired, isManualSignOutInProgress } from './authEvents';

// Single shared Supabase client for the whole app, used for Auth (login,
// signup, session management). Other components create their own ad-hoc
// clients for direct storage reads/uploads (AMCManager.tsx, TendorManagement.tsx)
// — that's a separate concern from auth and is left as-is here.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. Login/signup will not work until these are configured in .env.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Supabase itself can decide a session is no longer valid (e.g. its refresh
// token expired/was revoked) independently of any of our own backend calls
// — it signals this the same way as any sign-out, via a SIGNED_OUT event.
// Skip the "session expired" flow when the sign-out was actually a
// deliberate, app-initiated logout (see authEvents.ts).
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && !isManualSignOutInProgress()) {
    triggerSessionExpired();
  }
});

/**
 * Returns the current session's access token (a Supabase Auth JWT), or null
 * if no one is signed in. Used by apiClient.ts to attach
 * `Authorization: Bearer <token>` to every /api/... request.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
