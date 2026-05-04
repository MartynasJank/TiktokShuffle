# TikTok Shuffle

Watch your saved TikTok videos in a different way. Shuffled, clean, and distraction-free. No algorithm and no endless feed. Just your bookmarks in random order.

## How it works

1. Go to **Settings → Account → Download your data** on TikTok
2. Request your data in **JSON format**
3. Wait for the email, download it, and unzip it
4. Drop `user_data.json` into TikTok Shuffle
5. Start watching your saved videos in a random order

Sign in with Google to sync your progress across devices. Your video list is stored on your own server — no third parties involved.

## Features

- Shuffles your saved TikTok videos
- Navigate forward and backward between videos
- Playback modes:
    - Off (manual control)
    - Scroll (auto-advance when a video ends)
    - Loop
- Keyboard controls:
    - `→` / `Space` to skip forward
    - `←` to go back
- Scroll wheel and swipe support on mobile
- Tap to pause or play on mobile
- Open in TikTok button for quick access in the app
- Automatically skips deleted or unavailable videos
- Saves shuffle order and position across refreshes so you can leave and come back where you left off
- Optional Google sign-in to sync progress across devices
- Detects if you upload the same file twice and offers to resume instead of resetting
- Simple session stats including videos watched, skipped, and unavailable
- Works on desktop and mobile

## Getting started

```bash
npm install
npm run dev        # frontend at http://localhost:5173
```

To also run the backend (required for Google sign-in):

```bash
cp server/.env.example server/.env   # fill in credentials
node server/index.js                 # API at http://localhost:3001
```

## Build & deploy

```bash
npm run build          # builds frontend → dist/
node server/index.js   # serves dist/ + API on PORT (default 3001)
```

Point nginx at port 3001 and the app is fully self-hosted.

## Backend setup

The backend requires:
- Node.js
- MySQL database — run `server/schema.sql` once to create the tables
- A Google OAuth 2.0 Client ID ([Google Cloud Console](https://console.cloud.google.com)) with the callback URL `https://yourdomain.com/api/auth/google/callback`

Copy `server/.env.example` to `server/.env` and fill in all values before starting.

## Roadmap

The goal is to gradually turn this into something that feels close to a native app.

### Experience improvements

- Smoother swipe transitions between videos on mobile and desktop
- Natural swipe animations where the current video slides out and the next slides in
- Swipe left to open the current video in TikTok instead of using a button
- Progress bar showing how far you are through your saved list
- Persist playback mode between sessions
- Add PWA support so it can be installed like an app

### Video management

- Track unavailable or deleted videos across sessions
- Server-side cache of broken video IDs so they are skipped immediately on any device
- Filter videos by saved date such as recent or custom ranges

### Going native

- Wrap the PWA using Capacitor
- Publish to App Store (iOS) and Google Play (Android)

## Tech stack

- Vanilla JavaScript (no framework)
- Vite for bundling
- TikTok Embed Player API
- Express + Passport.js (backend)
- MySQL (session storage)
- Google OAuth 2.0