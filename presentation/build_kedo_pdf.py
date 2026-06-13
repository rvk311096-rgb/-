# -*- coding: utf-8 -*-
"""Генератор PDF-презентации «Битрикс24 КЭДО» — тёмное стекло, 12 слайдов."""

import base64, os
from weasyprint import HTML as WP

# ── встроенные шрифты ──────────────────────────────────────────────────────────
def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

FONT_DIR = "/tmp/fonts"
fonts_css = f"""
@font-face {{
  font-family: 'Inter'; font-weight: 300; font-style: normal;
  src: url('data:font/woff2;base64,{b64(f"{FONT_DIR}/Inter-Light.woff2")}') format('woff2');
}}
@font-face {{
  font-family: 'Inter'; font-weight: 400; font-style: normal;
  src: url('data:font/woff2;base64,{b64(f"{FONT_DIR}/Inter-Regular.woff2")}') format('woff2');
}}
@font-face {{
  font-family: 'Inter'; font-weight: 500; font-style: normal;
  src: url('data:font/woff2;base64,{b64(f"{FONT_DIR}/Inter-Medium.woff2")}') format('woff2');
}}
@font-face {{
  font-family: 'Inter'; font-weight: 600; font-style: normal;
  src: url('data:font/woff2;base64,{b64(f"{FONT_DIR}/Inter-SemiBold.woff2")}') format('woff2');
}}
"""

