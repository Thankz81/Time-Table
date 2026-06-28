/* views/today.js — dashboard */
'use strict';
window.TodayView = (() => {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  async function render() {
    const el    = document.getElementById('view-today');
    const today = Store.todayStr();
    const n     = new Date();
    const user  = Store.getUser();
    const hr    = n.getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

    el.innerHTML = `
      <div class="today-topstrip">
        <div class="today-topstrip-left">
          <span class="today-greeting-inline">${greeting}, <strong>${user ? user.username : ''}</strong></span>
          <span class="today-date-inline">${DAYS[n.getDay()]}, ${MONTHS_FULL[n.getMonth()]} ${n.getDate()}</span>
        </div>
        <div class="today-topstrip-quote" id="today-topstrip-quote">
          <span class="ttq-text" id="ttq-text"></span>
          <span class="ttq-author" id="ttq-author"></span>
          <button class="ttq-refresh" id="ttq-refresh" title="New quote">↻</button>
        </div>
        <div class="today-clock-inline" id="today-clock"></div>
      </div>

      <div class="kpi-strip" id="kpi-strip">
        <div class="kpi-card kpi-tasks kpi-clickable" id="kpi-tasks">
          <div class="kpi-icon">✓</div>
          <div class="kpi-info">
            <div class="kpi-num" id="kpi-task-num"><span class="skeleton" style="width:28px;height:20px;display:inline-block;border-radius:4px"></span></div>
            <div class="kpi-label">Tasks today</div>
            <div class="kpi-sub" id="kpi-task-sub"></div>
          </div>
        </div>
        <div class="kpi-card kpi-dl kpi-clickable" id="kpi-dl">
          <div class="kpi-icon">⚑</div>
          <div class="kpi-info">
            <div class="kpi-num" id="kpi-dl-num"><span class="skeleton" style="width:28px;height:20px;display:inline-block;border-radius:4px"></span></div>
            <div class="kpi-label">Deadlines today</div>
            <div class="kpi-sub" id="kpi-dl-sub"></div>
          </div>
        </div>
        <div class="kpi-card kpi-notes kpi-clickable" id="kpi-notes">
          <div class="kpi-icon">✎</div>
          <div class="kpi-info">
            <div class="kpi-num" id="kpi-note-num"><span class="skeleton" style="width:28px;height:20px;display:inline-block;border-radius:4px"></span></div>
            <div class="kpi-label">Notes</div>
            <div class="kpi-sub" id="kpi-note-sub"></div>
          </div>
        </div>
        <div class="kpi-card kpi-add kpi-clickable" id="kpi-add-card">
          <div class="kpi-icon">＋</div>
          <div class="kpi-info">
            <div class="kpi-num" style="font-size:14px;font-weight:600;color:var(--accent)">New Task</div>
            <div class="kpi-label">Click to add</div>
          </div>
        </div>
      </div>

      <div class="today-quickadd" id="today-quickadd">
        <input class="tqa-input" id="tqa-input" placeholder="Quick add task… (press Enter)" autocomplete="off">
        <input type="date" class="tqa-date" id="tqa-date" value="${today}">
        <button class="tqa-btn primary" id="tqa-submit">Add Task</button>
      </div>

      <div class="today-body">
        <div class="today-main">
          <div class="today-sec-header">
            <div class="today-sec-title c-task"><span>✓</span> Tasks</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="today-sec-count" id="today-task-count">…</span>
              <button class="sec-add-btn" id="today-open-tasks">View all →</button>
            </div>
          </div>
          <div class="today-task-list" id="today-task-list">
            ${_skeletonRows(4)}
          </div>
        </div>

        <div class="today-right">
          <div class="today-sec-header" style="flex-shrink:0">
            <div class="today-sec-title c-dl"><span>⚑</span> Deadlines</div>
            <span class="today-sec-count" id="today-dl-count">…</span>
          </div>
          <div class="today-dl-list" id="today-dl-list"></div>

          <div class="today-notes-wrap">
            <div class="today-sec-header" style="flex-shrink:0;padding-top:10px">
              <div class="today-sec-title c-note"><span>✎</span> Notes</div>
              <span class="today-sec-count" id="today-note-count">…</span>
            </div>
            <div class="today-notes-grid" id="today-note-list"></div>
          </div>
        </div>
      </div>`;

    Clock.mount(document.getElementById('today-clock'));

    // KPI clicks → navigate to work tab
    document.getElementById('kpi-tasks').onclick  = () => { Router.navigate('work'); if(window.WorkView) WorkView.switchTab('tasks'); };
    document.getElementById('kpi-dl').onclick     = () => { Router.navigate('work'); if(window.WorkView) WorkView.switchTab('deadlines'); };
    document.getElementById('kpi-notes').onclick  = () => { Router.navigate('work'); if(window.WorkView) WorkView.switchTab('notes'); };
    document.getElementById('kpi-add-card').onclick = () => TaskEditor.open(null, () => _loadData(today));
    document.getElementById('today-open-tasks').onclick = () => { Router.navigate('work'); if(window.WorkView) WorkView.switchTab('tasks'); };

    // Quick add
    const tqaInput = document.getElementById('tqa-input');
    const tqaSubmit = document.getElementById('tqa-submit');
    const tqaDate  = document.getElementById('tqa-date');
    async function _quickAdd() {
      const title = tqaInput.value.trim();
      const date  = tqaDate.value || today;
      if (!title) { tqaInput.focus(); return; }
      try {
        await API.createTask({ title, date, status: 'todo', priority: 'normal' });
        tqaInput.value = '';
        Toast.show('Task added ✓', 'success');
        await _loadData(today);
      } catch(e) { Toast.show(e.message, 'error'); }
    }
    tqaInput.addEventListener('keydown', e => { if (e.key === 'Enter') _quickAdd(); });
    tqaSubmit.onclick = _quickAdd;

    await _loadData(today);
  }

  function _skeletonRows(n) {
    return Array.from({length: n}, () =>
      `<div class="skel-row skeleton"></div>`
    ).join('');
  }

  async function _loadData(today) {
    try {
      const data = await API.day(today);
      _renderKPI(data, today);
      _renderTasks(data.tasks, today);
      _renderDeadlines(data.deadlines);
      _renderNotes(data.notes, today);
      _refreshSidebarSummary(data);
    } catch(e) { Toast.show('Failed to load data', 'error'); }
  }

  function _renderKPI(data, today) {
    const tasks = data.tasks || [], dl = data.deadlines || [], notes = data.notes || [];
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = dl.filter(d => {
      if (!d.time) return false;
      const [hh,mm] = d.time.split(':').map(Number);
      return new Date().getTime() > new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), hh, mm).getTime();
    }).length;
    const urgent = dl.filter(d => d.urgent).length;

    const tn = document.getElementById('kpi-task-num');
    const ts = document.getElementById('kpi-task-sub');
    const dn = document.getElementById('kpi-dl-num');
    const ds = document.getElementById('kpi-dl-sub');
    const nn = document.getElementById('kpi-note-num');
    const ns = document.getElementById('kpi-note-sub');

    if (tn) tn.textContent = tasks.length;
    if (ts) { ts.textContent = `${done} done · ${tasks.length - done} remaining`; ts.className = 'kpi-sub'; }
    if (dn) dn.textContent = dl.length;
    if (ds) { ds.textContent = urgent ? `${urgent} urgent` : (overdue ? `${overdue} overdue` : 'all clear'); ds.className = 'kpi-sub' + (urgent || overdue ? ' warn' : ''); }
    if (nn) nn.textContent = notes.length;
    if (ns) ns.textContent = `${tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0}% progress today`;
  }

  function _renderTasks(tasks, today) {
    const el = document.getElementById('today-task-list');
    document.getElementById('today-task-count').textContent = tasks.length;
    if (!tasks.length) {
      el.innerHTML = `<div class="today-empty">
        <div class="today-empty-icon">✓</div>
        <div class="today-empty-text">No tasks for today</div>
        <button class="today-empty-btn" id="teb-add">+ Add first task</button>
      </div>`;
      document.getElementById('teb-add').onclick = () => TaskEditor.open(null, () => _loadData(today));
      return;
    }

    // Sort: in-progress first, then todo, then done
    const order = { 'in-progress': 0, 'todo': 1, 'done': 2 };
    const priOrder = { 'high': 0, 'normal': 1, 'low': 2 };
    const sorted = [...tasks].sort((a, b) => {
      const s = order[a.status] - order[b.status];
      return s !== 0 ? s : priOrder[a.priority] - priOrder[b.priority];
    });

    el.innerHTML = '';
    sorted.forEach(t => {
      const div = document.createElement('div');
      div.className = `trow priority-${t.priority}${t.bg_color ? ' tc-'+t.bg_color : ''}`;
      if (t.font_color) div.style.color = t.font_color;
      const isDone = t.status === 'done';
      const hasDesc = t.description && t.description.replace(/<[^>]*>/g,'').trim();
      const recurBadge = t.recur_id ? `<span style="font-size:10px;opacity:.7" title="Recurring">↻</span>` : '';
      div.innerHTML = `
        <div class="trow-check${isDone ? ' done' : ''}" title="${isDone ? 'Mark undone' : 'Mark done'}"></div>
        <div class="trow-body">
          <div class="trow-title${isDone ? ' done' : ''}">${_e(t.title)}</div>
          <div class="trow-meta">
            <span class="trow-badge tb-${t.status === 'in-progress' ? 'inprog' : t.status}">${t.status}</span>
            <span class="trow-badge tb-${t.priority}">${t.priority}</span>
            ${hasDesc ? '<span class="trow-desc">📝 has notes</span>' : ''}
          ${recurBadge}
          </div>
        </div>
        <button class="trow-edit" title="Edit">✎</button>`;

      div.querySelector('.trow-check').onclick = async e => {
        e.stopPropagation();
        try { await API.patchTaskStatus(t.id, isDone ? 'todo' : 'done'); await _loadData(today); }
        catch(err) { Toast.show(err.message, 'error'); }
      };
      div.querySelector('.trow-edit').onclick = e => { e.stopPropagation(); TaskEditor.open(t, () => _loadData(today)); };
      div.onclick = e => { if(e.target.closest('.trow-check,.trow-edit')) return; Preview.openTask(t, () => _loadData(today)); };
      el.appendChild(div);
    });
  }

  function _renderDeadlines(deadlines) {
    const el = document.getElementById('today-dl-list');
    document.getElementById('today-dl-count').textContent = deadlines.length;
    if (!deadlines.length) {
      el.innerHTML = '<div class="empty-msg" style="padding:12px">No deadlines today</div>';
      return;
    }
    el.innerHTML = '';
    const now = new Date();
    deadlines.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    deadlines.forEach(d => {
      const div = document.createElement('div');
      div.className = 'dl-row' + (d.urgent ? ' urgent' : '');
      let countdown = '', cls = 'ok';
      if (d.time) {
        const [hh, mm] = d.time.split(':').map(Number);
        const diff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm).getTime() - now.getTime();
        if (diff < 0) { countdown = 'Overdue'; cls = 'overdue'; }
        else if (diff < 3600000) { countdown = `${Math.ceil(diff / 60000)}m left`; cls = 'soon'; }
        else { countdown = `${Math.ceil(diff / 3600000)}h left`; cls = 'ok'; }
      }
      div.innerHTML = `
        <div class="dl-time">${d.time || '—'}</div>
        <div class="dl-row-body">
          <div class="dl-row-title">${_e(d.title)}</div>
          ${countdown ? `<div class="dl-row-countdown ${cls}">${countdown}</div>` : ''}
        </div>
        ${d.urgent ? '<span class="badge b-urgent">!</span>' : ''}`;
      div.style.cursor = 'pointer';
      div.onclick = () => Preview.openDeadline(d, () => _loadData(today));
      el.appendChild(div);
    });
  }

  function _renderNotes(notes, today) {
    const el = document.getElementById('today-note-list');
    document.getElementById('today-note-count').textContent = notes.length;
    if (!notes.length) {
      el.innerHTML = '<div class="empty-msg" style="padding:10px 12px">No notes today</div>';
      return;
    }
    el.innerHTML = '';
    notes.forEach(n => {
      const div = document.createElement('div');
      div.className = `today-note-card nc-${n.color}`;
      if (n.font_color) div.style.color = n.font_color;
      const preview = _strip(n.content).slice(0, 100);
      const thumb = _firstImage(n.content);
      div.innerHTML = `
        ${n.title ? `<div class="note-mini-title">${_e(n.title)}</div>` : ''}
        ${thumb ? `<img class="nc-thumb-mini" src="${thumb}" alt="">` : ''}
        ${_e(preview)}`;
      div.onclick = () => Preview.openNote(n, () => _loadData(today));
      el.appendChild(div);
    });
  }

  function _refreshSidebarSummary(data) {
    const t = data.tasks || [], d = data.deadlines || [], n = data.notes || [];
    const done = t.filter(x => x.status === 'done').length;
    const st = document.getElementById('sb-sum-tasks');
    const sd = document.getElementById('sb-sum-deadlines');
    const sn = document.getElementById('sb-sum-notes');
    if (st) st.textContent = `${t.length} (${done}✓)`;
    if (sd) sd.textContent = d.length + (d.filter(x => x.urgent).length ? ` · ${d.filter(x => x.urgent).length}!` : '');
    if (sn) sn.textContent = n.length;
  }

  function _e(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _strip(s) { const d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent || ''; }
  function _firstImage(s) { const d = document.createElement('div'); d.innerHTML = s || ''; const img = d.querySelector('img'); return img ? img.src : null; }

  return { render };
})();
