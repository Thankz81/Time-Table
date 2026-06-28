/* components/panel.js — day timeline panel */
'use strict';
window.Panel = (() => {
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  // Hours shown in timeline: 0–23
  const HOURS = Array.from({length:24},(_,i)=>i);
  let _date=null, _onChanged=null;

  function open(date, onChanged) {
    _date=date; _onChanged=onChanged;
    const d=new Date(date+'T00:00:00'), isToday=date===Store.todayStr();
    document.getElementById('ph-weekday').textContent=DAYS[d.getDay()];
    document.getElementById('ph-date').textContent=`${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    document.getElementById('ph-today-badge').classList.toggle('hidden',!isToday);
    const ov=document.getElementById('overlay');
    document.getElementById('day-panel').classList.add('is-open');
    ov.classList.add('visible'); requestAnimationFrame(()=>ov.classList.add('shown'));
    _load(date, isToday);
  }

  function close() {
    document.getElementById('day-panel').classList.remove('is-open');
    const ov=document.getElementById('overlay');
    ov.classList.remove('shown'); setTimeout(()=>ov.classList.remove('visible'),280);
    _date=null;
  }

  async function _load(date, isToday) {
    try { const data=await API.day(date); _render(data,isToday,date); }
    catch(e){ Toast.show('Failed to load day','error'); }
  }

  async function refresh() {
    if(!_date) return;
    await _load(_date, _date===Store.todayStr());
  }

  /* ── Main render ── */
  function _render(data, isToday, date) {
    _renderProgress(data.tasks);
    _renderTimeline(data, date, isToday);
    if(_onChanged) _onChanged(_date, data);
  }

  function _renderProgress(tasks) {
    const wrap=document.getElementById('progress-bar-wrap');
    if(!tasks.length){wrap.classList.add('hidden');return;}
    wrap.classList.remove('hidden');
    const done=tasks.filter(t=>t.status==='done').length, pct=Math.round(done/tasks.length*100);
    document.getElementById('prog-label').textContent=`${done}/${tasks.length} tasks done`;
    document.getElementById('prog-pct').textContent=pct+'%';
    setTimeout(()=>{document.getElementById('prog-fill').style.width=pct+'%';},50);
  }

  /* ── Timeline ── */
  function _renderTimeline(data, date, isToday) {
    const body = document.getElementById('panel-body');
    body.innerHTML = '';

    const tasks     = data.tasks     || [];
    const deadlines = data.deadlines || [];
    const notes     = data.notes     || [];

    // Separate timed vs untimed
    const timedTasks = tasks.filter(t => t.time);
    const allDayTasks = tasks.filter(t => !t.time);
    const timedDls   = deadlines.filter(d => d.time);
    const allDayDls  = deadlines.filter(d => !d.time);

    const nowH = new Date().getHours();
    const nowM = new Date().getMinutes();

    // ── Add-item bar ──
    const addBar = document.createElement('div');
    addBar.className = 'tl-add-bar';
    addBar.innerHTML = `
      <button class="tl-add-btn tl-add-task" id="tl-add-task">＋ Task</button>
      <button class="tl-add-btn tl-add-dl"   id="tl-add-dl">＋ Deadline</button>
      <button class="tl-add-btn tl-add-note" id="tl-add-note">＋ Note</button>`;
    body.appendChild(addBar);
    addBar.querySelector('#tl-add-task').onclick = () => TaskEditor.open({date}, refresh);
    addBar.querySelector('#tl-add-dl').onclick   = () => _showQuickAdd('deadline', date);
    addBar.querySelector('#tl-add-note').onclick = () => NoteEditor.open(null, refresh);

    // ── All-day row ──
    if (allDayTasks.length || allDayDls.length || notes.length) {
      const allDay = document.createElement('div');
      allDay.className = 'tl-allday';
      allDay.innerHTML = `<div class="tl-allday-label">All day</div><div class="tl-allday-items" id="tl-allday-items"></div>`;
      body.appendChild(allDay);
      const allDayEl = allDay.querySelector('#tl-allday-items');
      allDayTasks.forEach(t => allDayEl.appendChild(_taskChip(t, date)));
      allDayDls.forEach(d   => allDayEl.appendChild(_dlChip(d, date)));
      notes.forEach(n       => allDayEl.appendChild(_noteChip(n, date)));
    }

    // ── Hour grid ──
    const grid = document.createElement('div');
    grid.className = 'tl-grid';
    body.appendChild(grid);

    // Group items by hour
    const byHour = {}; // hour -> [{type,item}]
    timedTasks.forEach(t => {
      const h = _hhmm(t.time);
      (byHour[h] = byHour[h]||[]).push({type:'task', item:t});
    });
    timedDls.forEach(d => {
      const h = _hhmm(d.time);
      (byHour[h] = byHour[h]||[]).push({type:'dl', item:d});
    });

    // Determine visible range: earliest item - latest item, min 8am–8pm
    const allHours = Object.keys(byHour).map(Number);
    const minH = allHours.length ? Math.min(Math.min(...allHours), 8)  : 8;
    const maxH = allHours.length ? Math.max(Math.max(...allHours)+1, 20): 20;

    for (let h = minH; h <= maxH; h++) {
      const row = document.createElement('div');
      row.className = 'tl-row' + (isToday && h === nowH ? ' tl-row-now' : '');
      row.dataset.hour = h;

      const lbl = document.createElement('div');
      lbl.className = 'tl-hour-lbl';
      lbl.textContent = _fmt12(h);
      row.appendChild(lbl);

      const slot = document.createElement('div');
      slot.className = 'tl-slot';

      // Now indicator line
      if (isToday && h === nowH) {
        const nowLine = document.createElement('div');
        nowLine.className = 'tl-now-line';
        nowLine.style.top = (nowM / 60 * 100) + '%';
        const dot = document.createElement('div');
        dot.className = 'tl-now-dot';
        dot.style.top = (nowM / 60 * 100) + '%';
        slot.appendChild(nowLine);
        slot.appendChild(dot);
      }

      const items = byHour[h] || [];
      if (items.length) {
        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'tl-items' + (items.length > 1 ? ' multi' : '');
        items.forEach(({type, item}) => {
          itemsWrap.appendChild(type === 'task' ? _taskChip(item, date) : _dlChip(item, date));
        });
        slot.appendChild(itemsWrap);
      }

      row.appendChild(slot);
      grid.appendChild(row);
    }

    // Scroll to now or earliest item
    requestAnimationFrame(() => {
      const target = isToday ? nowH : (allHours.length ? Math.min(...allHours) : 8);
      const nowRow = grid.querySelector(`[data-hour="${target}"]`);
      if (nowRow) nowRow.scrollIntoView({block:'center', behavior:'smooth'});
    });
  }

  /* ── Chip builders ── */
  function _taskChip(t, date) {
    const div = document.createElement('div');
    const done = t.status === 'done';
    div.className = `tl-chip tl-chip-task priority-${t.priority}${done?' done':''}${t.bg_color?' tc-'+t.bg_color:''}`;
    if (t.font_color) div.style.color = t.font_color;
    div.innerHTML = `
      <span class="tlc-check${done?' done':''}" title="${done?'Mark undone':'Mark done'}"></span>
      <span class="tlc-body">
        <span class="tlc-title">${_e(t.title)}</span>
        ${t.time ? `<span class="tlc-time">${t.time}</span>` : ''}
        <span class="tlc-badge">${t.status}</span>
        ${t.recur_id ? '<span class="tlc-recur">↻</span>' : ''}
      </span>
      <span class="tlc-actions">
        <button class="tlc-btn" data-a="edit" title="Edit">✎</button>
        <button class="tlc-btn del" data-a="del" title="Delete">✕</button>
      </span>`;
    div.querySelector('.tlc-check').onclick = async e => {
      e.stopPropagation();
      try { await API.patchTaskStatus(t.id, done ? 'todo' : 'done'); await refresh(); }
      catch(err) { Toast.show(err.message,'error'); }
    };
    div.querySelector('[data-a="edit"]').onclick = e => { e.stopPropagation(); TaskEditor.open(t, refresh); };
    div.querySelector('[data-a="del"]').onclick  = async e => {
      e.stopPropagation();
      div.style.opacity='0'; div.style.transition='opacity .15s';
      setTimeout(async()=>{
        try { await API.deleteTask(t.id); await refresh(); Toast.show('Task deleted'); }
        catch(err){ Toast.show(err.message,'error'); }
      },150);
    };
    div.onclick = () => TaskEditor.open(t, refresh);
    return div;
  }

  function _dlChip(d, date) {
    const div = document.createElement('div');
    div.className = 'tl-chip tl-chip-dl' + (d.urgent ? ' urgent' : '');
    div.innerHTML = `
      <span class="tlc-dl-icon">⚑</span>
      <span class="tlc-body">
        <span class="tlc-title">${_e(d.title)}</span>
        ${d.time ? `<span class="tlc-time">${d.time}</span>` : ''}
        ${d.urgent ? '<span class="tlc-badge urgent">URGENT</span>' : ''}
      </span>
      <span class="tlc-actions">
        <button class="tlc-btn del" data-a="del" title="Delete">✕</button>
      </span>`;
    div.querySelector('[data-a="del"]').onclick = async e => {
      e.stopPropagation();
      div.style.opacity='0'; div.style.transition='opacity .15s';
      setTimeout(async()=>{
        try { await API.deleteDeadline(d.id); await refresh(); Toast.show('Deadline deleted'); }
        catch(err){ Toast.show(err.message,'error'); }
      },150);
    };
    return div;
  }

  function _noteChip(n, date) {
    const div = document.createElement('div');
    div.className = `tl-chip tl-chip-note nc-${n.color}`;
    if (n.font_color) div.style.color = n.font_color;
    const preview = _strip(n.content).slice(0, 40);
    div.innerHTML = `
      <span class="tlc-note-icon">✎</span>
      <span class="tlc-body">
        ${n.title ? `<span class="tlc-title">${_e(n.title)}</span>` : `<span class="tlc-title">${_e(preview)}</span>`}
      </span>
      <span class="tlc-actions">
        <button class="tlc-btn" data-a="edit" title="Edit">✎</button>
        <button class="tlc-btn del" data-a="del" title="Delete">✕</button>
      </span>`;
    div.querySelector('[data-a="edit"]').onclick = e => { e.stopPropagation(); NoteEditor.open(n, refresh); };
    div.querySelector('[data-a="del"]').onclick  = async e => {
      e.stopPropagation();
      div.style.opacity='0'; div.style.transition='opacity .15s';
      setTimeout(async()=>{
        try { await API.deleteNote(n.id); await refresh(); Toast.show('Note deleted'); }
        catch(err){ Toast.show(err.message,'error'); }
      },150);
    };
    div.onclick = () => NoteEditor.open(n, refresh);
    return div;
  }

  /* ── Quick-add deadline inline ── */
  function _showQuickAdd(type, date) {
    const body = document.getElementById('panel-body');
    const existing = body.querySelector('.tl-quick-add');
    if (existing) { existing.remove(); return; }
    const wrap = document.createElement('div');
    wrap.className = 'tl-quick-add';
    wrap.innerHTML = `
      <input class="tl-qa-input" id="tl-qa-title" placeholder="Deadline title…" autocomplete="off">
      <input type="time" class="tl-qa-time" id="tl-qa-time">
      <label class="tl-qa-urgent"><input type="checkbox" id="tl-qa-urg"> Urgent</label>
      <button class="tl-qa-save" id="tl-qa-save">Add</button>
      <button class="tl-qa-cancel" id="tl-qa-cancel">✕</button>`;
    body.insertBefore(wrap, body.firstChild.nextSibling);
    wrap.querySelector('#tl-qa-cancel').onclick = () => wrap.remove();
    wrap.querySelector('#tl-qa-save').onclick = async () => {
      const title  = wrap.querySelector('#tl-qa-title').value.trim();
      const time   = wrap.querySelector('#tl-qa-time').value;
      const urgent = wrap.querySelector('#tl-qa-urg').checked;
      if (!title) return;
      try {
        await API.createDeadline({date, title, time:time||null, urgent});
        wrap.remove(); await refresh(); Toast.show('Deadline added ✓','success');
      } catch(e) { Toast.show(e.message,'error'); }
    };
    wrap.querySelector('#tl-qa-title').addEventListener('keydown', e => {
      if (e.key==='Enter') wrap.querySelector('#tl-qa-save').click();
      if (e.key==='Escape') wrap.remove();
    });
    setTimeout(()=>wrap.querySelector('#tl-qa-title').focus(), 50);
  }

  /* ── Helpers ── */
  function _hhmm(t) { return t ? parseInt(t.split(':')[0], 10) : null; }
  function _fmt12(h) {
    if (h === 0)  return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h-12} PM`;
  }
  function _e(s){ if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _strip(s){ const d=document.createElement('div'); d.innerHTML=s||''; return d.textContent||''; }

  function getDate() { return _date; }
  return { open, close, refresh, getDate };
})();