# ── базовый CSS ────────────────────────────────────────────────────────────────
BASE_CSS = """
@page {
  size: 297mm 167mm; /* 16:9 landscape */
  margin: 0;
}
* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: 'Inter', 'Liberation Sans', sans-serif;
  font-weight: 400;
  letter-spacing: -.1px;
  line-height: 1.5;
  background: #07091a;
  color: #cdd8f0;
}

/* ── слайд ── */
.slide {
  width: 297mm;
  height: 167mm;
  background: #07091a;
  position: relative;
  overflow: hidden;
  page-break-after: always;
}
.slide:last-child { page-break-after: avoid; }

/* ambient-кружки (без blur в PDF → очень прозрачные) */
.orb {
  position: absolute;
  border-radius: 50%;
}
.orb1 { width:250mm; height:250mm; background:rgba(85,102,240,.13);
         top:-120mm; left:-80mm; }
.orb2 { width:220mm; height:220mm; background:rgba(51,70,204,.10);
         bottom:-110mm; right:-70mm; }
.orb3 { width:300mm; height:300mm; background:rgba(85,102,240,.05);
         top:50%; left:50%; margin-top:-150mm; margin-left:-150mm; }

/* ── контент поверх орбов ── */
.content { position: relative; z-index: 1; padding: 10mm 14mm; height:100%; }

/* ── стекло ── */
.glass {
  background: rgba(85,102,240,.09);
  border: 1px solid rgba(200,215,255,.14);
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 3px 18px rgba(0,0,0,.22);
}
.glass-mid {
  background: rgba(200,215,255,.06);
  border: 1px solid rgba(200,215,255,.11);
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 2px 12px rgba(0,0,0,.18);
}

/* ── типографика ── */
.kicker {
  font-size: 7.5pt; font-weight: 500;
  color: rgba(200,215,255,.45);
  text-transform: uppercase; letter-spacing: 1.8px;
  margin-bottom: 3mm;
}
h1 { font-size: 26pt; font-weight: 600; letter-spacing: -.4px;
     line-height: 1.14; color: #dce4f5; margin-bottom: 3mm; }
h2 { font-size: 14pt; font-weight: 600; letter-spacing: -.2px;
     color: #dce4f5; margin-bottom: 2mm; }
h3 { font-size: 10pt; font-weight: 600; color: #dce4f5; margin-bottom:1.5mm; }
p  { font-size: 9pt; font-weight: 300; color: #cdd8f0; line-height: 1.5; }
.muted { color: rgba(200,215,255,.42); }
.accent { color: #5566f0; font-weight: 600; }
.hero-sub {
  font-size: 11.5pt; font-weight: 300; color: #cdd8f0;
  max-width: 155mm; line-height: 1.55;
}
.hero-sub b { font-weight: 500; color: #dce4f5; }

/* ── лого ── */
.logo { display:flex; align-items:center; gap:3mm; }
.logo-mark {
  width:9mm; height:9mm; border-radius:2.5mm;
  background:linear-gradient(140deg,#5566f0,#3346cc);
  display:flex; align-items:center; justify-content:center;
  font-size:12pt; font-weight:600; color:#fff;
}
.logo-text { font-size:11pt; font-weight:600; color:#dce4f5; }
.logo-text span { color:#5566f0; }

/* ── бейдж ── */
.badge {
  display:inline-block; padding:1.2mm 4mm; border-radius:20px;
  background:rgba(85,102,240,.14); border:1px solid rgba(85,102,240,.5);
  font-size:7.5pt; font-weight:500; color:#cdd8f0;
}

/* ── шапка слайда ── */
.slide-header {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:6mm;
}
.slide-num { font-size:8pt; color:rgba(200,215,255,.28); font-weight:500; }

/* ── акцентная полоса ── */
.top-bar {
  position:absolute; top:0; left:0; right:0; height:1.2mm;
  background:linear-gradient(90deg,#5566f0,#3346cc,rgba(51,70,204,0));
}

/* ── цифровые карточки ── */
.stats-row { display:flex; gap:4mm; margin-bottom:7mm; }
.stat {
  flex:1; padding:4mm 3mm; text-align:center;
  background: rgba(85,102,240,.09);
  border: 1px solid rgba(200,215,255,.13);
  border-radius:13px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
}
.stat .n {
  font-size:22pt; font-weight:600; color:#7c8cff;
  letter-spacing:-.5px; line-height:1;
}
.stat .l { font-size:7.5pt; color:rgba(200,215,255,.42); margin-top:2mm; line-height:1.35; }

/* ── Feature-карточки ── */
.cards-grid { display:flex; gap:4mm; }
.feat-card {
  flex:1; padding:5mm 5mm;
  background:rgba(85,102,240,.09);
  border:1px solid rgba(200,215,255,.13);
  border-radius:13px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
  position:relative;
}
.feat-card .accent-bar {
  position:absolute; top:0; left:0; bottom:0; width:1.5mm;
  border-radius:13px 0 0 13px;
  background:linear-gradient(180deg,#5566f0,#3346cc);
}
.feat-card-body { padding-left:3mm; }
.feat-card h3 { font-size:9.5pt; font-weight:600; color:#dce4f5; margin-bottom:1.5mm; }
.feat-card p { font-size:8pt; font-weight:300; color:rgba(200,215,255,.55); line-height:1.45; }

/* ── шаги ── */
.step-row { display:flex; gap:4mm; }
.step-box {
  flex:1; padding:5mm;
  background:rgba(85,102,240,.09);
  border:1px solid rgba(200,215,255,.13);
  border-radius:13px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
}
.step-num {
  width:7mm; height:7mm; border-radius:50%;
  background:linear-gradient(140deg,#5566f0,#3346cc);
  display:flex; align-items:center; justify-content:center;
  font-size:9pt; font-weight:600; color:#fff; margin-bottom:3mm;
}
.step-box h3 { font-size:9pt; font-weight:600; color:#dce4f5; margin-bottom:1.5mm; }
.step-box p { font-size:7.5pt; font-weight:300; color:rgba(200,215,255,.5); line-height:1.4; }
.step-tag { font-size:7pt; color:#7c8cff; font-weight:500; }

/* ── блок шагов в строку ── */
.steps-list { margin-bottom:5mm; }
.step-item {
  display:flex; gap:4mm; align-items:flex-start;
  padding:3.5mm 4mm;
  border-bottom:1px solid rgba(200,215,255,.07);
}
.step-item:last-child { border-bottom:none; }
.step-item .num {
  flex:0 0 7mm; height:7mm; border-radius:50%;
  background:linear-gradient(140deg,#5566f0,#3346cc);
  display:flex; align-items:center; justify-content:center;
  font-size:8.5pt; font-weight:600; color:#fff;
}
.step-item h3 { font-size:9pt; font-weight:500; color:#dce4f5; }
.step-item p { font-size:8pt; font-weight:300; color:rgba(200,215,255,.5); margin-top:0.5mm; }

/* ── section-заголовок ── */
.sec-label {
  font-size:7pt; font-weight:500; color:rgba(200,215,255,.42);
  text-transform:uppercase; letter-spacing:1.5px; margin-bottom:3.5mm;
}

/* ── список буллетов ── */
.blist { padding:0 1mm; }
.blist li {
  list-style:none; display:flex; gap:3mm; align-items:flex-start;
  padding:2.5mm 0; border-bottom:1px solid rgba(200,215,255,.07);
  font-size:8.5pt;
}
.blist li:last-child { border-bottom:none; }
.blist li::before {
  content:''; flex:0 0 2mm; height:2mm; border-radius:50%;
  background:#5566f0; margin-top:2mm;
}
.blist li b { font-weight:500; color:#dce4f5; }
.blist li span { color:rgba(200,215,255,.5); }

/* ── правый панель тёмная ── */
.dark-panel {
  background:rgba(7,9,26,.6);
  border:1px solid rgba(200,215,255,.1);
  border-radius:13px; padding:5mm 6mm;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
}
.dark-panel h3 { font-size:10pt; font-weight:600; color:#7c8cff; margin-bottom:3mm; }
.dark-panel p { font-size:8pt; font-weight:300; color:#cdd8f0; line-height:1.5; }
.dark-panel ul { padding-left:0; }
.dark-panel ul li {
  list-style:none; padding:1.8mm 0; font-size:8pt;
  border-bottom:1px solid rgba(200,215,255,.06);
  color:#cdd8f0; display:flex; gap:2.5mm;
}
.dark-panel ul li::before { content:'→'; color:#5566f0; font-weight:600; }
.dark-panel ul li:last-child { border-bottom:none; }

/* ── предупреждающие карточки ── */
.warn-card {
  display:flex; gap:0; align-items:stretch; margin-bottom:3mm;
  background:rgba(200,215,255,.05);
  border:1px solid rgba(200,215,255,.1);
  border-radius:11px; overflow:hidden;
}
.warn-bar { width:2mm; background:rgba(249,169,29,.7); flex-shrink:0; }
.warn-body { padding:2.5mm 4mm; font-size:8.5pt; color:#cdd8f0; }

/* ── check-list ── */
.chklist li {
  list-style:none; display:flex; gap:3mm; align-items:flex-start;
  padding:2mm 0; font-size:8.5pt; color:#cdd8f0;
  border-bottom:1px solid rgba(200,215,255,.06);
}
.chklist li::before {
  content:'✓'; color:#9dcf00; font-weight:600; font-size:9pt;
}
.chklist li:last-child { border-bottom:none; }

/* ── инфо-панель ── */
.info-strip {
  background:rgba(85,102,240,.12);
  border:1px solid rgba(85,102,240,.3);
  border-radius:11px; padding:3mm 5mm;
  font-size:8.5pt; color:#cdd8f0; line-height:1.5;
  margin-bottom:5mm;
}
.info-strip b { color:#8a97ff; font-weight:600; }

/* ── layout helpers ── */
.row { display:flex; gap:5mm; }
.col { flex:1; }
.col2 { flex:0 0 62%; }
.col-r { flex:1; }
"""

