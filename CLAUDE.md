# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173 (also binds 0.0.0.0 for network access)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test suite or linter is configured.

## Architecture

Vanilla JS SPA (no framework) bundled with Vite. Users upload their TikTok data export JSON, videos are shuffled and played inside a TikTok embed iframe.

**Four modules in `src/`:**

- **`main.js`** — Entry point. Wires all event listeners (file drop, keyboard, touch, scroll wheel), manages screen transitions, and handles localStorage session persistence.
- **`parser.js`** — Pure utilities: `parseBookmarks()` (handles 2 known TikTok JSON export variants + fallback), `extractVideoId()`, and `shuffle()` (Fisher-Yates).
- **`player.js`** — Holds the `state` object (deck array, current index, total). Controls playback via `postMessage` to the TikTok embed iframe. Implements three auto-advance modes: `'off'`, `'advance'` (go to next), `'loop'` (replay current; default).
- **`ui.js`** — Switches between the three screens (`upload`, `player`, `end`) via a `data-screen` attribute on `<body>`, and manages error display.

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

**Session persistence:** The shuffled deck and current index are stored in `localStorage` under `tiktok_shuffle_session`. On load, `restoreSession()` silently restores state; if a session exists, a banner appears on the upload screen letting the user resume or start fresh. The session is only replaced when a new file is loaded — navigating home preserves it. Demo sessions only overwrite other demo sessions, never a real one.

**TikTok JSON export variants:**
- Variant A (newer): `data.Activity["Favorite Videos"].FavoriteVideoList`
- Variant B (older): `data.Favorites.FavoriteVideoList`
- Fallback: shallow two-level key walk looking for any `FavoriteVideoList` array

**Debugging:** Append `?debug` to the URL to load the [eruda](https://github.com/liriliri/eruda) mobile console overlay — useful for debugging on real devices.

**Deployment:** GitHub Pages via `.github/workflows/deploy.yml` — pushes to `main` trigger a Vite build and deploy. The Vite base path `/TiktokShuffle/` must stay in sync with the repo name.