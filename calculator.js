// Данные игроков
let players = [
  { name: 'Игрок 1', chips: 1000 },
  { name: 'Игрок 2', chips: 1000 },
  { name: 'Игрок 3', chips: 1000 },
  { name: 'Игрок 4', chips: 1000 }
];
const playersList = document.getElementById('playersList');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const playersCountInput = document.getElementById('playersCount');
const startChipsInput = document.getElementById('startChips');
const startMoneyInput = document.getElementById('startMoney');
const computeBtnEl = document.getElementById('computeBtn');

function renderPlayers() {
  playersList.innerHTML = '';
  players.forEach((player, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.innerHTML = `
      <div class="player-avatar">${player.name[0] || '?'}</div>
      <input class="player-name" value="${player.name}" data-idx="${idx}" maxlength="20" placeholder="Имя игрока">
      <input class="player-chips" type="number" inputmode="numeric" min="0" value="${player.chips}" data-idx="${idx}">
      <button class="player-remove" title="Удалить" data-idx="${idx}">&times;</button>
    `;
    playersList.appendChild(card);
  });
}

// События для динамического списка игроков
playersList.addEventListener('input', e => {
  const idx = e.target.dataset.idx;
  if (e.target.classList.contains('player-name')) {
    players[idx].name = e.target.value;
    // Обновляем букву аватара без полной перерисовки и без потери фокуса
    const card = e.target.closest('.player-card');
    if (card) {
      const avatar = card.querySelector('.player-avatar');
      if (avatar) avatar.textContent = (e.target.value || '?').trim().charAt(0) || '?';
    }
    return;
  }
  if (e.target.classList.contains('player-chips')) {
    players[idx].chips = parseInt(e.target.value) || 0;
  }
});

playersList.addEventListener('click', e => {
  if (e.target.classList.contains('player-remove')) {
    const idx = e.target.dataset.idx;
    players.splice(idx, 1);
    renderPlayers();
    playersCountInput.value = players.length;
  }
});

// Добавить игрока
addPlayerBtn.onclick = () => {
  players.push({ name: `Игрок ${players.length+1}`, chips: parseInt(startChipsInput.value) || 1000 });
  renderPlayers();
  playersCountInput.value = players.length;
};

// Синхронизировать количество игроков
playersCountInput.oninput = () => {
  let n = parseInt(playersCountInput.value) || 1;
  if (n < 1) n = 1;
  if (n > 12) n = 12;
  playersCountInput.value = n;
  while (players.length < n) players.push({ name: `Игрок ${players.length+1}`, chips: parseInt(startChipsInput.value) || 1000 });
  while (players.length > n) players.pop();
  renderPlayers();
};

// Синхронизировать стартовые фишки
startChipsInput.oninput = () => {
  players.forEach(p => p.chips = parseInt(startChipsInput.value) || 0);
  renderPlayers();
};

// Первичный рендер
renderPlayers();

// Кнопка "Рассчитать"
computeBtnEl.onclick = () => {
  const startMoney = parseFloat(startMoneyInput.value || '0');
  const startChips = parseInt(startChipsInput.value || '0');
  if (!startMoney || !startChips) {
    alert('Заполните стартовый взнос и стартовые фишки.');
    return;
  }
  const totalStartChips = (players.length || 0) * startChips;
  const totalFinalChips = players.reduce((s, p) => s + (parseInt(p.chips) || 0), 0);
  if (totalStartChips !== totalFinalChips) {
    alert(`Сумма фишек (${totalFinalChips}) должна быть равна начальному количеству (${totalStartChips}).`);
    return;
  }
  const costPerChip = startMoney / startChips;
  const resultsEl = document.getElementById('results');
  resultsEl.style.display = 'block';
  const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
  const items = players.map(p => {
    const refund = Math.round((p.chips || 0) * costPerChip);
    const delta = refund - startMoney; // + получает, - платит
    return { name: p.name, refund, delta };
  });
  const totalRefund = items.reduce((s, i) => s + i.refund, 0);
  resultsEl.innerHTML = `
    <h2 class="section-title" style="margin:8px 0 8px; font-size:20px;">Итоговое распределение</h2>
    <div class="result-list">
      ${items.map(i => `
        <div class="result-row">
          <span>${i.name}</span>
          <div>
            <strong>${money.format(i.refund)}</strong>
            <span class="delta ${i.delta>0?'profit':i.delta<0?'loss':'neutral'}">
              ${i.delta>0?`+${money.format(i.delta)} получает`: i.delta<0?`${money.format(-i.delta)} платит` : money.format(0)}
            </span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="result-total" style="margin-top:8px; opacity:0.9;">Суммарный возврат: <strong>${money.format(totalRefund)}</strong></div>
    <div class="result-meta" style="margin-top:4px; font-size:13px; opacity:0.8;">Стоимость фишки: ${(costPerChip).toFixed(2)} ₽</div>
  `;
};

