const STORAGE_KEYS = {
  points: 'user_points',
  bets: 'user_bets',
  profile: 'user_profile',
  odds: 'odds_snapshots'
};

const demoMatches = [
  { id: 'wc2026-001', date: '2026-06-11', time: '20:00', home: 'Mexico', away: 'South Africa', group: 'Group A', venue: 'Estadio Azteca' },
  { id: 'wc2026-002', date: '2026-06-12', time: '18:00', home: 'Canada', away: 'Japan', group: 'Group B', venue: 'BMO Field' },
  { id: 'wc2026-003', date: '2026-06-13', time: '21:00', home: 'United States', away: 'Germany', group: 'Group C', venue: 'MetLife Stadium' },
  { id: 'wc2026-final', date: '2026-07-19', time: '19:00', home: 'TBD Finalist 1', away: 'TBD Finalist 2', group: 'Final', venue: 'MetLife Stadium' }
];

const baseOdds = {
  'wc2026-001': { HOME: 1.86, DRAW: 3.35, AWAY: 4.20 },
  'wc2026-002': { HOME: 2.18, DRAW: 3.10, AWAY: 3.05 },
  'wc2026-003': { HOME: 2.45, DRAW: 3.40, AWAY: 2.62 },
  'wc2026-final': { HOME: 2.05, DRAW: 3.25, AWAY: 3.45 }
};

let currentPoints = Number.parseInt(localStorage.getItem(STORAGE_KEYS.points), 10) || 100;
let selectedMatchId = demoMatches[0].id;