# ── хелперы ────────────────────────────────────────────────────────────────────

def orbs():
    return '<div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>'

def top_bar():
    return '<div class="top-bar"></div>'

def logo_html():
    return '''<div class="logo">
      <div class="logo-mark">S</div>
      <div class="logo-text">smart <span>business</span></div>
    </div>'''

def slide_header(num, total=12):
    return f'''<div class="slide-header">
      {logo_html()}
      <span class="slide-num">{num:02d} / {total:02d}</span>
    </div>'''

def badge(text):
    return f'<span class="badge">{text}</span>'

# ── слайды ─────────────────────────────────────────────────────────────────────

slides = []

# 01 ── ТИТУЛ ──────────────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content" style="display:flex;flex-direction:column;justify-content:space-between;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      {logo_html()}
      {badge('Официальный партнёр Битрикс24')}
    </div>
    <div>
      <div class="kicker" style="margin-bottom:4mm;">Инструмент для HR-автоматизации</div>
      <h1 style="font-size:34pt;margin-bottom:4mm;">
        Битрикс24 <span style="color:#5566f0;">КЭДО</span>
      </h1>
      <p class="hero-sub">
        Кадровый электронный документооборот с Госключом:
        сотрудники подписывают документы <b>за минуты</b> — без бумаги,
        печати и курьеров. Полностью юридически значимо (377-ФЗ).
      </p>
    </div>
    <div style="display:flex;gap:5mm;align-items:center;">
      <div class="glass" style="padding:3mm 5mm;display:inline-block;">
        <span style="font-size:8pt;color:rgba(200,215,255,.5);">Smart Business · Ростов-на-Дону · по всей России</span>
      </div>
    </div>
  </div>
