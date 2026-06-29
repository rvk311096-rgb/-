/* ── State ─────────────────────────────────────────────────────────────── */
const state = {
  sections: [],
  notes: [],
  currentSection: null,
  currentItems: [],
  sectionPasswords: {},
  editingItem: null,
  editingNote: null,
  selectedColor: '#6366f1',
  selectedNoteColor: '#ffd166',
  selectedStatus: 'planned',
};

const COLORS = [
  '#c0152a','#1e3a8a','#9f1239','#1d4ed8',
  '#be123c','#7f1d1d','#1e40af','#b91c1c','#1e3a6e',
];

/* ── Helpers ───────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function isOverdue(due) {
  return due && new Date(due) < new Date(new Date().toDateString());
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Navigation ────────────────────────────────────────────────────────── */
function showView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${name}`).classList.add('active');
  $$('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
}

$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.view;
    if (v === 'home') goHome();
    else if (v === 'timeline') showTimeline();
  });
});

/* ── Home ──────────────────────────────────────────────────────────────── */
async function goHome() {
  showView('home');
  state.currentSection = null;
  state.sectionPasswords = {};
  await loadSections();
}

async function loadSections() {
  [state.sections, state.notes] = await Promise.all([
    api('GET', '/api/sections'),
    api('GET', '/api/notes'),
  ]);
  renderSections();
  renderHomeNotes();
}

function renderSections() {
  const grid = $('#sections-grid');
  grid.innerHTML = '';

  state.sections.forEach(sec => {
    const done = sec.done_count || 0;
    const total = sec.total_count || 0;
    const pct = total ? Math.round(done / total * 100) : 0;

    const card = document.createElement('div');
    card.className = 'section-card';
    card.style.setProperty('--card-color', sec.color);
    card.innerHTML = `
      <div class="sc-top">
        <div class="sc-name" id="sc-name-${sec.id}" title="Двойной клик — переименовать">${esc(sec.name)}</div>
        ${sec.locked ? '<div class="sc-lock">🔒</div>' : ''}
      </div>
      <div class="sc-meta">${total} ${plural(total,'план','плана','планов')}</div>
      <div class="sc-bar"><div class="sc-bar-fill" style="width:${pct}%;background:${sec.color}"></div></div>
      <div class="sc-actions">
        <button class="sc-action-btn" data-open="${sec.id}">Открыть</button>
        <button class="sc-action-btn" data-rename="${sec.id}">✎ Переименовать</button>
        <button class="sc-action-btn danger" data-del="${sec.id}">Удалить</button>
      </div>
    `;
    card.querySelector(`#sc-name-${sec.id}`).addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startCardRename(sec);
    });
    card.addEventListener('click', (e) => {
      if (e.target.dataset.del)    { deleteSection(sec); return; }
      if (e.target.dataset.rename) { startCardRename(sec); return; }
      if (e.target.dataset.open || (!e.target.closest('.sc-actions') && !e.target.closest('[contenteditable="true"]'))) {
        openSection(sec);
      }
    });
    grid.appendChild(card);
  });

  // + new
  const add = document.createElement('div');
  add.className = 'new-section-card';
  add.innerHTML = `<div class="plus">＋</div><div class="label">Новый раздел</div>`;
  add.addEventListener('click', () => openModalSection());
  grid.appendChild(add);
}

