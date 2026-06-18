const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');
const CARD_WEBHOOK_SECRET = process.env.CARD_WEBHOOK_SECRET || 'dev-card-secret';
const STARTING_POINTS = 500;


const demoMatches = [
  { id: 'wc2026-001', date: '2026-06-11', time: '20:00', home: 'Mexico', away: 'South Africa', group: 'Group A', venue: 'Estadio Azteca', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-002', date: '2026-06-12', time: '18:00', home: 'Canada', away: 'Japan', group: 'Group B', venue: 'BMO Field', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-003', date: '2026-06-13', time: '21:00', home: 'United States', away: 'Germany', group: 'Group C', venue: 'MetLife Stadium', status: 'live', score: '1 - 1' },
  { id: 'wc2026-004', date: '2026-06-14', time: '17:00', home: 'Brazil', away: 'Morocco', group: 'Group D', venue: 'SoFi Stadium', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-005', date: '2026-06-15', time: '19:30', home: 'Argentina', away: 'Spain', group: 'Group E', venue: 'AT&T Stadium', status: 'soon', score: '0 - 0' },
  { id: 'wc2026-final', date: '2026-07-19', time: '19:00', home: 'TBD Finalist 1', away: 'TBD Finalist 2', group: 'Final', venue: 'MetLife Stadium', status: 'future', score: '0 - 0' }
];

const demoTeams = [
  ['Mexico', 'A', 84, 'S. Giménez'], ['South Africa', 'A', 72, 'P. Tau'], ['Canada', 'B', 79, 'A. Davies'],
  ['Japan', 'B', 82, 'K. Mitoma'], ['United States', 'C', 81, 'C. Pulisic'], ['Germany', 'C', 88, 'J. Musiala'],
  ['Brazil', 'D', 91, 'Vinícius Jr.'], ['Morocco', 'D', 83, 'A. Hakimi'], ['Argentina', 'E', 90, 'L. Messi'], ['Spain', 'E', 89, 'Pedri']
];

const demoOdds = {
  'wc2026-001': { HOME: 1.86, DRAW: 3.35, AWAY: 4.20 }, 'wc2026-002': { HOME: 2.18, DRAW: 3.10, AWAY: 3.05 },
  'wc2026-003': { HOME: 2.45, DRAW: 3.40, AWAY: 2.62 }, 'wc2026-004': { HOME: 1.72, DRAW: 3.85, AWAY: 5.20 },
  'wc2026-005': { HOME: 2.55, DRAW: 3.25, AWAY: 2.70 }, 'wc2026-final': { HOME: 2.05, DRAW: 3.25, AWAY: 3.45 }
};

function demoStandings() {
  return ['A', 'B', 'C', 'D', 'E'].map(group => ({
    group: `Group ${group}`,
    rows: demoTeams.filter(team => team[1] === group).map((team, index) => ({ team: team[0], played: index + 1, win: index ? 0 : 1, draw: index ? 1 : 0, loss: 0, points: index ? 1 : 3 }))
  }));
}

function buildDemoPredictions() {
  return demoMatches.map(match => ({ matchId: match.id, probabilities: impliedProbabilities(demoOdds[match.id] || { HOME: 2, DRAW: 3.2, AWAY: 3.4 }) }));
}

function impliedProbabilities(odds) {
  const inverse = { HOME: 1 / odds.HOME, DRAW: 1 / odds.DRAW, AWAY: 1 / odds.AWAY };
  const total = inverse.HOME + inverse.DRAW + inverse.AWAY;
  return { HOME: Math.round((inverse.HOME / total) * 100), DRAW: Math.round((inverse.DRAW / total) * 100), AWAY: Math.round((inverse.AWAY / total) * 100) };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Provider ${url} returned ${response.status}`);
  return response.json();
}

async function getFixturesData() {
  if (!process.env.API_SPORTS_KEY) return { source: 'demo', matches: demoMatches };
  const payload = await fetchJson('https://v3.football.api-sports.io/fixtures?league=1&season=2026', { headers: { 'x-apisports-key': process.env.API_SPORTS_KEY } });
  const matches = (payload.response || []).map(item => ({
    id: String(item.fixture.id), date: (item.fixture.date || '').slice(0, 10), time: (item.fixture.date || '').slice(11, 16),
    home: item.teams.home.name, away: item.teams.away.name, group: item.league.round || 'FIFA 2026', venue: item.fixture.venue?.name || 'TBD',
    status: item.fixture.status?.short === 'NS' ? 'soon' : 'live', score: `${item.goals.home ?? 0} - ${item.goals.away ?? 0}`
  }));
  return { source: 'api-sports', matches: matches.length ? matches : demoMatches };
}

async function getTeamsData() {
  return { source: process.env.API_SPORTS_KEY ? 'api-sports-ready' : 'demo', teams: demoTeams };
}

async function getStandingsData() {
  return { source: process.env.API_SPORTS_KEY ? 'api-sports-ready' : 'demo', standings: demoStandings() };
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

const PUBLIC_ASSETS = new Set(['/index.html', '/404.html', '/app.js', '/style.css']);

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  if (!PUBLIC_ASSETS.has(pathname)) return sendError(res, 404, 'Not found');
  const filePath = path.resolve(__dirname, `.${pathname}`);
  if (path.relative(__dirname, filePath).startsWith('..')) return sendError(res, 403, 'Forbidden');
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