function moneylineLabel(selection) {
  return { HOME: '主胜', DRAW: '平局', AWAY: '客胜' }[selection] || selection;
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function updatePoints(nextPoints = currentPoints) {
  currentPoints = nextPoints;
  localStorage.setItem(STORAGE_KEYS.points, String(currentPoints));
  document.getElementById('user-points').innerText = currentPoints;
}

function getCurrentOdds(matchId) {
  const snapshots = readJson(STORAGE_KEYS.odds, {});
  if (snapshots[matchId]) return snapshots[matchId];

  const seed = baseOdds[matchId] || { HOME: 2, DRAW: 3.2, AWAY: 3.4 };
  const drift = (Date.now() % 7) / 100;
  const odds = {
    HOME: Number((seed.HOME + drift).toFixed(2)),
    DRAW: Number((seed.DRAW + drift / 2).toFixed(2)),
    AWAY: Number((seed.AWAY - drift / 2).toFixed(2)),
    updatedAt: new Date().toISOString(),
    source: 'demo-aggregator'
  };
  snapshots[matchId] = odds;
  writeJson(STORAGE_KEYS.odds, snapshots);
  return odds;
}

function renderMatchSelect() {
  const select = document.getElementById('match-select');
  select.innerHTML = demoMatches.map(match => `<option value="${match.id}">${match.date} ${match.home} vs ${match.away}</option>`).join('');
  select.value = selectedMatchId;
}

function renderSelectedMatch() {
  const match = demoMatches.find(item => item.id === selectedMatchId);
  const container = document.getElementById('selected-match-card');
  container.innerHTML = `
    <div class="match-title">${match.home} vs ${match.away}</div>
    <div class="small text-secondary">${match.group} · ${match.date} ${match.time} · ${match.venue}</div>
  `;
}

function renderOdds() {
  const odds = getCurrentOdds(selectedMatchId);
  const container = document.getElementById('odds-panel');
  container.innerHTML = ['HOME', 'DRAW', 'AWAY'].map(selection => `
    <button class="odds-button" data-selection="${selection}">
      <span>${moneylineLabel(selection)}</span>
      <strong>${odds[selection].toFixed(2)}</strong>
    </button>
  `).join('');
}

function placeBet(selection) {
  const stakeInput = document.getElementById('stake-input');
  const stake = Number.parseInt(stakeInput.value, 10);
  if (!Number.isFinite(stake) || stake <= 0) {
    alert('请输入有效投注积分。');
    return;
  }
  if (currentPoints < stake) {
    alert('积分不足，请先充值。');
    return;
  }

  const match = demoMatches.find(item => item.id === selectedMatchId);
  const odds = getCurrentOdds(selectedMatchId);
  const bet = {
    id: `bet-${Date.now()}`,
    matchId: match.id,
    matchLabel: `${match.home} vs ${match.away}`,
    matchDate: match.date,
    selection,
    selectionLabel: moneylineLabel(selection),
    stake,
    odds: odds[selection],
    potentialReturn: Number((stake * odds[selection]).toFixed(2)),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const bets = readJson(STORAGE_KEYS.bets, []);
  bets.unshift(bet);
  writeJson(STORAGE_KEYS.bets, bets);
  updatePoints(currentPoints - stake);
  renderMyBets();
  renderBettingPool();
  alert(`投注成功：${bet.matchLabel} · ${bet.selectionLabel} @ ${bet.odds}`);
}

function renderMyBets() {
  const bets = readJson(STORAGE_KEYS.bets, []);
  const container = document.getElementById('my-bets-list');
  if (!bets.length) {
    container.innerHTML = '<div class="empty-state">暂无投注记录。选择比赛和赔率后即可保存到这里。</div>';
    return;
  }
  container.innerHTML = bets.map(bet => `
    <article class="bet-row">
      <div><strong>${bet.matchLabel}</strong><div class="small text-secondary">${bet.matchDate} · ${new Date(bet.createdAt).toLocaleString()}</div></div>
      <div>${bet.selectionLabel}</div>
      <div>${bet.stake} PTS</div>
      <div>@ ${Number(bet.odds).toFixed(2)}</div>
      <div class="text-warning">预计返还 ${bet.potentialReturn}</div>
      <span class="badge text-bg-secondary">${bet.status}</span>
    </article>
  `).join('');
}

function renderBettingPool() {
  const bets = readJson(STORAGE_KEYS.bets, []);
  const container = document.getElementById('betting-pool');
  const rows = demoMatches.map(match => {
    const matchBets = bets.filter(bet => bet.matchId === match.id);
    const total = matchBets.reduce((sum, bet) => sum + bet.stake, 0);
    const bySelection = ['HOME', 'DRAW', 'AWAY'].map(selection => {
      const amount = matchBets.filter(bet => bet.selection === selection).reduce((sum, bet) => sum + bet.stake, 0);
      const pct = total ? Math.round((amount / total) * 100) : 0;
      return `<div class="pool-option"><span>${moneylineLabel(selection)}</span><div class="progress"><div class="progress-bar bg-warning" style="width:${pct}%"></div></div><small>${amount} PTS · ${pct}%</small></div>`;
    }).join('');
    return `<article class="pool-card"><div class="d-flex justify-content-between"><strong>${match.home} vs ${match.away}</strong><span>${total} PTS</span></div><div class="small text-secondary mb-2">${match.date} · ${match.group}</div>${bySelection}</article>`;
  });
  container.innerHTML = rows.join('');
}

function renderSearchResults(query) {
  const shell = document.getElementById('search-results');
  const list = document.getElementById('search-results-list');
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    shell.classList.add('d-none');
    return;
  }
  const matches = demoMatches.filter(match => [match.home, match.away, match.date, match.group, match.venue].some(value => value.toLowerCase().includes(normalized)));
  shell.classList.remove('d-none');
  list.innerHTML = matches.length ? matches.map(match => `
    <button class="result-card" data-match-id="${match.id}">
      <strong>${match.home} vs ${match.away}</strong>
      <span>${match.date} ${match.time} · ${match.group}</span>
    </button>
  `).join('') : '<div class="empty-state">没有找到相关球队或比赛。</div>';
}

function showRoute(route) {
  document.querySelectorAll('.route-page').forEach(page => page.classList.toggle('d-none', page.dataset.page !== route));
  document.querySelectorAll('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === route));
}

function redeemCard() {
  const codeInput = document.getElementById('card-code');
  const code = codeInput.value.trim();
  if (!code) {
    alert('请输入卡密。');
    return;
  }
  if (!/^DEMO-\d{4}$/i.test(code)) {
    alert('演示环境仅接受 DEMO-2026 格式卡密；生产环境请接入服务端卡密校验。');
    return;
  }
  updatePoints(currentPoints + 100);
  codeInput.value = '';
  alert('演示卡密兑换成功：+100 PTS。');
}

function saveProfile() {
  const profile = {
    name: document.getElementById('auth-name').value.trim() || 'Demo User',
    email: document.getElementById('auth-email').value.trim(),
    savedAt: new Date().toISOString()
  };
  writeJson(STORAGE_KEYS.profile, profile);
  document.getElementById('auth-button').innerText = profile.name;
}

function boot() {
  updatePoints(currentPoints);
  const profile = readJson(STORAGE_KEYS.profile, null);
  if (profile?.name) document.getElementById('auth-button').innerText = profile.name;
  renderMatchSelect();
  renderSelectedMatch();
  renderOdds();
  renderMyBets();
  renderBettingPool();

  document.getElementById('match-select').addEventListener('change', event => {
    selectedMatchId = event.target.value;
    renderSelectedMatch();
    renderOdds();
  });
  document.getElementById('odds-panel').addEventListener('click', event => {
    const button = event.target.closest('[data-selection]');
    if (button) placeBet(button.dataset.selection);
  });
  document.getElementById('site-search').addEventListener('input', event => renderSearchResults(event.target.value));
  document.getElementById('search-results-list').addEventListener('click', event => {
    const card = event.target.closest('[data-match-id]');
    if (!card) return;
    selectedMatchId = card.dataset.matchId;
    document.getElementById('match-select').value = selectedMatchId;
    renderSelectedMatch();
    renderOdds();
    showRoute('home');
  });
  document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    showRoute(link.dataset.route);
  }));
  document.getElementById('redeem-card').addEventListener('click', redeemCard);
  document.getElementById('refresh-pool').addEventListener('click', renderBettingPool);
  document.getElementById('clear-bets').addEventListener('click', () => {
    if (confirm('确定清空本地投注记录？')) {
      writeJson(STORAGE_KEYS.bets, []);
      renderMyBets();
      renderBettingPool();
    }
  });
  document.getElementById('save-profile').addEventListener('click', saveProfile);
}

document.addEventListener('DOMContentLoaded', boot);
