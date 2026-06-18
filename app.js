const STORAGE_KEYS = {
  points: 'user_points',
  bets: 'user_bets',
  profile: 'user_profile',
  odds: 'odds_snapshots'
};

const demoTeams = [
  { id: 'mex', name: 'Mexico', group: 'Group A', fifaRank: 15, coach: 'Javier Aguirre', confederation: 'CONCACAF', form: ['W', 'D', 'W', 'L', 'W'], attack: 78, defense: 75 },
  { id: 'rsa', name: 'South Africa', group: 'Group A', fifaRank: 59, coach: 'Hugo Broos', confederation: 'CAF', form: ['D', 'W', 'L', 'W', 'D'], attack: 68, defense: 69 },
  { id: 'can', name: 'Canada', group: 'Group B', fifaRank: 31, coach: 'Jesse Marsch', confederation: 'CONCACAF', form: ['W', 'W', 'D', 'L', 'W'], attack: 76, defense: 72 },
  { id: 'jpn', name: 'Japan', group: 'Group B', fifaRank: 18, coach: 'Hajime Moriyasu', confederation: 'AFC', form: ['W', 'W', 'W', 'D', 'W'], attack: 82, defense: 80 },
  { id: 'usa', name: 'United States', group: 'Group C', fifaRank: 16, coach: 'Mauricio Pochettino', confederation: 'CONCACAF', form: ['W', 'L', 'W', 'D', 'W'], attack: 80, defense: 77 },
  { id: 'ger', name: 'Germany', group: 'Group C', fifaRank: 10, coach: 'Julian Nagelsmann', confederation: 'UEFA', form: ['W', 'W', 'D', 'W', 'L'], attack: 86, defense: 82 },
  { id: 'bra', name: 'Brazil', group: 'Group D', fifaRank: 5, coach: 'Carlo Ancelotti', confederation: 'CONMEBOL', form: ['W', 'W', 'L', 'W', 'D'], attack: 90, defense: 84 },
  { id: 'fra', name: 'France', group: 'Group D', fifaRank: 2, coach: 'Didier Deschamps', confederation: 'UEFA', form: ['W', 'D', 'W', 'W', 'W'], attack: 91, defense: 86 }
];

const demoMatches = [
  { id: 'wc2026-001', date: '2026-06-11', time: '20:00', home: 'Mexico', away: 'South Africa', group: 'Group A', venue: 'Estadio Azteca', status: 'Scheduled', score: null },
  { id: 'wc2026-002', date: '2026-06-12', time: '18:00', home: 'Canada', away: 'Japan', group: 'Group B', venue: 'BMO Field', status: 'Scheduled', score: null },
  { id: 'wc2026-003', date: '2026-06-13', time: '21:00', home: 'United States', away: 'Germany', group: 'Group C', venue: 'MetLife Stadium', status: 'Scheduled', score: null },
  { id: 'wc2026-004', date: '2026-06-14', time: '17:00', home: 'Brazil', away: 'France', group: 'Group D', venue: 'SoFi Stadium', status: 'Scheduled', score: null },
  { id: 'wc2026-final', date: '2026-07-19', time: '19:00', home: 'TBD Finalist 1', away: 'TBD Finalist 2', group: 'Final', venue: 'MetLife Stadium', status: 'Future', score: null }
];

const baseOdds = {
  'wc2026-001': { HOME: 1.86, DRAW: 3.35, AWAY: 4.20 },
  'wc2026-002': { HOME: 2.18, DRAW: 3.10, AWAY: 3.05 },
  'wc2026-003': { HOME: 2.45, DRAW: 3.40, AWAY: 2.62 },
  'wc2026-004': { HOME: 2.72, DRAW: 3.30, AWAY: 2.34 },
  'wc2026-final': { HOME: 2.05, DRAW: 3.25, AWAY: 3.45 }
};

let currentPoints = Number.parseInt(localStorage.getItem(STORAGE_KEYS.points), 10) || 100;
let selectedMatchId = demoMatches[0].id;

function moneylineLabel(selection) { return { HOME: '主胜', DRAW: '平局', AWAY: '客胜' }[selection] || selection; }
function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function teamByName(name) { return demoTeams.find(team => team.name === name) || { attack: 74, defense: 74, fifaRank: 48, form: ['D', 'D', 'D'], name }; }

