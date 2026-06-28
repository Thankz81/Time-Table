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
  let _task=null, _onSave=null;

  function open(task, onSave) {
    _task=task; _onSave=onSave;
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

  function _close() {
    document.getElementById('task-editor-backdrop').classList.add('hidden');
    _task=null;
  }

  function _init() {
    document.getElementById('tem-close').onclick  = _close;
    document.getElementById('task-editor-backdrop').onclick = e => { if(e.target===document.getElementById('task-editor-backdrop')) _close(); };

    document.getElementById('tem-save').onclick = async () => {
      const title  = document.getElementById('tem-title').value.trim();
      const status = document.getElementById('tem-status').value;
      const pri    = document.getElementById('tem-priority').value;
      const date   = document.getElementById('tem-date').value;
      const desc   = Editor.getHTML(document.getElementById('tem-description'));
      if (!title||!date) { Toast.show('Title and date required','error'); return; }
      try {
        if (_task) {
          await API.updateTask(_task.id,{title,status,priority:pri,date,description:desc});
          Toast.show('Task saved ✓','success');
        } else {
          await API.createTask({title,status,priority:pri,date,description:desc});
          Toast.show('Task created ✓','success');
        }
        _close();
        if (_onSave) _onSave();
      } catch(e){ Toast.show(e.message,'error'); }
    };

    document.getElementById('tem-delete').onclick = async () => {
      if (!_task) return;
      try { await API.deleteTask(_task.id); Toast.show('Task deleted'); _close(); if(_onSave)_onSave(); }
      catch(e){ Toast.show(e.message,'error'); }
    };
  }

  return { open, _init };
})();

/* ── Note Editor ────────────────────────────────────────────── */
window.NoteEditor = (() => {
  let _note=null, _onSave=null, _color='default';

  function open(note, onSave) {
    _note=note; _onSave=onSave; _color=note?note.color:'default';
    const backdrop = document.getElementById('note-editor-backdrop');
    document.getElementById('nem-title').value = note ? note.title   : '';
    Editor.setHTML(document.getElementById('nem-content'), note ? note.content : '');

    // Reset color picker
    document.querySelectorAll('#nem-colors .cp-dot').forEach(d=>{
      d.classList.toggle('active', d.dataset.color===_color);
    });

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
    document.getElementById('note-editor-backdrop').onclick = e => { if(e.target===document.getElementById('note-editor-backdrop')) _close(); };

    document.querySelectorAll('#nem-colors .cp-dot').forEach(dot=>{
      dot.addEventListener('click', ()=>{
        document.querySelectorAll('#nem-colors .cp-dot').forEach(d=>d.classList.remove('active'));
        dot.classList.add('active'); _color=dot.dataset.color;
      });
    });

    document.getElementById('nem-save').onclick = async () => {
      const title   = document.getElementById('nem-title').value.trim();
      const content = Editor.getHTML(document.getElementById('nem-content'));
      const date    = _note ? _note.date : Store.todayStr();
      if (!content) { Toast.show('Content cannot be empty','error'); return; }
      try {
        if (_note) {
          await API.updateNote(_note.id,{title,content,color:_color});
          Toast.show('Note saved ✓','success');
        } else {
          await API.createNote({title,content,color:_color,date});
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

  // Sidebar collapse toggle
  document.getElementById('btn-sidebar-toggle').onclick = () => {
    shell.classList.toggle('sidebar-collapsed');
  };

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

  // Init editors
  TaskEditor._init();
  NoteEditor._init();

  // Init floating calendar widget
  MiniCalendar.init(date => {
    Panel.open(date, () => { MiniCalendar.refresh(); if (Router.current() === 'today') TodayView.render(); });
  });

  // Wire panel forms
  wirePanelForms();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) return;
    if (e.key === '[') shell.classList.toggle('sidebar-collapsed');
    if (e.key === 'n' || e.key === 'N') TaskEditor.open(null, () => { _refreshSidebarSummary(); });
    if (e.key === 'r' || e.key === 'R') { const r = Router.current(); if (r) Router.navigate(r, true); }
    if (e.key === '1') Router.navigate('today');
    if (e.key === '2') Router.navigate('calendar');
    if (e.key === '3') Router.navigate('work');
  });

  // Register routes
  Router.on('today',     () => TodayView.render());
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
