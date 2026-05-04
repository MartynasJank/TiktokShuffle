let _user = null;
let _checked = false;

export async function fetchUser() {
  if (_checked) return _user;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    _user = res.ok ? await res.json() : null;
  } catch {
    _user = null;
  }
  _checked = true;
  return _user;
}

export function getCachedUser() { return _user; }
export function isSignedIn() { return _user !== null; }
export function signIn() { window.location.href = '/api/auth/google'; }

export async function signOut() {
  try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
  window.location.reload();
}