function updatePoints(nextPoints = currentPoints) {
  currentPoints = nextPoints;
  localStorage.setItem(STORAGE_KEYS.points, String(currentPoints));
  document.getElementById('user-points').innerText = currentPoints;
}

function getCurrentOdds(matchId, forceRefresh = false) {
  const snapshots = readJson(STORAGE_KEYS.odds, {});
  const existing = snapshots[matchId];
  const stillFresh = existing && Date.now() - new Date(existing.updatedAt).getTime() < 30000;
  if (stillFresh && !forceRefresh) return existing;
  const seed = baseOdds[matchId] || { HOME: 2, DRAW: 3.2, AWAY: 3.4 };
  const drift = ((Date.now() / 1000) % 13) / 100;
  const odds = { HOME: +(seed.HOME + drift).toFixed(2), DRAW: +(seed.DRAW + drift / 2).toFixed(2), AWAY: +(seed.AWAY - drift / 2).toFixed(2), updatedAt: new Date().toISOString(), source: '模拟实时赔率聚合器' };
  snapshots[matchId] = odds;
  writeJson(STORAGE_KEYS.odds, snapshots);
  return odds;
}

function buildPrediction(match) {
  const home = teamByName(match.home);
  const away = teamByName(match.away);
  const homeScore = home.attack * 0.55 + home.defense * 0.25 + (100 - home.fifaRank) * 0.2 + 3;
  const awayScore = away.attack * 0.55 + away.defense * 0.25 + (100 - away.fifaRank) * 0.2;
  const diff = homeScore - awayScore;
  const homePct = Math.max(18, Math.min(68, Math.round(38 + diff * 1.3)));
  const awayPct = Math.max(18, Math.min(68, Math.round(36 - diff * 1.1)));
  const drawPct = Math.max(18, 100 - homePct - awayPct);
  const total = homePct + drawPct + awayPct;
  return { HOME: Math.round(homePct / total * 100), DRAW: Math.round(drawPct / total * 100), AWAY: 100 - Math.round(homePct / total * 100) - Math.round(drawPct / total * 100), pick: diff >= 1 ? 'HOME' : diff <= -1 ? 'AWAY' : 'DRAW', confidence: Math.min(86, Math.round(52 + Math.abs(diff) * 1.6)) };
}

function renderMatchSelect() {
  const select = document.getElementById('match-select');
  select.innerHTML = demoMatches.map(match => `<option value="${match.id}">${match.date} ${match.home} vs ${match.away}</option>`).join('');
  select.value = selectedMatchId;
}

function renderSelectedMatch() {
  const match = demoMatches.find(item => item.id === selectedMatchId);
  const prediction = buildPrediction(match);
  document.getElementById('selected-match-card').innerHTML = `<div class="match-title">${match.home} vs ${match.away}</div><div class="small text-secondary">${match.group} · ${match.date} ${match.time} · ${match.venue}</div><div class="mt-2 small">模型推荐：<span class="text-warning fw-bold">${moneylineLabel(prediction.pick)}</span> · 信心 ${prediction.confidence}%</div>`;
}

function renderOdds(forceRefresh = false) {
  const odds = getCurrentOdds(selectedMatchId, forceRefresh);
  document.getElementById('odds-updated').innerText = `更新：${new Date(odds.updatedAt).toLocaleTimeString()} · ${odds.source}`;
  document.getElementById('odds-panel').innerHTML = ['HOME', 'DRAW', 'AWAY'].map(selection => `<button class="odds-button" data-selection="${selection}"><span>${moneylineLabel(selection)}</span><strong>${odds[selection].toFixed(2)}</strong></button>`).join('');
}

function renderSchedule() {
  document.getElementById('schedule-list').innerHTML = demoMatches.map(match => `<article class="schedule-card"><div><span class="badge text-bg-dark">${match.group}</span><h3>${match.home} <span>vs</span> ${match.away}</h3><p>${match.date} ${match.time} · ${match.venue}</p></div><div class="score-box">${match.score || match.status}</div></article>`).join('');
}

function renderTeams() {
  document.getElementById('teams-grid').innerHTML = demoTeams.map(team => `<article class="team-card"><div class="d-flex justify-content-between"><strong>${team.name}</strong><span>#${team.fifaRank}</span></div><div class="small text-secondary">${team.group} · ${team.confederation} · ${team.coach}</div><div class="form-line">${team.form.map(f => `<span class="form-${f}">${f}</span>`).join('')}</div><div class="metric"><span>进攻</span><div class="progress"><div class="progress-bar bg-warning" style="width:${team.attack}%"></div></div></div><div class="metric"><span>防守</span><div class="progress"><div class="progress-bar bg-info" style="width:${team.defense}%"></div></div></div></article>`).join('');
}

