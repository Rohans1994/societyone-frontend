// Configurable API base URL for the separated SocietyOne backend service.
//
// The app's components/App.tsx call the backend using relative paths, e.g.
// fetch('/api/users'). That works when a single server (or a single nginx
// origin proxying /api/ to the backend) serves both the frontend and API
// from the same origin — in that case, leave VITE_API_URL set to an empty
// string so requests stay relative and nginx's own /api/ location handles
// routing to the backend internally.
//
// If the frontend and backend are reachable on different origins/ports
// (e.g. no nginx yet, each service bound directly to its own public port),
// set VITE_API_URL to the backend's full origin, e.g. http://<ip>:8084.
//
// If VITE_API_URL is left completely unset (not present in .env at all),
// this falls back to http://localhost:3001 for local development, where the
// Vite dev server and the backend run on different ports.
//
// Rather than rewriting every one of the ~75 fetch('/api/...') call sites
// across the app, we patch the global `fetch` once at startup (see
// index.tsx) to prefix any request that starts with '/api' with
// API_BASE_URL, AND to attach the current Supabase session's access token as
// `Authorization: Bearer <token>` — the backend now requires this on most
// routes (see societyone-backend/src/middleware/auth.ts). Every existing
// call site keeps working unmodified; requests made while signed out simply
// go out without an Authorization header, and the backend rejects those that
// require one with 401.
import { triggerSessionExpired, triggerApiError } from './authEvents';

const rawApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
export const API_BASE_URL = rawApiUrl !== undefined
  ? rawApiUrl.replace(/\/$/, '')
  : 'http://localhost:3001';

let patched = false;

async function withAuthHeader(init?: RequestInit): Promise<RequestInit | undefined> {
  // Imported lazily (not at module top-level) to avoid a circular import,
  // since supabaseClient.ts doesn't depend on this file.
  const { getAccessToken } = await import('./supabaseClient');
  const token = await getAccessToken();
  if (!token) return init;

  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

// --- Global "is a backend API call in flight" tracker ---
//
// Powers the app-wide GlobalLoader overlay (components/GlobalLoader.tsx):
// every button click that triggers a backend call goes through one of the
// '/api/...' fetch branches below, so counting them here — in one place —
// covers every existing call site without needing to touch each of the
// ~75+ handlers individually. Exposed as a tiny subscribe/snapshot pair so
// it can be read from React via useSyncExternalStore (see
// hooks/useApiLoading.ts).
let activeApiCallCount = 0;
const apiLoadingListeners = new Set<() => void>();

function notifyApiLoadingListeners() {
  apiLoadingListeners.forEach(listener => listener());
}

export function subscribeApiLoading(listener: () => void): () => void {
  apiLoadingListeners.add(listener);
  return () => {
    apiLoadingListeners.delete(listener);
  };
}

export function getApiLoadingSnapshot(): boolean {
  return activeApiCallCount > 0;
}

// Also detects auth/error conditions on every backend call, in this one
// central place, so no individual button/handler needs its own logic for
// this (see authEvents.ts + components/GlobalErrorModal.tsx):
//   - 401 (token missing/invalid/expired) -> force logout + "session
//     expired" popup. This always means the session itself is dead.
//   - 5xx or the request never reaching the server at all (offline, DNS
//     failure, backend down, etc.) -> generic error popup, but the user
//     stays logged in since their session is still perfectly valid.
// Deliberately NOT triggered for 403/400/404 etc. — those are normal
// business-rule errors (e.g. "you don't have permission") that individual
// screens already handle with their own specific messages.
async function trackApiCall(run: () => Promise<Response>): Promise<Response> {
  activeApiCallCount++;
  notifyApiLoadingListeners();
  try {
    const response = await run();
    if (response.status === 401) {
      triggerSessionExpired();
    } else if (response.status >= 500) {
      triggerApiError('Something went wrong on our end. Please try again in a moment.');
    }
    return response;
  } catch (err) {
    triggerApiError('Unable to reach the server. Please check your connection and try again.');
    throw err;
  } finally {
    activeApiCallCount--;
    notifyApiLoadingListeners();
  }
}

/**
 * Rewrites relative `/api/...` fetch calls to point at API_BASE_URL and
 * attaches the current auth token. Safe to call multiple times; only patches
 * `window.fetch` once.
 */
export function installApiBaseUrlFetchPatch() {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      const authedInit = await withAuthHeader(init);
      return trackApiCall(() => originalFetch(API_BASE_URL + input, authedInit));
    }
    if (input instanceof URL && input.pathname.startsWith('/api') && !input.host) {
      const authedInit = await withAuthHeader(init);
      return trackApiCall(() => originalFetch(API_BASE_URL + input.pathname + input.search, authedInit));
    }
    if (input instanceof Request && input.url.startsWith('/api')) {
      return trackApiCall(async () => {
        const authedInit = await withAuthHeader({
          method: input.method,
          headers: input.headers,
          body: input.body,
          credentials: input.credentials,
          mode: input.mode,
          redirect: input.redirect
        });
        return originalFetch(new Request(API_BASE_URL + input.url, authedInit));
      });
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;
}
