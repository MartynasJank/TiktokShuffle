# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # Install frontend dependencies
npm run dev              # Vite dev server at http://localhost:5173 (binds 0.0.0.0)
npm run build            # Production build → dist/
npm run preview          # Preview production build locally

cd server && npm install # Install backend dependencies
node server/index.js     # Express API + serves dist/ on PORT (default 3001)
```

In dev, Vite proxies `/api/*` to `http://localhost:3001` — run both processes in parallel.

No test suite or linter is configured.

## Architecture

Vanilla JS SPA (no framework) bundled with Vite. Users upload their TikTok data export JSON, videos are shuffled and played inside a TikTok embed iframe.

**Frontend modules in `src/`:**

- **`main.js`** — Entry point. Wires all event listeners (file drop, keyboard, touch, scroll wheel), manages screen transitions, handles localStorage session persistence, and drives auth/sync init on load.
- **`parser.js`** — Pure utilities: `parseBookmarks()` (handles 2 known TikTok JSON export variants + fallback), `extractVideoId()`, `shuffle()` (Fisher-Yates), and `fingerprintVideos()` (SHA-256 of sorted video IDs — used to detect duplicate file uploads).
- **`player.js`** — Holds the `state` object (deck array, current index, total, fingerprint). Controls playback via `postMessage` to the TikTok embed iframe. Implements three auto-advance modes: `'off'`, `'advance'` (go to next), `'loop'` (replay current; default). Calls `uploadFullSession` on new load/reshuffle and `syncProgress` on every advance.
- **`auth.js`** — Thin wrapper around `/api/auth/me`, `/api/auth/google`, and `/api/auth/logout`. Caches the current user in memory.
- **`sync.js`** — Cloud session CRUD: `uploadFullSession` (PUT, full deck — called once per session), `syncProgress` (PATCH, index + unavailableIds — called on every advance, ~100 bytes), `loadSessionFromCloud`, `clearCloudSession`. All calls are no-ops when signed out and silently swallow network errors.
- **`ui.js`** — Switches between the three screens (`upload`, `player`, `end`) via a `data-screen` attribute on `<body>`, and manages error display.

**Backend in `server/`:**

- **`index.js`** — Express app entry point. Configures session middleware (MySQL store, 30-day cookie), Passport Google OAuth strategy, and mounts routes. Also serves `dist/` as static files so one process handles everything in production.
- **`db.js`** — MySQL2 connection pool. Reads config from `server/.env`.
- **`routes/auth.js`** — `/api/auth/google` (OAuth start), `/api/auth/google/callback` (upserts user, sets session cookie, redirects to `/`), `/api/auth/me` (returns user or 401), `/api/auth/logout`.
- **`routes/session.js`** — GET/PUT/PATCH/DELETE `/api/session`. PUT stores the full deck JSON; PATCH updates only `current_index`, `is_complete`, and `unavailable_ids` (kept small for frequent calls).
- **`schema.sql`** — Run once to create `users`, `user_sessions`, and `express_sessions` tables.

**Screen flow:**
```
upload → (parse JSON, shuffle, validate IDs) → player → (all videos seen) → end
                                                  ↑ reshuffle ←──────────────┘
```

**TikTok embed integration:**
- The iframe `src` always points directly to `https://www.tiktok.com/player/v1/<videoId>` (both in dev and prod).
- `vite.config.js` contains a custom middleware that proxies `/tiktok-embed/<videoId>` to TikTok with correct headers and injects dark-theme CSS — this exists as a dev utility but is not currently wired into the player.
- Player state (play/pause, video-ended events) is received via `window.addEventListener('message', ...)`. Relevant `type` values from TikTok: `onPlayerReady`, `onStateChange` (value `1` = playing, `0` = ended), `onCurrentTime` (for progress bar), `onPlayerError`.
- `onPlayerError` with code `1001`, or any error on desktop, sets `item.unavailable = true` on the deck entry and auto-skips.
- `#swipeZone` is a transparent div layered over the iframe to capture touch events without them being swallowed by the iframe.

**Session persistence:** The shuffled deck and current index are stored in `localStorage` under `tiktok_shuffle_session`. On load, `restoreSession()` silently restores state; if a session exists, a banner appears on the upload screen letting the user resume or start fresh. The session is only replaced when a new file is loaded — navigating home preserves it. Demo sessions only overwrite other demo sessions, never a real one. The session object now also includes `fingerprint` (hex string).

**Cloud sync:** When signed in, `saveSession()` fires a `PATCH /api/session` after every video advance (index + unavailableIds only). A full `PUT /api/session` (entire deck) is sent once when a new file is loaded or reshuffled. On page load, if a cloud session exists and differs from the local one (by fingerprint or index), the user is shown a conflict dialog. If the sessions are identical, the dialog is skipped silently.

**Duplicate file detection:** After parsing a JSON upload, `fingerprintVideos()` computes a SHA-256 hash of the sorted video IDs. If the fingerprint matches the current session's fingerprint, a dialog offers to resume or reshuffle instead of overwriting progress.

**Auth flow:** Clicking "Sign in with Google" navigates to `/api/auth/google`. Google redirects to `/api/auth/google/callback`, which upserts the user in MySQL and sets an HttpOnly session cookie (30-day expiry). `fetchUser()` is called async on every page load to restore auth state without blocking the UI.

**TikTok JSON export variants:**
- Variant A (newer): `data.Activity["Favorite Videos"].FavoriteVideoList`
- Variant B (older): `data.Favorites.FavoriteVideoList`
- Fallback: shallow two-level key walk looking for any `FavoriteVideoList` array

**Debugging:** Append `?debug` to the URL to load the [eruda](https://github.com/liriliri/eruda) mobile console overlay — useful for debugging on real devices.

**Deployment:** Self-hosted. `npm run build` produces `dist/`; `node server/index.js` serves it alongside the API. Nginx proxies port 80/443 → the Node process. The app is live at `https://tiktokshuffle.martybuilds.dev`. The old GitHub Pages workflow (`.github/workflows/deploy.yml`) is no longer used.

**Environment:** Backend config lives in `server/.env` (gitignored). Copy `server/.env.example` and fill in `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, and DB credentials. `APP_URL` must match the authorized redirect URI registered in Google Cloud Console.