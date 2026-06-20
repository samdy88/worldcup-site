const STORAGE_KEYS = {
  token: 'fifa2026_api_token'
};

const API_BASE = '';
const STARTING_POINTS = 500;

const LANGUAGE_KEY = 'predictwin_language';
const translations = {
  zh: { nav: ['🏟️ 首页大厅', '📅 赛程比分', '🛡️ 球队', '🏆 排行榜', '📈 实时赔率', '🤖 预测', '💰 投注池', '🎫 我的投注'], title: 'PredictWin · 2026 FIFA 投注', search: '搜索球队、比赛、场馆、日期', auth: '登录 / 注册', logout: '退出', guestTitle: '注册 30 秒，领取 500 PTS 试玩积分', guestCta: '免费注册试玩', schedule: '赛程 / 比分', teams: '球队资料', standings: '排行榜', odds: '实时赔率', predictions: 'AI 预测', pool: '投注池', myBets: '我的投注', promoTitle: '新玩家专属：领取 500 PTS，预测今日焦点赛！', promoText: '注册即可获得试玩积分，选择 2026 FIFA 比赛的主胜 / 平局 / 客胜赔率，下注记录自动进入你的投注池。', promoCta: '立即免费注册', promoOdds: '先看实时赔率' },
  en: { nav: ['🏟️ Lobby', '📅 Matches', '🛡️ Teams', '🏆 Standings', '📈 Live Odds', '🤖 Predictions', '💰 Pool', '🎫 My Bets'], title: 'PredictWin · FIFA 2026 Betting', search: 'Search teams, matches, venues, dates', auth: 'Login / Sign up', logout: 'Logout', guestTitle: 'Sign up in 30 seconds and claim 500 PTS', guestCta: 'Free sign up', schedule: 'Matches / Scores', teams: 'Teams', standings: 'Standings', odds: 'Live Odds', predictions: 'AI Predictions', pool: 'Betting Pool', myBets: 'My Bets', promoTitle: 'New player bonus: claim 500 PTS for today’s pick!', promoText: 'Register, choose a FIFA 2026 match, pick home/draw/away odds, and your bet enters the pool instantly.', promoCta: 'Claim free bet', promoOdds: 'View odds first' },
  es: { nav: ['🏟️ Inicio', '📅 Partidos', '🛡️ Equipos', '🏆 Tabla', '📈 Cuotas', '🤖 Predicción', '💰 Pozo', '🎫 Mis apuestas'], title: 'PredictWin · Apuestas FIFA 2026', search: 'Buscar equipos, partidos, sedes, fechas', auth: 'Entrar / Registro', logout: 'Salir', guestTitle: 'Regístrate y recibe 500 PTS', guestCta: 'Registro gratis', schedule: 'Partidos / Marcador', teams: 'Equipos', standings: 'Clasificación', odds: 'Cuotas en vivo', predictions: 'Predicción IA', pool: 'Pozo de apuestas', myBets: 'Mis apuestas', promoTitle: 'Bono nuevo jugador: 500 PTS gratis', promoText: 'Regístrate, elige un partido FIFA 2026 y apuesta local/empate/visitante.', promoCta: 'Recibir bono', promoOdds: 'Ver cuotas' },
  fr: { nav: ['🏟️ Accueil', '📅 Matchs', '🛡️ Équipes', '🏆 Classement', '📈 Cotes', '🤖 Prédiction', '💰 Pool', '🎫 Mes paris'], title: 'PredictWin · Paris FIFA 2026', search: 'Rechercher équipes, matchs, stades, dates', auth: 'Connexion / Inscription', logout: 'Sortir', guestTitle: 'Inscription rapide : 500 PTS offerts', guestCta: 'Inscription gratuite', schedule: 'Matchs / Scores', teams: 'Équipes', standings: 'Classement', odds: 'Cotes en direct', predictions: 'Prédictions IA', pool: 'Pool de paris', myBets: 'Mes paris', promoTitle: 'Offre nouveau joueur : 500 PTS', promoText: 'Choisissez un match FIFA 2026 et pariez domicile/nul/extérieur.', promoCta: 'Recevoir le bonus', promoOdds: 'Voir les cotes' },
  pt: { nav: ['🏟️ Início', '📅 Jogos', '🛡️ Times', '🏆 Tabela', '📈 Odds', '🤖 Previsão', '💰 Pool', '🎫 Minhas apostas'], title: 'PredictWin · Apostas FIFA 2026', search: 'Buscar times, jogos, estádios, datas', auth: 'Entrar / Registrar', logout: 'Sair', guestTitle: 'Cadastre-se e ganhe 500 PTS', guestCta: 'Cadastro grátis', schedule: 'Jogos / Placar', teams: 'Times', standings: 'Classificação', odds: 'Odds ao vivo', predictions: 'Previsões IA', pool: 'Pool de apostas', myBets: 'Minhas apostas', promoTitle: 'Bônus novo jogador: 500 PTS', promoText: 'Escolha um jogo da FIFA 2026 e aposte mandante/empate/visitante.', promoCta: 'Resgatar bônus', promoOdds: 'Ver odds' },
  de: { nav: ['🏟️ Lobby', '📅 Spiele', '🛡️ Teams', '🏆 Tabelle', '📈 Quoten', '🤖 Prognose', '💰 Pool', '🎫 Meine Tipps'], title: 'PredictWin · FIFA 2026 Wetten', search: 'Teams, Spiele, Stadien, Datum suchen', auth: 'Login / Registrieren', logout: 'Abmelden', guestTitle: 'Registrieren und 500 PTS sichern', guestCta: 'Gratis registrieren', schedule: 'Spiele / Ergebnisse', teams: 'Teams', standings: 'Tabelle', odds: 'Live-Quoten', predictions: 'KI-Prognosen', pool: 'Wettpool', myBets: 'Meine Wetten', promoTitle: 'Neuer Spielerbonus: 500 PTS', promoText: 'Wähle ein FIFA-2026-Spiel und tippe Heimsieg/Remis/Auswärtssieg.', promoCta: 'Bonus holen', promoOdds: 'Quoten ansehen' },
  ar: { nav: ['🏟️ الرئيسية', '📅 المباريات', '🛡️ الفرق', '🏆 الترتيب', '📈 الاحتمالات', '🤖 التوقعات', '💰 المجمع', '🎫 رهاناتي'], title: 'PredictWin · رهانات FIFA 2026', search: 'ابحث عن فرق أو مباريات أو ملاعب أو تواريخ', auth: 'دخول / تسجيل', logout: 'خروج', guestTitle: 'سجّل واحصل على 500 نقطة', guestCta: 'تسجيل مجاني', schedule: 'المباريات / النتائج', teams: 'الفرق', standings: 'الترتيب', odds: 'احتمالات مباشرة', predictions: 'توقعات الذكاء الاصطناعي', pool: 'مجمع الرهانات', myBets: 'رهاناتي', promoTitle: 'عرض لاعب جديد: 500 نقطة', promoText: 'اختر مباراة FIFA 2026 وارهن على فوز/تعادل/خسارة.', promoCta: 'احصل على العرض', promoOdds: 'شاهد الاحتمالات' },
  ja: { nav: ['🏟️ ホーム', '📅 試合', '🛡️ チーム', '🏆 順位', '📈 オッズ', '🤖 予測', '💰 プール', '🎫 自分のベット'], title: 'PredictWin · FIFA 2026 ベット', search: 'チーム、試合、会場、日付を検索', auth: 'ログイン / 登録', logout: 'ログアウト', guestTitle: '登録して500 PTSを獲得', guestCta: '無料登録', schedule: '日程 / スコア', teams: 'チーム', standings: '順位表', odds: 'ライブオッズ', predictions: 'AI予測', pool: 'ベットプール', myBets: 'マイベット', promoTitle: '新規特典：500 PTS無料', promoText: 'FIFA 2026の試合を選び、ホーム/ドロー/アウェイにベット。', promoCta: '特典を受け取る', promoOdds: 'オッズを見る' },
  ko: { nav: ['🏟️ 홈', '📅 경기', '🛡️ 팀', '🏆 순위', '📈 배당', '🤖 예측', '💰 풀', '🎫 내 베팅'], title: 'PredictWin · FIFA 2026 베팅', search: '팀, 경기, 경기장, 날짜 검색', auth: '로그인 / 가입', logout: '로그아웃', guestTitle: '가입하고 500 PTS 받기', guestCta: '무료 가입', schedule: '일정 / 스코어', teams: '팀', standings: '순위표', odds: '실시간 배당', predictions: 'AI 예측', pool: '베팅 풀', myBets: '내 베팅', promoTitle: '신규 보너스: 500 PTS', promoText: 'FIFA 2026 경기에서 홈/무/원정 배당을 선택하세요.', promoCta: '보너스 받기', promoOdds: '배당 보기' }
};
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'zh';