function plural(n, one, two, five) {
  const m = n % 100;
  if (m >= 11 && m <= 14) return `${n} ${five}`;
  const m1 = n % 10;
  if (m1 === 1) return `${n} ${one}`;
  if (m1 >= 2 && m1 <= 4) return `${n} ${two}`;
  return `${n} ${five}`;
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Delete section ────────────────────────────────────────────────────── */
async function deleteSection(sec) {
  if (!confirm(`Удалить раздел «${sec.name}»? Все планы будут удалены.`)) return;
  const password = state.sectionPasswords[sec.id] || '';
  try {
    await api('DELETE', `/api/sections/${sec.id}`, { password });
    await loadSections();
  } catch(e) {
    if (e.message.includes('wrong password')) {
      promptPassword(sec, async (pw) => {
        await api('DELETE', `/api/sections/${sec.id}`, { password: pw });
        await loadSections();
      });
    } else alert(e.message);
  }
}

/* ── Open Section ──────────────────────────────────────────────────────── */
async function openSection(sec) {
  if (sec.locked && !state.sectionPasswords[sec.id]) {
    promptPassword(sec, async (pw) => {
      state.sectionPasswords[sec.id] = pw;
      await loadSectionView(sec);
    });
    return;
  }
  await loadSectionView(sec);
}

async function loadSectionView(sec) {
  state.currentSection = sec;
  const password = state.sectionPasswords[sec.id] || '';
  try {
    state.currentItems = await api('POST', `/api/sections/${sec.id}/items-list`, { password });
  } catch(e) {
    state.currentItems = [];
  }

  $('#section-title-label').textContent = sec.name;
  const dot = $('#section-dot');
  dot.style.background = sec.color;
  initSectionTitleRename(sec);

  showView('section');
  setSubview('list');
  renderItems();
  renderSectionNotes(sec.id);
}

$('#btn-back').addEventListener('click', goHome);

/* ── Subview toggle ────────────────────────────────────────────────────── */
function setSubview(name) {
  $$('.vtoggle').forEach(b => b.classList.toggle('active', b.dataset.subview === name));
  $$('.subview').forEach(s => s.classList.remove('active'));
  $(`#subview-${name}`).classList.add('active');
  if (name === 'board') renderBoard();
}

$$('.vtoggle').forEach(b => b.addEventListener('click', () => setSubview(b.dataset.subview)));

/* ── Items ─────────────────────────────────────────────────────────────── */
async function reloadItems() {
  const sec = state.currentSection;
  if (!sec) return;
  const password = state.sectionPasswords[sec.id] || '';
  try {
    state.currentItems = await api('POST', `/api/sections/${sec.id}/items-list`, { password });
  } catch(_) {}
  renderItems();
  const active = $$('.vtoggle').find(b => b.classList.contains('active'));
  if (active?.dataset.subview === 'board') renderBoard();
}

function renderItems() {
  const list = $('#items-list');
  list.innerHTML = '';
  if (!state.currentItems.length) {
    list.innerHTML = `<div class="empty-state"><span>○</span>Пока пусто — добавьте первый план</div>`;
    return;
  }
  const sorted = [...state.currentItems].sort((a,b) => a.start_date.localeCompare(b.start_date));
  sorted.forEach(item => {
    const over = isOverdue(item.due_date) && item.status !== 'done';
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-status-dot dot-${item.status}"></div>
      <div class="item-body">
        <div class="item-title ${item.status === 'done' ? 'done-text' : ''}">${esc(item.title)}</div>
        ${item.note ? `<div class="item-note">${esc(item.note)}</div>` : ''}
        <div class="item-dates">
          <span>${fmtDate(item.start_date)}</span>
          <span class="sep">→</span>
          <span class="${over ? 'item-overdue' : ''}">${fmtDate(item.due_date)}${over ? ' ⚠' : ''}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="item-act-btn" data-edit="${item.id}">Изменить</button>
        <button class="item-act-btn del" data-del="${item.id}">✕</button>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.dataset.edit) { openEditItem(item); return; }
      if (e.target.dataset.del)  { deleteItem(item); return; }
    });
    list.appendChild(card);
  });
}

/* ── Board (Gantt) ─────────────────────────────────────────────────────── */
function renderBoard(items = null, canvas = null, showSectionLabels = false) {
  items = items || state.currentItems;
  canvas = canvas || $('#board-canvas');
  canvas.innerHTML = '';
  if (!items.length) {
    canvas.innerHTML = `<div class="empty-state"><span>◌</span>Нет планов для отображения</div>`;
    return;
  }

  const color = state.currentSection?.color || '#6366f1';

  // date range
  const starts = items.map(i => i.start_date).filter(Boolean).sort();
  const ends   = items.map(i => i.due_date).filter(Boolean).sort();
  let minD = new Date(starts[0]);
  let maxD = new Date(ends[ends.length-1]);
  // add padding
  minD.setDate(minD.getDate() - 3);
  maxD.setDate(maxD.getDate() + 10);
  const totalMs = maxD - minD;

  function pct(dateStr) {
    const d = new Date(dateStr);
    return Math.max(0, Math.min(100, (d - minD) / totalMs * 100));
  }

  // month labels
  const gantt = document.createElement('div');
  gantt.className = 'gantt';

  const monthRow = document.createElement('div');
  monthRow.className = 'gantt-months';
  const months = [];
  const cur = new Date(minD);
  cur.setDate(1);
  while (cur <= maxD) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  months.forEach(m => {
    const span = document.createElement('div');
    span.className = 'gantt-month';
    span.textContent = m.toLocaleString('ru', { month: 'short', year: '2-digit' });
    monthRow.appendChild(span);
  });
  gantt.appendChild(monthRow);

  const todayPct = pct(todayStr());

  // group by section if showing all
  if (showSectionLabels) {
    const bySec = {};
    items.forEach(item => {
      const key = item.section_id;
      if (!bySec[key]) bySec[key] = { name: item.section_name, color: item.section_color, items: [] };
      bySec[key].items.push(item);
    });
    Object.values(bySec).forEach(sec => {
      const hdr = document.createElement('div');
      hdr.className = 'gantt-section-header';
      hdr.innerHTML = `<span style="color:${sec.color};opacity:1">${esc(sec.name)}</span>`;
      gantt.appendChild(hdr);
      renderRows(sec.items, sec.color, gantt, pct, todayPct);
    });
  } else {
    renderRows(items, color, gantt, pct, todayPct);
  }

  canvas.appendChild(gantt);
}