function renderStandingsTable() {
  const rows = demoTeams.map((team, index) => ({ ...team, pts: Math.max(0, 9 - (index % 4) * 2), gd: 5 - (index % 4) })).sort((a, b) => a.group.localeCompare(b.group) || b.pts - a.pts);
  document.getElementById('standings-table').innerHTML = `<table class="table table-dark table-hover align-middle"><thead><tr><th>组</th><th>球队</th><th>积分</th><th>净胜球</th><th>状态</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.group}</td><td>${row.name}</td><td>${row.pts}</td><td>${row.gd > 0 ? '+' : ''}${row.gd}</td><td>${row.form.join(' ')}</td></tr>`).join('')}</tbody></table>`;
}

function renderPredictions() {
  document.getElementById('predictions-grid').innerHTML = demoMatches.map(match => {
    const p = buildPrediction(match);
    return `<article class="prediction-card"><strong>${match.home} vs ${match.away}</strong><div class="small text-secondary">${match.date} · ${match.group}</div>${['HOME', 'DRAW', 'AWAY'].map(key => `<div class="pool-option"><span>${moneylineLabel(key)}</span><div class="progress"><div class="progress-bar bg-warning" style="width:${p[key]}%"></div></div><small>${p[key]}%</small></div>`).join('')}<div class="mt-2">推荐：<span class="text-warning">${moneylineLabel(p.pick)}</span> · 信心 ${p.confidence}%</div></article>`;
  }).join('');
}

function placeBet(selection) {
  const stake = Number.parseInt(document.getElementById('stake-input').value, 10);
  if (!Number.isFinite(stake) || stake <= 0) return alert('请输入有效投注积分。');
  if (currentPoints < stake) return alert('积分不足，请先充值。');
  const match = demoMatches.find(item => item.id === selectedMatchId);
  const odds = getCurrentOdds(selectedMatchId);
  const bet = { id: `bet-${Date.now()}`, matchId: match.id, matchLabel: `${match.home} vs ${match.away}`, matchDate: match.date, selection, selectionLabel: moneylineLabel(selection), stake, odds: odds[selection], potentialReturn: +(stake * odds[selection]).toFixed(2), status: 'pending', createdAt: new Date().toISOString() };
  const bets = readJson(STORAGE_KEYS.bets, []);
  bets.unshift(bet); writeJson(STORAGE_KEYS.bets, bets); updatePoints(currentPoints - stake); renderMyBets(); renderBettingPool(); alert(`投注成功：${bet.matchLabel} · ${bet.selectionLabel} @ ${bet.odds}`);
}

function renderMyBets() {
  const bets = readJson(STORAGE_KEYS.bets, []);
  const container = document.getElementById('my-bets-list');
  container.innerHTML = bets.length ? bets.map(bet => `<article class="bet-row"><div><strong>${bet.matchLabel}</strong><div class="small text-secondary">${bet.matchDate} · ${new Date(bet.createdAt).toLocaleString()}</div></div><div>${bet.selectionLabel}</div><div>${bet.stake} PTS</div><div>@ ${Number(bet.odds).toFixed(2)}</div><div class="text-warning">预计返还 ${bet.potentialReturn}</div><span class="badge text-bg-secondary">${bet.status}</span></article>`).join('') : '<div class="empty-state">暂无投注记录。选择比赛和赔率后即可保存到这里。</div>';
}

function renderBettingPool() {
  const bets = readJson(STORAGE_KEYS.bets, []);
  document.getElementById('betting-pool').innerHTML = demoMatches.map(match => {
    const matchBets = bets.filter(bet => bet.matchId === match.id);
    const total = matchBets.reduce((sum, bet) => sum + bet.stake, 0);
    const bySelection = ['HOME', 'DRAW', 'AWAY'].map(selection => { const amount = matchBets.filter(bet => bet.selection === selection).reduce((sum, bet) => sum + bet.stake, 0); const pct = total ? Math.round((amount / total) * 100) : 0; return `<div class="pool-option"><span>${moneylineLabel(selection)}</span><div class="progress"><div class="progress-bar bg-warning" style="width:${pct}%"></div></div><small>${amount} PTS · ${pct}%</small></div>`; }).join('');
    return `<article class="pool-card"><div class="d-flex justify-content-between"><strong>${match.home} vs ${match.away}</strong><span>${total} PTS</span></div><div class="small text-secondary mb-2">${match.date} · ${match.group}</div>${bySelection}</article>`;
  }).join('');
}

function renderSearchResults(query) {
  const shell = document.getElementById('search-results'); const list = document.getElementById('search-results-list'); const normalized = query.trim().toLowerCase();
  if (!normalized) { shell.classList.add('d-none'); return; }
  const matchResults = demoMatches.filter(match => [match.home, match.away, match.date, match.group, match.venue].some(value => value.toLowerCase().includes(normalized))).map(match => ({ type: '比赛', id: match.id, title: `${match.home} vs ${match.away}`, meta: `${match.date} ${match.time} · ${match.group}` }));
  const teamResults = demoTeams.filter(team => [team.name, team.group, team.confederation, team.coach].some(value => value.toLowerCase().includes(normalized))).map(team => ({ type: '球队', id: team.name, title: team.name, meta: `${team.group} · FIFA #${team.fifaRank}` }));
  const results = [...matchResults, ...teamResults]; shell.classList.remove('d-none');
  list.innerHTML = results.length ? results.map(item => `<button class="result-card" data-result-type="${item.type}" data-match-id="${item.id}"><span>${item.type}</span><strong>${item.title}</strong><span>${item.meta}</span></button>`).join('') : '<div class="empty-state">没有找到相关球队或比赛。</div>';
}

