const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT    = 5005;
const DB_FILE = path.join(__dirname, 'data.json');

// ── JSON storage ──────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return { sections: [], items: [], seq: { s: 1, i: 1 } }; }
}
function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function hashPw(pw)         { return crypto.createHash('sha256').update(pw).digest('hex'); }
function checkPw(pw, hash)  { return hashPw(pw) === hash; }

// ── Static MIME ───────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.svg' : 'image/svg+xml',
  '.png' : 'image/png',
  '.json': 'application/json',
};

function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

function send(res, status, body, type = 'application/json') {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(payload);
}

// ── Server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method   = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }

  // Static files
  if (pathname.startsWith('/static/')) {
    const fp = path.join(__dirname, pathname);
    if (fs.existsSync(fp)) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    } else send(res, 404, '"not found"');
    return;
  }

  // Home page
  if (pathname === '/' && method === 'GET') {
    send(res, 200, fs.readFileSync(path.join(__dirname, 'templates/index.html'), 'utf8'), 'text/html; charset=utf-8');
    return;
  }

  // ── GET /api/sections ──────────────────────────────────────────────────
  if (pathname === '/api/sections' && method === 'GET') {
    const db = load();
    send(res, 200, db.sections.map(s => ({ ...s, locked: !!s.password_hash, password_hash: undefined })));
    return;
  }

  // ── POST /api/sections ─────────────────────────────────────────────────
  if (pathname === '/api/sections' && method === 'POST') {
    const data = await readBody(req);
    if (!data.name?.trim()) { send(res, 400, { detail: 'name required' }); return; }
    const db  = load();
    const sec = { id: db.seq.s++, name: data.name.trim(), color: data.color || '#c0152a', password_hash: data.password?.trim() ? hashPw(data.password) : null };
    db.sections.push(sec);
    save(db);
    send(res, 200, { ...sec, locked: !!sec.password_hash, password_hash: undefined });
    return;
  }

  // ── PUT /api/sections/:id ──────────────────────────────────────────────
  const secPut = pathname.match(/^\/api\/sections\/(\d+)$/);
  if (secPut && method === 'PUT') {
    const id = +secPut[1];
    const data = await readBody(req);
    const db = load();
    const sec = db.sections.find(s => s.id === id);
    if (!sec) { send(res, 404, { detail: 'not found' }); return; }
    sec.name  = data.name?.trim() || sec.name;
    sec.color = data.color || sec.color;
    if (data.new_password === '') sec.password_hash = null;
    else if (data.new_password)   sec.password_hash = hashPw(data.new_password);
    save(db);
    send(res, 200, { ok: true });
    return;
  }

  // ── DELETE /api/sections/:id ───────────────────────────────────────────
  if (secPut && method === 'DELETE') {
    const id = +secPut[1];
    const data = await readBody(req);
    const db = load();
    const sec = db.sections.find(s => s.id === id);
    if (!sec) { send(res, 404, { detail: 'not found' }); return; }
    if (sec.password_hash && !checkPw(data.password || '', sec.password_hash)) { send(res, 403, { detail: 'wrong password' }); return; }
    db.sections = db.sections.filter(s => s.id !== id);
    db.items    = db.items.filter(i => i.section_id !== id);
    save(db);
    send(res, 200, { ok: true });
    return;
  }

  // ── POST /api/sections/:id/items-list ─────────────────────────────────
  const itemsList = pathname.match(/^\/api\/sections\/(\d+)\/items-list$/);
  if (itemsList && method === 'POST') {
    const id = +itemsList[1];
    const data = await readBody(req);
    const db = load();
    const sec = db.sections.find(s => s.id === id);
    if (!sec) { send(res, 404, { detail: 'not found' }); return; }
    if (sec.password_hash && !checkPw(data.password || '', sec.password_hash)) { send(res, 403, { detail: 'wrong password' }); return; }
    send(res, 200, db.items.filter(i => i.section_id === id).sort((a,b) => a.start_date.localeCompare(b.start_date)));
    return;
  }

  // ── POST /api/sections/:id/items ──────────────────────────────────────
  const itemsPost = pathname.match(/^\/api\/sections\/(\d+)\/items$/);
  if (itemsPost && method === 'POST') {
    const id = +itemsPost[1];
    const data = await readBody(req);
    const db = load();
    const sec = db.sections.find(s => s.id === id);
    if (!sec) { send(res, 404, { detail: 'not found' }); return; }
    if (sec.password_hash && !checkPw(data.password || '', sec.password_hash)) { send(res, 403, { detail: 'wrong password' }); return; }
    const item = { id: db.seq.i++, section_id: id, title: data.title, note: data.note || '', start_date: data.start_date, due_date: data.due_date, status: data.status || 'planned', created_at: new Date().toISOString() };
    db.items.push(item);
    save(db);
    send(res, 200, item);
    return;
  }

  // ── PUT /api/items/:id ─────────────────────────────────────────────────
  const itemOp = pathname.match(/^\/api\/items\/(\d+)$/);
  if (itemOp && method === 'PUT') {
    const id = +itemOp[1];
    const data = await readBody(req);
    const db = load();
    const item = db.items.find(i => i.id === id);
    if (!item) { send(res, 404, { detail: 'not found' }); return; }
    const sec = db.sections.find(s => s.id === item.section_id);
    if (sec?.password_hash && !checkPw(data.password || '', sec.password_hash)) { send(res, 403, { detail: 'wrong password' }); return; }
    Object.assign(item, { title: data.title, note: data.note || '', start_date: data.start_date, due_date: data.due_date, status: data.status || item.status });
    save(db);
    send(res, 200, { ok: true });
    return;
  }

  // ── DELETE /api/items/:id ──────────────────────────────────────────────
  if (itemOp && method === 'DELETE') {
    const id = +itemOp[1];
    const data = await readBody(req);
    const db = load();
    const item = db.items.find(i => i.id === id);
    if (!item) { send(res, 404, { detail: 'not found' }); return; }
    const sec = db.sections.find(s => s.id === item.section_id);
    if (sec?.password_hash && !checkPw(data.password || '', sec.password_hash)) { send(res, 403, { detail: 'wrong password' }); return; }
    db.items = db.items.filter(i => i.id !== id);
    save(db);
    send(res, 200, { ok: true });
    return;
  }

  // ── GET /api/canvas ───────────────────────────────────────────────────
  if (pathname === '/api/canvas' && method === 'GET') {
    const db = load();
    send(res, 200, db.canvas || { positions: {}, connections: [], stickers: [] });
    return;
  }

  // ── PUT /api/canvas ───────────────────────────────────────────────────
  if (pathname === '/api/canvas' && method === 'PUT') {
    const data = await readBody(req);
    const db = load();
    db.canvas = { positions: data.positions || {}, connections: data.connections || [], stickers: data.stickers || [] };
    save(db);
    send(res, 200, { ok: true });
    return;
  }

  // ── POST /api/timeline ─────────────────────────────────────────────────
  if (pathname === '/api/timeline' && method === 'POST') {
    const data = await readBody(req);
    const db = load();
    const items = [], locked = [];
    for (const entry of (data.sections || [])) {
      const sec = db.sections.find(s => s.id === entry.id);
      if (!sec) continue;
      if (sec.password_hash && !checkPw(entry.password || '', sec.password_hash)) { locked.push({ id: sec.id, name: sec.name }); continue; }
      db.items.filter(i => i.section_id === entry.id)
        .forEach(i => items.push({ ...i, section_name: sec.name, section_color: sec.color }));
    }
    send(res, 200, { items, locked });
    return;
  }

  send(res, 404, { detail: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ✓ Plan запущен → http://localhost:${PORT}\n`);
  require('child_process').exec(`open http://localhost:${PORT}`);
});