function renderRows(items, color, parent, pct, todayPct) {
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'gantt-row';

    const label = document.createElement('div');
    label.className = 'gantt-label';
    label.title = item.title;
    label.textContent = item.title;

    const track = document.createElement('div');
    track.className = 'gantt-track';

    const startPct = pct(item.start_date);
    const endPct   = pct(item.due_date);
    const widthPct = Math.max(endPct - startPct, 1.5);

    const statusAlpha = item.status === 'done' ? '.35' : item.status === 'active' ? '.85' : '.6';
    const barColor = item.section_color || color;

    const bar = document.createElement('div');
    bar.className = 'gantt-bar';
    bar.style.cssText = `left:${startPct}%;width:${widthPct}%;background:${hexAlpha(barColor, parseFloat(statusAlpha))};color:#fff;`;
    bar.innerHTML = `<span class="bar-text">${esc(item.title)}</span>`;
    bar.title = `${item.title}\n${item.start_date} → ${item.due_date}`;
    track.appendChild(bar);

    // today line
    if (idx === 0) {
      const today = document.createElement('div');
      today.className = 'gantt-today';
      today.style.left = `${todayPct}%`;
      track.appendChild(today);
    }

    row.appendChild(label);
    row.appendChild(track);
    parent.appendChild(row);
  });
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Add / Edit Item ───────────────────────────────────────────────────── */
$('#btn-add-item').addEventListener('click', () => openAddItem());

function openAddItem() {
  state.editingItem = null;
  $('#modal-item .modal-title').textContent = 'Новый план';
  $('#m-item-title').value = '';
  $('#m-item-note').value = '';
  $('#m-item-start').value = '';
  $('#m-item-due').value = '';
  setStatusButtons('planned');
  openModal('modal-item');
  setTimeout(() => $('#m-item-title').focus(), 50);
}

function openEditItem(item) {
  state.editingItem = item;
  $('#modal-item .modal-title').textContent = 'Изменить план';
  $('#m-item-title').value = item.title;
  $('#m-item-note').value = item.note || '';
  $('#m-item-start').value = item.start_date;
  $('#m-item-due').value = item.due_date;
  setStatusButtons(item.status);
  openModal('modal-item');
}

function setStatusButtons(status) {
  state.selectedStatus = status;
  $$('#m-item-status-row .status-btn').forEach(b => b.classList.toggle('active', b.dataset.status === status));
}

$$('#m-item-status-row .status-btn').forEach(b => {
  b.addEventListener('click', () => setStatusButtons(b.dataset.status));
});

$('#btn-item-cancel').addEventListener('click', closeModal);
$('#btn-item-save').addEventListener('click', saveItem);

async function saveItem() {
  const title = $('#m-item-title').value.trim();
  if (!title) { $('#m-item-title').focus(); return; }
  const sec = state.currentSection;
  const password = state.sectionPasswords[sec.id] || '';
  const payload = {
    title,
    note: $('#m-item-note').value.trim(),
    start_date: $('#m-item-start').value,
    due_date: $('#m-item-due').value,
    status: state.selectedStatus,
    password,
  };
  try {
    if (state.editingItem) {
      await api('PUT', `/api/items/${state.editingItem.id}`, payload);
    } else {
      await api('POST', `/api/sections/${sec.id}/items`, payload);
    }
    closeModal();
    await reloadItems();
  } catch(e) { alert(e.message); }
}

async function deleteItem(item) {
  if (!confirm(`Удалить «${item.title}»?`)) return;
  const sec = state.currentSection;
  const password = state.sectionPasswords[sec.id] || '';
  await api('DELETE', `/api/items/${item.id}`, { password });
  await reloadItems();
}

/* ── New Section Modal ─────────────────────────────────────────────────── */
$('#btn-new-section').addEventListener('click', () => openModalSection());

function openModalSection() {
  state.selectedColor = COLORS[0];
  $('#m-section-name').value = '';
  $('#m-section-pass').value = '';
  renderColorPicker();
  openModal('modal-section');
  setTimeout(() => $('#m-section-name').focus(), 50);
}