</div>
""")

# 02 ── ЧТО ТАКОЕ КЭДО ─────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(2)}
    <h2 style="margin-bottom:5mm;">Что такое КЭДО</h2>
    <div class="row" style="gap:5mm;">
      <div class="col">
        <p class="hero-sub" style="font-size:10pt;margin-bottom:4mm;">
          <b>Кадровый электронный документооборот</b> — это подписание кадровых
          документов между компанией и сотрудником онлайн, без бумаги и
          личных встреч.
        </p>
        <div class="info-strip">
          <b>Правовая база:</b> Федеральный закон № 377-ФЗ от 22.11.2021,
          статьи 22.1–22.3 Трудового кодекса РФ. Электронные документы
          равнозначны бумажным — дублировать не нужно.
        </div>
        <div class="feat-card" style="margin-bottom:0;">
          <div class="accent-bar"></div>
          <div class="feat-card-body">
            <h3>Где в Битрикс24</h3>
            <p>Раздел «КЭДО + Госключ» в главном меню портала.
            Подписание из браузера и мобильного приложения —
            офис, удалёнка, командировка.</p>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="sec-label">Какие документы переводятся</div>
        <ul class="chklist" style="margin-bottom:4mm;">
          <li>Трудовые договоры и допсоглашения</li>
          <li>Приказы о командировках и переводах</li>
          <li>Заявления (отпуск, отгул, командировка)</li>
          <li>Согласия на обработку персональных данных</li>
          <li>Положения и регламенты компании</li>
          <li>Ознакомление с должностными инструкциями</li>
        </ul>
        <div class="dark-panel" style="padding:3mm 4mm;">
          <p style="color:rgba(200,215,255,.55);font-size:7.5pt;">
            Подходит компаниям с удалёнными сотрудниками и филиалами,
            HR-отделам с большим потоком документов, бизнесу
            любого масштаба — от 10 до 10 000+ сотрудников.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
""")

# 03 ── ПОЧЕМУ ПОРА ────────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(3)}
    <h2 style="margin-bottom:2mm;">Бумажный кадровый ДО обходится дорого</h2>
    <p class="muted" style="font-size:8pt;margin-bottom:5mm;">
      Подписание с удалённым сотрудником занимает дни, документы теряются, HR тратит время на рутину
    </p>
    <div class="stats-row">
      <div class="stat"><div class="n">−80%</div><div class="l">времени HR на создание, согласование и подписание</div></div>
      <div class="stat"><div class="n">30 ч</div><div class="l">в месяц экономит каждый кадровый специалист</div></div>
      <div class="stat"><div class="n">2 мин</div><div class="l">среднее время подписания через Госключ</div></div>
      <div class="stat"><div class="n">0 ₽</div><div class="l">расходов на бумагу, печать, курьеров и архив</div></div>
    </div>
    <div class="row" style="gap:4mm;">
      <div class="col">
        <ul class="blist">
          <li><b>Долго&nbsp;</b><span>— подписание с удалённым сотрудником: печать, курьер, ожидание, возврат</span></li>
          <li><b>Дорого&nbsp;</b><span>— бумага, печать, доставка, хранение в физическом архиве</span></li>
        </ul>
      </div>
      <div class="col">
        <ul class="blist">
          <li><b>Рискованно&nbsp;</b><span>— документы теряются, подписываются с опозданием или не теми датами</span></li>
          <li><b>Непрозрачно&nbsp;</b><span>— неизвестно, на каком этапе документ и кто его задерживает</span></li>
        </ul>
      </div>
    </div>
  </div>
