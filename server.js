const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'db.json');
const CARD_WEBHOOK_SECRET = process.env.CARD_WEBHOOK_SECRET || 'dev-card-secret';
const STARTING_POINTS = 500;

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
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(__dirname, pathname));
  if (!filePath.startsWith(__dirname)) return sendError(res, 403, 'Forbidden');
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
  console.log(`WorldCup betting site running at http://localhost:${PORT}`);
});
