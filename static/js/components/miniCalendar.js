/* components/miniCalendar.js — floating widget */
'use strict';
window.MiniCalendar = (() => {
  const DAYS   = ['S','M','T','W','T','F','S'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let _year, _month, _summary = {}, _onSelect = null, _open = false;

  function _pad(n){ return String(n).padStart(2,'0'); }
  function _fmt(y,m,d){ return `${y}-${_pad(m)}-${_pad(d)}`; }

  /* Called once on boot — creates the floating widget DOM */
  function init(onSelect) {
    _onSelect = onSelect;
    const n = new Date();
    _year = n.getFullYear(); _month = n.getMonth()+1;

    // Create widget if not already there
    if (document.getElementById('cal-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'cal-widget';
    widget.innerHTML = `
      <div class="cw-toggle" id="cw-toggle" title="Calendar">
        <span class="cw-toggle-icon">📅</span>
        <span class="cw-toggle-label" id="cw-toggle-label"></span>
        <span class="cw-dot-row" id="cw-dot-summary"></span>
      </div>
      <div class="cw-body hidden-off" id="cw-body">
        <div class="cw-header">
          <button class="cw-nav" id="cw-prev">‹</button>
          <span class="cw-month" id="cw-month"></span>
          <button class="cw-nav" id="cw-next">›</button>
          <button class="cw-today-dot" id="cw-go-today" title="Go to today">◉</button>
        </div>
        <div class="cw-grid" id="cw-grid"></div>
        <div class="cw-legend">
          <span class="cw-leg"><span class="cw-leg-dot" style="background:var(--task-c)"></span>Tasks</span>
          <span class="cw-leg"><span class="cw-leg-dot" style="background:var(--dl-c)"></span>Deadlines</span>
          <span class="cw-leg"><span class="cw-leg-dot" style="background:var(--note-c)"></span>Notes</span>
        </div>
      </div>`;
    document.body.appendChild(widget);

    document.getElementById('cw-toggle').onclick = _toggleOpen;
    document.getElementById('cw-prev').onclick   = e => { e.stopPropagation(); _month--; if(_month<1){_month=12;_year--;} _render(); _loadSummary(); };
    document.getElementById('cw-next').onclick   = e => { e.stopPropagation(); _month++; if(_month>12){_month=1;_year++;} _render(); _loadSummary(); };
    document.getElementById('cw-go-today').onclick = e => {
      e.stopPropagation();
      const n = new Date(); _year = n.getFullYear(); _month = n.getMonth()+1;
      _render(); _loadSummary();
    };

    // Close on outside click
    document.addEventListener('click', e => {
      const w = document.getElementById('cal-widget');
      if (_open && w && !w.contains(e.target)) _close();
    });

    _render();
    _loadSummary();
    _updateToggleLabel();
  }

  /* Legacy: mount() was called from Today view — keep as no-op so Today renders cleanly */
  function mount(container, onSelect) {
    if (container) container.innerHTML = '';
    if (onSelect) _onSelect = onSelect;
  }

  function _toggleOpen() {
    if (_open) { _close(); return; }
    _open = true;
    const body   = document.getElementById('cw-body');
    const widget = document.getElementById('cal-widget');
    if (!body || !widget) return;
    // Remove hidden, force reflow, then animate in
    body.classList.remove('hidden-off');
    void body.offsetWidth;
    body.classList.add('open');
    widget.classList.add('cw-expanded');
  }

  function _close() {
    _open = false;
    const body   = document.getElementById('cw-body');
    const widget = document.getElementById('cal-widget');
    if (!body || !widget) return;
    // Start fade+scale out
    body.classList.add('closing');
    body.classList.remove('open');
    // After transition ends, hide completely so toggle sits at bottom-right
    setTimeout(() => {
      body.classList.remove('closing');
      body.classList.add('hidden-off');
    }, 280);
    // Pill bounce
    widget.classList.remove('cw-expanded');
    widget.classList.add('cw-closing');
    setTimeout(() => widget.classList.remove('cw-closing'), 300);
  }

  function _updateToggleLabel() {
    const n = new Date();
    const lbl = document.getElementById('cw-toggle-label');
    if (lbl) lbl.textContent = `${n.getDate()} ${MONTHS[n.getMonth()]}`;
  }

  function _render() {
    const monthEl = document.getElementById('cw-month');
    if (monthEl) monthEl.textContent = `${MONTHS_FULL[_month-1]} ${_year}`;

    const grid = document.getElementById('cw-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Day headers
    DAYS.forEach(d => {
      const h = document.createElement('div');
      h.className = 'cw-dh'; h.textContent = d;
      grid.appendChild(h);
    });

    const n = new Date();
    const todayStr  = _fmt(n.getFullYear(), n.getMonth()+1, n.getDate());
    const firstDow  = new Date(_year, _month-1, 1).getDay();
    const dim       = new Date(_year, _month, 0).getDate();
    const prevDim   = new Date(_year, _month-1, 0).getDate();

    // Prev month overflow
    for (let i = firstDow-1; i >= 0; i--) {
      const pm = _month===1?12:_month-1, py = _month===1?_year-1:_year;
      const cell = _makeCell(_fmt(py,pm,prevDim-i), prevDim-i, true, todayStr);
      grid.appendChild(cell);
    }
    // Current month
    for (let d = 1; d <= dim; d++) {
      grid.appendChild(_makeCell(_fmt(_year,_month,d), d, false, todayStr));
    }
    // Next month overflow
    const trail = (firstDow + dim) % 7;
    if (trail > 0) {
      for (let d = 1; d <= 7-trail; d++) {
        const nm = _month===12?1:_month+1, ny = _month===12?_year+1:_year;
        grid.appendChild(_makeCell(_fmt(ny,nm,d), d, true, todayStr));
      }
    }

    _paintDots();
  }

  function _makeCell(ds, day, other, todayStr) {
    const el = document.createElement('div');
    el.className = 'cw-cell' + (other?' cw-other':'') + (ds===todayStr?' cw-today':'');
    el.dataset.date = ds;
    el.innerHTML = `<span class="cw-day-num">${day}</span><div class="cw-dots" id="cwdots-${ds}"></div>`;
    if (!other) {
      el.onclick = e => {
        e.stopPropagation();
        document.querySelectorAll('.cw-cell.cw-selected').forEach(c => c.classList.remove('cw-selected'));
        el.classList.add('cw-selected');
        if (_onSelect) _onSelect(ds);
        _close();
      };
    }
    return el;
  }

  async function _loadSummary() {
    try {
      _summary = await API.summary(_year, _month);
      _paintDots();
      _updateDotSummary();
    } catch(_) {}
  }

  function _paintDots() {
    Object.entries(_summary).forEach(([date, info]) => {
      const el = document.getElementById(`cwdots-${date}`);
      if (!el) return;
      el.innerHTML = '';
      if (info.tasks)     el.insertAdjacentHTML('beforeend','<span class="cw-dot cw-dot-task"></span>');
      if (info.deadlines) el.insertAdjacentHTML('beforeend','<span class="cw-dot cw-dot-dl"></span>');
      if (info.notes)     el.insertAdjacentHTML('beforeend','<span class="cw-dot cw-dot-note"></span>');
    });
  }

  function _updateDotSummary() {
    // Show today's dot summary in toggle button
    const today = _fmt(new Date().getFullYear(), new Date().getMonth()+1, new Date().getDate());
    const info  = _summary[today] || {};
    const row   = document.getElementById('cw-dot-summary');
    if (!row) return;
    row.innerHTML = '';
    if (info.tasks)     row.insertAdjacentHTML('beforeend','<span class="cw-dot cw-dot-task"></span>');
    if (info.deadlines) row.insertAdjacentHTML('beforeend','<span class="cw-dot cw-dot-dl"></span>');
    if (info.notes)     row.insertAdjacentHTML('beforeend','<span class="cw-dot cw-dot-note"></span>');
  }

  function refresh() { _loadSummary(); }

  return { init, mount, refresh };
})();
