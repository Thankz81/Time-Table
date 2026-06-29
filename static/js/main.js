/* main.js — bootstrap */
'use strict';

/* ── Toast ─────────────────────────────────────────────────── */
window.Toast = (() => {
  function show(msg, type='') {
    let c=document.getElementById('toast-container');
    if(!c){c=document.createElement('div');c.id='toast-container';document.body.appendChild(c);}
    const t=document.createElement('div'); t.className='toast'+(type?' '+type:''); t.textContent=msg;
    c.appendChild(t); setTimeout(()=>t.remove(),3200);
  }
  return {show};
})();

/* ── Task Editor ────────────────────────────────────────────── */
window.TaskEditor = (() => {
  let _task=null, _onSave=null, _bgColor='', _recurDays=new Set();

  function open(task, onSave) {
    _task=task; _onSave=onSave;
    _bgColor = task ? (task.bg_color||'') : '';
    _recurDays = new Set();

    const backdrop=document.getElementById('task-editor-backdrop');
    const titleEl =document.getElementById('tem-title');
    const statusEl=document.getElementById('tem-status');
    const priEl   =document.getElementById('tem-priority');
    const dateEl  =document.getElementById('tem-date');
    const descEl  =document.getElementById('tem-description');

    titleEl.value  = task ? task.title    : '';
    statusEl.value = task ? task.status   : 'todo';
    priEl.value    = task ? task.priority : 'normal';
    dateEl.value   = task ? task.date     : Store.todayStr();
    Editor.setHTML(descEl, task ? task.description : '');

    // Time
    const timeEl = document.getElementById('tem-time');
    if (timeEl) timeEl.value = task ? (task.time||'') : '';
    // Link
    const linkEl = document.getElementById('tem-link');
    if (linkEl) linkEl.value = task ? (task.link||'') : '';
    // Font color dots — restore active state and apply live preview to title
    const fcActive = task ? (task.font_color||'') : '';
    document.querySelectorAll('#tem-font-color-dots .rcd-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.color === fcActive);
    });
    titleEl.style.color = fcActive || '';

    // BG color picker
    document.querySelectorAll('#tem-colors .cp-dot').forEach(d=>{
      d.classList.toggle('active', d.dataset.color === _bgColor);
    });

    // Recurring toggle + weekdays
    const toggle = document.getElementById('tem-recur-toggle');
    const expand = document.getElementById('tem-recur-expand');
    const recurEnd = document.getElementById('tem-recur-end');
    const hasRecur = task && task.recur_days;
    if (toggle) toggle.checked = !!hasRecur;
    if (expand) expand.classList.toggle('hidden', !hasRecur);
    if (hasRecur) {
      task.recur_days.split(',').filter(Boolean).forEach(d => _recurDays.add(d));
      if (recurEnd) recurEnd.value = task.recur_end || '';
    } else {
      if (recurEnd) recurEnd.value = '';
    }
    _syncRecurBtns();
    _updateRecurHint();

    // Update modal header label
    const saveBtn = document.getElementById('tem-save');
    if(saveBtn) saveBtn.textContent = task ? 'Save Changes' : 'Create Task';
    const modalTitle = document.getElementById('tem-modal-title');
    if(modalTitle) modalTitle.textContent = task ? 'Edit Task' : 'New Task';

    backdrop.classList.remove('hidden');
    titleEl.focus();

    // Wire toolbar once
    const toolbar=document.getElementById('rte-toolbar');
    if (!toolbar.dataset.wired) {
      Editor.wire(toolbar, descEl, 'rte-img-btn', 'rte-img-input');
      toolbar.dataset.wired='1';
    }

    const deleteBtn=document.getElementById('tem-delete');
    deleteBtn.style.display = task ? '' : 'none';
  }

  function _syncRecurBtns() {
    document.querySelectorAll('#tem-recur-days .recur-day-btn').forEach(b=>{
      b.classList.toggle('active', _recurDays.has(b.dataset.day));
    });
  }

  function _updateRecurHint() {
    const hint = document.getElementById('tem-recur-hint');
    if (!hint) return;
    const end = document.getElementById('tem-recur-end');
    if (_recurDays.size === 0 || !end || !end.value) {
      hint.textContent = '';
      return;
    }
    const dayNames = {'0':'Mon','1':'Tue','2':'Wed','3':'Thu','4':'Fri','5':'Sat','6':'Sun'};
    const days = [..._recurDays].sort().map(d=>dayNames[d]||d).join(', ');
    hint.textContent = `Repeats every ${days} until ${end.value}`;
  }

  function _close() {
    document.getElementById('task-editor-backdrop').classList.add('hidden');
    _task=null;
  }

  function _init() {
    document.getElementById('tem-close').onclick  = _close;
    document.getElementById('task-editor-backdrop').onclick = e => {
      if(e.target===document.getElementById('task-editor-backdrop')) _close();
    };

    // BG color picker
    document.querySelectorAll('#tem-colors .cp-dot').forEach(dot=>{
      dot.addEventListener('click', ()=>{
        _bgColor = dot.dataset.color;
        document.querySelectorAll('#tem-colors .cp-dot').forEach(d=>d.classList.remove('active'));
        dot.classList.add('active');
      });
    });

    // Font color dots — live-preview on title
    document.querySelectorAll('#tem-font-color-dots .rcd-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('#tem-font-color-dots .rcd-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        document.getElementById('tem-title').style.color = dot.dataset.color || '';
      });
    });

    // Recurring checkbox shows/hides weekday section
    document.getElementById('tem-recur-toggle').addEventListener('change', function() {
      const expand = document.getElementById('tem-recur-expand');
      expand.classList.toggle('hidden', !this.checked);
      if (!this.checked) {
        _recurDays.clear();
        _syncRecurBtns();
        const re = document.getElementById('tem-recur-end');
        if (re) re.value = '';
        _updateRecurHint();
      }
    });

    // Recurrence day toggles
    document.querySelectorAll('#tem-recur-days .recur-day-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const d = btn.dataset.day;
        if (_recurDays.has(d)) _recurDays.delete(d); else _recurDays.add(d);
        btn.classList.toggle('active', _recurDays.has(d));
        _updateRecurHint();
      });
    });
    const recurEndEl = document.getElementById('tem-recur-end');
    if (recurEndEl) recurEndEl.addEventListener('change', _updateRecurHint);

    document.getElementById('tem-save').onclick = async () => {
      const title    = document.getElementById('tem-title').value.trim();
      const status   = document.getElementById('tem-status').value;
      const pri      = document.getElementById('tem-priority').value;
      const date     = document.getElementById('tem-date').value;
      const desc     = Editor.getHTML(document.getElementById('tem-description'));
      const taskTime  = (document.getElementById('tem-time')||{}).value || '';
      const taskLink  = (document.getElementById('tem-link')||{}).value.trim() || '';
      const fcDot = document.querySelector('#tem-font-color-dots .rcd-dot.active');
      const fontColor = fcDot ? (fcDot.dataset.color || '') : '';
      const recurToggle = document.getElementById('tem-recur-toggle');
      const isRecur = recurToggle && recurToggle.checked;
      const recurEnd = isRecur ? ((document.getElementById('tem-recur-end')||{}).value || '') : '';
      const recurDaysStr = isRecur ? [..._recurDays].sort().join(',') : '';

      if (!title||!date) { Toast.show('Title and date required','error'); return; }

      const payload = {
        title, status, priority:pri, date, description:desc,
        time: taskTime,
        bg_color: _bgColor || '',
        font_color: fontColor,
        link: taskLink,
      };

      // Only include recur fields when the toggle is checked (creating/updating recurrence)
      // or when explicitly clearing recurrence on an existing recurring task
      if (isRecur) {
        payload.recur_days = recurDaysStr;
        payload.recur_end  = recurEnd;
      } else if (_task && _task.recur_id) {
        // User unchecked recurring on an existing recurring task — clear it
        payload.recur_days = '';
        payload.recur_end  = '';
      }

      try {
        if (_task) {
          await API.updateTask(_task.id, payload);
          Toast.show('Task saved ✓','success');
        } else {
          await API.createTask(payload);
          Toast.show('Task created ✓','success');
        }
        _close();
        if (_onSave) _onSave();
      } catch(e){ Toast.show(e.message,'error'); }
    };

    document.getElementById('tem-delete').onclick = async () => {
      if (!_task) return;
      // If recurring, ask scope
      if (_task.recur_id) {
        const choice = confirm('Delete just this occurrence, or all recurring instances?\n\nOK = delete ALL\nCancel = delete only this one');
        try {
          await API.deleteTask(_task.id, choice ? 'all' : 'one');
          Toast.show('Task deleted');
          _close(); if(_onSave)_onSave();
        } catch(e){ Toast.show(e.message,'error'); }
      } else {
        try { await API.deleteTask(_task.id); Toast.show('Task deleted'); _close(); if(_onSave)_onSave(); }
        catch(e){ Toast.show(e.message,'error'); }
      }
    };
  }

  return { open, _init };
})();