</div>
""")

# 04 ── ВОЗМОЖНОСТИ ────────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(4)}
    <h2 style="margin-bottom:5mm;">Возможности Битрикс24 КЭДО</h2>
    <div class="cards-grid" style="gap:4mm;">
      <div class="feat-card">
        <div class="accent-bar"></div>
        <div class="feat-card-body">
          <h3>Шаблоны документов</h3>
          <p>Готовые и собственные шаблоны: данные компании и сотрудника подставляются автоматически из Битрикс24.</p>
        </div>
      </div>
      <div class="feat-card">
        <div class="accent-bar" style="background:linear-gradient(180deg,#2fc6f5,#1a8fc5);"></div>
        <div class="feat-card-body">
          <h3>Комплекты документов</h3>
          <p>Наборы для типовых ситуаций — приём сотрудника: трудовой договор, NDA, согласие на ПД одним действием.</p>
        </div>
      </div>
      <div class="feat-card">
        <div class="accent-bar" style="background:linear-gradient(180deg,#9dcf00,#6a9000);"></div>
        <div class="feat-card-body">
          <h3>Маршруты подписания</h3>
          <p>Согласующие по ролям, а не по фамилиям: «руководитель отдела», «директор». Маршрут — от компании или от сотрудника.</p>
        </div>
      </div>
    </div>
    <div style="height:3mm;"></div>
    <div class="cards-grid" style="gap:4mm;">
      <div class="feat-card">
        <div class="accent-bar"></div>
        <div class="feat-card-body">
          <h3>Подписание через Госключ</h3>
          <p>Бесплатное приложение Минцифры: сотрудник подписывает документ со смартфона за пару минут.</p>
        </div>
      </div>
      <div class="feat-card">
        <div class="accent-bar" style="background:linear-gradient(180deg,#2fc6f5,#1a8fc5);"></div>
        <div class="feat-card-body">
          <h3>Интеграция с 1С:ЗУП</h3>
          <p>Документы из 1С уходят на подпись в КЭДО, шаблоны заполняются данными сотрудников — без ручного ввода.</p>
        </div>
      </div>
      <div class="feat-card">
        <div class="accent-bar" style="background:linear-gradient(180deg,#9dcf00,#6a9000);"></div>
        <div class="feat-card-body">
          <h3>Электронный архив</h3>
          <p>Все документы хранятся в одном месте: даже через 5 лет нужный файл находится за 2 клика.</p>
        </div>
      </div>
    </div>
  </div>
</div>
""")

# 05 ── КАК ОТПРАВИТЬ ──────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(5)}
    <h2 style="margin-bottom:2mm;">Как отправить документ на подпись</h2>
    <p class="muted" style="font-size:8pt;margin-bottom:5mm;">Четыре шага на стороне HR — и документ уходит сотрудникам</p>
    <div class="step-row" style="margin-bottom:5mm;">
      <div class="step-box">
        <div class="step-num">1</div>
        <h3>Подготовьте документ</h3>
        <p>Загрузите файл или создайте по шаблону — реквизиты заполнятся автоматически.</p>
      </div>
      <div class="step-box">
        <div class="step-num">2</div>
        <h3>Выберите компанию и представителя</h3>
        <p>Кто подписывает со стороны работодателя (УКЭП).</p>
      </div>
      <div class="step-box">
        <div class="step-num">3</div>
        <h3>Укажите провайдера подписи</h3>
        <p>Госключ (УНЭП) или внутренний сервис Битрикс24 КЭДО (ПЭП).</p>
      </div>
      <div class="step-box">
        <div class="step-num">4</div>
        <h3>Выберите сотрудников</h3>
        <p>Одного, отдел или всю компанию — каждый получит уведомление.</p>
      </div>
    </div>
    <div class="dark-panel">
      <h3 style="font-size:9pt;margin-bottom:2mm;">Что видит сотрудник</h3>
      <ul>
        <li>Уведомление в Битрикс24 о поступившем документе</li>
        <li>Переход в приложение Госключ на смартфоне</li>
        <li>Подписание в пару касаний — документ автоматически попадает в архив</li>
      </ul>
    </div>
  </div>