function renderColorPicker() {
  const row = $('#color-picker');
  row.innerHTML = '';
  COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = `color-swatch ${c === state.selectedColor ? 'selected' : ''}`;
    sw.style.background = c;
    sw.addEventListener('click', () => {
      state.selectedColor = c;
      $$('.color-swatch').forEach(s => s.classList.toggle('selected', s.style.background === hexToRgb(c) || s.style.background === c));
      sw.classList.add('selected');
    });
    row.appendChild(sw);
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${r}, ${g}, ${b})`;
}

$('#btn-section-cancel').addEventListener('click', closeModal);
$('#btn-section-save').addEventListener('click', createSection);

async function createSection() {
  const name = $('#m-section-name').value.trim();
  if (!name) { $('#m-section-name').focus(); return; }
  try {
    await api('POST', '/api/sections', {
      name,
      color: state.selectedColor,
      password: $('#m-section-pass').value,
    });
    closeModal();
    await loadSections();
  } catch(e) { alert(e.message); }
}

/* ── Password prompt ───────────────────────────────────────────────────── */
let _passResolve = null;

function promptPassword(sec, onSuccess) {
  $('#modal-pass-desc').textContent = `Раздел «${sec.name}» защищён паролем`;
  $('#m-pass-input').value = '';
  _passResolve = onSuccess;
  openModal('modal-password');
  setTimeout(() => $('#m-pass-input').focus(), 50);
}

$('#btn-pass-cancel').addEventListener('click', closeModal);
$('#btn-pass-ok').addEventListener('click', async () => {
  const pw = $('#m-pass-input').value;
  if (!pw) return;
  try {
    if (_passResolve) await _passResolve(pw);
    closeModal();
  } catch(e) {
    $('#m-pass-input').value = '';
    $('#m-pass-input').style.borderColor = 'rgba(248,113,113,.6)';
    setTimeout(() => $('#m-pass-input').style.borderColor = '', 1200);
    $('#m-pass-input').focus();
  }
});
$('#m-pass-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-pass-ok').click(); });

/* ── Modal helpers ─────────────────────────────────────────────────────── */
function openModal(id) {
  $('#modal-overlay').classList.remove('hidden');
  $$('.modal').forEach(m => m.classList.add('hidden'));
  $(`#${id}`).classList.remove('hidden');
}
function closeModal() {
  $('#modal-overlay').classList.add('hidden');
  _passResolve = null;
}
$('#modal-overlay').addEventListener('click', e => { if (e.target === $('#modal-overlay')) closeModal(); });

/* ── Timeline ──────────────────────────────────────────────────────────── */
async function showTimeline() {
  showView('timeline');
  renderPicker();
  mapInit();
}

function renderPicker() {
  const picker = $('#timeline-picker');
  picker.innerHTML = '';
  state.sections.forEach(sec => {
    const chip = document.createElement('div');
    chip.className = 'picker-chip';
    chip.dataset.id = sec.id;
    chip.innerHTML = `
      <div class="chip-dot" style="background:${sec.color}"></div>
      <span class="chip-name">${esc(sec.name)}</span>
      ${sec.locked ? '<span class="chip-lock">🔒</span>' : ''}
    `;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    picker.appendChild(chip);
  });
}

$('#btn-build-timeline').addEventListener('click', buildTimeline);

async function buildTimeline() {
  const selected = $$('#timeline-picker .picker-chip.selected');
  if (!selected.length) { alert('Выберите хотя бы один раздел'); return; }
  const sections = selected.map(chip => ({
    id: parseInt(chip.dataset.id),
    password: state.sectionPasswords[chip.dataset.id] || '',
  }));
  try {
    const res = await api('POST', '/api/timeline', { sections });
    if (res.locked && res.locked.length) {
      await unlockSequential(res.locked, sections);
    } else {
      mapLoadItems(res.items);
    }
  } catch(e) { alert(e.message); }
}

async function unlockSequential(locked, sections) {
  for (const sec of locked) {
    await new Promise(resolve => {
      promptPassword(sec, async (pw) => {
        state.sectionPasswords[sec.id] = pw;
        const entry = sections.find(s => s.id === sec.id);
        if (entry) entry.password = pw;
        resolve();
      });
    });
  }
  const res = await api('POST', '/api/timeline', { sections });
  mapLoadItems(res.items);
}

/* ══════════════════════════════════════════════════════════════════════════
   INTERACTIVE MAP
   ══════════════════════════════════════════════════════════════════════════ */
const map = {
  pan: { x: 0, y: 0 }, scale: 1,
  dragging: false, dragStart: null, panStart: null,
  tool: 'pan',
  connectSource: null,
  canvas: { positions: {}, connections: [], stickers: [] },
  saveTimer: null,
};
const WORLD_OFFSET = 2800; // initial centre of 6000px world