/* ── Note Editor ────────────────────────────────────────────── */
window.NoteEditor = (() => {
  let _note=null, _onSave=null, _color='default', _fontColor='';

  function open(note, onSave) {
    _note=note; _onSave=onSave;
    _color     = note ? (note.color||'default')     : 'default';
    _fontColor = note ? (note.font_color||'') : '';

    const backdrop = document.getElementById('note-editor-backdrop');
    document.getElementById('nem-title').value = note ? note.title : '';
    Editor.setHTML(document.getElementById('nem-content'), note ? note.content : '');

    // BG color picker
    document.querySelectorAll('#nem-colors .cp-dot').forEach(d=>{
      d.classList.toggle('active', d.dataset.color===_color);
    });

    // Link
    const nemLink = document.getElementById('nem-link');
    if (nemLink) nemLink.value = note ? (note.link||'') : '';

    backdrop.classList.remove('hidden');
    document.getElementById('nem-title').focus();

    const toolbar = backdrop.querySelector('.rte-toolbar');
    if (!toolbar.dataset.wired) {
      Editor.wire(toolbar, document.getElementById('nem-content'), 'nem-img-btn', 'nem-img-input');
      toolbar.dataset.wired='1';
    }

    document.getElementById('nem-delete').style.display = note ? '' : 'none';
  }

  function _close() {
    document.getElementById('note-editor-backdrop').classList.add('hidden');
    _note=null;
  }

  function _init() {
    document.getElementById('nem-close').onclick = _close;
    document.getElementById('note-editor-backdrop').onclick = e => {
      if(e.target===document.getElementById('note-editor-backdrop')) _close();
    };

    // BG color picker
    document.querySelectorAll('#nem-colors .cp-dot').forEach(dot=>{
      dot.addEventListener('click', ()=>{
        document.querySelectorAll('#nem-colors .cp-dot').forEach(d=>d.classList.remove('active'));
        dot.classList.add('active'); _color=dot.dataset.color;
      });
    });

    // Note font color is now set via toolbar color dots (per-selection), not a header picker

    document.getElementById('nem-save').onclick = async () => {
      const title   = document.getElementById('nem-title').value.trim();
      const content = Editor.getHTML(document.getElementById('nem-content'));
      const noteLink = (document.getElementById('nem-link')||{}).value.trim() || '';
      const date    = _note ? _note.date : Store.todayStr();
      if (!content) { Toast.show('Content cannot be empty','error'); return; }
      try {
        if (_note) {
          await API.updateNote(_note.id,{title,content,color:_color,font_color:_fontColor,link:noteLink});
          Toast.show('Note saved ✓','success');
        } else {
          await API.createNote({title,content,color:_color,font_color:_fontColor,link:noteLink,date});
          Toast.show('Note created ✓','success');
        }
        _close();
        if (_onSave) _onSave();
      } catch(e){ Toast.show(e.message,'error'); }
    };

    document.getElementById('nem-delete').onclick = async () => {
      if(!_note) return;
      try { await API.deleteNote(_note.id); Toast.show('Note deleted'); _close(); if(_onSave)_onSave(); }
      catch(e){ Toast.show(e.message,'error'); }
    };
  }

  return { open, _init };
})();

