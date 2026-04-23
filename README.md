# TikTok Shuffle

Shuffle and watch your TikTok saved videos in a clean, distraction-free player — no algorithm, no feed, just your bookmarks in random order.

## How it works

1. Request your TikTok data export at **Settings → Account → Download your data**
2. Extract the ZIP and locate the `user_data.json` file
3. Drop it into TikTok Shuffle
4. Watch your saved videos in a random order

Videos are embedded via the official TikTok player. Your data never leaves your browser.

## Features

- Shuffles your entire saved video list
- Skip forward/back through videos
- Auto-advance or loop mode when a video ends
- Keyboard navigation — `→` / `Space` to skip, `←` to go back
- Scroll wheel and swipe navigation
- Tap to pause/play on mobile
- Remembers your session so you can pick up where you left off
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

## Tech stack

- Vanilla JS (no framework)
- [Vite](https://vitejs.dev/) for bundling
- TikTok Embed Player API