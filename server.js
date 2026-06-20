const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');
const ROOT_DIR = path.resolve(__dirname);
const DB_FILE_PATH = path.resolve(DB_PATH);
const DATA_DIR = path.resolve(__dirname, 'data');
const CARD_WEBHOOK_SECRET = process.env.CARD_WEBHOOK_SECRET || 'dev-card-secret';
const STARTING_POINTS = 500;
const FREE_FIFA_API_BASE = process.env.FREE_FIFA_API_BASE || 'https://worldcup26.ir';
const DISABLE_FREE_FIFA_API = process.env.DISABLE_FREE_FIFA_API === 'true';


const demoMatches = [
  { id: 'wc2026-001', date: '2026-06-11', time: '20:00', home: 'Mexico', away: 'South Africa', group: 'Group A', venue: 'Estadio Azteca', status: 'FT', score: '2 - 1', stats: { possession: '57% - 43%', shots: '14 - 8', corners: '6 - 3' } },
  { id: 'wc2026-002', date: '2026-06-11', time: '23:00', home: 'Denmark', away: 'South Korea', group: 'Group A', venue: 'Estadio BBVA', status: 'FT', score: '1 - 1', stats: { possession: '51% - 49%', shots: '10 - 11', corners: '4 - 5' } },
  { id: 'wc2026-003', date: '2026-06-12', time: '18:00', home: 'Canada', away: 'Italy', group: 'Group B', venue: 'BMO Field', status: 'FT', score: '1 - 2', stats: { possession: '48% - 52%', shots: '9 - 13', corners: '3 - 6' } },
  { id: 'wc2026-004', date: '2026-06-12', time: '21:00', home: 'Qatar', away: 'Switzerland', group: 'Group B', venue: 'Levi\'s Stadium', status: 'FT', score: '0 - 0', stats: { possession: '46% - 54%', shots: '6 - 9', corners: '2 - 5' } },
  { id: 'wc2026-005', date: '2026-06-13', time: '19:00', home: 'Brazil', away: 'Morocco', group: 'Group C', venue: 'SoFi Stadium', status: 'FT', score: '3 - 1', stats: { possession: '61% - 39%', shots: '18 - 7', corners: '8 - 2' } },
  { id: 'wc2026-006', date: '2026-06-13', time: '22:00', home: 'Haiti', away: 'Scotland', group: 'Group C', venue: 'AT&T Stadium', status: 'FT', score: '1 - 1', stats: { possession: '44% - 56%', shots: '8 - 12', corners: '3 - 4' } },
  { id: 'wc2026-007', date: '2026-06-14', time: '18:00', home: 'United States', away: 'Paraguay', group: 'Group D', venue: 'MetLife Stadium', status: 'FT', score: '2 - 0', stats: { possession: '55% - 45%', shots: '15 - 9', corners: '7 - 4' } },
  { id: 'wc2026-008', date: '2026-06-14', time: '21:00', home: 'Australia', away: 'Romania', group: 'Group D', venue: 'BC Place', status: 'FT', score: '0 - 1', stats: { possession: '50% - 50%', shots: '8 - 10', corners: '5 - 5' } },
  { id: 'wc2026-009', date: '2026-06-15', time: '18:00', home: 'Germany', away: 'Curaçao', group: 'Group E', venue: 'NRG Stadium', status: 'FT', score: '4 - 0', stats: { possession: '69% - 31%', shots: '22 - 3', corners: '9 - 1' } },
  { id: 'wc2026-010', date: '2026-06-15', time: '21:00', home: 'Ecuador', away: 'Ivory Coast', group: 'Group E', venue: 'Lincoln Financial Field', status: 'FT', score: '1 - 1', stats: { possession: '49% - 51%', shots: '10 - 10', corners: '4 - 4' } },
  { id: 'wc2026-011', date: '2026-06-16', time: '18:00', home: 'Japan', away: 'Netherlands', group: 'Group F', venue: 'Lumen Field', status: 'FT', score: '1 - 2', stats: { possession: '47% - 53%', shots: '11 - 14', corners: '4 - 7' } },
  { id: 'wc2026-012', date: '2026-06-16', time: '21:00', home: 'Poland', away: 'Tunisia', group: 'Group F', venue: 'Arrowhead Stadium', status: 'FT', score: '2 - 2', stats: { possession: '52% - 48%', shots: '13 - 10', corners: '6 - 3' } },
  { id: 'wc2026-013', date: '2026-06-17', time: '18:00', home: 'Belgium', away: 'Egypt', group: 'Group G', venue: 'Mercedes-Benz Stadium', status: 'FT', score: '2 - 1', stats: { possession: '58% - 42%', shots: '16 - 8', corners: '7 - 2' } },
  { id: 'wc2026-014', date: '2026-06-17', time: '21:00', home: 'Iran', away: 'New Zealand', group: 'Group G', venue: 'Gillette Stadium', status: 'FT', score: '1 - 0', stats: { possession: '54% - 46%', shots: '12 - 7', corners: '5 - 2' } },
  { id: 'wc2026-015', date: '2026-06-18', time: '18:00', home: 'Spain', away: 'Cape Verde', group: 'Group H', venue: 'Hard Rock Stadium', status: 'FT', score: '3 - 0', stats: { possession: '72% - 28%', shots: '21 - 4', corners: '10 - 1' } },
  { id: 'wc2026-016', date: '2026-06-18', time: '21:00', home: 'Uruguay', away: 'Saudi Arabia', group: 'Group H', venue: 'Camping World Stadium', status: 'FT', score: '2 - 0', stats: { possession: '57% - 43%', shots: '14 - 6', corners: '5 - 3' } },
  { id: 'wc2026-usa-aus', date: '2026-06-19', time: '14:00', home: '美国', away: '澳大利亚', group: '分组赛阶段。D组。第2轮', venue: 'Arrowhead Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-sco-mar', date: '2026-06-19', time: '17:00', home: '苏格兰', away: '摩洛哥', group: '分组赛阶段。C组。第2轮', venue: 'AT&T Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-bra-hai', date: '2026-06-19', time: '19:30', home: '巴西', away: '海地', group: '分组赛阶段。C组。第2轮', venue: 'SoFi Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-tur-par', date: '2026-06-19', time: '22:00', home: '土耳其', away: '巴拉圭', group: '分组赛阶段。D组。第2轮', venue: 'MetLife Stadium', status: 'soon', score: '- : -', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-017', date: '2026-06-19', time: '17:00', home: 'France', away: 'Senegal', group: 'Group I', venue: 'Rose Bowl', status: 'live', score: '1 - 1', minute: 64, stats: { possession: '60% - 40%', shots: '12 - 7', corners: '6 - 2' } },
  { id: 'wc2026-018', date: '2026-06-19', time: '20:00', home: 'Norway', away: 'Suriname', group: 'Group I', venue: 'Allegiant Stadium', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-019', date: '2026-06-20', time: '18:00', home: 'Argentina', away: 'Algeria', group: 'Group J', venue: 'AT&T Stadium', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-020', date: '2026-06-20', time: '21:00', home: 'Austria', away: 'Jordan', group: 'Group J', venue: 'Estadio Akron', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-021', date: '2026-06-21', time: '18:00', home: 'Portugal', away: 'New Caledonia', group: 'Group K', venue: 'MetLife Stadium', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-022', date: '2026-06-21', time: '21:00', home: 'Colombia', away: 'Uzbekistan', group: 'Group K', venue: 'NRG Stadium', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-023', date: '2026-06-22', time: '18:00', home: 'England', away: 'Croatia', group: 'Group L', venue: 'SoFi Stadium', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } },
  { id: 'wc2026-024', date: '2026-06-22', time: '21:00', home: 'Ghana', away: 'Panama', group: 'Group L', venue: 'BMO Field', status: 'soon', score: '0 - 0', stats: { possession: '-', shots: '-', corners: '-' } }
];

const demoTeams = [
  ['Denmark', 'A', 85, 'C. Eriksen'],
  ['Mexico', 'A', 84, 'S. Giménez'],
  ['South Africa', 'A', 72, 'P. Tau'],
  ['South Korea', 'A', 82, 'Son Heung-min'],
  ['Canada', 'B', 79, 'A. Davies'],
  ['Italy', 'B', 88, 'N. Barella'],
  ['Qatar', 'B', 74, 'A. Afif'],
  ['Switzerland', 'B', 83, 'G. Xhaka'],
  ['Brazil', 'C', 91, 'Vinícius Jr.'],
  ['Haiti', 'C', 68, 'D. Nazon'],
  ['Morocco', 'C', 83, 'A. Hakimi'],
  ['Scotland', 'C', 78, 'S. McTominay'],
  ['Australia', 'D', 77, 'M. Duke'],
  ['Paraguay', 'D', 76, 'M. Almirón'],
  ['Romania', 'D', 75, 'N. Stanciu'],
  ['United States', 'D', 81, 'C. Pulisic'],
  ['Curaçao', 'E', 69, 'L. Bacuna'],
  ['Ecuador', 'E', 80, 'M. Caicedo'],
  ['Germany', 'E', 88, 'J. Musiala'],
  ['Ivory Coast', 'E', 79, 'S. Adingra'],
  ['Japan', 'F', 82, 'K. Mitoma'],
  ['Netherlands', 'F', 89, 'V. van Dijk'],
  ['Poland', 'F', 81, 'R. Lewandowski'],
  ['Tunisia', 'F', 75, 'E. Skhiri'],
  ['Belgium', 'G', 86, 'K. De Bruyne'],
  ['Egypt', 'G', 81, 'M. Salah'],
  ['Iran', 'G', 77, 'M. Taremi'],
  ['New Zealand', 'G', 70, 'C. Wood'],
  ['Cape Verde', 'H', 73, 'Bebé'],
  ['Saudi Arabia', 'H', 74, 'S. Al-Dawsari'],
  ['Spain', 'H', 89, 'Pedri'],
  ['Uruguay', 'H', 84, 'F. Valverde'],
  ['France', 'I', 92, 'K. Mbappé'],
  ['Norway', 'I', 84, 'E. Haaland'],
  ['Senegal', 'I', 83, 'S. Mané'],
  ['Suriname', 'I', 68, 'S. Becker'],
  ['Algeria', 'J', 80, 'R. Mahrez'],
  ['Argentina', 'J', 90, 'L. Messi'],
  ['Austria', 'J', 81, 'D. Alaba'],
  ['Jordan', 'J', 72, 'M. Al-Taamari'],
  ['Colombia', 'K', 82, 'L. Díaz'],
  ['New Caledonia', 'K', 61, 'TBD'],
  ['Portugal', 'K', 89, 'C. Ronaldo'],
  ['Uzbekistan', 'K', 74, 'E. Shomurodov'],
  ['Croatia', 'L', 84, 'L. Modrić'],
  ['England', 'L', 90, 'J. Bellingham'],
  ['Ghana', 'L', 78, 'M. Kudus'],
  ['Panama', 'L', 73, 'A. Carrasquilla']
];

const demoOdds = {
  'wc2026-001': { HOME: 1.86, DRAW: 3.35, AWAY: 4.20 }, 'wc2026-002': { HOME: 2.18, DRAW: 3.10, AWAY: 3.05 },
  'wc2026-003': { HOME: 2.45, DRAW: 3.40, AWAY: 2.62 }, 'wc2026-004': { HOME: 1.72, DRAW: 3.85, AWAY: 5.20 },
  'wc2026-005': { HOME: 2.55, DRAW: 3.25, AWAY: 2.70 },
  'wc2026-usa-aus': { HOME: 1.64, DRAW: 3.82, AWAY: 5.05 },
  'wc2026-sco-mar': { HOME: 3.45, DRAW: 3.28, AWAY: 2.08 },
  'wc2026-bra-hai': { HOME: 1.18, DRAW: 6.40, AWAY: 13.0 },
  'wc2026-tur-par': { HOME: 2.20, DRAW: 3.15, AWAY: 3.25 },
  'wc2026-005': { HOME: 2.55, DRAW: 3.25, AWAY: 2.70 }, 'wc2026-final': { HOME: 2.05, DRAW: 3.25, AWAY: 3.45 }
};

function demoStandings() {
  const table = new Map(demoTeams.map(team => [team[0], { team: team[0], group: team[1], played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0, points: 0 }]));
  for (const match of demoMatches.filter(item => ['FT', 'AET', 'PEN'].includes(String(item.status).toUpperCase()))) {
    const [homeGoals, awayGoals] = match.score.split(' - ').map(Number);
    const home = table.get(match.home);
    const away = table.get(match.away);
    if (!home || !away || !Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;
    home.played += 1; away.played += 1;
    home.gf += homeGoals; home.ga += awayGoals; away.gf += awayGoals; away.ga += homeGoals;
    home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
    if (homeGoals > awayGoals) { home.win += 1; home.points += 3; away.loss += 1; }
    else if (homeGoals < awayGoals) { away.win += 1; away.points += 3; home.loss += 1; }
    else { home.draw += 1; away.draw += 1; home.points += 1; away.points += 1; }
  }
  return Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index)).map(group => ({
    group: `Group ${group}`,
    rows: Array.from(table.values()).filter(row => row.group === group).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
  }));
}

const poissonModelProbabilities = {
  'wc2026-001': { HOME: 55, DRAW: 26, AWAY: 19 },
  'wc2026-005': { HOME: 60, DRAW: 24, AWAY: 16 },
  'wc2026-009': { HOME: 82, DRAW: 13, AWAY: 5 },
  'wc2026-015': { HOME: 76, DRAW: 17, AWAY: 7 },
  'wc2026-017': { HOME: 62, DRAW: 23, AWAY: 15 },
  'wc2026-019': { HOME: 69, DRAW: 20, AWAY: 11 },
  'wc2026-021': { HOME: 91, DRAW: 8, AWAY: 1 },
  'wc2026-023': { HOME: 57, DRAW: 25, AWAY: 18 }
};

function buildDemoPredictions() {
  return demoMatches.map(match => ({
    matchId: match.id,
    model: poissonModelProbabilities[match.id] ? 'FIFA-2026-World Poisson sample' : 'odds-implied fallback',
    probabilities: poissonModelProbabilities[match.id] || impliedProbabilities(demoOdds[match.id] || { HOME: 2, DRAW: 3.2, AWAY: 3.4 })
  }));
}

function impliedProbabilities(odds) {
  const inverse = { HOME: 1 / odds.HOME, DRAW: 1 / odds.DRAW, AWAY: 1 / odds.AWAY };
  const total = inverse.HOME + inverse.DRAW + inverse.AWAY;
  return { HOME: Math.round((inverse.HOME / total) * 100), DRAW: Math.round((inverse.DRAW / total) * 100), AWAY: Math.round((inverse.AWAY / total) * 100) };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PROVIDER_TIMEOUT_MS || 3500));
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Provider ${url} returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.response)) return payload.response;
  return [];
}