/* ── Panel add-form wiring ──────────────────────────────────── */
function wirePanelForms() {
  // Toggle forms
  document.querySelectorAll('.padd-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const sec=btn.dataset.sec, form=document.getElementById(`panel-${sec}-form`);
      const open=!form.classList.contains('hidden');
      document.querySelectorAll('.padd-form').forEach(f=>f.classList.add('hidden'));
      document.querySelectorAll('.padd-btn').forEach(b=>b.classList.remove('open'));
      if(!open){form.classList.remove('hidden');btn.classList.add('open');const fi=form.querySelector('input,textarea');if(fi)setTimeout(()=>fi.focus(),50);}
    });
  });

  // Note color picker in panel
  let panelNoteColor='default';
  document.querySelectorAll('#panel-note-colors .cp-dot').forEach(dot=>{
    dot.addEventListener('click',()=>{
      document.querySelectorAll('#panel-note-colors .cp-dot').forEach(d=>d.classList.remove('active'));
      dot.classList.add('active'); panelNoteColor=dot.dataset.color;
    });
  });

  // Task form
  document.getElementById('panel-task-form').addEventListener('submit', async e=>{
    e.preventDefault();
    const date=Panel.getDate(), title=document.getElementById('panel-task-input').value.trim();
    const status=document.getElementById('panel-task-status').value;
    const priority=document.getElementById('panel-task-priority').value;
    if(!title||!date) return;
    try{
      await API.createTask({date,title,status,priority});
      document.getElementById('panel-task-input').value='';
      await Panel.refresh(); Toast.show('Task added ✓','success');
    }catch(e){Toast.show(e.message,'error');}
  });

  // Deadline form
  document.getElementById('panel-deadline-form').addEventListener('submit', async e=>{
    e.preventDefault();
    const date=Panel.getDate(), title=document.getElementById('panel-deadline-input').value.trim();
    const time=document.getElementById('panel-deadline-time').value;
    const urgent=document.getElementById('panel-deadline-urgent').checked;
    if(!title||!date) return;
    try{
      await API.createDeadline({date,title,time:time||null,urgent});
      document.getElementById('panel-deadline-input').value='';
      document.getElementById('panel-deadline-time').value='';
      document.getElementById('panel-deadline-urgent').checked=false;
      await Panel.refresh(); Toast.show('Deadline added ✓','success');
    }catch(e){Toast.show(e.message,'error');}
  });

  // Note form
  document.getElementById('panel-note-form').addEventListener('submit', async e=>{
    e.preventDefault();
    const date=Panel.getDate(), content=document.getElementById('panel-note-input').value.trim();
    if(!content||!date) return;
    try{
      await API.createNote({date,content,color:panelNoteColor});
      document.getElementById('panel-note-input').value='';
      await Panel.refresh(); Toast.show('Note added ✓','success');
    }catch(e){Toast.show(e.message,'error');}
  });
}

