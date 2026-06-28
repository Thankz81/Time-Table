/* views/calendar.js */
'use strict';
window.CalendarView = (() => {
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let _year, _month, _data = {}, _selected = null;

  function _pad(n){ return String(n).padStart(2,'0'); }
  function _fmt(y,m,d){ return `${y}-${_pad(m)}-${_pad(d)}`; }
  function _e(s){ if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function render() {
    const el = document.getElementById('view-calendar');
    el.innerHTML = `
      <div class="cal-toolbar">
        <div class="cal-toolbar-left">
          <button class="cal-nav-btn" id="cal-prev">‹</button>
          <div id="cal-month-label" class="cal-month-label"></div>
          <button class="cal-nav-btn" id="cal-next">›</button>
          <button class="cal-today-btn" id="cal-today">Today</button>
        </div>
        <div class="cal-toolbar-right">
          <div class="cal-legend">
            <span class="cal-leg"><span class="cal-leg-dot task"></span>Tasks</span>
            <span class="cal-leg"><span class="cal-leg-dot deadline"></span>Deadlines</span>
            <span class="cal-leg"><span class="cal-leg-dot note"></span>Notes</span>
          </div>
        </div>
      </div>
      <div class="cal-body">
        <div class="cal-day-names">
          ${DAYS.map(d=>`<div class="cal-dn">${d}</div>`).join('')}
        </div>
        <div class="cal-grid" id="cal-grid"></div>
      </div>`;

    document.getElementById('cal-prev').onclick  = () => { _month--; if(_month<1){_month=12;_year--;} _buildGrid(); _loadData(); };
    document.getElementById('cal-next').onclick  = () => { _month++; if(_month>12){_month=1;_year++;} _buildGrid(); _loadData(); };
    document.getElementById('cal-today').onclick = () => { const n=new Date();_year=n.getFullYear();_month=n.getMonth()+1; _buildGrid(); _loadData(); };

    const n = new Date(); _year = n.getFullYear(); _month = n.getMonth()+1;
    _buildGrid();
    _loadData();
  }

  function _buildGrid() {
    document.getElementById('cal-month-label').textContent = `${MONTHS[_month-1]} ${_year}`;
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    const n = new Date();
    const todayStr   = _fmt(n.getFullYear(), n.getMonth()+1, n.getDate());
    const firstDow   = new Date(_year, _month-1, 1).getDay();
    const dim        = new Date(_year, _month, 0).getDate();
    const prevDim    = new Date(_year, _month-1, 0).getDate();

    // Previous month overflow
    for (let i = firstDow-1; i >= 0; i--) {
      const pm = _month===1 ? 12 : _month-1;
      const py = _month===1 ? _year-1 : _year;
      grid.appendChild(_cell(_fmt(py,pm,prevDim-i), prevDim-i, true, todayStr));
    }
    // Current month
    for (let d = 1; d <= dim; d++) grid.appendChild(_cell(_fmt(_year,_month,d), d, false, todayStr));
    // Next month overflow
    const total = firstDow + dim;
    const trail = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= trail; d++) {
      const nm = _month===12 ? 1 : _month+1;
      const ny = _month===12 ? _year+1 : _year;
      grid.appendChild(_cell(_fmt(ny,nm,d), d, true, todayStr));
    }
    _paintCells();
  }

  function _cell(ds, day, other, todayStr) {
    const el = document.createElement('div');
    el.className = 'cal-cell' + (other?' other-month':'') + (ds===todayStr?' today':'') + (ds===_selected?' selected':'');
    el.dataset.date = ds;
    el.innerHTML = `
      <div class="cal-cell-header">
        <span class="cal-day-num">${day}</span>
        <button class="cal-cell-add" title="Add to ${ds}">+</button>
      </div>
      <div class="cal-cell-items" id="ccitems-${ds}"></div>`;

    el.onclick = e => {
      if (e.target.classList.contains('cal-cell-add')) return;
      document.querySelectorAll('.cal-cell.selected').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected'); _selected = ds;
      Panel.open(ds, () => { _loadData(); });
    };
    el.querySelector('.cal-cell-add').onclick = e => {
      e.stopPropagation();
      document.querySelectorAll('.cal-cell.selected').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected'); _selected = ds;
      Panel.open(ds, () => { _loadData(); });
    };
    return el;
  }

  async function _loadData() {
    try {
      // Load summary for dots, then load full day data for visible cells
      const summary = await API.summary(_year, _month);
      _data = summary;
      _paintCells();

      // Load full item data for each date that has content
      const datesWithContent = Object.keys(summary).filter(d => {
        const s = summary[d];
        return s.tasks || s.notes || s.deadlines;
      });

      await Promise.all(datesWithContent.map(async date => {
        try {
          const dayData = await API.day(date);
          _data[date] = { ...summary[date], items: dayData };
          _paintCell(date);
        } catch(_) {}
      }));
    } catch(_) {}
  }

  function _paintCells() {
    Object.keys(_data).forEach(date => _paintCell(date));
  }

  function _paintCell(date) {
    const container = document.getElementById(`ccitems-${date}`);
    if (!container) return;
    container.innerHTML = '';

    const entry = _data[date];
    if (!entry) return;

    const items = entry.items;
    if (!items) {
      // Just show dots while loading
      if (entry.tasks)     container.insertAdjacentHTML('beforeend', '<span class="cal-dot-pill task-pill">…tasks</span>');
      if (entry.deadlines) container.insertAdjacentHTML('beforeend', '<span class="cal-dot-pill dl-pill">…deadlines</span>');
      if (entry.notes)     container.insertAdjacentHTML('beforeend', '<span class="cal-dot-pill note-pill">…notes</span>');
      return;
    }

    let shown = 0;
    const MAX = 3; // max chips per cell before +N more

    // Deadlines first (most time-sensitive)
    (items.deadlines || []).forEach(d => {
      if (shown >= MAX) return;
      const chip = document.createElement('div');
      chip.className = 'cal-chip cal-chip-dl' + (d.urgent ? ' urgent' : '');
      chip.title = d.title + (d.time ? ` @ ${d.time}` : '');
      chip.innerHTML = `<span class="cch-icon">⚑</span><span class="cch-text">${_e(d.title)}</span>${d.time?`<span class="cch-time">${d.time}</span>`:''}`;
      chip.onclick = e => { e.stopPropagation(); Preview.openDeadline(d, () => _loadData()); };
      container.appendChild(chip);
      shown++;
    });

    // Tasks
    (items.tasks || []).forEach(t => {
      if (shown >= MAX) return;
      const chip = document.createElement('div');
      chip.className = `cal-chip cal-chip-task status-${t.status}${t.bg_color ? ' tc-'+t.bg_color : ''}`;
      chip.title = t.title;
      // Apply bg_color tint + font_color
      if (t.bg_color) {
        const TINTS = {yellow:'rgba(245,158,11,.18)',green:'rgba(62,207,142,.18)',blue:'rgba(96,165,250,.18)',pink:'rgba(244,114,182,.18)',purple:'rgba(167,139,250,.18)'};
        const BORDERS = {yellow:'rgba(245,158,11,.5)',green:'rgba(62,207,142,.5)',blue:'rgba(96,165,250,.5)',pink:'rgba(244,114,182,.5)',purple:'rgba(167,139,250,.5)'};
        const COLORS  = {yellow:'#f59e0b',green:'#3ecf8e',blue:'#60a5fa',pink:'#f472b6',purple:'#a78bfa'};
        chip.style.background   = TINTS[t.bg_color]  || '';
        chip.style.borderLeftColor = BORDERS[t.bg_color] || '';
        chip.style.color        = t.font_color || COLORS[t.bg_color] || '';
      } else if (t.font_color) {
        chip.style.color = t.font_color;
      }
      chip.innerHTML = `<span class="cch-check${t.status==='done'?' done':''}"></span><span class="cch-text">${_e(t.title)}</span>`;
      chip.onclick = e => { e.stopPropagation(); Preview.openTask(t, () => _loadData()); };
      container.appendChild(chip);
      shown++;
    });

    // Notes
    (items.notes || []).forEach(n => {
      if (shown >= MAX) return;
      const chip = document.createElement('div');
      chip.className = `cal-chip cal-chip-note nc-${n.color}`;
      const preview = _stripHTML(n.content).slice(0, 22);
      chip.title = n.title || preview;
      // Apply note color tint
      if (n.color && n.color !== 'default') {
        const NC_TINTS  = {yellow:'rgba(245,158,11,.15)',green:'rgba(62,207,142,.15)',blue:'rgba(96,165,250,.15)',pink:'rgba(244,114,182,.15)'};
        const NC_COLORS = {yellow:'#f59e0b',green:'#3ecf8e',blue:'#60a5fa',pink:'#f472b6'};
        chip.style.background      = NC_TINTS[n.color]  || '';
        chip.style.borderLeftColor = n.font_color || NC_COLORS[n.color] || '';
        chip.style.color           = n.font_color || NC_COLORS[n.color] || '';
      } else if (n.font_color) {
        chip.style.color = n.font_color;
      }
      chip.innerHTML = `<span class="cch-icon">✎</span><span class="cch-text">${_e(n.title || preview)}</span>`;
      chip.onclick = e => { e.stopPropagation(); Preview.openNote(n, () => _loadData()); };
      container.appendChild(chip);
      shown++;
    });

    // Overflow badge
    const total = (items.tasks||[]).length + (items.deadlines||[]).length + (items.notes||[]).length;
    if (total > MAX) {
      const more = document.createElement('div');
      more.className = 'cal-chip cal-chip-more';
      more.textContent = `+${total - MAX} more`;
      more.onclick = e => { e.stopPropagation(); Panel.open(date, () => _loadData()); };
      container.appendChild(more);
    }
  }

  function _stripHTML(s){ const d=document.createElement('div'); d.innerHTML=s||''; return d.textContent||''; }

  return { render };
})();
