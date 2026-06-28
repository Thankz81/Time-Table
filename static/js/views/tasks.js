/* views/tasks.js — flat grouped list */
'use strict';
window.TasksView = (() => {
  let _tasks = [], _filter = 'all', _dateFilter = '', _addOpen = false;

  async function render() {
    const el = document.getElementById('view-tasks');
    el.innerHTML = `
      <div class="tasks-filterbar">
        <div class="tasks-fb-pills">
          <button class="fb-pill active" data-f="all">All</button>
          <button class="fb-pill" data-f="todo">To Do</button>
          <button class="fb-pill" data-f="in-progress">In Progress</button>
          <button class="fb-pill" data-f="done">Done</button>
          <button class="fb-pill" data-f="high">High Priority</button>
        </div>
        <input type="date" class="tasks-fb-date" id="tf-date" title="Filter by date">
        <button class="tasks-add-btn" id="tasks-add-btn">＋ New Task</button>
      </div>
      <div class="tasks-list-wrap" id="tasks-list-wrap">
        ${_skeletonRows(5)}
      </div>`;

    el.querySelectorAll('.fb-pill').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.fb-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _filter = btn.dataset.f;
        _renderList();
      };
    });

    document.getElementById('tf-date').addEventListener('change', e => {
      _dateFilter = e.target.value;
      _loadAndRender();
    });

    document.getElementById('tasks-add-btn').onclick = () => TaskEditor.open(null, _loadAndRender);

    await _loadAndRender();
  }

  async function _loadAndRender() {
    try {
      const { tasks } = await API.getTasks(_dateFilter || null);
      _tasks = tasks;
      _renderList();
    } catch(e) { Toast.show(e.message, 'error'); }
  }

  function _renderList() {
    const wrap = document.getElementById('tasks-list-wrap');
    if (!wrap) return;

    let filtered = _tasks;
    if (_filter === 'todo')        filtered = _tasks.filter(t => t.status === 'todo');
    else if (_filter === 'in-progress') filtered = _tasks.filter(t => t.status === 'in-progress');
    else if (_filter === 'done')   filtered = _tasks.filter(t => t.status === 'done');
    else if (_filter === 'high')   filtered = _tasks.filter(t => t.priority === 'high');

    wrap.innerHTML = '';

    // Inline add row at top
    if (_addOpen) {
      wrap.appendChild(_inlineAddRow());
    } else {
      const addTrig = document.createElement('div');
      addTrig.className = 'task-row';
      addTrig.style.cssText = 'color:var(--tx3);border:1px dashed var(--border);border-radius:var(--r6);margin-bottom:4px';
      addTrig.innerHTML = `<span style="font-size:18px;margin-left:2px">＋</span><span style="font-size:13px">Add task…</span>`;
      addTrig.onclick = () => { _addOpen = true; _renderList(); };
      wrap.appendChild(addTrig);
    }

    if (!filtered.length) {
      const em = document.createElement('div');
      em.className = 'today-empty';
      em.innerHTML = `<div class="today-empty-icon">✓</div><div class="today-empty-text">No tasks${_filter !== 'all' ? ' matching filter' : ''}</div>`;
      wrap.appendChild(em);
      return;
    }

    // Group by status
    const groups = [
      { key: 'in-progress', label: 'In Progress', cls: 'grp-inprog' },
      { key: 'todo',        label: 'To Do',       cls: 'grp-todo'   },
      { key: 'done',        label: 'Done',         cls: 'grp-done'   },
    ];

    groups.forEach(g => {
      const items = filtered.filter(t => t.status === g.key);
      if (!items.length) return;

      // Sort by priority within group
      items.sort((a, b) => ({ high:0,normal:1,low:2 }[a.priority] - { high:0,normal:1,low:2 }[b.priority]));

      const hdr = document.createElement('div');
      hdr.className = `tasks-group-header ${g.cls}`;
      hdr.innerHTML = `<span>${g.label}</span><div class="tgh-line"></div><span class="tgh-count">${items.length}</span>`;
      wrap.appendChild(hdr);

      items.forEach(t => wrap.appendChild(_taskRow(t)));
    });
  }

  function _taskRow(t) {
    const div = document.createElement('div');
    div.className = `task-row priority-${t.priority}`;
    const isDone = t.status === 'done';
    div.innerHTML = `
      <div class="tr-check${isDone ? ' done' : ''}"></div>
      <div class="tr-body">
        <div class="tr-title${isDone ? ' done' : ''}">${_e(t.title)}</div>
        <div class="tr-meta">
          <span class="tr-badge tb-${t.priority}" style="background:${t.priority==='high'?'var(--danger-dim)':t.priority==='low'?'rgba(144,144,168,.05)':'rgba(144,144,168,.08)'};color:${t.priority==='high'?'var(--dl-c)':'var(--tx3)'}">${t.priority}</span>
          <span class="tr-date">${t.date}</span>
        </div>
      </div>
      <div class="tr-actions">
        <button class="tr-act" data-a="edit" title="Edit">✎</button>
        <button class="tr-act del" data-a="del" title="Delete">✕</button>
      </div>`;

    div.querySelector('.tr-check').onclick = async e => {
      e.stopPropagation();
      const next = isDone ? 'todo' : 'done';
      try { await API.patchTaskStatus(t.id, next); await _loadAndRender(); }
      catch(err) { Toast.show(err.message, 'error'); }
    };
    div.querySelector('[data-a="edit"]').onclick = e => { e.stopPropagation(); TaskEditor.open(t, _loadAndRender); };
    div.querySelector('[data-a="del"]').onclick = async e => {
      e.stopPropagation();
      div.style.transition = 'all .2s'; div.style.opacity = '0';
      setTimeout(async () => {
        try { await API.deleteTask(t.id); await _loadAndRender(); Toast.show('Task deleted'); }
        catch(err) { Toast.show(err.message, 'error'); }
      }, 180);
    };
    div.onclick = () => TaskEditor.open(t, _loadAndRender);
    return div;
  }

  function _inlineAddRow() {
    const today = Store.todayStr();
    const div = document.createElement('div');
    div.className = 'tasks-inline-add';
    div.innerHTML = `
      <input class="tia-input" id="tia-title" placeholder="Task title…" autocomplete="off">
      <input type="date" class="tia-date" id="tia-date" value="${today}">
      <select class="tia-pri" id="tia-pri">
        <option value="low">Low</option>
        <option value="normal" selected>Normal</option>
        <option value="high">High</option>
      </select>
      <button class="tia-save" id="tia-save">Add</button>
      <button class="tia-cancel" id="tia-cancel">✕</button>`;

    div.querySelector('#tia-cancel').onclick = () => { _addOpen = false; _renderList(); };
    div.querySelector('#tia-save').onclick = async () => {
      const title = div.querySelector('#tia-title').value.trim();
      const date  = div.querySelector('#tia-date').value;
      const pri   = div.querySelector('#tia-pri').value;
      if (!title || !date) { Toast.show('Title and date required', 'error'); return; }
      try {
        await API.createTask({ title, date, priority: pri, status: 'todo' });
        _addOpen = false;
        await _loadAndRender();
        Toast.show('Task added ✓', 'success');
      } catch(e) { Toast.show(e.message, 'error'); }
    };
    div.querySelector('#tia-title').addEventListener('keydown', e => {
      if (e.key === 'Enter') div.querySelector('#tia-save').click();
      if (e.key === 'Escape') { _addOpen = false; _renderList(); }
    });

    // Focus after render
    setTimeout(() => { const inp = div.querySelector('#tia-title'); if (inp) inp.focus(); }, 50);
    return div;
  }

  function _skeletonRows(n) {
    return Array.from({length: n}, () => `<div class="skel-row skeleton"></div>`).join('');
  }

  function _e(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  return { render };
})();