/* ── Stats modal ────────────────────────────────────────────── */
async function openStats(){
  const modal=document.getElementById('stats-modal'); modal.classList.remove('hidden');
  const body=document.getElementById('stats-body');
  body.innerHTML='<p style="color:var(--tx3);padding:12px">Loading…</p>';
  try{
    const s=await API.stats();
    const pct=s.total_tasks>0?Math.round(s.done_tasks/s.total_tasks*100):0;
    body.innerHTML=`
      <div class="ring-wrap"><div class="ring-bg"></div><div class="ring-fg" id="ring-fg"></div>
        <div class="ring-text"><span class="ring-pct">${pct}%</span><span class="ring-sub">done</span></div></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="sc-num">${s.total_tasks}</div><div class="sc-lbl">Total Tasks</div><div class="sc-sub">${s.done_tasks} completed</div></div>
        <div class="stat-card"><div class="sc-num">${s.total_tasks-s.done_tasks}</div><div class="sc-lbl">Pending</div></div>
        <div class="stat-card"><div class="sc-num">${s.total_deadlines}</div><div class="sc-lbl">Deadlines</div></div>
        <div class="stat-card"><div class="sc-num">${s.total_notes}</div><div class="sc-lbl">Notes</div></div>
      </div>`;
    setTimeout(()=>{const fg=document.getElementById('ring-fg');if(fg)fg.style.transform=`rotate(${pct*3.6-90}deg)`;},100);
  }catch(e){body.innerHTML=`<p class="empty-msg">${e.message}</p>`;}
}

/* ── Sidebar summary ────────────────────────────────────────── */
async function _refreshSidebarSummary(){
  if (window.MiniCalendar) MiniCalendar.refresh();
  try{
    const today=Store.todayStr();
    const data=await API.day(today);
    const t=data.tasks||[], d=data.deadlines||[], n=data.notes||[];
    const done=t.filter(x=>x.status==='done').length;
    const st=document.getElementById('sb-sum-tasks');
    const sd=document.getElementById('sb-sum-deadlines');
    const sn=document.getElementById('sb-sum-notes');
    if(st) st.textContent=`${t.length} (${done} done)`;
    if(sd) sd.textContent=d.length+(d.filter(x=>x.urgent).length?` · ${d.filter(x=>x.urgent).length} urgent`:'');
    if(sn) sn.textContent=n.length;
  }catch(_){}
}

