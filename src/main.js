import './style.css';
import { parseBookmarks } from './parser.js';
import { setScreen, showError, clearError } from './ui.js';
import { initPlayer, next, previous, reshuffle, clearPlayer, togglePlayback, setPlayMode } from './player.js';

const STORAGE_KEY = 'tiktok_shuffle_list';

function saveList(raw) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(raw)); } catch {}
}

function clearSavedList() {
  localStorage.removeItem(STORAGE_KEY);
}

function readFile(file) {
  clearError();
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    let parsed;
    try { parsed = JSON.parse(e.target.result); }
    catch {
      showError('File is not valid JSON. Make sure you extract the ZIP and select the .json file inside.');
      return;
    }

    const raw = parseBookmarks(parsed);
    if (!raw.length) {
      showError('No bookmarks found. Make sure you selected the correct JSON file (e.g. user_data.json) and that you have saved videos on TikTok.');
      return;
    }

    saveList(raw);
    initPlayer(raw);
  };
  reader.readAsText(file);
}

async function loadDemo() {
  clearError();
  try {
    const res = await fetch('./demo.json');
    if (!res.ok) throw new Error();
    const parsed = await res.json();
    const raw = parseBookmarks(parsed);
    if (!raw.length) { showError('Demo file has no videos.'); return; }
    saveList(raw);
    initPlayer(raw);
  } catch {
    showError('Could not load the demo file.');
  }
}

function resetToUpload() {
  clearSavedList();
  clearPlayer();
  clearError();
  fileInput.value = '';
  setScreen('upload');
}

// ── Restore from previous session ─────────────────────────────────────────────
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const raw = JSON.parse(saved);
    if (Array.isArray(raw) && raw.length) initPlayer(raw);
  }
} catch {}

// ── DOM refs ──────────────────────────────────────────────────────────────────
const dropZone  = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

if ('ontouchstart' in window) {
  document.getElementById('tiktok-frame').removeAttribute('allowfullscreen');
}

// ── Upload events ─────────────────────────────────────────────────────────────
document.getElementById('btnDemo').addEventListener('click', loadDemo);
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => readFile(fileInput.files[0]));

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-active');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-active');
  readFile(e.dataTransfer.files[0]);
});

// ── Player / end events ───────────────────────────────────────────────────────
document.getElementById('btnSkip').addEventListener('click', next);
document.getElementById('playMode').addEventListener('change', (e) => {
  setPlayMode(e.target.value);
});
document.getElementById('btnLoadNew').addEventListener('click', resetToUpload);
document.getElementById('btnLogo').addEventListener('click', resetToUpload);
document.getElementById('btnReshuffle').addEventListener('click', reshuffle);
document.getElementById('btnLoadNew2').addEventListener('click', resetToUpload);

document.addEventListener('keydown', (e) => {
  if (document.body.getAttribute('data-screen') !== 'player') return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
    next();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    previous();
  }
});

let lastScroll = 0;
document.addEventListener('wheel', (e) => {
  if (document.body.getAttribute('data-screen') !== 'player') return;
  const now = Date.now();
  if (now - lastScroll < 600) return;
  lastScroll = now;
  if (e.deltaY > 0) next();
  else previous();
}, { passive: true });

let touchStartY = 0;
let touchStartX = 0;

document.addEventListener('touchstart', (e) => {
  if (document.body.getAttribute('data-screen') !== 'player') return;
  touchStartY = e.touches[0].clientY;
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (document.body.getAttribute('data-screen') !== 'player') return;
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (document.body.getAttribute('data-screen') !== 'player') return;
const deltaY = touchStartY - e.changedTouches[0].clientY;
  const deltaX = touchStartX - e.changedTouches[0].clientX;

  if (Math.abs(deltaY) > 60 && Math.abs(deltaY) > Math.abs(deltaX)) {
    if (deltaY > 0) next();
    else previous();
    return;
  }

  if (Math.abs(deltaY) < 10 && Math.abs(deltaX) < 10) {
    togglePlayback();
  }
}, { passive: true });
