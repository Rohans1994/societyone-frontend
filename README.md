# SocietyOne Frontend

React + Vite frontend for the SocietyOne housing society management app.

This service was split out from the original `societyone-smart-management`
monolith. It no longer has its own Express server — it's a standalone Vite
SPA that talks to `societyone-backend` over HTTP.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and set `VITE_API_URL` to wherever
   `societyone-backend` is running (defaults to `http://localhost:3001`):
   ```
   cp .env.example .env
   ```
3. Run the dev server:
   ```
   npm run dev
   ```

The app runs on `http://localhost:5173` by default.

## How API calls reach the backend

Components call the backend using relative paths inherited from the original
monolith, e.g. `fetch('/api/users')`. `apiClient.ts` installs a one-time
patch on `window.fetch` (wired up in `index.tsx`) that rewrites any request
starting with `/api` to `${VITE_API_URL}${path}`. This avoids rewriting ~75
call sites scattered across `App.tsx` and `components/*.tsx` while still
routing every request to the correct backend origin. See `apiClient.ts` for
details.

## Build for production

```
npm run build
```

Output goes to `dist/`. Serve it with any static host — this app no longer
needs a Node server to run (unlike the original monolith, which used Express
to serve the built frontend).

## Security notes carried over from the migration

- `VITE_GEMINI_API_KEY` (used by the in-app AI assistant) ships in the
  client-side bundle, same as in the original app. It is visible to anyone
  who inspects network requests or the bundle. If that's not acceptable,
  move the Gemini call into `societyone-backend` behind an API route instead.