let demoMatches = [
  { id: 'wc2026-usa-aus', date: '2026-06-19', time: '14:00', home: '美国', away: '澳大利亚', group: '分组赛阶段。D组。第2轮', venue: 'Arrowhead Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-sco-mar', date: '2026-06-19', time: '17:00', home: '苏格兰', away: '摩洛哥', group: '分组赛阶段。C组。第2轮', venue: 'AT&T Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-bra-hai', date: '2026-06-19', time: '19:30', home: '巴西', away: '海地', group: '分组赛阶段。C组。第2轮', venue: 'SoFi Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-tur-par', date: '2026-06-19', time: '22:00', home: '土耳其', away: '巴拉圭', group: '分组赛阶段。D组。第2轮', venue: 'MetLife Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-sui-can', date: '2026-06-20', time: '16:00', home: '瑞士', away: '加拿大', group: '分组赛阶段。B组。第2轮', venue: 'BMO Field', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-final', date: '2026-07-19', time: '19:00', home: '决赛球队 1', away: '决赛球队 2', group: '决赛', venue: 'MetLife Stadium', status: 'future', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-001', date: '2026-06-11', time: '20:00', home: 'Mexico', away: 'South Africa', group: 'Group A', venue: 'Estadio Azteca', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-002', date: '2026-06-12', time: '18:00', home: 'Canada', away: 'Japan', group: 'Group B', venue: 'BMO Field', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-003', date: '2026-06-13', time: '21:00', home: 'United States', away: 'Germany', group: 'Group C', venue: 'MetLife Stadium', status: 'live', score: '1 - 1' },
  { id: 'wc2026-004', date: '2026-06-14', time: '17:00', home: 'Brazil', away: 'Morocco', group: 'Group D', venue: 'SoFi Stadium', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-005', date: '2026-06-15', time: '19:30', home: 'Argentina', away: 'Spain', group: 'Group E', venue: 'AT&T Stadium', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-final', date: '2026-07-19', time: '19:00', home: 'TBD Finalist 1', away: 'TBD Finalist 2', group: 'Final', venue: 'MetLife Stadium', status: 'future', score: '0 - 0' }
];

