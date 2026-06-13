'use strict';

// ── Storage ──────────────────────────────────────────────────────────────────
const DB = {
  load() {
    try { return JSON.parse(localStorage.getItem('dashboard_data') || 'null'); } catch { return null; }
  },
  save(data) {
    localStorage.setItem('dashboard_data', JSON.stringify(data));
  },
  defaults() {
    return {
      panels: [
        {
          id: uid(), name: 'Работа', color: '#6C63FF',
          bookmarks: [
            { id: uid(), name: 'Gmail', url: 'https://mail.google.com' },
            { id: uid(), name: 'Google Drive', url: 'https://drive.google.com' },
          ]
        },
        {
          id: uid(), name: 'Новости', color: '#00C2A8',
          bookmarks: [
            { id: uid(), name: 'Habr', url: 'https://habr.com' },
          ]
        },
        {
          id: uid(), name: 'Учёба', color: '#F59E0B',
          bookmarks: []
        },
      ]
    };
  }
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── State ─────────────────────────────────────────────────────────────────────
let state = DB.load() || DB.defaults();
let editingPanelId = null;
let editingBookmarkId = null;
let editingBookmarkPanelId = null;
let contextTarget = null; // { type: 'panel'|'bookmark', panelId, bookmarkId }

// ── Favicon helper ────────────────────────────────────────────────────────────
function faviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${hostname}`;
  } catch { return null; }
}

function initials(name) {
  return name.trim().slice(0, 2).toUpperCase();
}

const COLORS = ['#6C63FF','#00C2A8','#FF6584','#F59E0B','#10B981','#3B82F6'];
function colorForName(name) {
  const i = name.charCodeAt(0) % COLORS.length;
  return COLORS[i];
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  DB.save(state);
  renderStats();
  renderPanels();
}

function renderStats() {
  const totalBookmarks = state.panels.reduce((s, p) => s + p.bookmarks.length, 0);
  document.getElementById('total-count').textContent = `${totalBookmarks} ссылок · ${state.panels.length} панелей`;

  const statsRow = document.getElementById('stats-row');
  const items = [
    { icon: '🗂️', color: '#6C63FF', value: state.panels.length, label: 'Панелей' },
    { icon: '🔗', color: '#00C2A8', value: totalBookmarks, label: 'Всего ссылок' },
    ...state.panels.slice(0, 3).map(p => ({
      icon: '📌', color: p.color, value: p.bookmarks.length, label: p.name
    }))
  ];

  statsRow.innerHTML = items.map(it => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${it.color}22">
        <span>${it.icon}</span>
      </div>
      <div class="stat-info">
        <div class="stat-value">${it.value}</div>
        <div class="stat-label">${it.label}</div>
      </div>
    </div>
  `).join('');
}

