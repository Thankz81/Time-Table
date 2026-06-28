/* components/clock.js — live ticking clock */
'use strict';
window.Clock = (() => {
  let _el = null, _iv = null;

  function _tick() {
    if (!_el) return;
    const n = new Date();
    const h = String(n.getHours()).padStart(2,'0');
    const m = String(n.getMinutes()).padStart(2,'0');
    const s = String(n.getSeconds()).padStart(2,'0');
    _el.innerHTML = `${h}:${m}<span class="today-clock-sec">:${s}</span>`;
  }

  function mount(el) {
    _el = el;
    _tick();
    if (_iv) clearInterval(_iv);
    _iv = setInterval(_tick, 1000);
  }

  function destroy() { if (_iv) clearInterval(_iv); _iv = null; _el = null; }

  return { mount, destroy };
})();
