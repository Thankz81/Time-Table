/* views/notes.js */
'use strict';
window.NotesView = (() => {
  let _notes = [], _colorFilter = 'all';

  async function render() {
    const el = document.getElementById('view-notes');
    el.innerHTML = `
      <div class="notes-filterbar">
        <div class="ncf-pills">
          <button class="ncf-all-btn active" id="ncf-all">All</button>
          <div class="ncf-dot-btn cp-default" data-color="default" title="Default" style="background:#9090a8"></div>
          <div class="ncf-dot-btn cp-yellow"  data-color="yellow"  title="Yellow"  style="background:#f59e0b"></div>
          <div class="ncf-dot-btn cp-green"   data-color="green"   title="Green"   style="background:#3ecf8e"></div>
          <div class="ncf-dot-btn cp-blue"    data-color="blue"    title="Blue"    style="background:#60a5fa"></div>
          <div class="ncf-dot-btn cp-pink"    data-color="pink"    title="Pink"    style="background:#f472b6"></div>
        </div>
        <button class="notes-add-btn" id="notes-add">＋ New Note</button>
      </div>
      <div class="notes-grid-wrap">
        <div class="notes-grid" id="notes-grid"></div>
      </div>`;

    document.getElementById('notes-add').onclick = () => NoteEditor.open(null, _loadAndRender);
    document.getElementById('ncf-all').onclick = () => _setFilter('all');
    el.querySelectorAll('.ncf-dot-btn').forEach(b => { b.onclick = () => _setFilter(b.dataset.color); });

    await _loadAndRender();
  }

  function _setFilter(c) {
    _colorFilter = c;
    const allBtn = document.getElementById('ncf-all');
    if (allBtn) allBtn.classList.toggle('active', c === 'all');
    document.querySelectorAll('.ncf-dot-btn').forEach(b => b.classList.toggle('active', b.dataset.color === c));
    _renderGrid();
  }

  async function _loadAndRender() {
    try { const { notes } = await API.getNotes(); _notes = notes; _renderGrid(); }
    catch(e) { Toast.show(e.message, 'error'); }
  }

  function _renderGrid() {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;
    const filtered = _colorFilter === 'all' ? _notes : _notes.filter(n => n.color === _colorFilter);
    grid.innerHTML = '';
    if (!filtered.length) {
      grid.innerHTML = `<div class="notes-empty" style="grid-column:1/-1"><div class="notes-empty-icon">✎</div><div>No notes yet — create one!</div></div>`;
      return;
    }
    filtered.forEach(n => {
      const card = document.createElement('div');
      card.className = `note-card nc-${n.color}`;
      if (n.font_color) card.style.color = n.font_color;
      const preview = _strip(n.content).slice(0, 120);
      const thumb = _firstImage(n.content);
      card.innerHTML = `
        ${n.title ? `<div class="nc-title" style="${n.font_color?'color:inherit':''}">${_e(n.title)}</div>` : ''}
        ${thumb ? `<img class="nc-thumb" src="${thumb}" alt="">` : ''}
        <div class="nc-preview" style="${n.font_color?'color:inherit':''}">${_e(preview)}${preview.length === 120 ? '…' : ''}</div>
        <div class="nc-footer">
          <span class="nc-date">${n.date}</span>
          <button class="nc-del" data-id="${n.id}" title="Delete">✕</button>
        </div>`;
      card.onclick = () => NoteEditor.open(n, _loadAndRender);
      card.querySelector('.nc-del').onclick = async e => {
        e.stopPropagation();
        card.style.transition = 'all .18s'; card.style.opacity = '0'; card.style.transform = 'scale(.94)';
        setTimeout(async () => {
          try { await API.deleteNote(n.id); await _loadAndRender(); Toast.show('Note deleted'); }
          catch(err) { Toast.show(err.message, 'error'); }
        }, 170);
      };
      grid.appendChild(card);
    });
  }

  function _e(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _strip(s) { const d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent || ''; }
  function _firstImage(s) { const d = document.createElement('div'); d.innerHTML = s || ''; const img = d.querySelector('img'); return img ? img.src : null; }

  return { render };
})();