function renderPanels(filter = '') {
  const grid = document.getElementById('panels-grid');
  const q = filter.toLowerCase();

  if (state.panels.length === 0) {
    grid.innerHTML = `<div class="no-results"><div class="no-results-icon">📭</div><p>Нет панелей. Создайте первую!</p></div>`;
    return;
  }

  grid.innerHTML = state.panels.map(panel => {
    const filteredBookmarks = q
      ? panel.bookmarks.filter(b => b.name.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
      : panel.bookmarks;

    const panelVisible = !q || filteredBookmarks.length > 0 || panel.name.toLowerCase().includes(q);

    return `
    <div class="panel-card${panelVisible ? '' : ' hidden'}" data-panel-id="${panel.id}">
      <div class="panel-header">
        <div class="panel-header-left">
          <div class="panel-accent" style="background:${panel.color}"></div>
          <span class="panel-title">${esc(panel.name)}</span>
          <span class="panel-count">${panel.bookmarks.length}</span>
        </div>
        <div class="panel-actions">
          <button class="icon-btn" title="Редактировать панель" onclick="openEditPanel('${panel.id}')">✏️</button>
          <button class="icon-btn danger" title="Удалить панель" onclick="deletePanel('${panel.id}')">🗑️</button>
        </div>
      </div>
      <div class="bookmarks-list">
        ${filteredBookmarks.length === 0 && !q ? `
          <div class="empty-state">
            <div class="empty-state-icon">🔗</div>
            <p>Добавьте первую ссылку</p>
          </div>
        ` : filteredBookmarks.map(bk => renderBookmark(bk, panel.id, panel.color, q)).join('')}
      </div>
      <button class="add-bookmark-btn" onclick="openAddBookmark('${panel.id}')">
        <span class="plus">+</span> Добавить ссылку
      </button>
    </div>
  `;
  }).join('');
}

function renderBookmark(bk, panelId, accentColor, q = '') {
  const fav = faviconUrl(bk.url);
  const fallbackColor = colorForName(bk.name);
  const nameHtml = q ? highlight(esc(bk.name), q) : esc(bk.name);

  const faviconEl = fav
    ? `<img class="bookmark-favicon" src="${fav}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="" /><div class="bookmark-favicon-fallback" style="background:${fallbackColor};display:none">${initials(bk.name)}</div>`
    : `<div class="bookmark-favicon-fallback" style="background:${fallbackColor}">${initials(bk.name)}</div>`;

  return `
    <div class="bookmark-item" data-bk-id="${bk.id}" data-panel-id="${panelId}"
         onclick="openUrl('${esc(bk.url)}')"
         oncontextmenu="showCtx(event,'bookmark','${panelId}','${bk.id}')">
      ${faviconEl}
      <span class="bookmark-name" title="${esc(bk.url)}">${nameHtml}</span>
      <div class="bookmark-item-actions" onclick="event.stopPropagation()">
        <button class="bk-btn" title="Редактировать" onclick="openEditBookmark('${panelId}','${bk.id}')">✏️</button>
        <button class="bk-btn danger" title="Удалить" onclick="deleteBookmark('${panelId}','${bk.id}')">✕</button>
      </div>
    </div>
  `;
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark class="highlight">$1</mark>');
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function openUrl(url) { window.open(url, '_blank'); }

// ── Panel CRUD ────────────────────────────────────────────────────────────────
let selectedColor = '#6C63FF';

function openAddPanel() {
  editingPanelId = null;
  document.getElementById('panel-modal-title').textContent = 'Новая панель';
  document.getElementById('panel-name-input').value = '';
  selectedColor = '#6C63FF';
  syncColorPicker();
  openModal('panel-modal');
}

function openEditPanel(panelId) {
  const panel = state.panels.find(p => p.id === panelId);
  if (!panel) return;
  editingPanelId = panelId;
  document.getElementById('panel-modal-title').textContent = 'Редактировать панель';
  document.getElementById('panel-name-input').value = panel.name;
  selectedColor = panel.color;
  syncColorPicker();
  openModal('panel-modal');
}

function savePanelModal() {
  const name = document.getElementById('panel-name-input').value.trim();
  if (!name) { document.getElementById('panel-name-input').focus(); return; }

  if (editingPanelId) {
    const panel = state.panels.find(p => p.id === editingPanelId);
    if (panel) { panel.name = name; panel.color = selectedColor; }
  } else {
    state.panels.push({ id: uid(), name, color: selectedColor, bookmarks: [] });
  }
  closeModal('panel-modal');
  render();
}

function deletePanel(panelId) {
  if (!confirm('Удалить панель со всеми закладками?')) return;
  state.panels = state.panels.filter(p => p.id !== panelId);
  render();
}

// ── Bookmark CRUD ─────────────────────────────────────────────────────────────
function openAddBookmark(panelId) {
  editingBookmarkId = null;
  editingBookmarkPanelId = panelId;
  document.getElementById('bookmark-modal-title').textContent = 'Новая ссылка';
  document.getElementById('bookmark-name-input').value = '';
  document.getElementById('bookmark-url-input').value = '';
  openModal('bookmark-modal');
}

function openEditBookmark(panelId, bookmarkId) {
  const panel = state.panels.find(p => p.id === panelId);
  const bk = panel?.bookmarks.find(b => b.id === bookmarkId);
  if (!bk) return;
  editingBookmarkId = bookmarkId;
  editingBookmarkPanelId = panelId;
  document.getElementById('bookmark-modal-title').textContent = 'Редактировать ссылку';
  document.getElementById('bookmark-name-input').value = bk.name;
  document.getElementById('bookmark-url-input').value = bk.url;
  openModal('bookmark-modal');
}

function saveBookmarkModal() {
  const name = document.getElementById('bookmark-name-input').value.trim();
  let url = document.getElementById('bookmark-url-input').value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const panel = state.panels.find(p => p.id === editingBookmarkPanelId);
  if (!panel) return;

  if (editingBookmarkId) {
    const bk = panel.bookmarks.find(b => b.id === editingBookmarkId);
    if (bk) { bk.name = name; bk.url = url; }
  } else {
    panel.bookmarks.push({ id: uid(), name, url });
  }
  closeModal('bookmark-modal');
  render();
}

function deleteBookmark(panelId, bookmarkId) {
  const panel = state.panels.find(p => p.id === panelId);
  if (!panel) return;
  panel.bookmarks = panel.bookmarks.filter(b => b.id !== bookmarkId);
  render();
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function syncColorPicker() {
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.color === selectedColor);
  });
}

