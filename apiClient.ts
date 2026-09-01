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
// API_BASE_URL. Every existing call site keeps working unmodified.
const rawApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
export const API_BASE_URL = rawApiUrl !== undefined
  ? rawApiUrl.replace(/\/$/, '')
  : 'http://localhost:3001';

let patched = false;

/**
 * Rewrites relative `/api/...` fetch calls to point at API_BASE_URL.
 * Safe to call multiple times; only patches `window.fetch` once.
 */
export function installApiBaseUrlFetchPatch() {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(API_BASE_URL + input, init);
    }
    if (input instanceof URL && input.pathname.startsWith('/api') && !input.host) {
      return originalFetch(API_BASE_URL + input.pathname + input.search, init);
    }
    if (input instanceof Request && input.url.startsWith('/api')) {
      return originalFetch(new Request(API_BASE_URL + input.url, input));
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;
}
