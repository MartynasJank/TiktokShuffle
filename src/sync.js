import { isSignedIn } from './auth.js';

export async function uploadFullSession(session) {
  if (!isSignedIn()) return;
  try {
    await fetch('/api/session', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
  } catch {}
}

export async function syncProgress(index, complete, unavailableIds) {
  if (!isSignedIn()) return;
  try {
    await fetch('/api/session', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, complete, unavailableIds }),
    });
    flashSyncIndicator();
  } catch {}
}

export async function loadSessionFromCloud() {
  if (!isSignedIn()) return null;
  try {
    const res = await fetch('/api/session', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function clearCloudSession() {
  if (!isSignedIn()) return;
  try {
    await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' });
  } catch {}
}

function flashSyncIndicator() {
  const el = document.getElementById('syncIndicator');
  if (!el) return;
  el.classList.remove('syncing');
  void el.offsetWidth;
  el.classList.add('syncing');
}