// ── Context menu ──────────────────────────────────────────────────────────────
function showCtx(e, type, panelId, bookmarkId) {
  e.preventDefault();
  contextTarget = { type, panelId, bookmarkId };
  const menu = document.getElementById('context-menu');
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.classList.add('open');
}

function hideCtx() { document.getElementById('context-menu').classList.remove('open'); }

// ── Search ────────────────────────────────────────────────────────────────────
document.getElementById('global-search').addEventListener('input', e => {
  renderPanels(e.target.value);
});

// ── Event bindings ────────────────────────────────────────────────────────────
document.getElementById('add-panel-btn').addEventListener('click', openAddPanel);
document.getElementById('panel-modal-close').addEventListener('click', () => closeModal('panel-modal'));
document.getElementById('panel-modal-cancel').addEventListener('click', () => closeModal('panel-modal'));
document.getElementById('panel-modal-save').addEventListener('click', savePanelModal);
document.getElementById('panel-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') savePanelModal(); });

document.getElementById('bookmark-modal-close').addEventListener('click', () => closeModal('bookmark-modal'));
document.getElementById('bookmark-modal-cancel').addEventListener('click', () => closeModal('bookmark-modal'));
document.getElementById('bookmark-modal-save').addEventListener('click', saveBookmarkModal);
document.getElementById('bookmark-url-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveBookmarkModal(); });

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

document.getElementById('color-picker').addEventListener('click', e => {
  const dot = e.target.closest('.color-dot');
  if (!dot) return;
  selectedColor = dot.dataset.color;
  syncColorPicker();
});

document.getElementById('ctx-edit').addEventListener('click', () => {
  hideCtx();
  if (!contextTarget) return;
  if (contextTarget.type === 'bookmark') openEditBookmark(contextTarget.panelId, contextTarget.bookmarkId);
  if (contextTarget.type === 'panel') openEditPanel(contextTarget.panelId);
});
document.getElementById('ctx-delete').addEventListener('click', () => {
  hideCtx();
  if (!contextTarget) return;
  if (contextTarget.type === 'bookmark') deleteBookmark(contextTarget.panelId, contextTarget.bookmarkId);
  if (contextTarget.type === 'panel') deletePanel(contextTarget.panelId);
});

document.addEventListener('click', hideCtx);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('panel-modal');
    closeModal('bookmark-modal');
    hideCtx();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
render();
