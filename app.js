const STORAGE_KEYS = {
  token: 'fifa2026_api_token'
};

const API_BASE = '';
const STARTING_POINTS = 500;

const demoMatches = [
  { id: 'wc2026-001', date: '2026-06-11', time: '20:00', home: 'Mexico', away: 'South Africa', group: 'Group A', venue: 'Estadio Azteca', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-002', date: '2026-06-12', time: '18:00', home: 'Canada', away: 'Japan', group: 'Group B', venue: 'BMO Field', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-003', date: '2026-06-13', time: '21:00', home: 'United States', away: 'Germany', group: 'Group C', venue: 'MetLife Stadium', status: 'live', score: '1 - 1' },
  { id: 'wc2026-004', date: '2026-06-14', time: '17:00', home: 'Brazil', away: 'Morocco', group: 'Group D', venue: 'SoFi Stadium', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-005', date: '2026-06-15', time: '19:30', home: 'Argentina', away: 'Spain', group: 'Group E', venue: 'AT&T Stadium', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-final', date: '2026-07-19', time: '19:00', home: 'TBD Finalist 1', away: 'TBD Finalist 2', group: 'Final', venue: 'MetLife Stadium', status: 'future', score: '0 - 0' }
];

const teams = [
  ['Mexico', 'A', 84, 'S. Giménez'],
  ['South Africa', 'A', 72, 'P. Tau'],
  ['Canada', 'B', 79, 'A. Davies'],
  ['Japan', 'B', 82, 'K. Mitoma'],
  ['United States', 'C', 81, 'C. Pulisic'],
  ['Germany', 'C', 88, 'J. Musiala'],
  ['Brazil', 'D', 91, 'Vinícius Jr.'],
  ['Morocco', 'D', 83, 'A. Hakimi'],
  ['Argentina', 'E', 90, 'L. Messi'],
  ['Spain', 'E', 89, 'Pedri']
];

const baseOdds = {
  'wc2026-001': { HOME: 1.86, DRAW: 3.35, AWAY: 4.20 },
  'wc2026-002': { HOME: 2.18, DRAW: 3.10, AWAY: 3.05 },
  'wc2026-003': { HOME: 2.45, DRAW: 3.40, AWAY: 2.62 },
  'wc2026-004': { HOME: 1.72, DRAW: 3.85, AWAY: 5.20 },
  'wc2026-005': { HOME: 2.55, DRAW: 3.25, AWAY: 2.70 },
  'wc2026-final': { HOME: 2.05, DRAW: 3.25, AWAY: 3.45 }
};

let currentUser = null;
let selectedMatchId = demoMatches[0].id;

const $ = id => document.getElementById(id);

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || '服务器请求失败。');
  return payload;
}

function saveToken(token) {
  localStorage.setItem(STORAGE_KEYS.token, token);
}

function clearToken() {
  localStorage.removeItem(STORAGE_KEYS.token);
}

function moneylineLabel(selection) {
  return { HOME: '主胜', DRAW: '平局', AWAY: '客胜' }[selection] || selection;
}


function requireLogin(actionText = '请先注册或登录后再继续。') {
  if (currentUser) return true;
  showAuthMessage(actionText, 'error');
  openAuthModal('register');
  return false;
}

function openAuthModal(tab = 'register') {
  const tabButton = tab === 'login' ? $('login-tab') : $('register-tab');
  bootstrap.Tab.getOrCreateInstance(tabButton).show();
  bootstrap.Modal.getOrCreateInstance($('authModal')).show();
}

function showAuthMessage(message, type = 'success') {
  const messageBox = $('auth-message');
  messageBox.textContent = message;
  messageBox.className = `auth-message ${type}`;
  messageBox.classList.remove('d-none');
}

function hideAuthMessage() {
  $('auth-message').classList.add('d-none');
}

function updateUserChrome() {
  const loggedIn = Boolean(currentUser);
  $('guest-gate').classList.toggle('d-none', loggedIn);
  $('logout-button').classList.toggle('d-none', !loggedIn);
  $('auth-button').classList.toggle('d-none', loggedIn);
  $('sidebar-user-name').textContent = loggedIn ? currentUser.name : '游客模式';
  $('sidebar-user-email').textContent = loggedIn ? currentUser.email : '注册后可开始投注';
  $('user-points').textContent = loggedIn ? currentUser.points : 0;
}

async function registerUser(event) {
  event.preventDefault();
  hideAuthMessage();

  try {
    const payload = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('register-name').value.trim(),
        email: $('register-email').value.trim(),
        password: $('register-password').value,
        ageConfirmed: $('register-age').checked
      })
    });
    currentUser = payload.user;
    saveToken(payload.token);
    updateUserChrome();
    await renderAllDynamic();
    showAuthMessage(`注册成功！已发放 ${STARTING_POINTS} PTS。`, 'success');
    setTimeout(() => bootstrap.Modal.getInstance($('authModal'))?.hide(), 650);
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
}