async function fetchFreeWorldCup(path) {
  if (DISABLE_FREE_FIFA_API) throw new Error('Free FIFA API disabled');
  return fetchJson(`${FREE_FIFA_API_BASE.replace(/\/$/, '')}/get/${path}`);
}

function normalizeFreeGame(item, index) {
  const home = item.home_team || item.homeTeam || item.home_name || item.home?.name || item.team1 || item.team_a || item.home || 'TBD Home';
  const away = item.away_team || item.awayTeam || item.away_name || item.away?.name || item.team2 || item.team_b || item.away || 'TBD Away';
  const dateRaw = item.date || item.match_date || item.fixture?.date || item.datetime || '';
  const homeGoals = item.home_score ?? item.homeScore ?? item.goals?.home ?? item.score_home ?? 0;
  const awayGoals = item.away_score ?? item.awayScore ?? item.goals?.away ?? item.score_away ?? 0;
  return {
    id: String(item.id || item.match_id || item.fixture?.id || `wc2026-live-${index + 1}`),
    date: String(dateRaw).slice(0, 10) || item.day || '2026-06-11',
    time: String(dateRaw).slice(11, 16) || item.time || 'TBD',
    home,
    away,
    group: item.group || item.stage || item.round || item.matchday || 'FIFA 2026',
    venue: item.venue || item.stadium || item.stadium_name || item.fixture?.venue?.name || 'TBD',
    status: item.status || item.fixture?.status?.short || 'soon',
    score: `${homeGoals ?? 0} - ${awayGoals ?? 0}`
  };
}

