import { shuffle, extractVideoId } from './parser.js';
import { setScreen, showError } from './ui.js';
import { uploadFullSession, syncProgress, clearCloudSession } from './sync.js';

const SESSION_KEY = 'tiktok_shuffle_session';
const state = { deck: [], index: 0, total: 0, complete: false, demo: false, fingerprint: null };

function saveSession() {
  try {
    if (state.demo) {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        if (!parsed.demo) return;
      }
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      deck: state.deck,
      index: state.index,
      complete: state.complete,
      demo: state.demo,
      fingerprint: state.fingerprint,
    }));
    const unavailableIds = state.deck.filter(v => v.unavailable).map(v => v.videoId);
    syncProgress(state.index, state.complete, unavailableIds);
  } catch {}
}

export function restoreSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return false;
    const { deck, index, complete, demo, fingerprint } = JSON.parse(saved);
    if (!Array.isArray(deck) || !deck.length) return false;
    state.deck = deck;
    state.total = deck.length;
    state.index = Math.min(index, deck.length - 1);
    state.complete = complete || false;
    state.demo = demo || false;
    state.fingerprint = fingerprint || null;
    return true;
  } catch { return false; }
}

export function setSessionFromCloud(cloudSession) {
  const { deck, index, complete, demo, fingerprint, unavailableIds } = cloudSession;
  if (!Array.isArray(deck) || !deck.length) return false;
  const unavailableSet = new Set(unavailableIds || []);
  state.deck = deck.map(item => ({
    ...item,
    unavailable: unavailableSet.has(item.videoId) ? true : item.unavailable,
  }));
  state.total = state.deck.length;
  state.index = Math.min(index || 0, state.deck.length - 1);
  state.complete = complete || false;
  state.demo = demo || false;
  state.fingerprint = fingerprint || null;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      deck: state.deck,
      index: state.index,
      complete: state.complete,
      demo: state.demo,
      fingerprint: state.fingerprint,
    }));
  } catch {}
  return true;
}

export function getSessionFingerprint() { return state.fingerprint; }
export function getSessionIndex() { return state.index; }

export function isSessionDemo() { return state.demo; }

export function resumeSession() {
  setScreen('player');
  renderCard(state.index);
}

export function pauseVideo() {
  const frame = document.getElementById('tiktok-frame');
  frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'pause' }, 'https://www.tiktok.com');
  isPlaying = false;
}

export function getSessionSummary() {
  if (!state.deck.length) return null;
  const { total, seen, unavailable } = getStats();
  const remaining = total - seen;
  const percent = Math.round((seen / total) * 100);
  if (state.complete) return { text: `All ${total} videos watched`, percent: 100, complete: true };
  const parts = [`Video ${seen} of ${total}`];
  if (remaining > 0) parts.push(`${remaining} to go`);
  if (unavailable > 0) parts.push(`${unavailable} unavailable`);
  return { text: parts.join(' · '), percent, complete: false };
}

function getStats() {
  const unavailable = state.deck.filter(v => v.unavailable).length;
  return { total: state.total, seen: state.index + 1, unavailable };
}

function renderStats(elId) {
  const { total, seen, unavailable } = getStats();
  const el = document.getElementById(elId);
  const parts = [`${seen} of ${total} videos seen`];
  if (unavailable > 0) parts.push(`${unavailable} unavailable`);
  el.textContent = parts.join(' · ');
}

let messageHandler = null;
let isPlaying = false;
let playMode = 'loop'; // 'off' | 'advance' | 'loop'
let progressBarTimeout = null;

export function setPlayMode(mode) { playMode = mode; }

function listenForReady(frame) {
  if (messageHandler) window.removeEventListener('message', messageHandler);
  messageHandler = (e) => {
    if (e.origin !== 'https://www.tiktok.com') return;
    const data = e.data;
    if (!data?.['x-tiktok-player']) return;
    if (data.type === 'onPlayerReady') {
      frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'play' }, 'https://www.tiktok.com');
    }
    if (data.type === 'onStateChange') {
      isPlaying = data.value === 1;
      const bar = document.getElementById('videoProgressBar');
      clearTimeout(progressBarTimeout);
      if (isPlaying) {
        progressBarTimeout = setTimeout(() => bar.classList.add('playing'), 2500);
      } else {
        bar.classList.remove('playing');
      }
      if (isPlaying) {
        frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'unMute' }, 'https://www.tiktok.com');
      }
      if (data.value === 0) {
        if (playMode === 'advance') next();
        else if (playMode === 'loop') {
          frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'seekTo', value: 0 }, 'https://www.tiktok.com');
          frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'play' }, 'https://www.tiktok.com');
        }
      }
    }
    if (data.type === 'onCurrentTime') {
      const { currentTime, duration } = data.value || {};
      if (duration > 0) {
        document.getElementById('videoProgressBar').style.transform = `scaleX(${currentTime / duration})`;
      }
    }
    if (data.type === 'onPlayerError') {
      const code = data.value?.errorCode;
      if (code === 1001 || !('ontouchstart' in window)) {
        state.deck[state.index].unavailable = true;
        renderCounter();
        next();
      }
    }
  };
  window.addEventListener('message', messageHandler);
}

