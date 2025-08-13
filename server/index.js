const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { v4: uuid } = require('uuid');

const app = express();
const db = new Database(path.join(__dirname, 'pmc.db'));

// schema
function migrate() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      handle TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, partner_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(partner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS partners_user_status ON partners(user_id, status);
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT,
      currency TEXT NOT NULL,
      start_money INTEGER NOT NULL,
      start_chips INTEGER NOT NULL,
      cost_per_chip REAL NOT NULL,
      rake_amount INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS session_players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      final_chips INTEGER NOT NULL,
      refund INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      position INTEGER,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
}

migrate();

app.use(helmet());
app.use(cors({ origin: [/localhost:\d+$/], credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
function setAuthCookie(res, payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('access_token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*3600*1000 });
}
function auth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'unauthorized' }); }
}

// Helpers
const selectUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const selectUserByHandle = db.prepare('SELECT * FROM users WHERE handle = ?');
const selectUserById = db.prepare('SELECT * FROM users WHERE id = ?');

// Auth
app.post('/auth/register', async (req, res) => {
  const { email, password, handle, displayName } = req.body || {};
  if (!email || !password || !handle || !displayName) return res.status(400).json({ error: 'bad_request' });
  if (selectUserByEmail.get(email)) return res.status(409).json({ error: 'email_exists' });
  if (selectUserByHandle.get(handle)) return res.status(409).json({ error: 'handle_exists' });
  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO users (id, email, handle, display_name, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, handle, displayName, passwordHash);
  setAuthCookie(res, { id });
  res.json({ id, handle, displayName });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = selectUserByEmail.get(email || '');
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(password || '', user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  setAuthCookie(res, { id: user.id });
  res.json({ id: user.id, handle: user.handle, displayName: user.display_name, avatarUrl: user.avatar_url });
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('access_token');
  res.json({ ok: true });
});

app.get('/auth/me', auth, (req, res) => {
  const u = selectUserById.get(req.user.id);
  if (!u) return res.status(404).end();
  res.json({ id: u.id, handle: u.handle, displayName: u.display_name, avatarUrl: u.avatar_url });
});

// Profile update
app.patch('/users/me', auth, (req, res) => {
  const { displayName, handle } = req.body || {};
  if (!displayName && !handle) return res.status(400).json({ error: 'bad_request' });
  if (handle && selectUserByHandle.get(handle)) return res.status(409).json({ error: 'handle_exists' });
  const u = selectUserById.get(req.user.id);
  if (!u) return res.status(404).end();
  db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), handle = COALESCE(?, handle), updated_at = datetime("now") WHERE id = ?')
    .run(displayName || null, handle || null, req.user.id);
  const nu = selectUserById.get(req.user.id);
  res.json({ id: nu.id, handle: nu.handle, displayName: nu.display_name, avatarUrl: nu.avatar_url });
});

// Avatar upload
const upload = multer({ limits: { fileSize: 3 * 1024 * 1024 } });
app.post('/users/me/avatar', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const outDir = path.join(__dirname, 'uploads');
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `${req.user.id}-${Date.now()}.webp`;
  const outPath = path.join(outDir, filename);
  await sharp(req.file.buffer).rotate().resize(512, 512, { fit: 'inside' }).webp({ quality: 85 }).toFile(outPath);
  const url = `/uploads/${filename}`;
  db.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime("now") WHERE id = ?').run(url, req.user.id);
  res.json({ url });
});

// Partners
app.get('/users/me/partners', auth, (req, res) => {
  const rows = db.prepare('SELECT p.id, p.status, u.id as partnerId, u.handle, u.display_name as displayName, u.avatar_url as avatarUrl FROM partners p JOIN users u ON u.id = p.partner_id WHERE p.user_id = ?').all(req.user.id);
  res.json(rows);
});
app.post('/users/me/partners', auth, (req, res) => {
  const { partnerHandle } = req.body || {};
  const partner = selectUserByHandle.get(partnerHandle || '');
  if (!partner) return res.status(404).json({ error: 'not_found' });
  if (partner.id === req.user.id) return res.status(400).json({ error: 'self' });
  try {
    const id = uuid();
    db.prepare('INSERT INTO partners (id, user_id, partner_id, status) VALUES (?, ?, ?, ?)').run(id, req.user.id, partner.id, 'pending');
    res.json({ id, status: 'pending' });
  } catch (e) {
    return res.status(409).json({ error: 'exists' });
  }
});
app.post('/partners/:id/accept', auth, (req, res) => {
  const link = db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).end();
  if (link.partner_id !== req.user.id) return res.status(403).end();
  db.prepare('UPDATE partners SET status = "accepted" WHERE id = ?').run(link.id);
  // mirror link
  const exists = db.prepare('SELECT * FROM partners WHERE user_id = ? AND partner_id = ?').get(link.partner_id, link.user_id);
  if (!exists) db.prepare('INSERT INTO partners (id, user_id, partner_id, status) VALUES (?, ?, ?, "accepted")').run(uuid(), link.partner_id, link.user_id);
  else db.prepare('UPDATE partners SET status = "accepted" WHERE id = ?').run(exists.id);
  res.json({ ok: true });
});
app.delete('/partners/:id', auth, (req, res) => {
  const link = db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id);
  if (!link) return res.status(404).end();
  if (link.user_id !== req.user.id && link.partner_id !== req.user.id) return res.status(403).end();
  db.prepare('DELETE FROM partners WHERE (user_id = ? AND partner_id = ?) OR (user_id = ? AND partner_id = ?)')
    .run(link.user_id, link.partner_id, link.partner_id, link.user_id);
  res.json({ ok: true });
});

// Sessions
app.post('/sessions', auth, (req, res) => {
  const { title, currency = 'RUB', startMoney, startChips, rakeAmount, players } = req.body || {};
  if (!startMoney || !startChips || !Array.isArray(players) || players.length === 0) return res.status(400).json({ error: 'bad_request' });
  const costPerChip = startMoney / startChips;
  const id = uuid();
  db.prepare('INSERT INTO sessions (id, owner_id, title, currency, start_money, start_chips, cost_per_chip, rake_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, title || null, currency, startMoney, startChips, costPerChip, rakeAmount || null);
  const ins = db.prepare('INSERT INTO session_players (id, session_id, user_id, name, final_chips, refund, delta, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  players.forEach((p, i) => {
    const refund = Math.round((p.finalChips || 0) * costPerChip);
    const delta = refund - startMoney;
    ins.run(uuid(), id, p.userId || null, p.name, p.finalChips, refund, delta, p.position ?? i);
  });
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  const sessionPlayers = db.prepare('SELECT * FROM session_players WHERE session_id = ? ORDER BY position ASC').all(id);
  res.json({ ...session, players: sessionPlayers });
});
app.get('/sessions', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM sessions WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(rows);
});
app.get('/sessions/:id', auth, (req, res) => {
  const s = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!s || s.owner_id !== req.user.id) return res.status(404).end();
  const ps = db.prepare('SELECT * FROM session_players WHERE session_id = ? ORDER BY position ASC').all(s.id);
  res.json({ ...s, players: ps });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
