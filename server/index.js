import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 3001;
const SESSION_DAYS = 30;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));   // lo stato della dieta puo' essere grosso
app.use(cookieParser());

// --- Sessioni ----------------------------------------------------------------
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  return token;
}

function userFromRequest(req) {
  const token = req.cookies && req.cookies.sid;
  if (!token) return null;
  const row = db.prepare(
    'SELECT s.user_id, s.expires_at, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
  ).get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: row.user_id, username: row.username, token };
}

function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });
  req.user = user;
  next();
}

function setSessionCookie(res, token) {
  res.cookie('sid', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,               // -> metti true quando avrai HTTPS
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

// --- Auth --------------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');
  if (username.length < 3) return res.status(400).json({ error: 'Username troppo corto (min 3).' });
  if (password.length < 6) return res.status(400).json({ error: 'Password troppo corta (min 6).' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: "Username gia' in uso." });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  setSessionCookie(res, createSession(info.lastInsertRowid));
  return res.status(201).json({ username });
});

app.post('/api/auth/login', (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  const password = String((req.body && req.body.password) || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Username o password errati.' });
  }
  setSessionCookie(res, createSession(user.id));
  return res.json({ username: user.username });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies && req.cookies.sid;
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie('sid', { path: '/' });
  return res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Non autenticato' });
  return res.json({ username: user.username });
});

// --- Stato della dieta (per utente) ------------------------------------------
app.get('/api/state', requireAuth, (req, res) => {
  const row = db.prepare('SELECT state FROM user_state WHERE user_id = ?').get(req.user.id);
  if (!row) return res.json(null);
  try { return res.json(JSON.parse(row.state)); } catch { return res.json(null); }
});

app.put('/api/state', requireAuth, (req, res) => {
  const state = JSON.stringify(req.body == null ? {} : req.body);
  db.prepare(`
    INSERT INTO user_state (user_id, state, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = datetime('now')
  `).run(req.user.id, state);
  return res.json({ ok: true });
});

// --- Barcode (condiviso, senza login: lo alimenta il telefono) ---------------
let lastScan = null;
const history = [];
const HISTORY_MAX = 20;
const sseClients = new Set();

function broadcast(scan) {
  const payload = `data: ${JSON.stringify(scan)}\n\n`;
  for (const r of sseClients) r.write(payload);
}

app.post('/api/barcode', (req, res) => {
  const raw = req.body && req.body.code;
  const code = typeof raw === 'string' ? raw.trim() : '';
  if (!code) return res.status(400).json({ error: 'Campo "code" mancante o vuoto.' });
  const scan = { code, source: String((req.body && req.body.source) || 'unknown'), at: new Date().toISOString() };
  lastScan = scan;
  history.unshift(scan);
  if (history.length > HISTORY_MAX) history.pop();
  broadcast(scan);
  return res.status(202).json(scan);
});

app.get('/api/barcode/latest', (_req, res) => res.json(lastScan));
app.get('/api/barcode/history', (_req, res) => res.json(history));

app.get('/api/barcode/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  if (lastScan) res.write(`data: ${JSON.stringify(lastScan)}\n\n`);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  sseClients.add(res);
  req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', clients: sseClients.size }));

// --- Frontend React compilato ------------------------------------------------
app.use(express.static(distPath));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});