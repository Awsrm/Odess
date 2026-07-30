(function () {
  'use strict';

  /* ---------- utils ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = n => String(n).padStart(2, '0');
  const today = () => dateStr(new Date());
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function md(d) { return pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtMoney(n) { return '¥' + (Number(n) || 0).toFixed(2); }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function priRank(p) { return p === 'high' ? 3 : p === 'mid' ? 2 : 1; }
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 13) return '中午好';
    if (h < 17) return '下午好';
    if (h < 23) return '晚上好';
    return '夜深了';
  }
  function truthBanner() {
    return '<div class="truth-banner">⚜ <b>真理部提醒</b>：遗漏记录视同背叛。</div>';
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    const t = store.get('odess_theme', 'night');
    document.documentElement.classList.toggle('theme-day', t === 'day');
    document.documentElement.classList.toggle('theme-night', t === 'night');
    const btn = $('#themeToggle');
    if (btn) btn.textContent = t === 'day' ? '☀' : '☾';
  }
  function setTheme(t) { store.set('odess_theme', t); applyTheme(); }

  /* ---------- confirm modal ---------- */
  function confirmModal(opts) {
    const { title = '确认', message = '', confirmText = '确认', danger = true, onConfirm, bodyHtml = '' } = opts;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal ${danger ? 'modal-danger' : ''}">
      <div class="modal-title">${escapeHtml(title)}</div>
      <div class="modal-msg">${escapeHtml(message)}</div>
      ${bodyHtml}
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="cancel">取消</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escapeHtml(confirmText)}</button>
      </div></div></div>`;
    const mask = root.querySelector('.modal-mask');
    const close = () => { root.innerHTML = ''; };
    mask.addEventListener('click', e => { if (e.target === mask) close(); });
    root.querySelector('[data-act=cancel]').onclick = close;
    root.querySelector('[data-act=ok]').onclick = () => { close(); if (onConfirm) onConfirm(); };
  }

  /* ---------- icon picker (~20个图标) ---------- */
  const ICON_CHOICES = ['💧', '🏃', '📚', '🧘', '🌙', '⚖️', '💰', '🔥', '🍎', '💡', '✍️', '🎯', '🌟', '🍵', '💤', '📝', '🎵', '🌿', '🏋️', '☕'];
  function openIconPicker(current, onPick) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal" style="max-width:340px">
      <div class="modal-title">选择图标</div>
      <div class="icon-grid">${ICON_CHOICES.map(e => `<div class="icon-cell ${e === current ? 'sel' : ''}" data-ic="${e}">${e}</div>`).join('')}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="none">不使用</button>
        <button class="btn btn-ghost" data-act="close">关闭</button>
      </div></div></div>`;
    const mask = root.querySelector('.modal-mask');
    mask.addEventListener('click', e => { if (e.target === mask) root.innerHTML = ''; });
    root.querySelectorAll('.icon-cell').forEach(cell => cell.onclick = () => { onPick(cell.dataset.ic); root.innerHTML = ''; });
    root.querySelector('[data-act=none]').onclick = () => { onPick(''); root.innerHTML = ''; };
    root.querySelector('[data-act=close]').onclick = () => { root.innerHTML = ''; };
  }

  /* ---------- 记账类目(支出/收入) ---------- */
  const FIN_CATS = {
    out: [
      { id: '餐饮', n: '餐饮', e: '🍜' },
      { id: '交通', n: '交通', e: '🚇' },
      { id: '购物', n: '购物', e: '🛍' },
      { id: '娱乐', n: '娱乐', e: '🎮' },
      { id: '居住', n: '居住', e: '🏠' },
      { id: '医疗', n: '医疗', e: '💊' },
      { id: '其他', n: '其他', e: '·' }
    ],
    in: [
      { id: '工资', n: '工资', e: '💼' },
      { id: '兼职', n: '兼职', e: '🤝' },
      { id: '理财', n: '理财', e: '📈' },
      { id: '红包', n: '红包', e: '🧧' },
      { id: '其他', n: '其他', e: '·' }
    ]
  };
  /* 类目配色(柔和,日夜间皆可用) */
  const CAT_COLORS = ['#9CC1A8', '#C9A878', '#B59CD9', '#D08A8A', '#7C9CFF', '#E8C56E', '#A0BFE0', '#C8A6A6', '#88BBA6', '#B0A0E0'];

  function openCatPicker(current, type, onPick) {
    const list = FIN_CATS[type] || FIN_CATS.out;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal" style="max-width:380px">
      <div class="modal-title">选择类目</div>
      <div class="cat-grid">${list.map(c => `<div class="cat-cell ${c.id === current ? 'sel' : ''}" data-c="${c.id}"><span class="cat-emoji">${c.e}</span>${escapeHtml(c.n)}</div>`).join('')}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="close">关闭</button>
      </div></div></div>`;
    const mask = root.querySelector('.modal-mask');
    mask.addEventListener('click', e => { if (e.target === mask) root.innerHTML = ''; });
    root.querySelectorAll('.cat-cell').forEach(cell => cell.onclick = () => { onPick(cell.dataset.c); root.innerHTML = ''; });
    root.querySelector('[data-act=close]').onclick = () => { root.innerHTML = ''; };
  }
  function catEmoji(type, name) {
    const arr = FIN_CATS[type] || [];
    const x = arr.find(c => c.id === name);
    return x ? x.e : '·';
  }

  /* ---------- nav icons ---------- */
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
    checkin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/></svg>',
    metrics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5M4 19h16"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
    tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5H13a2 2 0 010 4H9"/></svg>',
    notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h11l3 3v15H5z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
    coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5h4a2 2 0 010 4H9"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>'
  };

  /* ---------- nav ---------- */
  const NAV = [
    { key: 'dashboard', label: '仪表盘', icon: ICONS.dashboard },
    { key: 'checkin', label: '打卡', icon: ICONS.checkin },
    { key: 'metrics', label: '数据记录', icon: ICONS.metrics },
    { key: 'tasks', label: '待办', icon: ICONS.tasks },
    { key: 'finance', label: '记账', icon: ICONS.finance },
    { key: 'notes', label: '笔记', icon: ICONS.notes },
    { key: 'coin', label: '命运硬币', icon: ICONS.coin },
    { key: 'settings', label: '设置', icon: ICONS.settings }
  ];
  const TITLES = { dashboard: '仪表盘', checkin: '打卡', metrics: '数据记录', tasks: '待办', finance: '记账', notes: '笔记', coin: '命运硬币', settings: '设置' };

  /* ---------- sidebar ---------- */
  function buildNav() {
    const nav = $('#nav');
    nav.innerHTML = NAV.map(n => `<button class="nav-item" data-key="${n.key}">${n.icon}<span class="nav-label">${n.label}</span></button>`).join('');
    $$('.nav-item', nav).forEach(b => b.onclick = () => { location.hash = '#/' + b.dataset.key; closeDrawer(); });
  }
  function applyCollapse() {
    const collapsed = store.get('odess_sidebar_collapsed', false);
    $('#sidebar').classList.toggle('collapsed', collapsed);
  }
  function toggleCollapse() { store.set('odess_sidebar_collapsed', !store.get('odess_sidebar_collapsed', false)); applyCollapse(); }
  function openDrawer() { $('#sidebar').classList.add('open'); $('#overlay').classList.add('show'); }
  function closeDrawer() { $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); }

  /* ---------- router ---------- */
  function route() {
    let key = (location.hash || '#/dashboard').replace('#/', '');
    if (!TITLES[key]) key = 'dashboard';
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.key === key));
    $('#topbarTitle').textContent = TITLES[key];
    const c = $('#content');
    if (key === 'dashboard') renderDashboard(c);
    else if (key === 'checkin') renderCheckin(c);
    else if (key === 'metrics') renderMetrics(c);
    else if (key === 'tasks') renderTasks(c);
    else if (key === 'finance') renderFinance(c);
    else if (key === 'notes') renderNotes(c);
    else if (key === 'coin') renderCoin(c);
    else if (key === 'settings') renderSettings(c);
    c.insertAdjacentHTML('afterbegin', truthBanner());
    c.scrollTop = 0; window.scrollTo(0, 0);
  }

  /* ---------- holidays & reminders ---------- */
  const LUNAR = {
    '2026': { spring: '02-17', qingming: '04-05', duanwu: '06-19', zhongqiu: '09-25' },
    '2027': { spring: '02-06', qingming: '04-05', duanwu: '06-09', zhongqiu: '09-15' },
    '2028': { spring: '01-26', qingming: '04-04', duanwu: '05-28', zhongqiu: '10-03' },
    '2029': { spring: '02-13', qingming: '04-04', duanwu: '06-16', zhongqiu: '09-22' },
    '2030': { spring: '02-03', qingming: '04-05', duanwu: '06-05', zhongqiu: '09-12' },
    '2031': { spring: '01-23', qingming: '04-05', duanwu: '05-26', zhongqiu: '10-01' },
    '2032': { spring: '02-11', qingming: '04-04', duanwu: '06-13', zhongqiu: '09-30' }
  };
  function nthSunday(year, month, n) {
    const d = new Date(year, month, 1);
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      d.setDate(day);
      if (d.getDay() === 0) { count++; if (count === n) return day; }
    }
    return null;
  }
  function getHolidays() {
    const y = new Date().getFullYear();
    const md2 = (m, day) => pad(m) + '-' + pad(day);
    const fixed = [
      { d: '01-01', n: '元旦' }, { d: '02-14', n: '情人节' }, { d: '03-08', n: '妇女节' },
      { d: '04-01', n: '愚人节' }, { d: '05-01', n: '劳动节' }, { d: '06-01', n: '儿童节' },
      { d: '09-10', n: '教师节' }, { d: '10-01', n: '国庆节' }, { d: '10-31', n: '万圣节' },
      { d: '12-24', n: '平安夜' }, { d: '12-25', n: '圣诞节' }
    ];
    const extra = [];
    const ms = nthSunday(y, 4, 2); if (ms) extra.push({ d: md2(5, ms), n: '母亲节' });
    const fs = nthSunday(y, 5, 3); if (fs) extra.push({ d: md2(6, fs), n: '父亲节' });
    const ln = LUNAR[String(y)];
    if (ln) extra.push(
      { d: ln.spring, n: '春节' }, { d: ln.qingming, n: '清明' },
      { d: ln.duanwu, n: '端午' }, { d: ln.zhongqiu, n: '中秋' }
    );
    return fixed.concat(extra);
  }
  function getSpecialDays() { return store.get('odess_special_days', []); }
  function setSpecial(a) { store.set('odess_special_days', a); }
  function getReminders() {
    const now = new Date();
    const todayMD = md(now);
    const tom = new Date(now); tom.setDate(tom.getDate() + 1);
    const tomMD = md(tom);
    const all = [
      ...getHolidays().map(h => ({ name: h.n, kind: '节日', d: h.d })),
      ...getSpecialDays().map(s => ({ name: s.name, kind: '特别日子', d: s.date }))
    ].map(x => ({ ...x, today: x.d === todayMD, tom: x.d === tomMD }));
    const res = [];
    all.forEach(x => {
      if (x.today) res.push({ when: '今天', name: x.name, kind: x.kind });
      else if (x.tom) res.push({ when: '明天', name: x.name, kind: x.kind });
    });
    return res;
  }
  function renderReminderBar(c) {
    const rs = getReminders();
    if (!rs.length) { c.innerHTML += `<div class="reminder-bar"><span class="rb-none">📌 近期无节日或特别日子提醒</span></div>`; return; }
    c.innerHTML += `<div class="reminder-bar">` + rs.map(r =>
      `<span class="rb-tag">${r.kind}</span><span class="rb-item"><b>${r.when}</b> · ${escapeHtml(r.name)}</span>`
    ).join('') + `</div>`;
  }

  /* ---------- checkin data ---------- */
  function getHabits() {
    return store.get('odess_habits', [
      { id: 'h1', name: '喝水', emoji: '💧' }, { id: 'h2', name: '运动', emoji: '🏃' },
      { id: 'h3', name: '读书', emoji: '📚' }, { id: 'h4', name: '冥想', emoji: '🧘' },
      { id: 'h5', name: '早睡', emoji: '🌙' }
    ]);
  }
  function setHabits(a) { store.set('odess_habits', a); }
  function getCheckins() { return store.get('odess_checkins', {}); }
  function setCheckins(o) { store.set('odess_checkins', o); }
  function toggleCheckin(id) {
    const c = getCheckins(); const t = today();
    c[t] = c[t] || [];
    const i = c[t].indexOf(id);
    if (i >= 0) c[t].splice(i, 1); else c[t].push(id);
    setCheckins(c);
  }
  function calcStreak(checks) {
    let n = 0; const d = new Date();
    if (!(checks[today()] && checks[today()].length)) d.setDate(d.getDate() - 1);
    while (true) {
      const k = dateStr(d);
      if (checks[k] && checks[k].length) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }

  /* ---------- notes ---------- */
  function getNotes() { return store.get('odess_notes', []); }
  function setNotes(a) { store.set('odess_notes', a); }
  function getRecentNotes(n) {
    return getNotes().slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, n || 3);
  }

  /* ---------- dashboard ---------- */
  function renderDashboard(c) {
    const habits = getHabits(); const checks = getCheckins(); const t = today();
    const doneToday = (checks[t] || []).length;
    const tasks = store.get('odess_tasks', []);
    const pending = tasks.filter(x => !x.done).length;
    const fin = store.get('odess_finance', []);
    const expToday = fin.filter(r => r.type === 'out' && r.date === t).reduce((s, r) => s + r.amount, 0);
    const recentNotes = getRecentNotes(3);
    const heroEmoji = new Date().getHours() < 17 ? (new Date().getHours() < 11 ? '🌤️' : '☀️') : '🌙';
    c.innerHTML = `
      <div class="hero">
        <span class="hero-emoji">${heroEmoji}</span>
        <div class="hero-text"><h2>${greeting()}，老板</h2><p>${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p></div>
      </div>
      <div class="grid">
        <div class="card stat" data-go="checkin"><div class="stat-num">${doneToday}<span class="stat-sub">/${habits.length}</span></div><div class="stat-label">今日打卡</div></div>
        <div class="card stat" data-go="tasks"><div class="stat-num">${pending}</div><div class="stat-label">待办未完成</div></div>
        <div class="card stat" data-go="finance"><div class="stat-num">${fmtMoney(expToday)}</div><div class="stat-label">今日支出</div></div>
        <div class="card stat" data-go="checkin"><div class="stat-num" id="dashStreak">0</div><div class="stat-label">连续打卡(天)</div></div>
      </div>`;
    renderReminderBar(c);
    c.innerHTML += `
      <div class="card quick-note-card">
        <div class="card-title"><span class="ct-ico">✦</span>快速笔记</div>
        <button class="quick-note-trigger" id="dashQuickNote">
          <span class="qn-ico">✍</span>
          <span class="qn-text">随手记一笔...</span>
          <span class="qn-hint">点此新建 / 编辑</span>
        </button>
        <div class="quick-note-recent" id="dashNoteRecent">
          ${recentNotes.length ? recentNotes.map(n => `<div class="quick-note-row" data-id="${n.id}"><span class="qn-title">${escapeHtml(n.title || '无标题')}</span><span class="qn-time">${n.updated ? n.updated.slice(5) : ''}</span></div>`).join('') : '<div class="empty" style="padding:6px 0">还没有笔记</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>快速打卡</div>
        <div class="chip-row" id="dashChips">${habits.map(h => `<button class="chip ${(checks[t] || []).includes(h.id) ? 'on' : ''}" data-id="${h.id}">${h.emoji || ''} ${escapeHtml(h.name)}</button>`).join('')}</div>
      </div>`;
    $('#dashStreak').textContent = calcStreak(checks);
    $('#dashQuickNote').onclick = () => openNoteEditor(null, () => renderDashboard($('#content')));
    $$('#dashNoteRecent .quick-note-row').forEach(row => row.onclick = () => {
      const n = getNotes().find(x => x.id === row.dataset.id);
      if (n) openNoteView(n, () => renderDashboard($('#content')));
    });
    $$('#dashChips .chip').forEach(b => b.onclick = () => { toggleCheckin(b.dataset.id); renderDashboard(c); });
    $$('.stat[data-go]').forEach(el => el.onclick = () => location.hash = '#/' + el.dataset.go);
  }

  /* ---------- checkin ---------- */
  function renderCheckin(c) {
    const habits = getHabits(); const checks = getCheckins(); const t = today();
    const done = checks[t] || [];
    let cells = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dateStr(d); const cnt = (checks[k] || []).length;
      const ratio = habits.length ? cnt / habits.length : 0;
      const lvl = ratio === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : 3;
      cells += `<div class="hm-cell lvl${lvl}" title="${k}：打卡 ${cnt}/${habits.length}"></div>`;
    }
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>今日打卡</div>
        <div class="checkin-list">${habits.map(h => `<button class="checkin-item ${done.includes(h.id) ? 'done' : ''}" data-id="${h.id}">
          <span class="ci-emoji">${h.emoji || ''}</span><span class="ci-name">${escapeHtml(h.name)}</span>
          <span class="ci-check">${done.includes(h.id) ? '✓' : ''}</span></button>`).join('')}</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>最近 7 天</div>
        <div class="heatmap">${cells}</div>
        <div class="hm-legend"><span>少</span><i class="hm-cell lvl0"></i><i class="hm-cell lvl1"></i><i class="hm-cell lvl2"></i><i class="hm-cell lvl3"></i><span>多</span></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>管理习惯</div>
        <div class="habit-manage">${habits.map(h => `<div class="habit-row"><span>${h.emoji || ''} ${escapeHtml(h.name)}</span>
          <button class="btn btn-danger btn-sm" data-del="${h.id}">删除</button></div>`).join('')}</div>
        <div class="add-row">
          <button class="icon-pick" id="habitEmojiBtn" title="选择图标">🙂</button>
          <input class="form-input" id="habitName" placeholder="习惯名称，如：喝水" style="flex:1">
          <button class="btn btn-primary" id="habitAdd">添加</button>
        </div>
      </div>`;
    let habitEmoji = '🙂';
    $$('.checkin-item', c).forEach(b => b.onclick = () => { toggleCheckin(b.dataset.id); renderCheckin(c); });
    $$('[data-del]', c).forEach(b => b.onclick = () => {
      const id = b.dataset.del; const h = habits.find(x => x.id === id);
      confirmModal({
        title: '删除习惯', message: '确定删除「' + (h ? h.name : '') + '」？历史打卡记录仍保留。',
        onConfirm: () => {
          setHabits(getHabits().filter(x => x.id !== id));
          const ck = getCheckins(); Object.keys(ck).forEach(d => { ck[d] = ck[d].filter(x => x !== id); });
          setCheckins(ck); renderCheckin(c);
        }
      });
    });
    $('#habitEmojiBtn', c).onclick = () => openIconPicker(habitEmoji, e => { habitEmoji = e || '🙂'; $('#habitEmojiBtn', c).textContent = habitEmoji; });
    $('#habitAdd', c).onclick = () => {
      const nm = $('#habitName', c).value.trim(); if (!nm) return;
      const arr = getHabits(); arr.push({ id: uid(), name: nm, emoji: habitEmoji });
      setHabits(arr); renderCheckin(c);
    };
  }

  /* ---------- metrics (数据记录) ---------- */
  function getMetrics() {
    return store.get('odess_metrics', [
      { id: 'm1', name: '体重', unit: 'kg', emoji: '⚖️', entries: {} },
      { id: 'm2', name: '自媒体收入', unit: '元', emoji: '💰', entries: {} }
    ]);
  }
  function setMetrics(a) { store.set('odess_metrics', a); }
  function sparkline(vals, w, h) {
    if (vals.length < 2) return '';
    const max = Math.max(...vals), min = Math.min(...vals), range = (max - min) || 1, n = vals.length;
    const pts = vals.map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - ((v - min) / range) * (h - 10) - 5;
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    const last = pts[pts.length - 1].split(',');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="var(--accent)"/></svg>`;
  }
  function renderMetrics(c) {
    const t = today();
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>新建追踪项</div>
        <div class="add-row">
          <button class="icon-pick" id="mEmojiBtn" title="选择图标">🙂</button>
          <input class="form-input" id="mName" placeholder="名称，如：体重 / 自媒体收入" style="flex:1">
          <input class="form-input" id="mUnit" placeholder="单位，如：kg / 元" style="width:90px">
          <button class="btn btn-primary" id="mAdd">添加</button>
        </div>
      </div>
      <div id="metricList"></div>`;
    let mEmoji = '🙂';
    function paint() {
      const arr = getMetrics();
      if (!arr.length) { $('#metricList').innerHTML = '<div class="empty">还没有追踪项，先添加一个吧</div>'; return; }
      $('#metricList').innerHTML = arr.map(m => {
        const entries = m.entries || {};
        const todayVal = entries[t];
        const keys = Object.keys(entries).sort().reverse();
        const recent = keys.slice(0, 7);
        const last14 = keys.slice(0, 14).reverse().map(k => Number(entries[k]));
        const spark = sparkline(last14, 280, 46);
        const listHtml = recent.length
          ? recent.map(k => `<div class="metric-entry"><span>${k}</span><span class="me-val">${entries[k]} ${escapeHtml(m.unit || '')}</span><button class="me-del" data-m="${m.id}" data-k="${k}">删</button></div>`).join('')
          : '<div class="empty" style="padding:10px 0">暂无记录</div>';
        return `<div class="card metric-card">
          <div class="metric-head"><span class="metric-emoji">${m.emoji || ''}</span><span class="metric-name">${escapeHtml(m.name)}</span><span class="metric-unit">${escapeHtml(m.unit || '')}</span>
            <button class="btn btn-danger btn-sm" style="margin-left:auto" data-del="${m.id}">删除</button></div>
          <div class="metric-today">
            <input class="form-input" id="mv-${m.id}" type="number" step="0.01" placeholder="今日数值" value="${todayVal != null ? todayVal : ''}">
            <button class="btn btn-primary btn-sm" data-rec="${m.id}">记录今日</button>
            <span style="font-size:13px;color:var(--text-dim)">${todayVal != null ? '今日已记：' + todayVal + ' ' + escapeHtml(m.unit || '') : '今日未记'}</span>
          </div>
          ${spark}
          <div class="metric-entries">${listHtml}</div>
        </div>`;
      }).join('');
      $$('#metricList [data-rec]', c).forEach(b => b.onclick = () => {
        const id = b.dataset.rec, val = parseFloat($('#mv-' + id, c).value);
        if (!(val >= 0) || isNaN(val)) return;
        const arr2 = getMetrics(); const m = arr2.find(x => x.id === id);
        m.entries = m.entries || {}; m.entries[today()] = val; setMetrics(arr2); paint();
      });
      $$('#metricList [data-del]', c).forEach(b => b.onclick = () => {
        const m = getMetrics().find(x => x.id === b.dataset.del);
        confirmModal({ title: '删除追踪项', message: '确定删除「' + (m ? m.name : '') + '」？其全部历史数值将一并清除。', onConfirm: () => { setMetrics(getMetrics().filter(x => x.id !== b.dataset.del)); paint(); } });
      });
      $$('#metricList .me-del', c).forEach(b => b.onclick = () => {
        const arr2 = getMetrics(); const m = arr2.find(x => x.id === b.dataset.m);
        delete m.entries[b.dataset.k]; setMetrics(arr2); paint();
      });
    }
    paint();
    $('#mEmojiBtn', c).onclick = () => openIconPicker(mEmoji, e => { mEmoji = e || '🙂'; $('#mEmojiBtn', c).textContent = mEmoji; });
    $('#mAdd', c).onclick = () => {
      const nm = $('#mName', c).value.trim(); if (!nm) return;
      const arr = getMetrics(); arr.push({ id: uid(), name: nm, unit: $('#mUnit', c).value.trim(), emoji: mEmoji, entries: {} });
      setMetrics(arr); $('#mName', c).value = ''; $('#mUnit', c).value = ''; paint();
    };
  }

  /* ---------- tasks ---------- */
  function renderTasks(c) {
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>添加待办</div>
        <div class="add-row">
          <input class="form-input" id="taskText" placeholder="要做什么？" style="flex:1">
          <select class="form-input" id="taskPri" style="width:90px"><option value="high">高</option><option value="mid" selected>中</option><option value="low">低</option></select>
          <span class="date-trigger" id="taskDueTrigger"><span class="dt-ico">📅</span><span id="taskDueLabel" style="font-size:14px;color:var(--text-dim)">选截止日</span></span>
          <button class="btn btn-primary" id="taskAdd">添加</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>清单 <span class="badge" id="taskCount"></span></div>
        <div id="taskList" class="task-list"></div>
      </div>`;
    let dueVal = '';
    $('#taskDueTrigger', c).onclick = () => openDatePicker(dueVal, v => { dueVal = v; $('#taskDueLabel', c).textContent = v; $('#taskDueLabel', c).style.color = 'var(--text)'; });
    function paint() {
      let arr = store.get('odess_tasks', []).slice();
      arr.sort((a, b) => (a.done === b.done) ? (priRank(b.pri) - priRank(a.pri)) : (a.done ? 1 : -1));
      $('#taskCount').textContent = arr.filter(x => !x.done).length + ' 未完成';
      $('#taskList').innerHTML = arr.length ? arr.map(t => `<div class="task-item ${t.done ? 'done' : ''} pri-${t.pri}">
          <input type="checkbox" class="task-cb" data-id="${t.id}" ${t.done ? 'checked' : ''}>
          <div class="task-main"><span class="task-text">${escapeHtml(t.text)}</span>${t.due ? `<span class="task-due">📅 ${t.due}</span>` : ''}</div>
          <button class="btn btn-danger btn-sm" data-del="${t.id}">删除</button>
        </div>`).join('') : '<div class="empty">暂无待办，添加一条吧</div>';
      $$('#taskList .task-cb').forEach(cb => cb.onchange = () => {
        const arr2 = store.get('odess_tasks', []); const x = arr2.find(y => y.id === cb.dataset.id);
        if (x) { x.done = cb.checked; store.set('odess_tasks', arr2); paint(); }
      });
      $$('#taskList [data-del]', c).forEach(b => b.onclick = () => {
        confirmModal({ title: '删除待办', message: '确定删除这条待办？', onConfirm: () => { store.set('odess_tasks', store.get('odess_tasks', []).filter(y => y.id !== b.dataset.del)); paint(); } });
      });
    }
    paint();
    $('#taskAdd', c).onclick = () => {
      const tx = $('#taskText', c).value.trim(); if (!tx) return;
      const arr = store.get('odess_tasks', []);
      arr.push({ id: uid(), text: tx, done: false, pri: $('#taskPri', c).value, due: dueVal });
      store.set('odess_tasks', arr); $('#taskText', c).value = ''; dueVal = ''; $('#taskDueLabel', c).textContent = '选截止日'; $('#taskDueLabel', c).style.color = 'var(--text-dim)'; paint();
    };
  }

  /* ---------- finance ---------- */
  function renderFinance(c) {
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>记一笔</div>
        <div class="seg" id="finType">
          <button class="seg-btn active" data-t="out">支出</button>
          <button class="seg-btn" data-t="in">收入</button>
        </div>
        <div class="add-row">
          <input class="form-input" id="finAmount" type="number" min="0" step="0.01" placeholder="金额" style="width:120px">
          <button class="cat-trigger" id="finCatTrigger" type="button">
            <span style="display:flex;align-items:center;gap:8px"><span class="cat-trigger-emo" id="finCatEmo">🍜</span><span id="finCatLabel">餐饮</span></span>
            <span class="cat-trigger-arrow">▾</span>
          </button>
          <span class="date-trigger" id="finDateTrigger"><span class="dt-ico">📅</span><span id="finDateLabel" style="font-size:14px">${today()}</span></span>
          <input class="form-input" id="finNote" placeholder="备注" style="flex:1">
          <button class="btn btn-primary" id="finAdd">添加</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>本月概览</div>
        <div class="summary">
          <div class="sum-item"><div class="sum-num out" id="sumOut">¥0.00</div><div class="sum-label">支出</div></div>
          <div class="sum-item"><div class="sum-num in" id="sumIn">¥0.00</div><div class="sum-label">收入</div></div>
          <div class="sum-item"><div class="sum-num" id="sumBal">¥0.00</div><div class="sum-label">结余</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span><span id="finStatTitle">本月支出 · 类目分布</span></div>
        <div class="cat-stats" id="catStats"></div>
      </div>`;
    let type = 'out'; let dateVal = today(); let cat = '餐饮';
    function refreshCatTrigger() {
      $('#finCatLabel', c).textContent = cat;
      $('#finCatEmo', c).textContent = catEmoji(type, cat);
    }
    refreshCatTrigger();
    $('#finCatTrigger', c).onclick = () => openCatPicker(cat, type, v => { cat = v || cat; refreshCatTrigger(); });
    $('#finDateTrigger', c).onclick = () => openDatePicker(dateVal, v => { dateVal = v; $('#finDateLabel', c).textContent = v; });
    $$('#finType .seg-btn', c).forEach(b => b.onclick = () => {
      type = b.dataset.t;
      $$('#finType .seg-btn', c).forEach(x => x.classList.remove('active')); b.classList.add('active');
      const first = (FIN_CATS[type] || [])[0];
      if (first) cat = first.id;
      refreshCatTrigger(); paint();
    });
    function paint() {
      const all = store.get('odess_finance', []);
      const now = new Date(); const ym = now.getFullYear() + '-' + pad(now.getMonth() + 1);
      const month = all.filter(r => r.date && r.date.startsWith(ym));
      const out = month.filter(r => r.type === 'out').reduce((s, r) => s + r.amount, 0);
      const inc = month.filter(r => r.type === 'in').reduce((s, r) => s + r.amount, 0);
      $('#sumOut', c).textContent = fmtMoney(out);
      $('#sumIn', c).textContent = fmtMoney(inc);
      $('#sumBal', c).textContent = fmtMoney(inc - out);
      // 类目分布
      const items = month.filter(r => r.type === type);
      const total = items.reduce((s, r) => s + r.amount, 0);
      $('#finStatTitle', c).textContent = (type === 'out' ? '本月支出' : '本月收入') + ' · 类目分布';
      const byCat = {};
      items.forEach(r => byCat[r.category] = (byCat[r.category] || 0) + r.amount);
      const sorted = Object.keys(byCat).map(k => ({ k, v: byCat[k] })).sort((a, b) => b.v - a.v);
      if (!sorted.length) {
        $('#catStats', c).innerHTML = '<div class="empty">本月还没有' + (type === 'out' ? '支出' : '收入') + '记录</div>';
      } else {
        // 饼图 (conic-gradient)
        let acc = 0;
        const stops = sorted.map((s, i) => {
          const start = (acc / total) * 360; acc += s.v;
          const end = (acc / total) * 360;
          return `${CAT_COLORS[i % CAT_COLORS.length]} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
        }).join(', ');
        const pie = `conic-gradient(${stops})`;
        const legend = sorted.map((s, i) => {
          const pct = total ? ((s.v / total) * 100).toFixed(1) : '0.0';
          return `<div class="cat-legend-row"><span class="cat-dot" style="background:${CAT_COLORS[i % CAT_COLORS.length]}"></span><span class="cat-name">${catEmoji(type, s.k)} ${escapeHtml(s.k)}</span><span class="cat-pct">${pct}%</span></div>`;
        }).join('');
        const max = Math.max(1, ...sorted.map(x => x.v));
        const bars = sorted.map((s, i) => `<div class="bar-row"><span class="bar-label"><span class="bar-emo">${catEmoji(type, s.k)}</span>${escapeHtml(s.k)}</span><div class="bar-track"><div class="bar-fill" style="width:${(s.v / max) * 100}%;background:${CAT_COLORS[i % CAT_COLORS.length]}"></div></div><span class="bar-val">${fmtMoney(s.v)}</span></div>`).join('');
        $('#catStats', c).innerHTML = `
          <div class="cat-pie-wrap">
            <div class="cat-pie" style="background:${pie}"></div>
            <div class="cat-legend">${legend}</div>
          </div>
          <div class="cat-bars">${bars}</div>`;
      }
    }
    paint();
    $('#finAdd', c).onclick = () => {
      const amt = parseFloat($('#finAmount', c).value); if (!(amt > 0)) return;
      const arr = store.get('odess_finance', []);
      arr.push({ id: uid(), type, amount: amt, category: cat, date: dateVal, note: $('#finNote', c).value.trim() });
      store.set('odess_finance', arr); $('#finAmount', c).value = ''; $('#finNote', c).value = ''; paint();
    };
  }

  /* ---------- notes (大模态) ---------- */
  function openNoteEditor(note, onAfter) {
    const isNew = !note;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal note-editor-modal">
      <div class="modal-title">${isNew ? '新建笔记' : '编辑笔记'}</div>
      <input class="form-input" id="neTitle" placeholder="标题，如：麻将的好打法" value="${escapeHtml(note ? note.title : '')}">
      <textarea class="form-input" id="neBody" rows="14" placeholder="随手记点什么...">${escapeHtml(note ? note.body : '')}</textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="cancel">取消</button>
        <button class="btn btn-primary" data-act="save">保存</button>
      </div></div></div>`;
    const mask = root.querySelector('.modal-mask');
    mask.addEventListener('click', e => { if (e.target === mask) root.innerHTML = ''; });
    root.querySelector('[data-act=cancel]').onclick = () => root.innerHTML = '';
    root.querySelector('[data-act=save]').onclick = () => {
      const title = $('#neTitle', root).value.trim();
      const body = $('#neBody', root).value;
      if (!title && !body.trim()) { root.innerHTML = ''; return; }
      const arr = getNotes();
      if (isNew) arr.push({ id: uid(), title, body, updated: today() });
      else { const n = arr.find(x => x.id === note.id); n.title = title; n.body = body; n.updated = today(); }
      setNotes(arr); root.innerHTML = ''; if (onAfter) onAfter(); else if ($('#noteList')) { /* 列表内刷新由调用方处理 */ }
    };
    setTimeout(() => { $('#neTitle', root).focus(); }, 50);
  }
  function openNoteView(note, onAfter) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal note-view-modal">
      <div class="note-view-title">${escapeHtml(note.title || '无标题')}</div>
      <div class="note-view-meta">${note.updated || ''}</div>
      <div class="note-view-body">${escapeHtml(note.body || '（空）')}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="close">关闭</button>
        <button class="btn btn-primary" data-act="edit">编辑</button>
      </div></div></div>`;
    const mask = root.querySelector('.modal-mask');
    mask.addEventListener('click', e => { if (e.target === mask) root.innerHTML = ''; });
    root.querySelector('[data-act=close]').onclick = () => root.innerHTML = '';
    root.querySelector('[data-act=edit]').onclick = () => { root.innerHTML = ''; openNoteEditor(note, onAfter); };
  }

  function renderNotes(c) {
    c.innerHTML = `
      <div class="card">
        <div class="add-row note-search">
          <input class="form-input" id="noteSearch" placeholder="搜索笔记..." style="flex:1">
          <button class="btn btn-primary" id="noteNew">+ 新建笔记</button>
        </div>
      </div>
      <div id="noteList" class="note-list"></div>`;
    function paint() {
      const q = ($('#noteSearch', c).value || '').trim().toLowerCase();
      let arr = getNotes().slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
      if (q) arr = arr.filter(n => (n.title + n.body).toLowerCase().includes(q));
      $('#noteList').innerHTML = arr.length ? arr.map(n => `<div class="note-card" data-id="${n.id}">
          <div class="note-title">${escapeHtml(n.title || '无标题')}</div>
          <div class="note-snippet">${escapeHtml(n.body || '')}</div>
          <div class="note-meta"><span>${n.updated ? n.updated.slice(5) : ''}</span><button class="note-del" data-del="${n.id}">删除</button></div>
        </div>`).join('') : '<div class="empty">还没有笔记，点「新建笔记」记一笔</div>';
      $$('#noteList .note-card', c).forEach(card => card.onclick = e => {
        if (e.target.classList.contains('note-del')) return;
        openNoteView(getNotes().find(n => n.id === card.dataset.id), () => paint());
      });
      $$('#noteList .note-del', c).forEach(b => b.onclick = () => {
        confirmModal({ title: '删除笔记', message: '确定删除这条笔记？', onConfirm: () => { setNotes(getNotes().filter(n => n.id !== b.dataset.del)); paint(); } });
      });
    }
    paint();
    $('#noteSearch', c).oninput = paint;
    $('#noteNew', c).onclick = () => openNoteEditor(null, () => paint());
  }

  /* ---------- coin (命运硬币) ---------- */
  const GODDESS_FACE = `<img class="coin-face-img" src="avatar-goddess.png" alt="女神"/>`;
  const DRAGON_FACE = `<img class="coin-face-img" src="avatar-dragon.png" alt="恶龙"/>`;
  function renderCoin(c) {
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>命运硬币</div>
        <div class="coin-stage">
          <div class="coin" id="coinEl"><div class="coin-inner" id="coinInner">
            <div class="coin-face front">${GODDESS_FACE}</div>
            <div class="coin-face back">${DRAGON_FACE}</div>
          </div></div>
          <div class="coin-result" id="coinResult">点击下方硬币抛掷</div>
          <button class="btn btn-primary" id="coinFlip">抛掷硬币</button>
          <div class="coin-hint">女神面带来好运 · 恶龙面提醒谨慎</div>
        </div>
      </div>`;
    let rot = 0;
    function flip() {
      const result = Math.random() < 0.5 ? 'goddess' : 'dragon';
      const spins = 5;
      let newRot = rot + spins * 360;
      const targetMod = result === 'dragon' ? 180 : 0;
      const currentMod = ((newRot % 360) + 360) % 360;
      newRot += (targetMod - currentMod + 360) % 360;
      rot = newRot;
      $('#coinInner').style.transform = `rotateY(${rot}deg)`;
      $('#coinResult').textContent = '抛掷中…';
      setTimeout(() => {
        $('#coinResult').className = 'coin-result ' + result;
        $('#coinResult').textContent = (result === 'goddess' ? '🙏 女神面 · 今日好运' : '🐉 恶龙面 · 谨慎行事');
      }, 1000);
    }
    $('#coinEl', c).onclick = flip;
    $('#coinFlip', c).onclick = flip;
  }

  /* ---------- date picker ---------- */
  function openDatePicker(initial, onPick) {
    initial = initial || today();
    let view = new Date(initial + 'T00:00:00');
    const root = $('#modalRoot');
    function render() {
      const y = view.getFullYear(), m = view.getMonth();
      const first = new Date(y, m, 1);
      const startDow = first.getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const dow = ['日', '一', '二', '三', '四', '五', '六'];
      let grid = dow.map(d => `<span class="dp-dow">${d}</span>`).join('');
      for (let i = 0; i < startDow; i++) grid += '<span class="dp-cell empty"></span>';
      const tMD = today();
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = y + '-' + pad(m + 1) + '-' + pad(d);
        const isToday = cell === tMD;
        grid += `<span class="dp-cell ${cell === initial ? 'sel' : ''} ${isToday ? 'today' : ''}" data-d="${cell}">${d}</span>`;
      }
      root.innerHTML = `<div class="modal-mask"><div class="dpicker">
        <div class="dp-head"><button class="dp-nav" data-nav="-1">‹</button><span class="dp-title">${y}年${m + 1}月</span><button class="dp-nav" data-nav="1">›</button></div>
        <div class="dp-dow-row">${dow.map(d => `<span class="dp-dow">${d}</span>`).join('')}</div>
        <div class="dp-grid">${grid}</div>
        <div class="dp-foot"><button class="btn btn-ghost btn-sm" data-act="today">今天</button><button class="btn btn-ghost btn-sm" data-act="cancel">取消</button></div>
      </div></div>`;
      root.querySelector('.modal-mask').addEventListener('click', e => { if (e.target === root.querySelector('.modal-mask')) root.innerHTML = ''; });
      root.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { view.setMonth(view.getMonth() + parseInt(b.dataset.nav, 10)); render(); });
      root.querySelectorAll('.dp-cell[data-d]').forEach(b => b.onclick = () => { const v = b.dataset.d; root.innerHTML = ''; onPick(v); });
      root.querySelector('[data-act=today]').onclick = () => { const v = today(); root.innerHTML = ''; onPick(v); };
      root.querySelector('[data-act=cancel]').onclick = () => { root.innerHTML = ''; };
    }
    render();
  }

  /* ---------- settings ---------- */
  function renderSettings(c) {
    const special = getSpecialDays();
    const currentTheme = store.get('odess_theme', 'night');
    c.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>主题</div>
        <p class="hint">夜间为黑灰配雪松；日间为白色配暖金（非黄）。切换立即生效。</p>
        <div class="theme-switch" id="themeSwitch">
          <div class="theme-opt ${currentTheme === 'night' ? 'sel' : ''}" data-t="night">
            <span class="to-ico">☾</span>
            <span class="to-meta">夜间模式<small>黑灰底 · 雪松点缀</small></span>
          </div>
          <div class="theme-opt ${currentTheme === 'day' ? 'sel' : ''}" data-t="day">
            <span class="to-ico">☀</span>
            <span class="to-meta">日间模式<small>白色底 · 暖金点缀</small></span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>数据备份</div>
        <p class="hint">所有数据仅存于本机浏览器。换设备或清缓存前，请务必导出备份；导入会用备份覆盖当前全部数据。</p>
        <div class="add-row" style="margin-top:12px">
          <button class="btn btn-primary" id="expBtn">导出 JSON</button>
          <button class="btn btn-ghost" id="impBtn">导入 JSON</button>
          <input type="file" id="impFile" accept="application/json" style="display:none">
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>特别日子提醒</div>
        <p class="hint">节日已内置（元旦/春节/情人节/劳动/母亲节/父亲节/教师节/万圣节/圣诞 等，按当年日期匹配）。下方添加你自己的特别日子，主页会在前一天与当天提醒。</p>
        <div id="specialList" style="margin:12px 0"></div>
        <div class="add-row">
          <input class="form-input" id="spName" placeholder="名称，如：妈妈生日" style="flex:1">
          <span class="date-trigger" id="spTrigger"><span class="dt-ico">📅</span><span id="spLabel" style="font-size:14px;color:var(--text-dim)">选日期</span></span>
          <button class="btn btn-primary" id="spAdd">添加</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>危险区</div>
        <button class="btn btn-danger" id="wipeBtn">清空全部数据</button>
      </div>
      <div class="card">
        <div class="card-title"><span class="ct-ico">✦</span>关于</div>
        <p class="hint">Odess · 个人生活管理工作台<br>纯静态 PWA，本地优先，隐私不出本机。<br>GitHub：github.com/Awsrm/Odess</p>
      </div>`;
    $$('.theme-opt', c).forEach(el => el.onclick = () => { setTheme(el.dataset.t); renderSettings(c); });
    let spDate = '';
    $('#spTrigger', c).onclick = () => openDatePicker(spDate, v => { spDate = v; const md0 = v.slice(5); $('#spLabel', c).textContent = md0; $('#spLabel', c).style.color = 'var(--text)'; });
    function paintSpecial() {
      const arr = getSpecialDays();
      $('#specialList').innerHTML = arr.length ? arr.map(s => `<div class="habit-row"><span>🔔 ${escapeHtml(s.name)} <span style="color:var(--text-dim)">${s.date.slice(5)}</span></span><button class="btn btn-danger btn-sm" data-del="${s.id}">删</button></div>`).join('') : '<div class="empty">暂无特别日子</div>';
      $$('#specialList [data-del]', c).forEach(b => b.onclick = () => { setSpecial(getSpecialDays().filter(x => x.id !== b.dataset.del)); paintSpecial(); });
    }
    paintSpecial();
    $('#spAdd', c).onclick = () => {
      const nm = $('#spName', c).value.trim(); if (!nm || !spDate) return;
      const arr = getSpecialDays(); arr.push({ id: uid(), name: nm, date: spDate });
      setSpecial(arr); $('#spName', c).value = ''; spDate = ''; $('#spLabel', c).textContent = '选日期'; $('#spLabel', c).style.color = 'var(--text-dim)'; paintSpecial();
    };
    $('#expBtn', c).onclick = () => {
      const out = {}; Object.keys(localStorage).filter(k => k.startsWith('odess_')).forEach(k => out[k] = localStorage.getItem(k));
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'odess-backup-' + today() + '.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    $('#impBtn', c).onclick = () => $('#impFile', c).click();
    $('#impFile', c).onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const obj = JSON.parse(rd.result);
          confirmModal({ title: '导入备份', message: '将用备份覆盖当前所有数据，确定？', onConfirm: () => { Object.keys(obj).forEach(k => localStorage.setItem(k, obj[k])); location.reload(); } });
        } catch (err) { alert('文件解析失败'); }
      };
      rd.readAsText(f);
    };
    $('#wipeBtn', c).onclick = () => {
      confirmModal({ title: '清空全部数据', message: '将删除本应用所有本地数据，且不可恢复。建议先导出备份。', confirmText: '确认清空', onConfirm: () => { Object.keys(localStorage).filter(k => k.startsWith('odess_')).forEach(k => localStorage.removeItem(k)); location.reload(); } });
    };
  }

  /* ---------- init ---------- */
  function init() {
    applyTheme();
    buildNav(); applyCollapse();
    $('#menuBtn').onclick = openDrawer;
    $('#overlay').onclick = closeDrawer;
    $('#themeToggle').onclick = () => setTheme(store.get('odess_theme', 'night') === 'night' ? 'day' : 'night');
    $('#topbarDate').textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    window.addEventListener('hashchange', route);
    route();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      registerSW();
    }
  }
  function registerSW() {
    navigator.serviceWorker.register('sw.js').then(reg => {
      if (reg.waiting) showUpdateBar(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(nw);
        });
      });
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }
  function showUpdateBar(worker) {
    if (document.getElementById('odessUpdateBar')) return;
    const bar = document.createElement('div');
    bar.id = 'odessUpdateBar';
    bar.className = 'update-bar';
    bar.innerHTML = '<span>新版本可用</span><button type="button" id="odessUpdateBtn">更新</button>';
    document.body.appendChild(bar);
    document.getElementById('odessUpdateBtn').onclick = () => worker.postMessage('skipWaiting');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