let teams = [
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

let baseOdds = {
  'wc2026-usa-aus': { HOME: 1.64, DRAW: 3.82, AWAY: 5.05 },
  'wc2026-sco-mar': { HOME: 3.45, DRAW: 3.28, AWAY: 2.08 },
  'wc2026-bra-hai': { HOME: 1.18, DRAW: 6.40, AWAY: 13.0 },
  'wc2026-tur-par': { HOME: 2.20, DRAW: 3.15, AWAY: 3.25 },
  'wc2026-sui-can': { HOME: 2.40, DRAW: 3.10, AWAY: 1.62 },
  'wc2026-001': { HOME: 1.86, DRAW: 3.35, AWAY: 4.20 },
  'wc2026-002': { HOME: 2.18, DRAW: 3.10, AWAY: 3.05 },
  'wc2026-003': { HOME: 2.45, DRAW: 3.40, AWAY: 2.62 },
  'wc2026-004': { HOME: 1.72, DRAW: 3.85, AWAY: 5.20 },
  'wc2026-005': { HOME: 2.55, DRAW: 3.25, AWAY: 2.70 },
  'wc2026-final': { HOME: 2.05, DRAW: 3.25, AWAY: 3.45 }
};

let standingsGroups = [];
let externalPools = [];
let predictionOverrides = [];
let dataSources = {};

let currentUser = null;
let selectedMatchId = demoMatches[0].id;
let selectedBet = null;
let activeDateFilter = 'today';
let outrights = [];
let topScorers = [];

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


async function loadFifa2026Data() {
  try {
    const [fixtures, teamData, standingsData, oddsData, poolData, predictionData, outrightData, scorerData] = await Promise.all([
      apiRequest('/api/fixtures'),
      apiRequest('/api/teams'),
      apiRequest('/api/standings'),
      apiRequest('/api/odds'),
      apiRequest('/api/external-pools'),
      apiRequest('/api/predictions'),
      apiRequest('/api/outrights').catch(() => ({ markets: [] })),
      apiRequest('/api/top-scorers').catch(() => ({ players: [] }))
    ]);
    if (fixtures.matches?.length) demoMatches = fixtures.matches;
    if (teamData.teams?.length) teams = teamData.teams;
    if (standingsData.standings?.length) standingsGroups = standingsData.standings;
    if (oddsData.oddsByMatchId) baseOdds = oddsData.oddsByMatchId;
    externalPools = poolData.pools || [];
    predictionOverrides = predictionData.predictions || [];
    outrights = outrightData.markets || [];
    topScorers = scorerData.players || [];
    dataSources = { fixtures: fixtures.source, teams: teamData.source, standings: standingsData.source, odds: oddsData.source, pools: poolData.source, predictions: predictionData.source };
    updateDataSourceStatus();
    updateLiveDataBanner();
    selectedMatchId = demoMatches.find(match => match.date === '2026-06-19')?.id || demoMatches[0]?.id || selectedMatchId;
    selectedMatchId = demoMatches[0]?.id || selectedMatchId;
  } catch (error) {
    console.warn('FIFA 2026 data API unavailable, using demo fallback.', error);
    dataSources = { fixtures: 'demo-fallback', teams: 'demo-fallback', standings: 'demo-fallback', odds: 'demo-fallback', pools: 'local', predictions: 'demo-model' };
    updateDataSourceStatus();
    updateLiveDataBanner();
  }
}

function updateDataSourceStatus() {
  const target = $('data-source-status');
  if (!target) return;
  target.textContent = `数据源：赛程 ${dataSources.fixtures || '-'} · 赔率 ${dataSources.odds || '-'} · 预测 ${dataSources.predictions || '-'} · 投注池 ${dataSources.pools || '-'}`;
}


function updateLiveDataBanner() {
  const banner = $('live-data-banner');
  const message = $('live-data-message');
  if (!banner || !message) return;

  const fallbackSources = Object.entries(dataSources).filter(([, source]) => String(source || '').includes('demo'));
  const liveSources = Object.values(dataSources).filter(source => source && !String(source).includes('demo'));

  if (!fallbackSources.length) {
    banner.classList.add('d-none');
    return;
  }

  banner.classList.remove('d-none');
  message.textContent = `当前 ${fallbackSources.map(([key, source]) => `${key}=${source}`).join('，')}。请在部署环境配置 FREE_FIFA_API_BASE/API_SPORTS_KEY/ODDS_API_KEY/PREDICTION_API_URL/EXTERNAL_POOL_API_URL；已启用的数据源：${liveSources.join('，') || '无'}。`;
}


function t(key) {
  return (translations[currentLanguage] || translations.zh)[key] || translations.zh[key] || key;
}

function applyLanguage(language = currentLanguage) {
  currentLanguage = translations[language] ? language : 'zh';
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  const navTexts = t('nav');
  document.querySelectorAll('.side-nav a').forEach((link, index) => { link.textContent = navTexts[index] || link.textContent; });
  $('site-search').placeholder = t('search');
  $('auth-button').textContent = t('auth');
  $('logout-button').textContent = t('logout');
  document.querySelector('.topbar h1').textContent = t('title');
  $('guest-gate').querySelector('h2').textContent = t('guestTitle');
  $('guest-gate').querySelector('button').textContent = t('guestCta');
  document.querySelector('[data-page="schedule"] .section-heading span').textContent = t('schedule');
  document.querySelector('[data-page="teams"] .section-heading span').textContent = t('teams');
  document.querySelector('[data-page="standings"] .section-heading span').textContent = t('standings');
  document.querySelector('[data-page="odds"] .section-heading span').textContent = t('odds');
  document.querySelector('[data-page="predictions"] .section-heading span').textContent = t('predictions');
  document.querySelector('[data-page="pool"] .section-heading span').textContent = t('pool');
  document.querySelector('[data-page="my-bets"] .section-heading span').textContent = t('myBets');
  $('promoModalLabel').textContent = t('promoTitle');
  document.querySelector('.promo-body p').textContent = t('promoText');
  document.querySelector('.promo-actions [data-auth-tab]').textContent = t('promoCta');
  document.querySelector('.promo-actions [data-route]').textContent = t('promoOdds');
}

function showPromoModal() {
  const match = demoMatches.find(item => item.status === 'live') || demoMatches.find(item => item.date >= '2026-06-19') || demoMatches[0];
  if (match) {
    $('promo-match-title').textContent = `${match.home} vs ${match.away}`;
    $('promo-match-meta').textContent = `${match.group} · ${match.date} ${match.time} · ${match.venue}`;
  }
  setTimeout(() => showModalById('promoModal'), 550);
}


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


async function loadFifa2026Data() {
  try {
    const [fixtures, teamData, standingsData, oddsData, poolData, predictionData] = await Promise.all([
      apiRequest('/api/fixtures'),
      apiRequest('/api/teams'),
      apiRequest('/api/standings'),
      apiRequest('/api/odds'),
      apiRequest('/api/external-pools'),
      apiRequest('/api/predictions')
    ]);
    if (fixtures.matches?.length) demoMatches = fixtures.matches;
    if (teamData.teams?.length) teams = teamData.teams;
    if (standingsData.standings?.length) standingsGroups = standingsData.standings;
    if (oddsData.oddsByMatchId) baseOdds = oddsData.oddsByMatchId;
    externalPools = poolData.pools || [];
    predictionOverrides = predictionData.predictions || [];
    dataSources = { fixtures: fixtures.source, teams: teamData.source, standings: standingsData.source, odds: oddsData.source, pools: poolData.source, predictions: predictionData.source };
    updateDataSourceStatus();
    updateLiveDataBanner();
    selectedMatchId = demoMatches[0]?.id || selectedMatchId;
  } catch (error) {
    console.warn('FIFA 2026 data API unavailable, using demo fallback.', error);
    dataSources = { fixtures: 'demo-fallback', teams: 'demo-fallback', standings: 'demo-fallback', odds: 'demo-fallback', pools: 'local', predictions: 'demo-model' };
    updateDataSourceStatus();
    updateLiveDataBanner();
  }
}

function updateDataSourceStatus() {
  const target = $('data-source-status');
  if (!target) return;
  target.textContent = `数据源：赛程 ${dataSources.fixtures || '-'} · 赔率 ${dataSources.odds || '-'} · 预测 ${dataSources.predictions || '-'} · 投注池 ${dataSources.pools || '-'}`;
}


function updateLiveDataBanner() {
  const banner = $('live-data-banner');
  const message = $('live-data-message');
  if (!banner || !message) return;

  const fallbackSources = Object.entries(dataSources).filter(([, source]) => String(source || '').includes('demo'));
  const liveSources = Object.values(dataSources).filter(source => source && !String(source).includes('demo'));

  if (!fallbackSources.length) {
    banner.classList.add('d-none');
    return;
  }

  banner.classList.remove('d-none');
  message.textContent = `当前 ${fallbackSources.map(([key, source]) => `${key}=${source}`).join('，')}。请在部署环境配置 FREE_FIFA_API_BASE/API_SPORTS_KEY/ODDS_API_KEY/PREDICTION_API_URL/EXTERNAL_POOL_API_URL；已启用的数据源：${liveSources.join('，') || '无'}。`;
}


function t(key) {
  return (translations[currentLanguage] || translations.zh)[key] || translations.zh[key] || key;
}

function applyLanguage(language = currentLanguage) {
  currentLanguage = translations[language] ? language : 'zh';
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  const navTexts = t('nav');
  document.querySelectorAll('.side-nav a').forEach((link, index) => { link.textContent = navTexts[index] || link.textContent; });
  $('site-search').placeholder = t('search');
  $('auth-button').textContent = t('auth');
  $('logout-button').textContent = t('logout');
  document.querySelector('.topbar h1').textContent = t('title');
  $('guest-gate').querySelector('h2').textContent = t('guestTitle');
  $('guest-gate').querySelector('button').textContent = t('guestCta');
  document.querySelector('[data-page="schedule"] .section-heading span').textContent = t('schedule');
  document.querySelector('[data-page="teams"] .section-heading span').textContent = t('teams');
  document.querySelector('[data-page="standings"] .section-heading span').textContent = t('standings');
  document.querySelector('[data-page="odds"] .section-heading span').textContent = t('odds');
  document.querySelector('[data-page="predictions"] .section-heading span').textContent = t('predictions');
  document.querySelector('[data-page="pool"] .section-heading span').textContent = t('pool');
  document.querySelector('[data-page="my-bets"] .section-heading span').textContent = t('myBets');
  $('promoModalLabel').textContent = t('promoTitle');
  document.querySelector('.promo-body p').textContent = t('promoText');
  document.querySelector('.promo-actions [data-auth-tab]').textContent = t('promoCta');
  document.querySelector('.promo-actions [data-route]').textContent = t('promoOdds');
}

function showPromoModal() {
  const match = demoMatches.find(item => item.status === 'live') || demoMatches.find(item => item.date >= '2026-06-19') || demoMatches[0];
  if (match) {
    $('promo-match-title').textContent = `${match.home} vs ${match.away}`;
    $('promo-match-meta').textContent = `${match.group} · ${match.date} ${match.time} · ${match.venue}`;
  }
  setTimeout(() => showModalById('promoModal'), 550);
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

function showModalById(id) {
  const element = $(id);
  if (!element) return;
  if (window.bootstrap?.Modal) {
    bootstrap.Modal.getOrCreateInstance(element).show();
    return;
  }
  element.classList.add('show');
  element.style.display = 'block';
  element.removeAttribute('aria-hidden');
}

function hideModalById(id) {
  const element = $(id);
  if (!element) return;
  if (window.bootstrap?.Modal) {
    bootstrap.Modal.getInstance(element)?.hide();
    return;
  }
  element.classList.remove('show');
  element.style.display = 'none';
  element.setAttribute('aria-hidden', 'true');
}

function openAuthModal(tab = 'register') {
  const tabButton = tab === 'login' ? $('login-tab') : $('register-tab');
  if (window.bootstrap?.Tab) bootstrap.Tab.getOrCreateInstance(tabButton).show();
  showModalById('authModal');
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
    setTimeout(() => hideModalById('authModal'), 650);
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
    setTimeout(() => hideModalById('authModal'), 650);
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
  const override = predictionOverrides.find(item => item.matchId === match.id);
  if (override?.probabilities) return override.probabilities;

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
  const select = $('match-select');
  if (!select) return;
  select.innerHTML = demoMatches.map(match => `<option value="${match.id}">${match.date} ${match.home} vs ${match.away}</option>`).join('');
  select.value = selectedMatchId;
}

function renderSelectedMatch() {
  const match = demoMatches.find(item => item.id === selectedMatchId) || demoMatches[0];
  const selectedCard = $('selected-match-card');
  if (selectedCard) selectedCard.innerHTML = `<div class="team-name">${match.home} vs ${match.away}</div><div class="small text-secondary">${match.group} · ${match.date} ${match.time} · ${match.venue}</div>`;
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
  const oddsPanel = $('odds-panel');
  if (oddsPanel) oddsPanel.innerHTML = oddsButtons(selectedMatchId);
  const heroOdds = $('hero-odds');
  if (heroOdds) heroOdds.innerHTML = oddsButtons(selectedMatchId, 'quick-odd');
  renderBetSlip();
}

function statusLabel(match) {
  const status = String(match.status || '').toUpperCase();
  if (status === 'LIVE' || status === 'IN_PLAY') return `LIVE ${match.minute ? match.minute + '′' : ''}`;
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FT';
  return 'UPCOMING';
}

function matchDateRank(match) {
  const today = '2026-06-19';
  if (activeDateFilter === 'today') return match.date === today || String(match.status).toLowerCase() === 'live';
  if (activeDateFilter === 'tomorrow') return match.date === '2026-06-20';
  return true;
}

function renderTopEventCard(match) {
  const probabilities = prediction(match);
  const odds = getCurrentOdds(match.id);
  return `
    <article class="top-event-card">
      <div class="event-status-row"><span class="match-status ${String(match.status).toLowerCase() === 'live' ? 'live' : ''}">${statusLabel(match)}</span><small>${match.group} · ${match.date} ${match.time}</small></div>
      <div class="event-teams"><strong>${match.home}</strong><span>${match.score}</span><strong>${match.away}</strong></div>
      <div class="event-meta">${match.venue} · 控球 ${match.stats?.possession || '-'} · 射门 ${match.stats?.shots || '-'}</div>
      <div class="win-probabilities">${['HOME', 'DRAW', 'AWAY'].map(selection => `<span>${moneylineLabel(selection)} <b>${probabilities[selection]}%</b></span>`).join('')}</div>
      <div class="quick-odds">${['HOME', 'DRAW', 'AWAY'].map(selection => `<button class="quick-odd" data-selection="${selection}" data-match-id="${match.id}"><span>${moneylineLabel(selection)}</span><strong>${odds[selection].toFixed(2)}</strong></button>`).join('')}</div>
      <button class="all-markets" data-match-id="${match.id}">所有盘口 +${Math.floor(420 + Number(match.id.replace(/\D/g, '').slice(-2) || 1) * 17)}</button>
    </article>`;
}

function renderMatches() {
  const eventMatches = demoMatches.filter(matchDateRank);
  const html = (eventMatches.length ? eventMatches : demoMatches).map(renderTopEventCard).join('');
  $('featured-matches').innerHTML = html;
  $('schedule-list').innerHTML = demoMatches.map(match => `
    <article class="match-card">
      <div><div class="team-name">${match.home}</div><small>${match.venue}</small><div class="match-stats">控球 ${match.stats?.possession || '-'} · 射门 ${match.stats?.shots || '-'}</div></div>
      <div class="score-pill">${match.score}</div>
      <div><div class="team-name">${match.away}</div><small>${match.group} · ${match.date} ${match.time}</small><div class="match-status ${String(match.status).toLowerCase() === 'live' ? 'live' : ''}">${statusLabel(match)}</div></div>
      <button class="btn btn-sm btn-outline-warning pick-match" data-match-id="${match.id}">${String(match.status).toLowerCase() === 'live' ? '进入直播' : '投注'}</button>
    </article>
  `).join('');
  const todayCount = $('today-count');
  if (todayCount) todayCount.textContent = demoMatches.filter(match => match.date === '2026-06-19' || String(match.status).toLowerCase() === 'live').length;
}

function renderOutrights() {
  const markets = outrights.length ? outrights : [
    { label: '冠军', selections: [{ name: 'Brazil', odds: 5.2 }, { name: 'France', odds: 6.1 }, { name: 'Argentina', odds: 6.4 }, { name: 'England', odds: 7.2 }] },
    { label: '小组冠军 · Group I', selections: [{ name: 'France', odds: 1.62 }, { name: 'Norway', odds: 3.4 }, { name: 'Senegal', odds: 4.1 }, { name: 'Suriname', odds: 26 }] }
  ];
  const board = $('outrights-board');
  if (!board) return;
  board.innerHTML = markets.map(market => `<article class="outright-market"><strong>${market.label}</strong>${market.selections.map(item => `<button class="market-line" type="button"><span>${item.name}</span><b>${Number(item.odds).toFixed(2)}</b></button>`).join('')}</article>`).join('');
}

function renderTopScorers() {
  const players = topScorers.length ? topScorers : [
    { rank: 1, name: 'Kylian Mbappé', team: 'France', goals: 3 },
    { rank: 2, name: 'Lionel Messi', team: 'Argentina', goals: 3 },
    { rank: 3, name: 'Harry Kane', team: 'England', goals: 2 },
    { rank: 4, name: 'Vinícius Jr.', team: 'Brazil', goals: 2 },
    { rank: 5, name: 'Erling Haaland', team: 'Norway', goals: 2 }
  ];
  const board = $('top-scorers-board');
  if (!board) return;
  board.innerHTML = players.slice(0, 10).map(player => `<div class="scorer-row"><span>#${player.rank}</span><strong>${player.name}</strong><small>${player.team}</small><b>${player.goals} 球</b></div>`).join('');
}


function renderTeams() {
  $('teams-grid').innerHTML = teams.map(team => `
    <article class="team-card">
      <small>Group ${team[1]}</small>
      <strong>${team[0]}</strong>
      <p class="mb-2 text-secondary">核心球员：${team[3]}</p>
      <div class="meter"><span style="width:${team[2]}%"></span></div>
      <div class="team-meta"><span>Group ${team[1]}</span><span>Power ${team[2]}</span><span>FIFA 2026</span></div>
    </article>
  `).join('');
}

function renderStandings() {
  const groups = standingsGroups.length ? standingsGroups : ['A', 'B', 'C', 'D', 'E'].map(group => ({
    group: `Group ${group}`,
    rows: teams.filter(team => team[1] === group).map((team, index) => ({ team: team[0], played: index + 1, win: index ? 0 : 1, draw: index ? 1 : 0, loss: 0, points: index ? 1 : 3 }))
  }));

  $('standings-content').innerHTML = groups.map(group => `
    <article class="standing-card">
      <strong>${group.group}</strong>
      <div class="standing-row text-secondary"><span>Team</span><b>场</b><b>胜</b><b>平</b><b>净</b><b>分</b></div>
      ${group.rows.map(row => `
        <div class="standing-row"><span>${row.team}</span><b>${row.played}</b><b>${row.win}</b><b>${row.draw}</b><b>${row.gd ?? 0}</b><b>${row.points}</b></div>
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
        <small class="text-warning">推荐：${moneylineLabel(top[0])}</small><small class="prediction-model">模型：${predictionOverrides.find(item => item.matchId === match.id)?.model || 'FIFA-2026-World / Odds implied'}</small>
      </article>
    `;
  }).join('');

  const topPick = $('top-pick');
  if (topPick) topPick.textContent = best;
}

function selectBet(selection, matchId = selectedMatchId) {
  const match = demoMatches.find(item => item.id === matchId) || demoMatches[0];
  const odds = getCurrentOdds(match.id);
  selectedMatchId = match.id;
  selectedBet = {
    matchId: match.id,
    matchLabel: `${match.home} vs ${match.away}`,
    matchDate: match.date,
    selection,
    selectionLabel: moneylineLabel(selection),
    odds: odds[selection]
  };
  renderBetSlip();
}

function renderBetSlip() {
  const slip = $('bet-slip');
  const empty = $('bet-slip-empty');
  if (!slip || !empty) return;
  if (!selectedBet) {
    slip.classList.add('d-none');
    empty.classList.remove('d-none');
    return;
  }
  const stake = Number.parseInt($('stake-input')?.value || '10', 10) || 10;
  empty.classList.add('d-none');
  slip.classList.remove('d-none');
  $('bet-slip-match').innerHTML = `<div class="team-name">${selectedBet.matchLabel}</div><div class="small text-secondary">${selectedBet.matchDate} · ${selectedBet.selectionLabel} @ ${Number(selectedBet.odds).toFixed(2)}</div>`;
  $('bet-slip-return').textContent = `${(stake * selectedBet.odds).toFixed(2)} PTS`;
}

async function placeBet(selection = selectedBet?.selection, matchId = selectedBet?.matchId || selectedMatchId) {
  if (!selection) return alert('请先选择一个赔率加入投注单。');
  if (!requireLogin('请先注册/登录，领取模拟积分后即可投注。')) return;
  const stake = Number.parseInt($('stake-input')?.value || '0', 10);
  if (!Number.isFinite(stake) || stake <= 0) return alert('请输入有效投注积分。');
  if (currentUser.points < stake) return alert('积分不足，请先充值。');
  const match = demoMatches.find(item => item.id === matchId) || demoMatches[0];
  const odds = selectedBet?.matchId === match.id && selectedBet?.selection === selection ? selectedBet.odds : getCurrentOdds(match.id)[selection];
  $('odds-panel').innerHTML = oddsButtons(selectedMatchId);
  $('hero-odds').innerHTML = oddsButtons(selectedMatchId, 'quick-odd');
}

function statusLabel(match) {
  const status = String(match.status || '').toUpperCase();
  if (status === 'LIVE' || status === 'IN_PLAY') return `LIVE ${match.minute ? match.minute + '′' : ''}`;
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FT';
  return 'UPCOMING';
}

function renderMatches() {
  const html = demoMatches.map(match => `
    <article class="match-card">
      <div><div class="team-name">${match.home}</div><small>${match.venue}</small><div class="match-stats">控球 ${match.stats?.possession || '-'} · 射门 ${match.stats?.shots || '-'}</div></div>
      <div class="score-pill">${match.score}</div>
      <div><div class="team-name">${match.away}</div><small>${match.group} · ${match.date} ${match.time}</small><div class="match-status ${String(match.status).toLowerCase() === 'live' ? 'live' : ''}">${statusLabel(match)}</div></div>
      <button class="btn btn-sm btn-outline-warning pick-match" data-match-id="${match.id}">${String(match.status).toLowerCase() === 'live' ? '进入直播' : '投注'}</button>
    </article>
  `).join('');

  $('featured-matches').innerHTML = html;
  $('schedule-list').innerHTML = html;
  const today = new Date().toISOString().slice(0, 10);
  $('today-count').textContent = demoMatches.filter(match => match.date === today || String(match.status).toLowerCase() === 'live').length;
}

function renderTeams() {
  $('teams-grid').innerHTML = teams.map(team => `
    <article class="team-card">
      <small>Group ${team[1]}</small>
      <strong>${team[0]}</strong>
      <p class="mb-2 text-secondary">核心球员：${team[3]}</p>
      <div class="meter"><span style="width:${team[2]}%"></span></div>
      <div class="team-meta"><span>Group ${team[1]}</span><span>Power ${team[2]}</span><span>FIFA 2026</span></div>
    </article>
  `).join('');
}

function renderStandings() {
  const groups = standingsGroups.length ? standingsGroups : ['A', 'B', 'C', 'D', 'E'].map(group => ({
    group: `Group ${group}`,
    rows: teams.filter(team => team[1] === group).map((team, index) => ({ team: team[0], played: index + 1, win: index ? 0 : 1, draw: index ? 1 : 0, loss: 0, points: index ? 1 : 3 }))
  }));

  $('standings-content').innerHTML = groups.map(group => `
    <article class="standing-card">
      <strong>${group.group}</strong>
      <div class="standing-row text-secondary"><span>Team</span><b>场</b><b>胜</b><b>平</b><b>净</b><b>分</b></div>
      ${group.rows.map(row => `
        <div class="standing-row"><span>${row.team}</span><b>${row.played}</b><b>${row.win}</b><b>${row.draw}</b><b>${row.gd ?? 0}</b><b>${row.points}</b></div>
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
        <small class="text-warning">推荐：${moneylineLabel(top[0])}</small><small class="prediction-model">模型：${predictionOverrides.find(item => item.matchId === match.id)?.model || 'FIFA-2026-World / Odds implied'}</small>
      </article>
    `;
  }).join('');

  $('top-pick').textContent = best;
}

async function placeBet(selection = selectedBet?.selection, matchId = selectedBet?.matchId || selectedMatchId) {
  if (!selection) return alert('请先选择一个赔率加入投注单。');
  if (!requireLogin('请先注册/登录，领取模拟积分后即可投注。')) return;

  const stake = Number.parseInt($('stake-input')?.value || '0', 10);
  if (!Number.isFinite(stake) || stake <= 0) return alert('请输入有效投注积分。');
  if (currentUser.points < stake) return alert('积分不足，请先充值。');

  const match = demoMatches.find(item => item.id === matchId) || demoMatches[0];
  const odds = selectedBet?.matchId === match.id && selectedBet?.selection === selection ? selectedBet.odds : getCurrentOdds(match.id)[selection];
  const betPayload = {
    matchId: match.id,
    matchLabel: `${match.home} vs ${match.away}`,
    matchDate: match.date,
    selection,
    selectionLabel: moneylineLabel(selection),
    stake,
    odds,
    potentialReturn: Number((stake * odds).toFixed(2))
  };

  try {
    const payload = await apiRequest('/api/bets', { method: 'POST', body: JSON.stringify(betPayload) });
    currentUser = payload.user;
    selectedBet = null;
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
  const externalTotal = externalPools.reduce((sum, bet) => sum + Number(bet.stake || bet.amount || 0), 0);
  const totalPoolPoints = $('total-pool-points');
  if (totalPoolPoints) totalPoolPoints.textContent = `${bets.reduce((sum, bet) => sum + bet.stake, 0)} PTS 本站 / ${externalTotal} PTS 外部`;
  $('total-pool-points').textContent = `${bets.reduce((sum, bet) => sum + bet.stake, 0)} PTS 本站 / ${externalTotal} PTS 外部`;
  $('betting-pool').innerHTML = demoMatches.map(match => {
    const matchBets = bets.filter(bet => bet.matchId === match.id);
    const total = matchBets.reduce((sum, bet) => sum + bet.stake, 0);
    const options = ['HOME', 'DRAW', 'AWAY'].map(selection => {
      const amount = matchBets.filter(bet => bet.selection === selection).reduce((sum, bet) => sum + bet.stake, 0);
      const pct = total ? Math.round((amount / total) * 100) : 0;
      return `<div class="pool-option"><span>${moneylineLabel(selection)}</span><div class="progress"><div class="progress-bar bg-warning" style="width:${pct}%"></div></div><small>${amount} PTS · ${pct}%</small></div>`;
    }).join('');
    const externalTotal = externalPools.filter(bet => bet.matchId === match.id).reduce((sum, bet) => sum + Number(bet.stake || bet.amount || 0), 0);
    return `<article class="pool-card"><div class="d-flex justify-content-between"><strong>${match.home} vs ${match.away}</strong><span>${total} PTS 本站 · ${externalTotal} PTS 外部</span></div>${options}</article>`;
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
    hideModalById('walletModal');
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
  renderOutrights();
  renderTopScorers();
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
    const matchSelect = $('match-select');
    if (matchSelect) matchSelect.value = selectedMatchId;
    $('match-select').value = selectedMatchId;
    renderSelectedMatch();
    renderOdds();
    if (pick.classList.contains('pick-match') || pick.classList.contains('result-card')) showRoute('home');
  }

  const odd = event.target.closest('[data-selection]');
  if (odd) selectBet(odd.dataset.selection, odd.dataset.matchId || selectedMatchId);

  const dateFilter = event.target.closest('[data-date-filter]');
  if (dateFilter) {
    activeDateFilter = dateFilter.dataset.dateFilter;
    document.querySelectorAll('[data-date-filter]').forEach(button => button.classList.toggle('active', button === dateFilter));
    renderMatches();
  }
  if (odd) placeBet(odd.dataset.selection, odd.dataset.matchId || selectedMatchId);
}

async function boot() {
  await restoreSession();
  await loadFifa2026Data();
  renderMatchSelect();
  await renderAllDynamic();

  const matchSelect = $('match-select');
  if (matchSelect) matchSelect.addEventListener('change', event => {
    selectedMatchId = event.target.value;
    renderSelectedMatch();
    renderOdds();
  });
  const stakeInput = $('stake-input');
  if (stakeInput) stakeInput.addEventListener('input', renderBetSlip);
  const confirmBet = $('confirm-bet');
  if (confirmBet) confirmBet.addEventListener('click', () => placeBet());
  $('language-select').value = currentLanguage;
  applyLanguage(currentLanguage);
  $('language-select').addEventListener('change', event => { applyLanguage(event.target.value); renderAllDynamic(); });
  $('site-search').addEventListener('input', event => renderSearchResults(event.target.value));
  $('register-pane').addEventListener('submit', registerUser);
  $('login-pane').addEventListener('submit', loginUser);
  $('logout-button').addEventListener('click', logoutUser);
  $('redeem-card').addEventListener('click', redeemCard);
  $('refresh-pool').addEventListener('click', () => renderBettingPool());
  $('clear-bets').addEventListener('click', clearMyBets);
  document.body.addEventListener('click', event => {
    const dismiss = event.target.closest('[data-bs-dismiss="modal"]');
    if (dismiss && !window.bootstrap?.Modal) hideModalById(dismiss.closest('.modal')?.id);
    handleBodyClick(event);
  });
  // Homepage itself is now the World Win 26 promotion page; keep the modal available but do not cover the landing view on first load.
  showPromoModal();
  setInterval(() => {
    renderOdds();
    renderLiveOdds();
    renderPrediction();
  }, 20000);
}

document.addEventListener('DOMContentLoaded', boot);
