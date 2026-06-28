/* store.js — shared app state */
'use strict';
window.Store = (() => {
  let _user = null;
  const _listeners = {};

  function on(event, fn) {
    (_listeners[event] = _listeners[event] || []).push(fn);
  }
  function emit(event, data) {
    (_listeners[event] || []).forEach(fn => fn(data));
  }

  function setUser(u) { _user = u; emit('user', u); }
  function getUser()  { return _user; }

  function todayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  }

  return { on, emit, setUser, getUser, todayStr };
})();
