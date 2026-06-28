/* ── State ─────────────────────────────────────────────────────────────── */
const state = {
  sections: [],
  currentSection: null,
  currentItems: [],
  sectionPasswords: {},   // {sectionId: password}
  editingItem: null,
  selectedColor: '#6366f1',
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
  state.sections = await api('GET', '/api/sections');
  renderSections();
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
  $('#m-item-start').value = todayStr();
  $('#m-item-due').value = todayStr();
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
  $('#timeline-canvas').innerHTML = '';
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

    // handle locked
    if (res.locked && res.locked.length) {
      await unlockSequential(res.locked, sections, res.items);
    } else {
      renderBranches(res.items, $('#timeline-canvas'));
    }
  } catch(e) { alert(e.message); }
}

async function unlockSequential(locked, sections, existingItems) {
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
  // retry with updated passwords
  const res = await api('POST', '/api/timeline', { sections });
  renderBranches(res.items, $('#timeline-canvas'));
}

/* ── Branch map (timeline view) ────────────────────────────────────────── */
function renderBranches(items, canvas) {
  canvas.innerHTML = '';
  if (!items.length) {
    canvas.innerHTML = `<div class="empty-state"><span>◌</span>Нет планов для отображения</div>`;
    return;
  }

  // group by section
  const sections = [];
  const byId = {};
  items.forEach(item => {
    if (!byId[item.section_id]) {
      byId[item.section_id] = { id: item.section_id, name: item.section_name, color: item.section_color, items: [] };
      sections.push(byId[item.section_id]);
    }
    byId[item.section_id].items.push(item);
  });

  const wrap = document.createElement('div');
  wrap.className = 'branches-wrap';

  sections.forEach(sec => {
    const branch = document.createElement('div');
    branch.className = 'branch-row';
    branch.style.setProperty('--bc', sec.color);

    const lbl = document.createElement('div');
    lbl.className = 'branch-section-label';
    lbl.textContent = sec.name;

    const chips = document.createElement('div');
    chips.className = 'branch-chips';

    sec.items
      .slice()
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
      .forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'branch-chip';
        chip.style.setProperty('--bc', sec.color);

        const statusClass = { planned: 'st-planned', active: 'st-active', done: 'st-done' }[item.status] || 'st-planned';
        const dateStr = [item.start_date, item.due_date].filter(Boolean).join(' → ');

        chip.innerHTML = `
          <div class="bchip-dot ${statusClass}"></div>
          <div class="bchip-body">
            <div class="bchip-title">${esc(item.title)}</div>
            ${dateStr ? `<div class="bchip-date">${dateStr}</div>` : ''}
            ${item.note ? `<div class="bchip-note">${esc(item.note)}</div>` : ''}
          </div>
        `;
        chips.appendChild(chip);
      });

    branch.appendChild(lbl);
    branch.appendChild(chips);
    wrap.appendChild(branch);
  });

  canvas.appendChild(wrap);
}

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