function mapInit() {
  const vp = $('#map-viewport');
  const world = $('#map-world');
  const hint = $('#map-hint');
  if (!vp || map._inited) return;
  map._inited = true;

  // centre world
  map.pan.x = -(WORLD_OFFSET - vp.clientWidth / 2);
  map.pan.y = -(WORLD_OFFSET - vp.clientHeight / 2);
  mapApplyTransform();

  // load saved canvas state
  api('GET', '/api/canvas').then(c => { map.canvas = c; }).catch(() => {});

  // ── pan ──────────────────────────────────────────────────────────────
  vp.addEventListener('mousedown', e => {
    if (e.target !== vp && e.target !== world && e.target !== $('#map-svg') && map.tool !== 'pan') return;
    if (map.tool !== 'pan') return;
    map.dragging = true;
    map.dragStart = { mx: e.clientX, my: e.clientY, px: map.pan.x, py: map.pan.y };
    vp.classList.add('cursor-grabbing');
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!map.dragging) return;
    map.pan.x = map.dragStart.px + e.clientX - map.dragStart.mx;
    map.pan.y = map.dragStart.py + e.clientY - map.dragStart.my;
    mapApplyTransform();
  });
  window.addEventListener('mouseup', () => {
    map.dragging = false;
    vp.classList.remove('cursor-grabbing');
  });

  // ── zoom (scroll) ─────────────────────────────────────────────────
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    const rect = vp.getBoundingClientRect();
    const ox = e.clientX - rect.left;
    const oy = e.clientY - rect.top;
    map.pan.x = ox - (ox - map.pan.x) * factor;
    map.pan.y = oy - (oy - map.pan.y) * factor;
    map.scale = Math.max(0.25, Math.min(2.5, map.scale * factor));
    mapApplyTransform();
  }, { passive: false });

  // ── sticker click on empty space ─────────────────────────────────
  vp.addEventListener('click', e => {
    if (map.tool !== 'sticker') return;
    if (e.target !== vp && e.target !== world && e.target !== $('#map-svg')) return;
    const rect = vp.getBoundingClientRect();
    const wx = (e.clientX - rect.left - map.pan.x) / map.scale;
    const wy = (e.clientY - rect.top  - map.pan.y) / map.scale;
    const s = { id: 's' + Date.now(), x: wx - 85, y: wy - 40, text: '' };
    map.canvas.stickers.push(s);
    mapRenderSticker(s);
    mapSave();
  });

  // toolbar
  $$('.map-tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      map.tool = btn.dataset.tool;
      map.connectSource = null;
      $$('.map-tool').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      vp.className = 'map-viewport';
      if (map.tool === 'pan')     vp.classList.add('cursor-grab');
      if (map.tool === 'connect') vp.classList.add('cursor-crosshair');
      if (map.tool === 'sticker') vp.classList.add('cursor-cell');
      if (map.tool === 'erase')   vp.classList.add('cursor-crosshair');
      mapRedrawLines();
    });
  });

  $('#btn-map-fit').addEventListener('click', mapFit);

  // keyboard: Space = pan
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && document.getElementById('view-timeline')?.classList.contains('active')) {
      e.preventDefault();
      map.tool = 'pan';
      $$('.map-tool').forEach(b => b.classList.remove('active'));
      $('[data-tool="pan"]').classList.add('active');
    }
  });
}

function mapApplyTransform() {
  $('#map-world').style.transform = `translate(${map.pan.x}px,${map.pan.y}px) scale(${map.scale})`;
}

async function mapLoadItems(items) {
  const world = $('#map-world');
  const hint = $('#map-hint');
  hint?.classList.add('hidden');

  // remove old nodes
  $$('.map-node', world).forEach(n => n.remove());

  // load saved positions
  try { map.canvas = await api('GET', '/api/canvas'); } catch(e) { map.canvas = { positions: {}, connections: [], stickers: [] }; }

  // group by section for auto-layout
  const bySection = {};
  items.forEach(item => {
    if (!bySection[item.section_id]) bySection[item.section_id] = { color: item.section_color, name: item.section_name, items: [] };
    bySection[item.section_id].items.push(item);
  });

  let secCol = 0;
  Object.values(bySection).forEach(sec => {
    sec.items.forEach((item, rowIdx) => {
      const key = 'item-' + item.id;
      const defaultX = WORLD_OFFSET - 300 + secCol * 230;
      const defaultY = WORLD_OFFSET - 200 + rowIdx * 130;
      const pos = map.canvas.positions[key] || { x: defaultX, y: defaultY };
      mapRenderNode(item, pos, sec.color);
    });
    secCol++;
  });

  // render saved stickers
  (map.canvas.stickers || []).forEach(s => mapRenderSticker(s));

  mapRedrawLines();
  mapFit();
}

