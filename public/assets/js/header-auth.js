import { Auth } from './api.js';

function setLoggedOut() {
  const link = document.querySelector('.profile-link');
  const btnLogin = document.getElementById('openLogin');
  const btnRegister = document.getElementById('openRegister');
  if (link) link.style.display = 'none';
  if (btnLogin) btnLogin.style.display = '';
  if (btnRegister) btnRegister.style.display = '';
}

function setLoggedIn(me) {
  const link = document.querySelector('.profile-link');
  const btnLogin = document.getElementById('openLogin');
  const btnRegister = document.getElementById('openRegister');
  if (btnLogin) btnLogin.style.display = 'none';
  if (btnRegister) btnRegister.style.display = 'none';
  if (link) {
    link.style.display = 'flex';
    if (me?.avatarUrl) {
      link.innerHTML = `<img src="${me.avatarUrl}" alt="avatar" class="avatar-mini"/>`;
    } else {
      // оставить золотую иконку человека
      link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
    }
  }
}

(async function initHeaderAuth() {
  try {
    const me = await Auth.me();
    setLoggedIn(me);
  } catch {
    setLoggedOut();
  }
})();
