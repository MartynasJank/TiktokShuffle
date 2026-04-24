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
- **`player.js`** — Holds the `state` object (deck array, current index, total). Controls playback via `postMessage` to the TikTok embed iframe. Implements three auto-advance modes: `'off'`, `'advance'` (go to next), `'loop'` (replay current).
- **`ui.js`** — Switches between the three screens (`upload`, `player`, `end`) via a `data-screen` attribute on `<body>`, and manages error display.

**Screen flow:**
```
upload → (parse JSON, shuffle, validate IDs) → player → (all videos seen) → end
                                                  ↑ reshuffle ←──────────────┘
```

**TikTok embed integration:**
- The iframe src points to `/tiktok-embed/<videoId>` in dev, which is intercepted by a custom Vite plugin in `vite.config.js`. The plugin proxies requests to TikTok's player API, sets correct `User-Agent`/`Referer` headers, and injects dark-theme CSS.
- In production (GitHub Pages), the base path is `/TiktokShuffle/` and the embed URLs resolve to TikTok directly.
- Player state (play/pause, video-ended events) is received via `window.addEventListener('message', ...)` cross-origin postMessage from the TikTok embed.

**Session persistence:** The shuffled video list is stored in `localStorage` under `tiktok_shuffle_list` so a page reload resumes where the user left off.

**Deployment:** GitHub Pages via `.github/workflows/deploy.yml` — pushes to `master` trigger a Vite build and deploy. The Vite base path `/TiktokShuffle/` must stay in sync with the repo name.
