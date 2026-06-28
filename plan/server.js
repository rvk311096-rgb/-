const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const Database = require('better-sqlite3');

const PORT = 5005;
const DB_PATH = path.join(__dirname, 'data.db');

// ── Database ──────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sections (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    color        TEXT NOT NULL DEFAULT '#c0152a',
    password_hash TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    note       TEXT DEFAULT '',
    start_date DATE NOT NULL,
    due_date   DATE NOT NULL,
    status     TEXT NOT NULL DEFAULT 'planned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

function hashPw(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}
function checkPw(pw, hash) {
  return hashPw(pw) === hash;
}

// ── MIME types ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── Template renderer (tiny Jinja2 substitute) ───────────────────────────
function renderTemplate(name) {
  return fs.readFileSync(path.join(__dirname, 'templates', name), 'utf8');
}

// ── Body parser ───────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
  });
}

function send(res, status, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(payload);
}

// ── Router ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }

  // ── Static files ──────────────────────────────────────────────────────
  if (pathname.startsWith('/static/')) {
    const filePath = path.join(__dirname, pathname);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      send(res, 404, '"not found"');
    }
    return;
  }

  // ── Home page ─────────────────────────────────────────────────────────
  if (pathname === '/' && method === 'GET') {
    send(res, 200, renderTemplate('index.html'), 'text/html; charset=utf-8'); return;
  }

  // ── API: sections ─────────────────────────────────────────────────────
  if (pathname === '/api/sections' && method === 'GET') {
    const rows = db.prepare(
      "SELECT id, name, color, (password_hash IS NOT NULL) as locked, created_at FROM sections ORDER BY id"
    ).all();
    send(res, 200, rows); return;
  }

  if (pathname === '/api/sections' && method === 'POST') {
    const data = await readBody(req);
    if (!data.name?.trim()) { send(res, 400, { detail: 'name required' }); return; }
    const ph = data.password?.trim() ? hashPw(data.password) : null;
    const row = db.prepare(
      "INSERT INTO sections (name, color, password_hash) VALUES (?,?,?) RETURNING id, name, color, (password_hash IS NOT NULL) as locked"
    ).get(data.name.trim(), data.color || '#c0152a', ph);
    send(res, 200, row); return;
  }

  const secMatch = pathname.match(/^\/api\/sections\/(\d+)$/);
  if (secMatch) {
    const sid = parseInt(secMatch[1]);

    if (method === 'PUT') {
      const data = await readBody(req);
      if (!data.name?.trim()) { send(res, 400, { detail: 'name required' }); return; }
      const existing = db.prepare("SELECT password_hash FROM sections WHERE id=?").get(sid);
      if (!existing) { send(res, 404, { detail: 'not found' }); return; }
      let ph = existing.password_hash;
      if (data.new_password === '') ph = null;
      else if (data.new_password) ph = hashPw(data.new_password);
      db.prepare("UPDATE sections SET name=?, color=?, password_hash=? WHERE id=?")
        .run(data.name.trim(), data.color || existing.color, ph, sid);
      send(res, 200, { ok: true }); return;
    }

    if (method === 'DELETE') {
      const data = await readBody(req);
      const row = db.prepare("SELECT password_hash FROM sections WHERE id=?").get(sid);
      if (!row) { send(res, 404, { detail: 'not found' }); return; }
      if (row.password_hash && !checkPw(data.password || '', row.password_hash)) {
        send(res, 403, { detail: 'wrong password' }); return;
      }
      db.prepare("DELETE FROM sections WHERE id=?").run(sid);
      send(res, 200, { ok: true }); return;
    }
  }

  // ── API: verify password ──────────────────────────────────────────────
  const verifyMatch = pathname.match(/^\/api\/sections\/(\d+)\/verify$/);
  if (verifyMatch && method === 'POST') {
    const sid = parseInt(verifyMatch[1]);
    const data = await readBody(req);
    const row = db.prepare("SELECT password_hash FROM sections WHERE id=?").get(sid);
    if (!row) { send(res, 404, { detail: 'not found' }); return; }
    if (!row.password_hash || checkPw(data.password || '', row.password_hash)) {
      send(res, 200, { ok: true });
    } else {
      send(res, 403, { detail: 'wrong password' });
    }
    return;
  }

  // ── API: items list (POST with optional password) ─────────────────────
  const itemsListMatch = pathname.match(/^\/api\/sections\/(\d+)\/items-list$/);
  if (itemsListMatch && method === 'POST') {
    const sid = parseInt(itemsListMatch[1]);
    const data = await readBody(req);
    const section = db.prepare("SELECT password_hash FROM sections WHERE id=?").get(sid);
    if (!section) { send(res, 404, { detail: 'not found' }); return; }
    if (section.password_hash && !checkPw(data.password || '', section.password_hash)) {
      send(res, 403, { detail: 'wrong password' }); return;
    }
    const rows = db.prepare("SELECT * FROM items WHERE section_id=? ORDER BY start_date, due_date").all(sid);
    send(res, 200, rows); return;
  }

  // ── API: create item ──────────────────────────────────────────────────
  const itemsMatch = pathname.match(/^\/api\/sections\/(\d+)\/items$/);
  if (itemsMatch && method === 'POST') {
    const sid = parseInt(itemsMatch[1]);
    const data = await readBody(req);
    const section = db.prepare("SELECT password_hash FROM sections WHERE id=?").get(sid);
    if (!section) { send(res, 404, { detail: 'not found' }); return; }
    if (section.password_hash && !checkPw(data.password || '', section.password_hash)) {
      send(res, 403, { detail: 'wrong password' }); return;
    }
    const row = db.prepare(
      "INSERT INTO items (section_id, title, note, start_date, due_date, status) VALUES (?,?,?,?,?,?) RETURNING *"
    ).get(sid, data.title, data.note || '', data.start_date, data.due_date, data.status || 'planned');
    send(res, 200, row); return;
  }

  // ── API: update / delete item ─────────────────────────────────────────
  const itemMatch = pathname.match(/^\/api\/items\/(\d+)$/);
  if (itemMatch) {
    const iid = parseInt(itemMatch[1]);
    const data = await readBody(req);
    const item = db.prepare("SELECT section_id FROM items WHERE id=?").get(iid);
    if (!item) { send(res, 404, { detail: 'not found' }); return; }
    const section = db.prepare("SELECT password_hash FROM sections WHERE id=?").get(item.section_id);
    if (section.password_hash && !checkPw(data.password || '', section.password_hash)) {
      send(res, 403, { detail: 'wrong password' }); return;
    }
    if (method === 'PUT') {
      db.prepare("UPDATE items SET title=?, note=?, start_date=?, due_date=?, status=? WHERE id=?")
        .run(data.title, data.note || '', data.start_date, data.due_date, data.status || 'planned', iid);
      send(res, 200, { ok: true });
    } else if (method === 'DELETE') {
      db.prepare("DELETE FROM items WHERE id=?").run(iid);
      send(res, 200, { ok: true });
    }
    return;
  }

  // ── API: cross-section timeline ───────────────────────────────────────
  if (pathname === '/api/timeline' && method === 'POST') {
    const data = await readBody(req);
    const items = [], locked = [];
    for (const entry of (data.sections || [])) {
      const section = db.prepare("SELECT id, name, color, password_hash FROM sections WHERE id=?").get(entry.id);
      if (!section) continue;
      if (section.password_hash && !checkPw(entry.password || '', section.password_hash)) {
        locked.push({ id: section.id, name: section.name }); continue;
      }
      const rows = db.prepare("SELECT * FROM items WHERE section_id=? ORDER BY start_date").all(entry.id);
      rows.forEach(r => items.push({ ...r, section_name: section.name, section_color: section.color }));
    }
    send(res, 200, { items, locked }); return;
  }

  send(res, 404, { detail: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Plan запущен → http://localhost:${PORT}\n`);
  // Auto-open browser on Mac
  if (process.platform === 'darwin') {
    require('child_process').exec(`open http://localhost:${PORT}`);
  }
});
