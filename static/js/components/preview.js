/* components/preview.js — shared preview card (centred modal) */
'use strict';
window.Preview = (() => {
  let _type = null, _item = null, _onChanged = null;

  // bg_color name → hex tint (matches .tc-* / .nc-* card colors)
  const BG_TINTS = {
    yellow: { bg: 'rgba(245,158,11,.13)', border: 'rgba(245,158,11,.35)', accent: '#f59e0b' },
    green:  { bg: 'rgba(62,207,142,.13)', border: 'rgba(62,207,142,.35)', accent: '#3ecf8e' },
    blue:   { bg: 'rgba(96,165,250,.13)', border: 'rgba(96,165,250,.35)', accent: '#60a5fa' },
    pink:   { bg: 'rgba(244,114,182,.13)',border: 'rgba(244,114,182,.35)',accent: '#f472b6' },
    purple: { bg: 'rgba(167,139,250,.13)',border: 'rgba(167,139,250,.35)',accent: '#a78bfa' },
    default:{ bg: 'rgba(62,207,142,.10)', border: 'rgba(62,207,142,.25)', accent: '#3ecf8e' },
  };

  /* ── Public API ── */
  function openTask(task, onChanged)     { _show('task',     task, onChanged); }
  function openNote(note, onChanged)     { _show('note',     note, onChanged); }
  function openDeadline(dl, onChanged)   { _show('deadline', dl,   onChanged); }

  function close() {
    const bd = document.getElementById('preview-backdrop');
    bd.classList.remove('shown');
    setTimeout(() => { bd.classList.add('hidden'); _type = null; _item = null; }, 240);
  }

  /* ── Internal ── */
  function _show(type, item, onChanged) {
    _type = type; _item = item; _onChanged = onChanged;
    _render(type, item);
    const bd = document.getElementById('preview-backdrop');
    bd.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('shown')));
  }

  function _render(type, item) {
    const header  = document.getElementById('preview-header');
    const iconEl  = document.getElementById('preview-icon-badge');
    const titleEl = document.getElementById('preview-title');
    const metaEl  = document.getElementById('preview-meta-chips');
    const bodyEl  = document.getElementById('preview-body');
    const statusBtn = document.getElementById('preview-status-toggle');
    const delBtn    = document.getElementById('preview-delete');

    // Reset header styles
    header.style.background = '';
    header.style.borderColor = '';
    titleEl.style.color = '';
    titleEl.style.textDecoration = '';
    iconEl.style.background = 'var(--bg-elevated)';
    iconEl.style.color = '';
    iconEl.style.borderColor = '';
    bodyEl.innerHTML = '';
    metaEl.innerHTML = '';
    statusBtn.classList.add('hidden');

    if (type === 'task')         _renderTask(item,     header, iconEl, titleEl, metaEl, bodyEl, statusBtn, delBtn);
    else if (type === 'note')    _renderNote(item,     header, iconEl, titleEl, metaEl, bodyEl, delBtn);
    else                         _renderDeadline(item, header, iconEl, titleEl, metaEl, bodyEl, delBtn);
  }

  /* ── Task ── */
  function _renderTask(t, header, iconEl, titleEl, metaEl, bodyEl, statusBtn, delBtn) {
    const isDone = t.status === 'done';
    const tint   = BG_TINTS[t.bg_color] || null;

    // Header tint from bg_color
    if (tint) {
      header.style.background   = tint.bg;
      header.style.borderColor  = tint.border;
    }

    iconEl.textContent  = isDone ? '✓' : '○';
    iconEl.style.color  = tint ? tint.accent : (isDone ? 'var(--success)' : 'var(--accent)');
    if (tint) { iconEl.style.background = tint.bg; iconEl.style.borderColor = tint.border; }

    titleEl.textContent = t.title;
    if (t.font_color)  titleEl.style.color = t.font_color;
    if (isDone)        titleEl.style.textDecoration = 'line-through';

    metaEl.innerHTML = `
      <span class="pv-chip status-${t.status}">${t.status}</span>
      <span class="pv-chip pri-${t.priority}">${t.priority}</span>
      <span class="pv-chip">📅 ${t.date}${t.time ? ' · '+t.time : ''}</span>
      ${t.recur_id ? '<span class="pv-chip recur">↻ recurring</span>' : ''}`;

    if (t.description && t.description.replace(/<[^>]*>/g,'').trim()) {
      const sec = document.createElement('div');
      sec.innerHTML = `<div class="pv-section-label">Description</div><div class="pv-desc">${t.description}</div>`;
      bodyEl.appendChild(sec);
    } else {
      const thumb = _firstImage(t.description);
      if (thumb) { const img = document.createElement('img'); img.className='pv-thumb'; img.src=thumb; img.alt=''; bodyEl.appendChild(img); }
    }

    statusBtn.classList.remove('hidden');
    statusBtn.textContent = isDone ? '↩ Mark To Do' : '✓ Mark Done';
    statusBtn.onclick = async () => {
      try {
        await API.patchTaskStatus(t.id, isDone ? 'todo' : 'done');
        Toast.show(isDone ? 'Marked to do' : 'Marked done ✓', 'success');
        close(); if (_onChanged) _onChanged();
      } catch(e) { Toast.show(e.message,'error'); }
    };

    delBtn.onclick = async () => {
      if (!confirm(`Delete "${t.title}"?`)) return;
      if (t.recur_id) {
        const all = confirm('Delete all recurring instances?\nOK = all   Cancel = just this one');
        try { await API.deleteTask(t.id, all?'all':'one'); } catch(e) { Toast.show(e.message,'error'); return; }
      } else {
        try { await API.deleteTask(t.id); } catch(e) { Toast.show(e.message,'error'); return; }
      }
      Toast.show('Task deleted'); close(); if (_onChanged) _onChanged();
    };
    document.getElementById('preview-edit').onclick = () => { close(); TaskEditor.open(t, _onChanged); };
  }

  /* ── Note ── */
  function _renderNote(n, header, iconEl, titleEl, metaEl, bodyEl, delBtn) {
    const tint = BG_TINTS[n.color] || null;

    if (tint) {
      header.style.background  = tint.bg;
      header.style.borderColor = tint.border;
    }

    iconEl.textContent = '✎';
    iconEl.style.color = tint ? tint.accent : 'var(--note-c)';
    if (tint) { iconEl.style.background = tint.bg; iconEl.style.borderColor = tint.border; }

    titleEl.textContent = n.title || _strip(n.content).slice(0,50) || 'Note';
    if (n.font_color) titleEl.style.color = n.font_color;
    else if (tint)    titleEl.style.color = tint.accent;

    metaEl.innerHTML = `<span class="pv-chip">📅 ${n.date}</span>
      ${n.color && n.color !== 'default' ? `<span class="pv-chip" style="background:${tint?tint.bg:'var(--bg-hover)'};color:${tint?tint.accent:'var(--tx3)'};border:1px solid ${tint?tint.border:'transparent'}">${n.color}</span>` : ''}`;

    const thumb = _firstImage(n.content);
    if (thumb) { const img = document.createElement('img'); img.className='pv-thumb'; img.src=thumb; img.alt=''; bodyEl.appendChild(img); }
    if (n.content) {
      const sec = document.createElement('div');
      sec.innerHTML = `<div class="pv-note-preview">${n.content}</div>`;
      bodyEl.appendChild(sec);
    }

    delBtn.onclick = async () => {
      if (!confirm('Delete this note?')) return;
      try { await API.deleteNote(n.id); Toast.show('Note deleted'); close(); if (_onChanged) _onChanged(); }
      catch(e) { Toast.show(e.message,'error'); }
    };
    document.getElementById('preview-edit').onclick = () => { close(); NoteEditor.open(n, _onChanged); };
  }

  /* ── Deadline ── */
  function _renderDeadline(d, header, iconEl, titleEl, metaEl, bodyEl, delBtn) {
    if (d.urgent) {
      header.style.background  = 'rgba(248,113,113,.10)';
      header.style.borderColor = 'rgba(248,113,113,.30)';
    }

    iconEl.textContent = '⚑';
    iconEl.style.color = 'var(--dl-c)';
    if (d.urgent) { iconEl.style.background = 'var(--danger-dim)'; iconEl.style.borderColor = 'rgba(248,113,113,.4)'; }

    titleEl.textContent = d.title;
    if (d.urgent) titleEl.style.color = 'var(--dl-c)';

    metaEl.innerHTML = `
      <span class="pv-chip">📅 ${d.date}${d.time?' · '+d.time:''}</span>
      ${d.urgent ? '<span class="pv-chip urgent">⚠ URGENT</span>' : ''}`;

    const { text, cls } = _dlCountdown(d);
    const cd = document.createElement('div');
    cd.className = `pv-dl-countdown ${cls}`;
    cd.textContent = text;
    bodyEl.appendChild(cd);

    delBtn.onclick = async () => {
      if (!confirm(`Delete "${d.title}"?`)) return;
      try { await API.deleteDeadline(d.id); Toast.show('Deadline deleted'); close(); if (_onChanged) _onChanged(); }
      catch(e) { Toast.show(e.message,'error'); }
    };
    document.getElementById('preview-edit').onclick = () => { close(); Panel.open(d.date, _onChanged); };
  }

  /* ── Helpers ── */
  function _dlCountdown(d) {
    const today = Store.todayStr(), now = new Date();
    const dDate = new Date(d.date+'T00:00:00');
    const diffDays = Math.ceil((dDate - new Date(today+'T00:00:00')) / 86400000);
    if (diffDays < 0)   return { text:`${-diffDays} day${-diffDays===1?'':'s'} overdue`, cls:'overdue' };
    if (diffDays === 0) {
      if (d.time) {
        const [hh,mm] = d.time.split(':').map(Number);
        const diff = new Date(now.getFullYear(),now.getMonth(),now.getDate(),hh,mm).getTime() - now.getTime();
        if (diff < 0)         return { text:'Overdue', cls:'overdue' };
        if (diff < 3600000)   return { text:`${Math.ceil(diff/60000)} min left`, cls:'today' };
        return { text:`${Math.ceil(diff/3600000)}h left today`, cls:'today' };
      }
      return { text:'Due today', cls:'today' };
    }
    if (diffDays <= 3) return { text:`${diffDays} day${diffDays===1?'':'s'} left`, cls:'soon' };
    return { text:`${diffDays} days left`, cls:'' };
  }

  function _firstImage(s) { const d=document.createElement('div');d.innerHTML=s||'';const i=d.querySelector('img');return i?i.src:null; }
  function _strip(s)       { const d=document.createElement('div');d.innerHTML=s||'';return d.textContent||''; }

  function _init() {
    document.getElementById('preview-close').onclick = close;
    document.getElementById('preview-backdrop').onclick = e => {
      if (e.target === document.getElementById('preview-backdrop')) close();
    };
  }

  return { openTask, openNote, openDeadline, close, _init };
})();
