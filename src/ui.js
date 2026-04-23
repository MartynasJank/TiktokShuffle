export function setScreen(name) {
  document.body.setAttribute('data-screen', name);
}

export function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('visible');
}

export function clearError() {
  const el = document.getElementById('errorMsg');
  el.textContent = '';
  el.classList.remove('visible');
}
