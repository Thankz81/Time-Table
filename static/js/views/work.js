/* views/work.js — unified Tasks / Notes / Deadlines tab container */
'use strict';
window.WorkView = (() => {
  let _activeTab = 'tasks';
  let _initialized = false;

  const TAB_VIEWS = {
    tasks:     () => TasksView.render(),
    notes:     () => NotesView.render(),
    deadlines: () => DeadlinesView.render(),
  };

  async function render(forceTab) {
    if (forceTab) _activeTab = forceTab;

    if (!_initialized) {
      _wireTabs();
      _initialized = true;
    }

    _switchTo(_activeTab, true);
    // Re-position slider after layout settles
    requestAnimationFrame(() => {
      const activeBtn = document.querySelector(`.work-tab[data-tab="${_activeTab}"]`);
      _moveSlider(activeBtn);
    });
    _loadBadges();
  }

  function switchTab(tab) {
    _activeTab = tab;
    _switchTo(tab, true);
    _loadBadges();
  }

  function _wireTabs() {
    document.querySelectorAll('.work-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab === _activeTab) return;
        _activeTab = tab;
        _switchTo(tab, true);
        _loadBadges();
      });
    });
  }

  function _switchTo(tab, animate) {
    // Update tab buttons + slider
    const tabs = document.querySelectorAll('.work-tab');
    tabs.forEach((btn, i) => {
      const isActive = btn.dataset.tab === tab;
      btn.classList.toggle('active', isActive);
      if (isActive) _moveSlider(btn);
    });

    // Show/hide panes with slide animation
    document.querySelectorAll('.work-pane').forEach(pane => {
      const isActive = pane.id === 'view-' + tab;
      if (isActive) {
        pane.classList.remove('hidden');
        if (animate) {
          pane.classList.remove('pane-in');
          void pane.offsetWidth; // force reflow
          pane.classList.add('pane-in');
        }
      } else {
        pane.classList.add('hidden');
      }
    });

    // Render the active sub-view
    if (TAB_VIEWS[tab]) TAB_VIEWS[tab]();
  }

  function _moveSlider(activeBtn) {
    const slider = document.getElementById('wt-slider');
    if (!slider || !activeBtn) return;
    const bar = activeBtn.closest('.work-tab-bar');
    const barRect = bar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    slider.style.width  = btnRect.width + 'px';
    slider.style.left   = (btnRect.left - barRect.left) + 'px';
  }

  async function _loadBadges() {
    try {
      const today = Store.todayStr();
      const [tasksRes, notesRes, dlRes] = await Promise.all([
        API.getTasks(),
        API.getNotes(),
        API.getDeadlines(),
      ]);
      _setBadge('tasks',     (tasksRes.tasks     || []).length);
      _setBadge('notes',     (notesRes.notes     || []).length);
      _setBadge('deadlines', (dlRes.deadlines    || []).length);
    } catch(_) {}
  }

  function _setBadge(tab, count) {
    const el = document.getElementById('wt-badge-' + tab);
    if (el) { el.textContent = count; el.classList.toggle('wt-badge-zero', count === 0); }
  }

  return { render, switchTab };
})();
