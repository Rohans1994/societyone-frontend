// Configurable API base URL for the separated SocietyOne backend service.
//
// The app's components/App.tsx call the backend using relative paths, e.g.
// fetch('/api/users'). That works when a single server serves both the
// frontend and API from the same origin. Now that frontend and backend are
// separate services, those relative calls need to be redirected to the
// backend's origin.
//
// Rather than rewriting every one of the ~75 fetch('/api/...') call sites
// across the app, we patch the global `fetch` once at startup (see
// index.tsx) to prefix any request that starts with '/api' with
// API_BASE_URL. Every existing call site keeps working unmodified.
export const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL as string | undefined
)?.replace(/\/$/, '') || 'http://localhost:3001';

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