async function loginUser(event) {
  event.preventDefault();
  hideAuthMessage();

  try {
    const payload = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('login-email').value.trim(), password: $('login-password').value })
    });
    currentUser = payload.user;
    saveToken(payload.token);
    updateUserChrome();
    await renderAllDynamic();
    showAuthMessage(`欢迎回来，${currentUser.name}！`, 'success');
    setTimeout(() => bootstrap.Modal.getInstance($('authModal'))?.hide(), 650);
  } catch (error) {
    showAuthMessage(error.message, 'error');
  }
}

async function logoutUser() {
  try { await apiRequest('/api/auth/logout', { method: 'POST' }); } catch {}
  currentUser = null;
  clearToken();
  updateUserChrome();
  await renderAllDynamic();
}

async function restoreSession() {
  try {
    const payload = await apiRequest('/api/auth/me');
    currentUser = payload.user;
  } catch {
    currentUser = null;
    clearToken();
  }
  updateUserChrome();
}

function getCurrentOdds(matchId) {
  const seed = baseOdds[matchId] || { HOME: 2, DRAW: 3.2, AWAY: 3.4 };
  const wave = ((Date.now() / 20000) % 1 - 0.5) / 8;
  return {
    HOME: Number((seed.HOME + wave).toFixed(2)),
    DRAW: Number((seed.DRAW - wave / 2).toFixed(2)),
    AWAY: Number((seed.AWAY - wave).toFixed(2)),
    updatedAt: new Date().toISOString()
  };
}

function prediction(match) {
  const odds = getCurrentOdds(match.id);
  const inverse = { HOME: 1 / odds.HOME, DRAW: 1 / odds.DRAW, AWAY: 1 / odds.AWAY };
  const total = inverse.HOME + inverse.DRAW + inverse.AWAY;
  return {
    HOME: Math.round((inverse.HOME / total) * 100),
    DRAW: Math.round((inverse.DRAW / total) * 100),
    AWAY: Math.round((inverse.AWAY / total) * 100)
  };
}

function renderMatchSelect() {
  $('match-select').innerHTML = demoMatches.map(match => `<option value="${match.id}">${match.date} ${match.home} vs ${match.away}</option>`).join('');
  $('match-select').value = selectedMatchId;
}

function renderSelectedMatch() {
  const match = demoMatches.find(item => item.id === selectedMatchId);
  $('selected-match-card').innerHTML = `<div class="team-name">${match.home} vs ${match.away}</div><div class="small text-secondary">${match.group} · ${match.date} ${match.time} · ${match.venue}</div>`;
  $('hero-match-title').textContent = `${match.home} vs ${match.away}`;
  $('hero-match-meta').textContent = `${match.group} · ${match.date} ${match.time} · ${match.venue}`;
  [$('hero-home-score').textContent, $('hero-away-score').textContent] = match.score.split(' - ');
}

function oddsButtons(matchId, className = 'odds-button') {
  const odds = getCurrentOdds(matchId);
  return ['HOME', 'DRAW', 'AWAY'].map(selection => `
    <button class="${className}" data-selection="${selection}" data-match-id="${matchId}">
      <span>${moneylineLabel(selection)}</span>
      <strong>${odds[selection].toFixed(2)}</strong>
    </button>
  `).join('');
}

function renderOdds() {
  $('odds-panel').innerHTML = oddsButtons(selectedMatchId);
  $('hero-odds').innerHTML = oddsButtons(selectedMatchId, 'quick-odd');
}

function renderMatches() {
  const html = demoMatches.map(match => `
    <article class="match-card">
      <div><div class="team-name">${match.home}</div><small>${match.venue}</small></div>
      <div class="score-pill">${match.score}</div>
      <div><div class="team-name">${match.away}</div><small>${match.group} · ${match.date} ${match.time}</small></div>
      <button class="btn btn-sm btn-outline-warning pick-match" data-match-id="${match.id}">${match.status === 'live' ? '进入直播' : '投注'}</button>
    </article>
  `).join('');

  $('featured-matches').innerHTML = html;
  $('schedule-list').innerHTML = html;
  $('today-count').textContent = demoMatches.filter(match => match.date <= '2026-06-18').length;
}

function renderTeams() {
  $('teams-grid').innerHTML = teams.map(team => `
    <article class="team-card">
      <small>Group ${team[1]}</small>
      <strong>${team[0]}</strong>
      <p class="mb-2 text-secondary">核心球员：${team[3]}</p>
      <div class="meter"><span style="width:${team[2]}%"></span></div>
      <small>综合实力 ${team[2]}</small>
    </article>
  `).join('');
}