function showRoute(route) { document.querySelectorAll('.route-page').forEach(page => page.classList.toggle('d-none', page.dataset.page !== route)); document.querySelectorAll('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === route)); }
function redeemCard() { const input = document.getElementById('card-code'); if (!/^DEMO-\d{4}$/i.test(input.value.trim())) return alert('演示环境仅接受 DEMO-2026 格式卡密；生产环境请接入服务端卡密校验。'); updatePoints(currentPoints + 100); input.value = ''; alert('演示卡密兑换成功：+100 PTS。'); }
function saveProfile() { const profile = { name: document.getElementById('auth-name').value.trim() || 'Demo User', email: document.getElementById('auth-email').value.trim(), savedAt: new Date().toISOString() }; writeJson(STORAGE_KEYS.profile, profile); document.getElementById('auth-button').innerText = profile.name; }

function boot() {
  updatePoints(currentPoints); const profile = readJson(STORAGE_KEYS.profile, null); if (profile?.name) document.getElementById('auth-button').innerText = profile.name;
  renderMatchSelect(); renderSelectedMatch(); renderOdds(); renderSchedule(); renderTeams(); renderStandingsTable(); renderPredictions(); renderMyBets(); renderBettingPool();
  document.getElementById('match-select').addEventListener('change', e => { selectedMatchId = e.target.value; renderSelectedMatch(); renderOdds(); });
  document.getElementById('refresh-odds').addEventListener('click', () => renderOdds(true));
  document.getElementById('odds-panel').addEventListener('click', e => { const b = e.target.closest('[data-selection]'); if (b) placeBet(b.dataset.selection); });
  document.getElementById('site-search').addEventListener('input', e => renderSearchResults(e.target.value));
  document.getElementById('search-results-list').addEventListener('click', e => { const card = e.target.closest('[data-match-id]'); if (!card) return; if (card.dataset.resultType === '球队') showRoute('teams'); else { selectedMatchId = card.dataset.matchId; document.getElementById('match-select').value = selectedMatchId; renderSelectedMatch(); renderOdds(); showRoute('home'); } });
  document.querySelectorAll('[data-route]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); showRoute(link.dataset.route); }));
  document.getElementById('redeem-card').addEventListener('click', redeemCard); document.getElementById('refresh-pool').addEventListener('click', renderBettingPool);
  document.getElementById('clear-bets').addEventListener('click', () => { if (confirm('确定清空本地投注记录？')) { writeJson(STORAGE_KEYS.bets, []); renderMyBets(); renderBettingPool(); } });
  document.getElementById('save-profile').addEventListener('click', saveProfile);
  setInterval(() => renderOdds(true), 30000);
}

document.addEventListener('DOMContentLoaded', boot);