function mapRenderNode(item, pos, color) {
  const world = $('#map-world');
  const key = 'item-' + item.id;
  const node = document.createElement('div');
  node.className = 'map-node';
  node.dataset.key = key;
  node.dataset.itemId = item.id;
  node.style.cssText = `left:${pos.x}px;top:${pos.y}px;--nc:${color};`;

  const dateStr = [item.start_date, item.due_date].filter(Boolean).join(' → ');
  node.innerHTML = `
    <div class="map-node-section">${esc(item.section_name)}</div>
    <div class="map-node-title">${esc(item.title)}</div>
    ${dateStr ? `<div class="map-node-meta">${dateStr}</div>` : ''}
    ${item.note ? `<div class="map-node-meta" style="opacity:.6">${esc(item.note)}</div>` : ''}
  `;

  makeDraggable(node, key);
  node.addEventListener('click', e => {
    e.stopPropagation();
    if (map.tool === 'connect') {
      if (!map.connectSource) {
        map.connectSource = key;
        node.classList.add('connect-source');
      } else if (map.connectSource !== key) {
        const conn = { id: 'c' + Date.now(), from: map.connectSource, to: key };
        map.canvas.connections.push(conn);
        $$('.connect-source', world).forEach(n => n.classList.remove('connect-source'));
        map.connectSource = null;
        mapRedrawLines();
        mapSave();
      }
    } else if (map.tool === 'erase') {
      node.remove();
    }
  });

  world.appendChild(node);
}

function mapRenderSticker(s) {
  const world = $('#map-world');
  const el = document.createElement('div');
  el.className = 'map-sticker';
  el.dataset.stickerId = s.id;
  el.style.cssText = `left:${s.x}px;top:${s.y}px;`;
  el.innerHTML = `
    <div class="map-sticker-text" contenteditable="true">${esc(s.text)}</div>
    <div class="map-sticker-actions">
      <button class="sticker-add-btn">+ В планы</button>
    </div>
  `;

  const textEl = el.querySelector('.map-sticker-text');
  textEl.addEventListener('blur', () => {
    s.text = textEl.textContent.trim();
    mapSave();
  });
  textEl.addEventListener('click', e => e.stopPropagation());

  el.querySelector('.sticker-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    openNewItemModalWithText(s.text);
  });

  makeDraggable(el, null, s);

  el.addEventListener('click', e => {
    if (map.tool === 'erase') {
      map.canvas.stickers = map.canvas.stickers.filter(x => x.id !== s.id);
      el.remove();
      mapSave();
    }
  });

  world.appendChild(el);
}