function renderStandings() {
  const groups = ['A', 'B', 'C', 'D', 'E'];
  $('standings-content').innerHTML = groups.map(group => `
    <article class="standing-card">
      <strong>Group ${group}</strong>
      <div class="standing-row text-secondary"><span>Team</span><b>场</b><b>胜</b><b>平</b><b>负</b><b>分</b></div>
      ${teams.filter(team => team[1] === group).map((team, index) => `
        <div class="standing-row"><span>${team[0]}</span><b>${index + 1}</b><b>${index ? 0 : 1}</b><b>${index ? 1 : 0}</b><b>0</b><b>${index ? 1 : 3}</b></div>
      `).join('')}
    </article>
  `).join('');
}

function renderPrediction() {
  let best = '--';
  let bestPct = 0;

  $('prediction-board').innerHTML = demoMatches.map(match => {
    const probabilities = prediction(match);
    const top = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0];
    if (top[1] > bestPct) {
      bestPct = top[1];
      best = `${match.home} ${moneylineLabel(top[0])} ${top[1]}%`;
    }

    return `
      <article class="prediction-card">
        <strong>${match.home} vs ${match.away}</strong>
        ${['HOME', 'DRAW', 'AWAY'].map(selection => `
          <div class="prob-row"><span>${moneylineLabel(selection)}</span><div class="meter"><span style="width:${probabilities[selection]}%"></span></div><b>${probabilities[selection]}%</b></div>
        `).join('')}
        <small class="text-warning">推荐：${moneylineLabel(top[0])}</small>
      </article>
    `;
  }).join('');

  $('top-pick').textContent = best;
}

async function placeBet(selection, matchId = selectedMatchId) {
  if (!requireLogin('请先注册/登录，领取模拟积分后即可投注。')) return;

  const stake = Number.parseInt($('stake-input').value, 10);
  if (!Number.isFinite(stake) || stake <= 0) return alert('请输入有效投注积分。');
  if (currentUser.points < stake) return alert('积分不足，请先充值。');

  const match = demoMatches.find(item => item.id === matchId);
  const odds = getCurrentOdds(matchId);
  const betPayload = {
    matchId: match.id,
    matchLabel: `${match.home} vs ${match.away}`,
    matchDate: match.date,
    selection,
    selectionLabel: moneylineLabel(selection),
    stake,
    odds: odds[selection],
    potentialReturn: Number((stake * odds[selection]).toFixed(2))
  };

  try {
    const payload = await apiRequest('/api/bets', { method: 'POST', body: JSON.stringify(betPayload) });
    currentUser = payload.user;
    updateUserChrome();
    await renderAllDynamic();
    alert(`投注成功：${betPayload.matchLabel} · ${betPayload.selectionLabel} @ ${betPayload.odds}`);
  } catch (error) {
    alert(error.message);
  }
}