/* ── Quote Banner (topbar + mobile strip) ───────────────────── */
window.QuoteBanner = (() => {
  const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
    { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
    { text: "Productivity is never an accident. It is always the result of a commitment to excellence.", author: "Paul J. Meyer" },
    { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
    { text: "You can always find a distraction if you're looking for one.", author: "Tom Kite" },
    { text: "Work is hard. Distractions are plentiful. And time is short.", author: "Adam Hochschild" },
    { text: "Until we can manage time, we can manage nothing else.", author: "Peter Drucker" },
    { text: "Lost time is never found again.", author: "Benjamin Franklin" },
    { text: "One day or day one. You decide.", author: "Paulo Coelho" },
    { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
    { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { text: "Time you enjoy wasting is not wasted time.", author: "Marthe Troly-Curtin" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Someday is not a day of the week.", author: "Denise Brennan-Nelson" },
    { text: "The most effective way to do it is to do it.", author: "Amelia Earhart" },
    { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  ];
  let _lastIdx = -1;

  function _set(q) {
    const ids = [['ttq-text','ttq-author'],['mqs-text','mqs-author']];
    ids.forEach(([tId, aId]) => {
      const t = document.getElementById(tId), a = document.getElementById(aId);
      if (!t) return;
      t.style.opacity = '0'; a.style.opacity = '0';
      setTimeout(() => {
        t.textContent = q.text; a.textContent = '— ' + q.author;
        t.style.opacity = '1'; a.style.opacity = '1';
      }, 180);
    });
  }

  function next() {
    let idx;
    do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === _lastIdx && QUOTES.length > 1);
    _lastIdx = idx;
    _set(QUOTES[idx]);
  }

  function init() {
    next();
    const mqs = document.getElementById('mqs-refresh');
    if (mqs) mqs.onclick = next;
  }

  function wireToday() {
    const btn = document.getElementById('ttq-refresh');
    if (btn) btn.onclick = next;
    next();
  }

  return { init, next, wireToday };
})();

/* ── Boot app ───────────────────────────────────────────────── */
function bootApp(user) {
  Store.setUser(user);
  document.getElementById('sb-avatar').textContent   = user.avatar;
  document.getElementById('sb-username').textContent = user.username;
  document.getElementById('sb-email').textContent    = user.email;

  const shell = document.getElementById('app-shell');
  shell.classList.remove('hidden'); shell.classList.add('app-enter');
  setTimeout(() => shell.classList.remove('app-enter'), 500);

  // Panel close
  document.getElementById('panel-close').onclick = () => Panel.close();
  document.getElementById('overlay').onclick      = () => Panel.close();

  // Sidebar collapse toggle — desktop collapses, mobile overlays
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  function isMobile(){ return window.innerWidth <= 900; }
  function closeMobileSidebar(){
    document.getElementById('sidebar').classList.remove('mobile-open');
    sidebarOverlay.classList.remove('visible');
  }
  document.getElementById('btn-sidebar-toggle').onclick = () => {
    if(isMobile()){
      const open = document.getElementById('sidebar').classList.toggle('mobile-open');
      sidebarOverlay.classList.toggle('visible', open);
    } else {
      shell.classList.toggle('sidebar-collapsed');
    }
  };
  sidebarOverlay.onclick = closeMobileSidebar;
  // Close mobile sidebar when a nav link is tapped
  document.querySelectorAll('.sb-link').forEach(l => l.addEventListener('click', ()=>{ if(isMobile()) closeMobileSidebar(); }));

  // Sidebar quick-add new task
  document.getElementById('sb-new-task').onclick = () =>
    TaskEditor.open(null, () => { _refreshSidebarSummary(); if (Router.current() === 'work') WorkView.render(); if (Router.current() === 'today') TodayView.render(); });

  // Sidebar summary rows → navigate to work tab
  const ssRows = { 'sb-sum-row-tasks':'tasks', 'sb-sum-row-dl':'deadlines', 'sb-sum-row-notes':'notes' };
  Object.entries(ssRows).forEach(([id, tab]) => {
    const el = document.getElementById(id);
    if (el) el.onclick = () => { Router.navigate('work'); WorkView.switchTab(tab); };
  });

  // Topbar add task
  document.getElementById('btn-add-task').onclick = () =>
    TaskEditor.open(null, () => { _refreshSidebarSummary(); if (Router.current() === 'work') WorkView.render(); if (Router.current() === 'today') TodayView.render(); });

  // Topbar nav pills
  document.querySelectorAll('.tb-nav-pill').forEach(btn => {
    btn.addEventListener('click', () => Router.navigate(btn.dataset.route));
  });

  // Refresh + stats
  document.getElementById('btn-refresh').onclick = () => { const r = Router.current(); if (r) Router.navigate(r, true); };
  document.getElementById('btn-stats').onclick   = openStats;
  document.getElementById('stats-close').onclick = () => document.getElementById('stats-modal').classList.add('hidden');
  document.getElementById('stats-modal').onclick = e => { if (e.target === document.getElementById('stats-modal')) document.getElementById('stats-modal').classList.add('hidden'); };

  // Logout
  document.getElementById('btn-logout').onclick = async () => { await API.logout(); location.reload(); };

  // Delete account
  document.getElementById('btn-delete-account').onclick = () => {
    document.getElementById('delete-confirm-input').value = '';
    document.getElementById('delete-account-confirm').disabled = true;
    document.getElementById('delete-account-confirm').style.opacity = '.7';
    document.getElementById('delete-account-error').classList.add('hidden');
    document.getElementById('delete-account-modal').classList.remove('hidden');
  };
  document.getElementById('delete-account-close').onclick = () =>
    document.getElementById('delete-account-modal').classList.add('hidden');
  document.getElementById('delete-account-modal').onclick = e => {
    if (e.target === document.getElementById('delete-account-modal'))
      document.getElementById('delete-account-modal').classList.add('hidden');
  };
  document.getElementById('delete-confirm-input').oninput = e => {
    const ok = e.target.value === 'DELETE';
    document.getElementById('delete-account-confirm').disabled = !ok;
    document.getElementById('delete-account-confirm').style.opacity = ok ? '1' : '.7';
  };
  document.getElementById('delete-account-confirm').onclick = async () => {
    const btn = document.getElementById('delete-account-confirm');
    const errEl = document.getElementById('delete-account-error');
    const loader = btn.querySelector('.btn-loader');
    const text = btn.querySelector('.btn-text');
    text.classList.add('hidden'); loader.classList.remove('hidden'); btn.disabled = true;
    try {
      await API.deleteAccount();
      location.reload();
    } catch(e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
      text.classList.remove('hidden'); loader.classList.add('hidden'); btn.disabled = false;
    }
  };

  // Init editors + preview
  TaskEditor._init();
  NoteEditor._init();
  Preview._init();

  // Quote banner (topbar + mobile)
  QuoteBanner.init();

  // Init floating calendar widget
  MiniCalendar.init(date => {
    Panel.open(date, () => { MiniCalendar.refresh(); if (Router.current() === 'today') TodayView.render(); });
  });

  // Panel forms are now rendered dynamically inside the timeline — no static wiring needed

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) return;
    if (e.key === '[' && !isMobile()) shell.classList.toggle('sidebar-collapsed');
    if (e.key === 'n' || e.key === 'N') TaskEditor.open(null, () => { _refreshSidebarSummary(); });
    if (e.key === 'r' || e.key === 'R') { const r = Router.current(); if (r) Router.navigate(r, true); }
    if (e.key === '1') Router.navigate('today');
    if (e.key === '2') Router.navigate('calendar');
    if (e.key === '3') Router.navigate('work');
  });

  // Register routes
  Router.on('today',     () => { TodayView.render(); QuoteBanner.wireToday(); });
  Router.on('calendar',  () => CalendarView.render());
  Router.on('work',      () => WorkView.render());
  Router.on('tasks',     () => { Router.navigate('work'); WorkView.switchTab('tasks'); });
  Router.on('notes',     () => { Router.navigate('work'); WorkView.switchTab('notes'); });
  Router.on('deadlines', () => { Router.navigate('work'); WorkView.switchTab('deadlines'); });
  Router.init();

  if (!window.location.hash || window.location.hash === '#/') Router.navigate('today');

  _refreshSidebarSummary();
}

/* ── Entry point ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.checkSession();
  if (user) {
    document.getElementById('auth-screen').classList.add('hidden');
    bootApp(user);
  } else {
    Auth.init(bootApp);
  }
});