function makeDraggable(el, posKey, stickerObj) {
  let startX, startY, startL, startT, moved;
  el.addEventListener('mousedown', e => {
    if (e.target.contentEditable === 'true') return;
    if (e.target.tagName === 'BUTTON') return;
    if (map.tool === 'erase') return;
    if (map.tool === 'connect') return;
    e.stopPropagation();
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    startL = parseInt(el.style.left); startT = parseInt(el.style.top);
    moved = false;
    const onMove = ev => {
      const dx = (ev.clientX - startX) / map.scale;
      const dy = (ev.clientY - startY) / map.scale;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      el.style.left = (startL + dx) + 'px';
      el.style.top  = (startT + dy) + 'px';
      if (posKey) {
        map.canvas.positions[posKey] = { x: startL + dx, y: startT + dy };
        mapRedrawLines();
      } else if (stickerObj) {
        stickerObj.x = startL + dx;
        stickerObj.y = startT + dy;
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (moved) mapSave();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

function mapRedrawLines() {
  const svg = $('#map-svg');
  svg.innerHTML = '';
  const world = $('#map-world');

  (map.canvas.connections || []).forEach(conn => {
    const fromEl = world.querySelector(`[data-key="${conn.from}"]`);
    const toEl   = world.querySelector(`[data-key="${conn.to}"]`);
    if (!fromEl || !toEl) return;

    const fx = parseInt(fromEl.style.left) + fromEl.offsetWidth / 2;
    const fy = parseInt(fromEl.style.top)  + fromEl.offsetHeight / 2;
    const tx = parseInt(toEl.style.left)   + toEl.offsetWidth / 2;
    const ty = parseInt(toEl.style.top)    + toEl.offsetHeight / 2;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fx); line.setAttribute('y1', fy);
    line.setAttribute('x2', tx); line.setAttribute('y2', ty);
    line.style.pointerEvents = 'stroke';

    if (map.tool === 'erase') {
      line.addEventListener('mouseenter', () => line.classList.add('erase-hover'));
      line.addEventListener('mouseleave', () => line.classList.remove('erase-hover'));
      line.addEventListener('click', () => {
        map.canvas.connections = map.canvas.connections.filter(c => c.id !== conn.id);
        mapRedrawLines();
        mapSave();
      });
    }
    svg.appendChild(line);
  });
}

function mapFit() {
  const vp = $('#map-viewport');
  const nodes = $$('.map-node, .map-sticker', $('#map-world'));
  if (!nodes.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const x = parseInt(n.style.left), y = parseInt(n.style.top);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + 200); maxY = Math.max(maxY, y + 100);
  });
  const pad = 60;
  const scaleX = (vp.clientWidth  - pad * 2) / (maxX - minX || 1);
  const scaleY = (vp.clientHeight - pad * 2) / (maxY - minY || 1);
  map.scale = Math.max(0.3, Math.min(1.4, Math.min(scaleX, scaleY)));
  map.pan.x = pad - minX * map.scale;
  map.pan.y = pad - minY * map.scale;
  mapApplyTransform();
}

function openNewItemModalWithText(text) {
  state.editingItem = null;
  $('#modal-item .modal-title').textContent = 'Новый план';
  $('#m-item-title').value = text || '';
  $('#m-item-note').value = '';
  $('#m-item-start').value = '';
  $('#m-item-due').value = '';
  setStatusButtons('planned');
  openModal('modal-item');
  setTimeout(() => $('#m-item-title').focus(), 50);
}

function mapSave() {
  clearTimeout(map.saveTimer);
  map.saveTimer = setTimeout(() => api('PUT', '/api/canvas', map.canvas), 600);
}

/* ══════════════════════════════════════════════════════════════════════════
   STICKER NOTES
   ══════════════════════════════════════════════════════════════════════════ */
const NOTE_COLORS = ['#c0152a','#9f1239','#7f1d1d','#1e3a8a','#1d4ed8','#312e81','rgba(255,255,255,.08)'];

function renderHomeNotes() {
  const strip = $('#notes-strip');
  if (!strip) return;
  strip.innerHTML = '';
  const homeNotes = state.notes.filter(n => !n.section_id);
  homeNotes.forEach(n => strip.appendChild(buildNoteCard(n, null)));
  $('#notes-bar').style.display = homeNotes.length ? 'flex' : 'none';
  // always show if we want to hint user — keep visible but small when empty
  $('#notes-bar').style.display = 'flex';
}

function renderSectionNotes(secId) {
  const strip = $('#section-notes-strip');
  if (!strip) return;
  strip.innerHTML = '';
  const secNotes = state.notes.filter(n => n.section_id === secId);
  secNotes.forEach(n => strip.appendChild(buildNoteCard(n, secId)));
  strip.style.display = secNotes.length ? 'flex' : 'none';
}

function buildNoteCard(note, contextSecId) {
  const card = document.createElement('div');
  card.className = 'note-card';
  card.dataset.noteId = note.id;
  card.style.setProperty('--nc', note.color);

  const sectionName = note.section_id
    ? (state.sections.find(s => s.id === note.section_id)?.name || '')
    : '';

  card.innerHTML = `
    <div class="note-text">${esc(note.text)}</div>
    ${note.locked ? '<div class="note-lock">🔒</div>' : ''}
    <div class="note-footer">
      ${sectionName ? `<span class="note-sec-badge">${esc(sectionName)}</span>` : ''}
      <div class="note-actions">
        <button class="note-btn" data-action="move" title="Переместить в раздел">⇥</button>
        <button class="note-btn" data-action="edit" title="Редактировать">✎</button>
        <button class="note-btn danger" data-action="del" title="Удалить">✕</button>
      </div>
    </div>
  `;

  card.querySelector('[data-action="edit"]').addEventListener('click', e => {
    e.stopPropagation();
    openNoteModal(note);
  });
  card.querySelector('[data-action="del"]').addEventListener('click', async e => {
    e.stopPropagation();
    await deleteNote(note);
  });
  card.querySelector('[data-action="move"]').addEventListener('click', e => {
    e.stopPropagation();
    showNoteMover(card, note);
  });

  return card;
}

function showNoteMover(anchor, note) {
  // remove any existing picker
  $('.note-mover-popup')?.remove();
  const popup = document.createElement('div');
  popup.className = 'note-mover-popup';

  const homeOpt = document.createElement('div');
  homeOpt.className = 'mover-opt' + (!note.section_id ? ' active' : '');
  homeOpt.textContent = '🏠 Главная страница';
  homeOpt.addEventListener('click', async () => { await moveNote(note, null); popup.remove(); });
  popup.appendChild(homeOpt);

  state.sections.forEach(sec => {
    const opt = document.createElement('div');
    opt.className = 'mover-opt' + (note.section_id === sec.id ? ' active' : '');
    opt.innerHTML = `<span class="mover-dot" style="background:${sec.color}"></span>${esc(sec.name)}`;
    opt.addEventListener('click', async () => { await moveNote(note, sec.id); popup.remove(); });
    popup.appendChild(opt);
  });

  document.body.appendChild(popup);
  const r = anchor.getBoundingClientRect();
  popup.style.cssText = `top:${r.bottom + 6}px;left:${r.left}px;`;
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 10);
}

async function moveNote(note, sectionId) {
  try {
    await api('PUT', `/api/notes/${note.id}`, { section_id: sectionId, password: '' });
    note.section_id = sectionId;
    state.notes = await api('GET', '/api/notes');
    renderHomeNotes();
    if (state.currentSection) renderSectionNotes(state.currentSection.id);
  } catch(e) { alert(e.message); }
}

async function deleteNote(note) {
  if (note.locked) {
    promptPassword(note, async pw => {
      try {
        await api('DELETE', `/api/notes/${note.id}`, { password: pw });
        state.notes = state.notes.filter(n => n.id !== note.id);
        renderHomeNotes();
        if (state.currentSection) renderSectionNotes(state.currentSection.id);
      } catch(e) { alert(e.message); }
    });
    return;
  }
  try {
    await api('DELETE', `/api/notes/${note.id}`, {});
    state.notes = state.notes.filter(n => n.id !== note.id);
    renderHomeNotes();
    if (state.currentSection) renderSectionNotes(state.currentSection.id);
  } catch(e) { alert(e.message); }
}

// ── Note modal ────────────────────────────────────────────────────────────
function buildNoteColorPicker() {
  const row = $('#note-color-picker');
  row.innerHTML = '';
  NOTE_COLORS.forEach(c => {
    const dot = document.createElement('div');
    dot.className = 'color-dot' + (c === state.selectedNoteColor ? ' active' : '');
    dot.style.background = c;
    dot.dataset.color = c;
    dot.addEventListener('click', () => {
      state.selectedNoteColor = c;
      $$('#note-color-picker .color-dot').forEach(d => d.classList.toggle('active', d.dataset.color === c));
    });
    row.appendChild(dot);
  });
}

function openNoteModal(note) {
  state.editingNote = note || null;
  $('#modal-note-title').textContent = note ? 'Редактировать стикер' : 'Новый стикер';
  $('#m-note-text').value = note ? note.text : '';
  $('#m-note-pass').value = '';
  state.selectedNoteColor = note ? note.color : '#ffd166';
  buildNoteColorPicker();
  openModal('modal-note');
  setTimeout(() => $('#m-note-text').focus(), 50);
}

$('#btn-new-note').addEventListener('click', () => openNoteModal(null));
$('#btn-note-cancel').addEventListener('click', closeModal);

$('#btn-note-save').addEventListener('click', async () => {
  const text = $('#m-note-text').value.trim();
  if (!text) return;
  const pw = $('#m-note-pass').value;
  const color = state.selectedNoteColor;

  try {
    if (state.editingNote) {
      await api('PUT', `/api/notes/${state.editingNote.id}`, {
        text, color,
        new_password: pw || undefined,
        password: '',
      });
    } else {
      await api('POST', '/api/notes', { text, color, password: pw });
    }
    state.notes = await api('GET', '/api/notes');
    closeModal();
    renderHomeNotes();
    if (state.currentSection) renderSectionNotes(state.currentSection.id);
  } catch(e) { alert(e.message); }
});

/* ── Card rename ───────────────────────────────────────────────────────── */
function startCardRename(sec) {
  const el = $(`#sc-name-${sec.id}`);
  if (!el) return;
  el.contentEditable = 'true';
  el.focus();
  const range = document.createRange(); range.selectNodeContents(el);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  const finish = () => {
    const name = el.textContent.trim();
    el.contentEditable = 'false';
    if (!name) { el.textContent = sec.name; return; }
    api('PUT', `/api/sections/${sec.id}`, { name, color: sec.color })
      .then(() => { sec.name = name; if (state.currentSection?.id === sec.id) $('#section-title-label').textContent = name; })
      .catch(e => { alert(e.message); el.textContent = sec.name; });
  };
  el.addEventListener('blur', finish, { once: true });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }, { once: true });
}

/* ── Section view inline rename ────────────────────────────────────────── */
function initSectionTitleRename(sec) {
  const el = $('#section-title-label');
  el.ondblclick = () => {
    el.contentEditable = 'true';
    el.focus();
    const range = document.createRange(); range.selectNodeContents(el);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    const finish = () => {
      const name = el.textContent.trim();
      el.contentEditable = 'false';
      if (!name) { el.textContent = sec.name; return; }
      api('PUT', `/api/sections/${sec.id}`, { name, color: sec.color })
        .then(() => { sec.name = name; const card = $(`#sc-name-${sec.id}`); if (card) card.textContent = name; })
        .catch(e => { alert(e.message); el.textContent = sec.name; });
    };
    el.addEventListener('blur', finish, { once: true });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }, { once: true });
  };
}

/* ── Section menu ──────────────────────────────────────────────────────── */
$('#btn-section-menu').addEventListener('click', () => {
  const sec = state.currentSection;
  if (!sec) return;
  const el = $('#section-title-label');
  el.contentEditable = 'true'; el.focus();
  const range = document.createRange(); range.selectNodeContents(el);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
});

/* ── Init ──────────────────────────────────────────────────────────────── */
goHome();