function normalizeFreeTeam(item, index) {
  return [
    item.name || item.name_en || item.team || item.country || `Team ${index + 1}`,
    item.group || item.group_name || item.group_letter || '-',
    Number(item.rating || item.rank_score || Math.max(60, 95 - index)),
    item.captain || item.key_player || item.fifa_code || item.code || 'TBD'
  ];
}

function normalizeFreeStandings(payload) {
  const groups = unwrapArray(payload, ['groups', 'standings', 'tables']);
  return groups.map((group, groupIndex) => {
    const rows = unwrapArray(group, ['teams', 'rows', 'standings']).map((row, rowIndex) => ({
      team: row.team || row.name || row.name_en || row.country || `Team ${rowIndex + 1}`,
      played: Number(row.played ?? row.p ?? row.matches ?? 0),
      win: Number(row.win ?? row.w ?? row.wins ?? 0),
      draw: Number(row.draw ?? row.d ?? row.draws ?? 0),
      loss: Number(row.loss ?? row.l ?? row.losses ?? 0),
      points: Number(row.points ?? row.pts ?? 0)
    }));
    return { group: group.group || group.name || group.group_name || `Group ${String.fromCharCode(65 + groupIndex)}`, rows };
  }).filter(group => group.rows.length);
}

async function getFixturesData() {
  try {
    const payload = await fetchFreeWorldCup('games');
    const matches = unwrapArray(payload, ['games', 'matches', 'fixtures']).map(normalizeFreeGame).filter(match => match.home !== 'TBD Home' || match.away !== 'TBD Away');
    if (matches.length) return { source: 'worldcup26-free-api', matches };
  } catch (error) {
    console.warn('[fixtures] free FIFA API unavailable:', error.message);
  }

  if (!process.env.API_SPORTS_KEY) return { source: 'demo-fallback', matches: demoMatches };
  const payload = await fetchJson('https://v3.football.api-sports.io/fixtures?league=1&season=2026', { headers: { 'x-apisports-key': process.env.API_SPORTS_KEY } });
  const matches = (payload.response || []).map(item => ({
    id: String(item.fixture.id), date: (item.fixture.date || '').slice(0, 10), time: (item.fixture.date || '').slice(11, 16),
    home: item.teams.home.name, away: item.teams.away.name, group: item.league.round || 'FIFA 2026', venue: item.fixture.venue?.name || 'TBD',
    status: item.fixture.status?.short === 'NS' ? 'soon' : 'live', score: `${item.goals.home ?? 0} - ${item.goals.away ?? 0}`
  }));
  return { source: 'api-sports', matches: matches.length ? matches : demoMatches };
}

