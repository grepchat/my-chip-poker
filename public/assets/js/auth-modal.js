import { Auth } from './api.js';

function ensureModal() {
  if (document.getElementById('authModal')) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
  <div id="authModal" class="modal-overlay" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="modal-header">
        <div id="authTitle" class="modal-title">Аккаунт PMC</div>
        <button class="modal-close" id="closeAuth">Закрыть</button>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <div class="auth-tab active" data-tab="login">Вход</div>
          <div class="auth-tab" data-tab="register">Регистрация</div>
        </div>
        <div id="authLogin" class="auth-form">
          <input id="loginEmail" class="input" placeholder="Email"/>
          <input id="loginPassword" type="password" class="input" placeholder="Пароль"/>
          <div class="auth-actions">
            <button class="auth-btn primary" id="loginBtn">Войти</button>
            <button class="auth-btn secondary" id="toRegister">Создать</button>
          </div>
        </div>
        <div id="authRegister" class="auth-form" style="display:none;">
          <input id="regEmail" class="input" placeholder="Email"/>
          <input id="regPassword" type="password" class="input" placeholder="Пароль"/>
          <input id="regHandle" class="input" placeholder="Ник (handle)"/>
          <input id="regName" class="input" placeholder="Отображаемое имя"/>
          <div class="auth-actions">
            <button class="auth-btn secondary" id="toLogin">Назад</button>
            <button class="auth-btn primary" id="registerBtn">Создать аккаунт</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrapper.firstElementChild);
}

function bindAuthModal() {
  ensureModal();
  const modal = document.getElementById('authModal');
  const closeBtn = document.getElementById('closeAuth');
  const tabLogin = document.querySelector('.auth-tab[data-tab="login"]');
  const tabRegister = document.querySelector('.auth-tab[data-tab="register"]');
  const formLogin = document.getElementById('authLogin');
  const formRegister = document.getElementById('authRegister');

  function openModal() { modal.style.display = 'flex'; modal.setAttribute('aria-hidden','false'); }
  function closeModal() { modal.style.display = 'none'; modal.setAttribute('aria-hidden','true'); }
  function setTab(which) {
    if (which === 'login') {
      tabLogin.classList.add('active'); tabRegister.classList.remove('active');
      formLogin.style.display=''; formRegister.style.display='none';
    } else {
      tabRegister.classList.add('active'); tabLogin.classList.remove('active');
      formRegister.style.display=''; formLogin.style.display='none';
    }
  }

  document.getElementById('openAuth')?.addEventListener('click', openModal);
  document.getElementById('openLogin')?.addEventListener('click', () => { setTab('login'); openModal(); });
  document.getElementById('openRegister')?.addEventListener('click', () => { setTab('register'); openModal(); });
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  tabLogin?.addEventListener('click', () => setTab('login'));
  tabRegister?.addEventListener('click', () => setTab('register'));
  document.getElementById('toRegister')?.addEventListener('click', () => setTab('register'));
  document.getElementById('toLogin')?.addEventListener('click', () => setTab('login'));

  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    await Auth.login(
      (document.getElementById('loginEmail').value || '').trim(),
      (document.getElementById('loginPassword').value || '').trim()
    );
    closeModal();
    location.href = 'profile.html';
  });
  document.getElementById('registerBtn')?.addEventListener('click', async () => {
    await Auth.register(
      (document.getElementById('regEmail').value || '').trim(),
      (document.getElementById('regPassword').value || '').trim(),
      (document.getElementById('regHandle').value || '').trim(),
      (document.getElementById('regName').value || '').trim(),
    );
    closeModal();
    location.href = 'profile.html';
  });
}

bindAuthModal();
