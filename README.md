# TikTok Shuffle

Shuffle and watch your TikTok saved videos in a clean, distraction-free player — no algorithm, no feed, just your bookmarks in random order.

## How it works

1. Request your TikTok data export at **Settings → Account → Download your data**
2. Select **JSON** format, wait for the email, download and unzip
3. Drop `user_data.json` into TikTok Shuffle
4. Watch your saved videos in a random order

Videos are embedded via the official TikTok player. Your data never leaves your browser.

## Features

- Shuffles your entire saved video list
- Skip forward/back through videos
- Playback modes: **Off**, **Scroll** (auto-advance when video ends), **Loop**
- Keyboard navigation — `→` / `Space` to skip, `←` to go back
- Scroll wheel and swipe navigation
- Tap to pause/play on mobile
- **Open in TikTok** link to open the current video in the app
- Unavailable or deleted videos are automatically skipped in both directions
- Remembers your shuffle order and exact position across page refreshes
- Works on desktop and mobile

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`.


## Roadmap

The goal is to progressively improve the web app until it's good enough to wrap as a native mobile app.

**Feel**
- Slide transition between videos on both mobile and desktop
- Swipe animation on mobile — video slides out in the direction of the swipe, next one slides in
- Swipe left to open the current video in TikTok — more natural than tapping a small link
- Visual progress bar showing how far through the deck you are
- Session stats on the end screen — videos watched, skipped, and unavailable
- "Done for today" button — save your position intentionally without having to reach the end screen
- Remember last playback mode across sessions
- PWA support — installable from the browser with its own icon, fullscreen, no browser chrome

**Video management**
- Remember unavailable video IDs across sessions and devices — store confirmed broken/deleted video IDs server-side so they are skipped instantly on any device without waiting for a player error
- Filter by date saved — watch only recently saved or a specific time range

**Going native**
- Package the PWA as a native app using Capacitor
- Release on App Store (iOS) and Google Play (Android)

## Tech stack

- Vanilla JS (no framework)
- [Vite](https://vitejs.dev/) for bundling
- TikTok Embed Player API