</div>
""")

# 06 ── ПОДПИСИ И ГОСКЛЮЧ ──────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(6)}
    <h2 style="margin-bottom:5mm;">Электронные подписи и Госключ</h2>
    <div class="row" style="gap:5mm;">
      <div class="col">
        <div class="feat-card" style="margin-bottom:4mm;">
          <div class="accent-bar"></div>
          <div class="feat-card-body">
            <h3>Работодатель — УКЭП</h3>
            <p>Усиленная квалифицированная электронная подпись.
            Документы заверяет уполномоченный представитель компании.</p>
          </div>
        </div>
        <div class="feat-card">
          <div class="accent-bar" style="background:linear-gradient(180deg,#2fc6f5,#1a8fc5);"></div>
          <div class="feat-card-body">
            <h3>Сотрудник — УНЭП / ПЭП</h3>
            <p>Усиленная неквалифицированная подпись через Госключ
            или простая электронная подпись через внутренний
            сервис Битрикс24 КЭДО — по типу документа.</p>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="dark-panel" style="height:100%;">
          <h3>Госключ — бесплатно для сотрудников</h3>
          <ul>
            <li>Приложение Министерства цифрового развития РФ</li>
            <li>Подпись выпускается онлайн — без визита в УЦ</li>
            <li>Нужна только подтверждённая запись на Госуслугах</li>
            <li>Подписание со смартфона из любой точки мира</li>
            <li style="color:#9dcf00;">Для сотрудника — 0 рублей</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
""")

# 07 ── ИНТЕГРАЦИЯ 1С ──────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(7)}
    <h2 style="margin-bottom:2mm;">Интеграция с 1С: без ручного ввода</h2>
    <p class="muted" style="font-size:8pt;margin-bottom:5mm;">
      Связка Битрикс24 КЭДО + 1С (в т.ч. 1С:ЗУП) исключает ошибки и двойную работу
    </p>
    <div class="cards-grid" style="gap:4mm;margin-bottom:5mm;">
      <div class="feat-card">
        <div class="accent-bar"></div>
        <div class="feat-card-body">
          <h3>Документы из 1С — на подпись</h3>
          <p>Кадровик формирует документ в привычной 1С и отправляет
          на подписание в Битрикс24 КЭДО, не выходя из программы.</p>
        </div>
      </div>
      <div class="feat-card">
        <div class="accent-bar" style="background:linear-gradient(180deg,#2fc6f5,#1a8fc5);"></div>
        <div class="feat-card-body">
          <h3>Данные сотрудников из 1С</h3>
          <p>Битрикс24 КЭДО заполняет шаблоны данными из 1С:
          сопоставление сотрудников настраивается один раз.</p>
        </div>
      </div>
      <div class="feat-card">
        <div class="accent-bar" style="background:linear-gradient(180deg,#9dcf00,#6a9000);"></div>
        <div class="feat-card-body">
          <h3>Статусы и архив</h3>
          <p>Подписанные документы и статусы синхронизируются:
          в 1С видно, что подписано, а что ждёт сотрудника.</p>
        </div>
      </div>
    </div>
    <div class="info-strip">
      <b>Результат:</b> ноль ручного переноса данных между системами,
      ноль ошибок в реквизитах и датах.
      Единый контур: <b>1С → Битрикс24 → Госключ → архив</b>.
    </div>
  </div>
</div>
""")

# 08 ── ШАБЛОНЫ И КОМПЛЕКТЫ ───────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(8)}
    <h2 style="margin-bottom:5mm;">Шаблоны и комплекты документов</h2>
    <div class="row" style="gap:5mm;">
      <div class="col">
        <ul class="blist" style="margin-bottom:4mm;">
          <li><b>Свои шаблоны&nbsp;</b><span>— загрузите трудовой договор, допсоглашение, приказ или заявление</span></li>
          <li><b>Автозаполнение&nbsp;</b><span>— данные компании и сотрудника подставляются из Битрикс24 и 1С</span></li>
          <li><b>Самообслуживание&nbsp;</b><span>— сотрудник сам формирует заявление на отпуск по шаблону и отправляет на подпись</span></li>
          <li><b>Простая подпись&nbsp;</b><span>— типовые заявления подписываются ПЭП прямо в Битрикс24, без Госключа</span></li>
        </ul>
        <div class="dark-panel" style="padding:3mm 4mm;">
          <p style="font-size:7.5pt;color:rgba(200,215,255,.55);">
            HR-специалист экономит <span style="color:#7c8cff;font-weight:500;">до 30 часов в месяц</span>
            за счёт устранения ручного создания, распечатки и сбора подписей.
          </p>
        </div>
      </div>
      <div class="col">
        <div class="sec-label">Комплект «Приём сотрудника»</div>
        <div class="glass" style="padding:4mm 5mm;">
          <ul class="chklist">
            <li>Трудовой договор</li>
            <li>Согласие на обработку персональных данных</li>
            <li>Положение о коммерческой тайне (NDA)</li>
            <li>Ознакомление с ЛНА и должностной инструкцией</li>
          </ul>
          <div style="margin-top:3mm;padding-top:3mm;border-top:1px solid rgba(200,215,255,.08);">
            <p style="font-size:8pt;color:#7c8cff;font-weight:500;">
              Весь комплект уходит сотруднику одним действием
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
""")

