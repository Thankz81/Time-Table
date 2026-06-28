/* router.js — hash-based SPA router */
'use strict';
window.Router = (() => {
  const routes = {};
  let _current = null;

  function on(path, fn) { routes[path] = fn; }

  function navigate(path, force) {
    if (force && _current === path) { _current = null; }
    window.location.hash = '#/' + path;
  }

  function _resolve() {
    const hash  = window.location.hash.replace('#/', '') || 'today';
    const path  = hash.split('/')[0];
    const route = routes[path] || routes['today'];
    if (_current === path) return;
    _current = path;

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const view = document.getElementById('view-' + path);
    if (view) view.classList.remove('hidden');

    // Update sidebar active state
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.sb-link[data-route="${path}"]`);
    if (link) link.classList.add('active');

    // Update topbar nav pills active state
    document.querySelectorAll('.tb-nav-pill').forEach(l => l.classList.remove('active'));
    const tbPill = document.querySelector(`.tb-nav-pill[data-route="${path}"]`);
    if (tbPill) tbPill.classList.add('active');

    // Update topbar title
    const titles = { today:'Today', calendar:'Calendar', work:'My Work', tasks:'My Work', notes:'My Work', deadlines:'My Work' };
    const tb = document.getElementById('topbar-title');
    if (tb) tb.textContent = titles[path] || path;

    if (route) route();
  }

  function init() {
    window.addEventListener('hashchange', _resolve);
    _resolve();
  }

  function current() { return _current; }

  return { on, navigate, init, current };
})();
