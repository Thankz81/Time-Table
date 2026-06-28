/* components/panel.js — slide-in day panel */
'use strict';
window.Panel = (() => {
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
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
    document.querySelectorAll('.padd-form').forEach(f=>f.classList.add('hidden'));
    document.querySelectorAll('.padd-btn').forEach(b=>b.classList.remove('open'));
    _load(date, isToday);
  }

  function close() {
    document.getElementById('day-panel').classList.remove('is-open');
    const ov=document.getElementById('overlay');
    ov.classList.remove('shown'); setTimeout(()=>ov.classList.remove('visible'),280);
    _date=null;
  }

  async function _load(date, isToday) {
    try { const data=await API.day(date); _render(data,isToday); }
    catch(e){ Toast.show('Failed to load day','error'); }
  }

  async function refresh() {
    if(!_date) return;
    await _load(_date, _date===Store.todayStr());
  }

  function _render(data, isToday) {
    _renderTasks(data.tasks); _renderDeadlines(data.deadlines); _renderNotes(data.notes);
    _updateProgress(data.tasks); _updateStrip(data.tasks, isToday);
    if(_onChanged) _onChanged(_date, data);
  }

  function _updateProgress(tasks) {
    const wrap=document.getElementById('progress-bar-wrap');
    if(!tasks.length){wrap.classList.add('hidden');return;}
    wrap.classList.remove('hidden');
    const done=tasks.filter(t=>t.status==='done').length, pct=Math.round(done/tasks.length*100);
    document.getElementById('prog-label').textContent=`${done}/${tasks.length} tasks done`;
    document.getElementById('prog-pct').textContent=pct+'%';
    setTimeout(()=>{document.getElementById('prog-fill').style.width=pct+'%';},50);
  }

  function _updateStrip(tasks, isToday) {
    const strip=document.getElementById('today-strip');
    if(!isToday){strip.classList.add('hidden');return;}
    strip.classList.remove('hidden');
    _animNum('ts-todo',tasks.filter(t=>t.status==='todo').length);
    _animNum('ts-prog',tasks.filter(t=>t.status==='in-progress').length);
    _animNum('ts-done',tasks.filter(t=>t.status==='done').length);
  }

  function _renderTasks(tasks) {
    const list=document.getElementById('panel-task-list'); list.innerHTML='';
    if(!tasks.length){list.innerHTML='<li class="empty-msg">No tasks yet</li>';return;}
    tasks.forEach(t=>list.appendChild(_taskRow(t)));
  }

  function _taskRow(t) {
    const li=document.createElement('li'); li.className=`pitem priority-${t.priority}`;
    li.innerHTML=`<div class="pitem-content">
      <div class="pitem-title${t.status==='done'?' done':''}">${_e(t.title)}</div>
      <div class="pitem-meta"><span class="badge b-${t.status}">${t.status}</span><span class="badge b-${t.priority}">${t.priority}</span></div>
    </div>
    <div class="pitem-actions">
      <button class="ia-btn" title="Edit" data-a="edit">✎</button>
      <button class="ia-btn del" title="Delete" data-a="del">✕</button>
    </div>`;
    li.querySelector('[data-a="edit"]').onclick=()=>TaskEditor.open(t, refresh);
    li.querySelector('[data-a="del"]').onclick=()=>_delItem(li,()=>API.deleteTask(t.id));
    return li;
  }

  function _renderDeadlines(deadlines) {
    const list=document.getElementById('panel-deadline-list'); list.innerHTML='';
    if(!deadlines.length){list.innerHTML='<li class="empty-msg">No deadlines yet</li>';return;}
    deadlines.forEach(d=>list.appendChild(_dlRow(d)));
  }

  function _dlRow(d) {
    const li=document.createElement('li'); li.className='pitem';
    li.innerHTML=`<div class="pitem-content">
      <div class="pitem-title">${_e(d.title)}</div>
      <div class="pitem-meta">
        ${d.time?`<span class="pitem-time">🕐 ${d.time}</span>`:''}
        ${d.urgent?'<span class="badge b-urgent">URGENT</span>':''}
      </div>
    </div>
    <div class="pitem-actions">
      <button class="ia-btn del" title="Delete" data-a="del">✕</button>
    </div>`;
    li.querySelector('[data-a="del"]').onclick=()=>_delItem(li,()=>API.deleteDeadline(d.id));
    return li;
  }

  function _renderNotes(notes) {
    const list=document.getElementById('panel-note-list'); list.innerHTML='';
    if(!notes.length){list.innerHTML='<li class="empty-msg">No notes yet</li>';return;}
    notes.forEach(n=>list.appendChild(_noteRow(n)));
  }

  function _noteRow(n) {
    const li=document.createElement('li'); li.className=`pitem nc-${n.color}`;
    const preview=_stripHTML(n.content).slice(0,80);
    li.innerHTML=`<div class="pitem-content">
      ${n.title?`<div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:3px">${_e(n.title)}</div>`:''}
      <div class="pitem-title">${_e(preview)}${preview.length===80?'…':''}</div>
    </div>
    <div class="pitem-actions">
      <button class="ia-btn" title="Edit" data-a="edit">✎</button>
      <button class="ia-btn del" title="Delete" data-a="del">✕</button>
    </div>`;
    li.querySelector('[data-a="edit"]').onclick=()=>NoteEditor.open(n, refresh);
    li.querySelector('[data-a="del"]').onclick=()=>_delItem(li,()=>API.deleteNote(n.id));
    return li;
  }

  function _delItem(li, apiFn) {
    li.classList.add('removing');
    setTimeout(async()=>{ try{await apiFn(); await refresh();}catch(e){Toast.show(e.message,'error');} }, 220);
  }

  function _e(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
  function _stripHTML(s){const tmp=document.createElement('div');tmp.innerHTML=s||'';return tmp.textContent||''}
  function _animNum(id,target){const el=document.getElementById(id);if(!el)return;const start=parseInt(el.textContent)||0;if(start===target)return;let i=0;const iv=setInterval(()=>{i++;el.textContent=Math.round(start+(target-start)*(i/20));if(i>=20)clearInterval(iv);},16)}

  function getDate() { return _date; }

  return { open, close, refresh, getDate };
})();