# 09 ── ЧТО ОСТАЁТСЯ НА БУМАГЕ ────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(9)}
    <h2 style="margin-bottom:2mm;">Что остаётся на бумаге</h2>
    <p class="muted" style="font-size:8pt;margin-bottom:5mm;">
      Закон (ст. 22.1 ТК РФ) оставляет несколько исключений — важно учесть при переходе
    </p>
    <div class="row" style="gap:5mm;">
      <div class="col">
        <div class="sec-label" style="margin-bottom:3mm;">Документы, которые нельзя перевести в электронный вид</div>
        <div class="warn-card"><div class="warn-bar"></div><div class="warn-body">Трудовые книжки и сведения о трудовой деятельности (СТД-Р)</div></div>
        <div class="warn-card"><div class="warn-bar"></div><div class="warn-body">Акты о несчастных случаях на производстве</div></div>
        <div class="warn-card"><div class="warn-bar"></div><div class="warn-body">Приказы (распоряжения) об увольнении</div></div>
        <div class="warn-card"><div class="warn-bar"></div><div class="warn-body">Документы о прохождении инструктажей по охране труда</div></div>
      </div>
      <div class="col">
        <div class="feat-card" style="margin-bottom:4mm;">
          <div class="accent-bar"></div>
          <div class="feat-card-body">
            <h3>Согласие сотрудника обязательно</h3>
            <p>Переход на КЭДО возможен только с письменного согласия работника.
            Отказ — не основание для увольнения или отказа в приёме на работу.</p>
          </div>
        </div>
        <div class="feat-card">
          <div class="accent-bar" style="background:linear-gradient(180deg,#9dcf00,#6a9000);"></div>
          <div class="feat-card-body">
            <h3>Исключение для новичков</h3>
            <p>Сотрудников, принятых после 31.12.2021 и не имеющих
            трудового стажа, можно переводить на КЭДО без
            отдельного письменного согласия.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
""")

# 10 ── КАК ПЕРЕЙТИ — 5 ШАГОВ ─────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(10)}
    <h2 style="margin-bottom:2mm;">Как перейти на КЭДО: 5 шагов</h2>
    <p class="muted" style="font-size:8pt;margin-bottom:5mm;">Юридическая подготовка + настройка Битрикс24 — обычно 2–4 недели</p>
    <div class="glass steps-list" style="margin-bottom:4mm;">
      <div class="step-item">
        <div class="num">1</div>
        <div><h3>Локальный нормативный акт</h3>
        <p>Утвердите положение о КЭДО: система, порядок доступа, перечень документов и сроки.</p></div>
        <span class="step-tag" style="margin-left:auto;white-space:nowrap;">неделя 1</span>
      </div>
      <div class="step-item">
        <div class="num">2</div>
        <div><h3>Уведомление сотрудников</h3>
        <p>Закон требует уведомить персонал о переходе на ЭДО до его запуска.</p></div>
        <span class="step-tag" style="margin-left:auto;white-space:nowrap;">неделя 1–2</span>
      </div>
      <div class="step-item">
        <div class="num">3</div>
        <div><h3>Сбор согласий</h3>
        <p>Получите письменные согласия — удобно собрать их прямо в Битрикс24.</p></div>
        <span class="step-tag" style="margin-left:auto;white-space:nowrap;">неделя 2</span>
      </div>
      <div class="step-item">
        <div class="num">4</div>
        <div><h3>Настройка Битрикс24 КЭДО</h3>
        <p>«КЭДО + Госключ»: представители, шаблоны, маршруты, интеграция с 1С.</p></div>
        <span class="step-tag" style="margin-left:auto;white-space:nowrap;">недели 2–3</span>
      </div>
      <div class="step-item">
        <div class="num">5</div>
        <div><h3>Запуск и обучение</h3>
        <p>Сотрудники устанавливают Госключ, подписывают первые документы, HR контролирует статусы.</p></div>
        <span class="step-tag" style="margin-left:auto;white-space:nowrap;">неделя 4</span>
      </div>
    </div>
  </div>
</div>
""")