async function renderMyBets() {
  const container = $('my-bets-list');
  if (!currentUser) {
    container.innerHTML = '<div class="empty-state">暂无投注记录。注册登录后，选择比赛和赔率即可保存到这里。</div>';
    return;
  }

  try {
    const { bets } = await apiRequest('/api/bets/me');
    container.innerHTML = bets.length ? bets.map(bet => `
      <article class="bet-row">
        <div><strong>${bet.matchLabel}</strong><div class="small text-secondary">${bet.matchDate} · ${new Date(bet.createdAt).toLocaleString()}</div></div>
        <div>${bet.selectionLabel}</div>
        <div>${bet.stake} PTS</div>
        <div>@ ${Number(bet.odds).toFixed(2)}</div>
        <div class="text-warning">预计返还 ${bet.potentialReturn}</div>
        <span class="badge text-bg-secondary">${bet.status}</span>
      </article>
    `).join('') : '<div class="empty-state">暂无投注记录。选择比赛和赔率后即可保存到这里。</div>';
  } catch (error) {
    container.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

async function renderBettingPool() {
  const { bets } = await apiRequest('/api/bets/pool');
  $('total-pool-points').textContent = `${bets.reduce((sum, bet) => sum + bet.stake, 0)} PTS`;
  $('betting-pool').innerHTML = demoMatches.map(match => {
    const matchBets = bets.filter(bet => bet.matchId === match.id);
    const total = matchBets.reduce((sum, bet) => sum + bet.stake, 0);
    const options = ['HOME', 'DRAW', 'AWAY'].map(selection => {
      const amount = matchBets.filter(bet => bet.selection === selection).reduce((sum, bet) => sum + bet.stake, 0);
      const pct = total ? Math.round((amount / total) * 100) : 0;
      return `<div class="pool-option"><span>${moneylineLabel(selection)}</span><div class="progress"><div class="progress-bar bg-warning" style="width:${pct}%"></div></div><small>${amount} PTS · ${pct}%</small></div>`;
    }).join('');
    return `<article class="pool-card"><div class="d-flex justify-content-between"><strong>${match.home} vs ${match.away}</strong><span>${total} PTS</span></div>${options}</article>`;
  }).join('');
}

function renderLiveOdds() {
  $('live-odds-board').innerHTML = demoMatches.map(match => `
    <article class="pool-card">
      <div class="d-flex justify-content-between mb-2"><strong>${match.home} vs ${match.away}</strong><small>${match.date} ${match.time}</small></div>
      <div class="quick-odds">${oddsButtons(match.id, 'quick-odd')}</div>
    </article>
  `).join('');
}

function renderSearchResults(query) {
  const shell = $('search-results');
  const list = $('search-results-list');
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    shell.classList.add('d-none');
    return;
  }

  const found = demoMatches.filter(match => [match.home, match.away, match.date, match.group, match.venue].some(value => value.toLowerCase().includes(normalized)));
  shell.classList.remove('d-none');
  $('search-count').textContent = `${found.length} 条`;
  list.innerHTML = found.length ? found.map(match => `
    <button class="result-card" data-match-id="${match.id}">
      <strong>${match.home} vs ${match.away}</strong>
      <span>${match.date} ${match.time} · ${match.group} · ${match.venue}</span>
    </button>
  `).join('') : '<div class="empty-state">没有找到相关球队或比赛。</div>';
}

function showRoute(route) {
  document.querySelectorAll('.route-page').forEach(page => page.classList.toggle('d-none', page.dataset.page !== route));
  document.querySelectorAll('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === route));
}

async function redeemCard() {
  if (!requireLogin('请先注册/登录后再充值模拟积分。')) return;
  const code = $('card-code').value.trim();
  try {
    const payload = await apiRequest('/api/cards/redeem', { method: 'POST', body: JSON.stringify({ code }) });
    currentUser = payload.user;
    updateUserChrome();
    $('card-code').value = '';
    bootstrap.Modal.getInstance($('walletModal'))?.hide();
    alert(`卡密兑换成功：+${payload.card.points} PTS。`);
  } catch (error) {
    alert(error.message);
  }
}

async function clearMyBets() {
  if (!requireLogin()) return;
  if (!confirm('确定清空当前账号的投注记录？')) return;
  try {
    await apiRequest('/api/bets/me', { method: 'DELETE' });
    await renderAllDynamic();
  } catch (error) {
    alert(error.message);
  }
}

async function renderAllDynamic() {
  renderSelectedMatch();
  renderOdds();
  renderMatches();
  renderTeams();
  renderStandings();
  renderPrediction();
  await renderMyBets();
  await renderBettingPool();
  renderLiveOdds();
}

function handleBodyClick(event) {
  const authTrigger = event.target.closest('[data-auth-tab]');
  if (authTrigger) openAuthModal(authTrigger.dataset.authTab);

  const route = event.target.closest('[data-route]');
  if (route) {
    event.preventDefault();
    showRoute(route.dataset.route);
  }

  const pick = event.target.closest('[data-match-id]');
  if (pick) {
    selectedMatchId = pick.dataset.matchId;
    $('match-select').value = selectedMatchId;
    renderSelectedMatch();
    renderOdds();
    if (pick.classList.contains('pick-match') || pick.classList.contains('result-card')) showRoute('home');
  }

  const odd = event.target.closest('[data-selection]');
  if (odd) placeBet(odd.dataset.selection, odd.dataset.matchId || selectedMatchId);
}

async function boot() {
  await restoreSession();
  renderMatchSelect();
  await renderAllDynamic();

  $('match-select').addEventListener('change', event => {
    selectedMatchId = event.target.value;
    renderSelectedMatch();
    renderOdds();
  });
  $('site-search').addEventListener('input', event => renderSearchResults(event.target.value));
  $('register-pane').addEventListener('submit', registerUser);
  $('login-pane').addEventListener('submit', loginUser);
  $('logout-button').addEventListener('click', logoutUser);
  $('redeem-card').addEventListener('click', redeemCard);
  $('refresh-pool').addEventListener('click', () => renderBettingPool());
  $('clear-bets').addEventListener('click', clearMyBets);
  document.body.addEventListener('click', handleBodyClick);
  setInterval(() => {
    renderOdds();
    renderLiveOdds();
    renderPrediction();
  }, 20000);
}

document.addEventListener('DOMContentLoaded', boot);
