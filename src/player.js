import { shuffle, extractVideoId } from './parser.js';
import { setScreen, showError } from './ui.js';

const SESSION_KEY = 'tiktok_shuffle_session';
const state = { deck: [], index: 0, total: 0 };

function saveSession() {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ deck: state.deck, index: state.index })); } catch {}
}

export function restoreSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return false;
    const { deck, index } = JSON.parse(saved);
    if (!Array.isArray(deck) || !deck.length) return false;
    state.deck = deck;
    state.total = deck.length;
    state.index = Math.min(index, deck.length - 1);
    setScreen('player');
    renderCard(state.index);
    return true;
  } catch { return false; }
}

let messageHandler = null;
let isPlaying = false;
let playMode = 'off'; // 'off' | 'advance' | 'loop'

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
    if (data.type === 'onPlayerError') {
      const code = data.value?.errorCode;
      if (code === 1001 || !('ontouchstart' in window)) {
        state.deck[state.index].unavailable = true;
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

export function initPlayer(rawList) {
  const valid = rawList
    .map(item => ({ ...item, videoId: extractVideoId(item.Link || item.link) }))
    .filter(item => item.videoId);

  const skipped = rawList.length - valid.length;

  state.deck = shuffle(valid);
  state.index = 0;
  state.total = state.deck.length;

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
}

export function next() {
  let target = state.index + 1;
  while (target < state.total && state.deck[target]?.unavailable) target++;
  if (target >= state.total) {
    document.getElementById('endTitle').textContent =
      `You've seen all ${state.total} video${state.total !== 1 ? 's' : ''}!`;
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
  setScreen('player');
  renderCard(0);
}

export function clearPlayer() {
  document.getElementById('tiktok-frame').src = 'about:blank';
  state.deck = [];
  state.index = 0;
  state.total = 0;
  localStorage.removeItem(SESSION_KEY);
}

function renderCard(index) {
  const item = state.deck[index];
  const frame = document.getElementById('tiktok-frame');
  isPlaying = false;
  listenForReady(frame);
  frame.src = `https://www.tiktok.com/player/v1/${item.videoId}?autoplay=1&muted=0&loop=0&progress_bar=1&fullscreen_button=0&rel=0`;
document.getElementById('counter').textContent = `${index + 1} / ${state.total}`;
  const rawDate = item.Date || item.date || '';
  document.getElementById('videoDate').textContent = rawDate ? `Saved: ${rawDate}` : '';
  saveSession();
}