# 11 ── ВЫГОДЫ И УСЛОВИЯ ───────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content">
    {slide_header(11)}
    <h2 style="margin-bottom:5mm;">Выгоды и условия подключения</h2>
    <div class="stats-row" style="margin-bottom:5mm;">
      <div class="stat"><div class="n">−80%</div><div class="l">времени HR на согласование и подписание</div></div>
      <div class="stat"><div class="n">30 ч</div><div class="l">в месяц экономии для кадрового специалиста</div></div>
      <div class="stat"><div class="n">2 клика</div><div class="l">— нужный документ в архиве даже через 5 лет</div></div>
      <div class="stat"><div class="n">100%</div><div class="l">юридическая значимость по 377-ФЗ и ТК РФ</div></div>
    </div>
    <div class="glass" style="padding:5mm 6mm;">
      <div class="sec-label" style="margin-bottom:3mm;">Условия подключения</div>
      <ul class="blist">
        <li><b>Входит в тариф&nbsp;</b><span>— КЭДО доступен на тарифах Битрикс24 «Профессиональный» и «Энтерпрайз» без доплаты за пользователей и документы</span></li>
        <li><b>Госключ бесплатен&nbsp;</b><span>— сотрудники не платят ни копейки; отдельные лицензии на КЭДО покупать не нужно</span></li>
        <li><b>Если вы уже на этих тарифах&nbsp;</b><span>— инструмент достаточно настроить и запустить, без дополнительных расходов</span></li>
      </ul>
    </div>
  </div>
</div>
""")

# 12 ── SMART BUSINESS ─────────────────────────────────────────────────────────
slides.append(f"""
<div class="slide">
  {orbs()}{top_bar()}
  <div class="content" style="display:flex;flex-direction:column;justify-content:space-between;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      {logo_html()}
      {badge('Официальный партнёр Битрикс24')}
    </div>
    <div>
      <div class="kicker" style="margin-bottom:3mm;">Внедрение под ключ</div>
      <h1 style="font-size:26pt;margin-bottom:4mm;">
        Переведём ваши кадры<br>в <span style="color:#5566f0;">цифровой формат</span>
      </h1>
      <div class="cards-grid" style="gap:4mm;">
        <div class="glass-mid" style="padding:4mm 5mm;">
          <h3 style="color:#7c8cff;margin-bottom:2mm;">Аудит и подготовка</h3>
          <p style="font-size:8pt;color:rgba(200,215,255,.55);">
            Перечень документов, шаблоны ЛНА, уведомлений и согласий сотрудников.
          </p>
        </div>
        <div class="glass-mid" style="padding:4mm 5mm;">
          <h3 style="color:#7c8cff;margin-bottom:2mm;">Настройка и интеграции</h3>
          <p style="font-size:8pt;color:rgba(200,215,255,.55);">
            КЭДО + Госключ, шаблоны и маршруты, интеграция с 1С:ЗУП.
          </p>
        </div>
        <div class="glass-mid" style="padding:4mm 5mm;">
          <h3 style="color:#7c8cff;margin-bottom:2mm;">Обучение и поддержка</h3>
          <p style="font-size:8pt;color:rgba(200,215,255,.55);">
            Обучение HR и сотрудников, сопровождение после запуска.
          </p>
        </div>
      </div>
    </div>
    <div class="info-strip" style="margin-bottom:0;text-align:center;">
      Ответьте на это письмо — за <b>1 рабочий день</b> подготовим
      план перехода и расчёт экономии. <b>Бесплатно и без обязательств.</b>
    </div>
  </div>
</div>
""")

# ── Сборка HTML ────────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
{fonts_css}
{BASE_CSS}
</style>
</head>
<body>
{''.join(slides)}
</body>
</html>"""

# ── Сохраняем HTML (для отладки) ───────────────────────────────────────────────
html_path = "/home/user/-/presentation/Bitrix24_KEDO_prezentaciya.html"
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
print("HTML saved:", html_path)

# ── Рендер в PDF ──────────────────────────────────────────────────────────────
out = "/home/user/-/presentation/Bitrix24_KEDO_prezentaciya.pdf"
WP(string=html, base_url="/").write_pdf(out)
print("PDF saved:", out)
