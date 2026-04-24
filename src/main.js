import './style.css';
import { parseBookmarks } from './parser.js';
import { setScreen, showError, clearError } from './ui.js';
import { initPlayer, next, previous, reshuffle, togglePlayback, setPlayMode, restoreSession, resumeSession, pauseVideo, getSessionSummary } from './player.js';

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
    initPlayer(raw, { demo: true });
  } catch {
    showError('Could not load the demo file.');
  }
}

function updateSessionBanner() {
  const summary = getSessionSummary();
  const banner = document.getElementById('sessionBanner');
  if (summary) {
    document.getElementById('sessionBannerStats').textContent = summary.text;
    document.getElementById('sessionProgressFill').style.width = summary.percent + '%';
    const btn = document.getElementById('btnResumeHome');
    if (summary.complete) {
      btn.textContent = 'Reshuffle videos';
      btn.onclick = () => reshuffle();
    } else {
      btn.textContent = 'Continue watching →';
      btn.onclick = resumeSession;
    }
    banner.classList.add('visible');
  } else {
    banner.classList.remove('visible');
  }
}

function goToHome() {
  pauseVideo();
  restoreSession();
  clearError();
  fileInput.value = '';
  updateSessionBanner();
  setScreen('upload');
}

// ── Restore from previous session ─────────────────────────────────────────────
restoreSession();

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
document.getElementById('btnCopyLink').addEventListener('click', () => {
  const url = document.getElementById('openInTiktok').href;
  const btn = document.getElementById('btnCopyLink');

  function onCopied() {
    btn.classList.add('copied');
    btn.textContent = '✓';
    setTimeout(() => { btn.classList.remove('copied'); btn.textContent = '⎘'; }, 1500);
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(onCopied).catch(() => fallbackCopy(url, onCopied));
  } else {
    fallbackCopy(url, onCopied);
  }
});

function fallbackCopy(text, onCopied) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); onCopied(); } catch {}
  document.body.removeChild(ta);
}

if ('ontouchstart' in window) {
  let openPending = false;
  let openTimer = null;
  const openLink = document.getElementById('openInTiktok');
  openLink.addEventListener('click', (e) => {
    if (!openPending) {
      e.preventDefault();
      openPending = true;
      openLink.textContent = 'Tap again to open ↗';
      openTimer = setTimeout(() => {
        openPending = false;
        openLink.textContent = 'Open in TikTok ↗';
      }, 2000);
    } else {
      clearTimeout(openTimer);
      openPending = false;
      openLink.textContent = 'Open in TikTok ↗';
    }
  });
}
document.getElementById('playModeGroup').addEventListener('click', (e) => {
  const btn = e.target.closest('.play-mode-btn');
  if (!btn) return;
  document.querySelectorAll('.play-mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  setPlayMode(btn.dataset.mode);
});
document.getElementById('btnLogo').addEventListener('click', goToHome);
document.getElementById('btnReshuffle').addEventListener('click', reshuffle);
document.getElementById('btnLoadNew2').addEventListener('click', goToHome);

updateSessionBanner();

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
    if (!e.target.closest('button, a, select')) togglePlayback();
  }
}, { passive: true });