export function togglePlayback() {
  const frame = document.getElementById('tiktok-frame');
  if (isPlaying) {
    frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'pause' }, 'https://www.tiktok.com');
  } else {
    frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'play' }, 'https://www.tiktok.com');
    frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type: 'unMute' }, 'https://www.tiktok.com');
  }
}

export function initPlayer(rawList, { demo = false, fingerprint = null } = {}) {
  const valid = rawList
    .map(item => ({ ...item, videoId: extractVideoId(item.Link || item.link) }))
    .filter(item => item.videoId);

  const skipped = rawList.length - valid.length;

  state.deck = shuffle(valid);
  state.index = 0;
  state.total = state.deck.length;
  state.complete = false;
  state.demo = demo;
  state.fingerprint = fingerprint;

  if (!state.total) {
    showError('No valid video URLs found in the bookmarks list.');
    return;
  }

  const notice = document.getElementById('skipNotice');
  if (skipped > 0) {
    notice.textContent = `${skipped} bookmark${skipped > 1 ? 's' : ''} skipped (unrecognised URL format)`;
    notice.classList.add('visible');
  } else {
    notice.classList.remove('visible');
  }

  setScreen('player');
  renderCard(0);

  uploadFullSession({
    deck: state.deck,
    index: 0,
    complete: false,
    demo,
    fingerprint,
  });
}

export function next() {
  let target = state.index + 1;
  while (target < state.total && state.deck[target]?.unavailable) target++;
  if (target >= state.total) {
    document.getElementById('endTitle').textContent =
      `You've seen all ${state.total} video${state.total !== 1 ? 's' : ''}!`;
    renderStats('sessionStats');
    state.complete = true;
    saveSession();
    setScreen('end');
  } else {
    state.index = target;
    renderCard(state.index);
  }
}

export function previous() {
  let target = state.index - 1;
  while (target > 0 && state.deck[target]?.unavailable) target--;
  if (target >= 0 && !state.deck[target]?.unavailable) {
    state.index = target;
    renderCard(state.index);
  }
}

export function reshuffle() {
  state.deck = shuffle(state.deck);
  state.index = 0;
  state.complete = false;
  setScreen('player');
  renderCard(0);
  uploadFullSession({
    deck: state.deck,
    index: 0,
    complete: false,
    demo: state.demo,
    fingerprint: state.fingerprint,
  });
}

export function clearPlayer() {
  document.getElementById('tiktok-frame').src = 'about:blank';
  clearCloudSession();
  state.deck = [];
  state.index = 0;
  state.total = 0;
  state.complete = false;
  state.fingerprint = null;
  localStorage.removeItem(SESSION_KEY);
}

function renderCounter() {
  const { unavailable } = getStats();
  const parts = [`${state.index + 1} / ${state.total}`];
  if (unavailable > 0) parts.push(`${unavailable} unavailable`);
  document.getElementById('counter').textContent = parts.join(' · ');
}

function renderCard(index) {
  const item = state.deck[index];
  const frame = document.getElementById('tiktok-frame');
  isPlaying = false;
  clearTimeout(progressBarTimeout);
  const bar = document.getElementById('videoProgressBar');
  bar.classList.remove('playing');
  bar.style.transform = 'scaleX(0)';
  listenForReady(frame);
  frame.src = `https://www.tiktok.com/player/v1/${item.videoId}?autoplay=1&muted=0&loop=0&progress_bar=1&fullscreen_button=0&rel=0`;
  renderCounter();
  const rawDate = item.Date || item.date || '';
  document.getElementById('videoDate').textContent = rawDate ? `Saved: ${rawDate}` : '';
  const openLink = document.getElementById('openInTiktok');
  openLink.href = item.Link || item.link || '#';
  openLink.textContent = 'Open in TikTok ↗';
  saveSession();
}