async function getTeamsData() {
  try {
    const payload = await fetchFreeWorldCup('teams');
    const teams = unwrapArray(payload, ['teams']).map(normalizeFreeTeam);
    if (teams.length) return { source: 'worldcup26-free-api', teams };
  } catch (error) {
    console.warn('[teams] free FIFA API unavailable:', error.message);
  }
  return { source: process.env.API_SPORTS_KEY ? 'api-sports-ready' : 'demo-fallback', teams: demoTeams };
}

async function getStandingsData() {
  try {
    const payload = await fetchFreeWorldCup('groups');
    const standings = normalizeFreeStandings(payload);
    if (standings.length) return { source: 'worldcup26-free-api', standings };
  } catch (error) {
    console.warn('[standings] free FIFA API unavailable:', error.message);
  }
  return { source: process.env.API_SPORTS_KEY ? 'api-sports-ready' : 'demo-fallback', standings: demoStandings() };
}

async function getOddsData() {
  if (!process.env.ODDS_API_KEY) return { source: 'demo', oddsByMatchId: demoOdds };
  const sport = process.env.ODDS_API_SPORT_KEY || 'soccer_fifa_world_cup';
  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${process.env.ODDS_API_KEY}&regions=us,eu&markets=h2h&oddsFormat=decimal`;
  const payload = await fetchJson(url);
  const oddsByMatchId = { ...demoOdds };
  for (const match of demoMatches) {
    const market = payload.find(item => [item.home_team, item.away_team].includes(match.home) && [item.home_team, item.away_team].includes(match.away));
    const outcomes = market?.bookmakers?.[0]?.markets?.find(item => item.key === 'h2h')?.outcomes || [];
    const home = outcomes.find(item => item.name === match.home)?.price;
    const away = outcomes.find(item => item.name === match.away)?.price;
    const draw = outcomes.find(item => item.name === 'Draw')?.price;
    if (home && away && draw) oddsByMatchId[match.id] = { HOME: home, DRAW: draw, AWAY: away };
  }
  return { source: 'the-odds-api', oddsByMatchId };
}

async function getExternalPoolsData(db) {
  if (process.env.EXTERNAL_POOL_API_URL) {
    const payload = await fetchJson(process.env.EXTERNAL_POOL_API_URL);
    return { source: 'external', pools: payload.pools || payload };
  }
  return { source: 'local', pools: db.bets };
}

async function getPredictionsData() {
  if (process.env.PREDICTION_API_URL) {
    const payload = await fetchJson(process.env.PREDICTION_API_URL);
    return { source: 'world-2026-prediction-model', predictions: payload.predictions || payload };
  }
  return { source: 'demo-model', predictions: buildDemoPredictions() };
}


async function getOutrightsData() {
  if (process.env.OUTRIGHTS_API_URL) {
    const payload = await fetchJson(process.env.OUTRIGHTS_API_URL);
    return { source: 'external', markets: payload.markets || payload.outrights || payload };
  }
  return {
    source: 'demo-market',
    markets: [
      { label: '冠军 · Winner 2026', selections: [{ name: 'Brazil', odds: 5.2 }, { name: 'France', odds: 6.1 }, { name: 'Argentina', odds: 6.4 }, { name: 'England', odds: 7.2 }, { name: 'Spain', odds: 8.1 }] },
      { label: '小组冠军 · Group I', selections: [{ name: 'France', odds: 1.62 }, { name: 'Norway', odds: 3.4 }, { name: 'Senegal', odds: 4.1 }, { name: 'Suriname', odds: 26 }] }
    ]
  };
}

async function getTopScorersData() {
  if (process.env.TOP_SCORERS_API_URL) {
    const payload = await fetchJson(process.env.TOP_SCORERS_API_URL);
    return { source: 'external', players: payload.players || payload.scorers || payload };
  }
  return {
    source: 'demo-stats',
    players: [
      { rank: 1, name: 'Kylian Mbappé', team: 'France', goals: 3 },
      { rank: 2, name: 'Lionel Messi', team: 'Argentina', goals: 3 },
      { rank: 3, name: 'Harry Kane', team: 'England', goals: 2 },
      { rank: 4, name: 'Vinícius Jr.', team: 'Brazil', goals: 2 },
      { rank: 5, name: 'Erling Haaland', team: 'Norway', goals: 2 },
      { rank: 6, name: 'Cristiano Ronaldo', team: 'Portugal', goals: 2 },
      { rank: 7, name: 'Jamal Musiala', team: 'Germany', goals: 2 },
      { rank: 8, name: 'Lautaro Martínez', team: 'Argentina', goals: 1 },
      { rank: 9, name: 'Pedri', team: 'Spain', goals: 1 },
      { rank: 10, name: 'Mohamed Salah', team: 'Egypt', goals: 1 }
    ]
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function ensureDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    writeDb({
      users: [],
      sessions: [],
      bets: [],
      cards: [
        { code: 'DEMO-2026', points: 100, source: 'seed', status: 'active', redeemedBy: null, redeemedAt: null, orderId: 'seed-demo-2026' },
        { code: 'CARD-500', points: 500, source: 'seed', status: 'active', redeemedBy: null, redeemedAt: null, orderId: 'seed-card-500' }
      ]
    });
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, `${JSON.stringify(db, null, 2)}\n`);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); }
    });
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, points: user.points, createdAt: user.createdAt };
}

function getAuthUser(req, db) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const session = db.sessions.find(item => item.token === token && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  return db.users.find(user => user.id === session.userId) || null;
}

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({ token, userId, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() });
  return token;
}

async function handleApi(req, res) {
  const db = readDb();
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/fixtures') return sendJson(res, 200, await getFixturesData());
    if (req.method === 'GET' && url.pathname === '/api/teams') return sendJson(res, 200, await getTeamsData());
    if (req.method === 'GET' && url.pathname === '/api/standings') return sendJson(res, 200, await getStandingsData());
    if (req.method === 'GET' && url.pathname === '/api/odds') return sendJson(res, 200, await getOddsData());
    if (req.method === 'GET' && url.pathname === '/api/external-pools') return sendJson(res, 200, await getExternalPoolsData(db));
    if (req.method === 'GET' && url.pathname === '/api/predictions') return sendJson(res, 200, await getPredictionsData());
    if (req.method === 'GET' && url.pathname === '/api/outrights') return sendJson(res, 200, await getOutrightsData());
    if (req.method === 'GET' && url.pathname === '/api/top-scorers') return sendJson(res, 200, await getTopScorersData());

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (name.length < 2) return sendError(res, 400, '用户名至少需要 2 个字符。');
      if (!email.includes('@')) return sendError(res, 400, '请输入有效邮箱。');
      if (password.length < 6) return sendError(res, 400, '密码至少需要 6 位。');
      if (!body.ageConfirmed) return sendError(res, 400, '请确认年龄与演示说明。');
      if (db.users.some(user => user.email === email)) return sendError(res, 409, '该邮箱已注册，请直接登录。');
      const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password), points: STARTING_POINTS, createdAt: new Date().toISOString() };
      db.users.push(user);
      const token = createSession(db, user.id);
      writeDb(db);
      return sendJson(res, 201, { user: publicUser(user), token });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const user = db.users.find(item => item.email === email);
      if (!user || !verifyPassword(String(body.password || ''), user.passwordHash)) return sendError(res, 401, '邮箱或密码不正确。');
      const token = createSession(db, user.id);
      writeDb(db);
      return sendJson(res, 200, { user: publicUser(user), token });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      const nextDb = { ...db, sessions: db.sessions.filter(session => session.token !== token) };
      writeDb(nextDb);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const user = getAuthUser(req, db);
      if (!user) return sendError(res, 401, '未登录。');
      return sendJson(res, 200, { user: publicUser(user) });
    }

    if (req.method === 'POST' && url.pathname === '/api/cards/redeem') {
      const user = getAuthUser(req, db);
      if (!user) return sendError(res, 401, '请先登录。');
      const body = await parseBody(req);
      const code = String(body.code || '').trim().toUpperCase();
      const card = db.cards.find(item => item.code.toUpperCase() === code);
      if (!card) return sendError(res, 404, '卡密不存在，请确认第三方发卡平台订单。');
      if (card.status !== 'active' || card.redeemedBy) return sendError(res, 409, '该卡密已被兑换或不可用。');
      card.status = 'redeemed';
      card.redeemedBy = user.id;
      card.redeemedAt = new Date().toISOString();
      user.points += Number(card.points || 0);
      writeDb(db);
      return sendJson(res, 200, { user: publicUser(user), card: { code: card.code, points: card.points, orderId: card.orderId } });
    }

    if (req.method === 'POST' && url.pathname === '/api/card-platform/cards') {
      if ((req.headers['x-card-platform-secret'] || '') !== CARD_WEBHOOK_SECRET) return sendError(res, 403, 'Invalid card platform secret.');
      const body = await parseBody(req);
      const code = String(body.code || '').trim().toUpperCase();
      const points = Number(body.points || 0);
      if (!code || points <= 0) return sendError(res, 400, 'code 和 points 必填。');
      if (db.cards.some(card => card.code.toUpperCase() === code)) return sendError(res, 409, '卡密已存在。');
      const card = { code, points, source: 'card-platform', status: 'active', redeemedBy: null, redeemedAt: null, orderId: String(body.orderId || ''), buyerEmail: String(body.buyerEmail || ''), issuedAt: new Date().toISOString() };
      db.cards.push(card);
      writeDb(db);
      return sendJson(res, 201, { card: { code: card.code, points: card.points, orderId: card.orderId } });
    }

    if (req.method === 'GET' && url.pathname === '/api/bets/me') {
      const user = getAuthUser(req, db);
      if (!user) return sendError(res, 401, '请先登录。');
      return sendJson(res, 200, { bets: db.bets.filter(bet => bet.userId === user.id) });
    }

    if (req.method === 'GET' && url.pathname === '/api/bets/pool') {
      return sendJson(res, 200, { bets: db.bets });
    }

    if (req.method === 'DELETE' && url.pathname === '/api/bets/me') {
      const user = getAuthUser(req, db);
      if (!user) return sendError(res, 401, '请先登录。');
      db.bets = db.bets.filter(bet => bet.userId !== user.id);
      writeDb(db);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/bets') {
      const user = getAuthUser(req, db);
      if (!user) return sendError(res, 401, '请先登录。');
      const body = await parseBody(req);
      const stake = Number.parseInt(body.stake, 10);
      if (!Number.isFinite(stake) || stake <= 0) return sendError(res, 400, '投注积分无效。');
      if (user.points < stake) return sendError(res, 409, '积分不足，请先充值。');
      const bet = { id: crypto.randomUUID(), userId: user.id, userName: user.name, matchId: body.matchId, matchLabel: body.matchLabel, matchDate: body.matchDate, selection: body.selection, selectionLabel: body.selectionLabel, stake, odds: Number(body.odds), potentialReturn: Number(body.potentialReturn), status: 'pending', createdAt: new Date().toISOString() };
      user.points -= stake;
      db.bets.unshift(bet);
      writeDb(db);
      return sendJson(res, 201, { user: publicUser(user), bet });
    }

    return sendError(res, 404, 'API not found.');
  } catch (error) {
    return sendError(res, 500, error.message || 'Server error.');
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname;
  try {
    pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  } catch (error) {
    return sendError(res, 400, 'Malformed URL encoding.');
  }

  const filePath = path.resolve(path.join(__dirname, pathname));
  if (filePath !== ROOT_DIR && !filePath.startsWith(`${ROOT_DIR}${path.sep}`)) return sendError(res, 403, 'Forbidden');
  if (filePath === DB_FILE_PATH || filePath.startsWith(`${DATA_DIR}${path.sep}`)) return sendError(res, 404, 'Not found');

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(__dirname, '404.html'), (notFoundError, notFoundContent) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFoundError ? 'Not found' : notFoundContent);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  ensureDb();
  console.log(`PredictWin running at http://localhost:${PORT}`);
});
