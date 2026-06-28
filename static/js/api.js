/* api.js */
'use strict';
window.API = (() => {
  async function req(url, opts = {}) {
    const res  = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  }
  const get  = url      => req(url);
  const post = (url, b) => req(url, { method:'POST',  body:JSON.stringify(b) });
  const put  = (url, b) => req(url, { method:'PUT',   body:JSON.stringify(b) });
  const patch= (url, b) => req(url, { method:'PATCH', body:JSON.stringify(b) });
  const del  = url      => req(url, { method:'DELETE' });
  return {
    me: () => get('/api/auth/me'),
    login: b => post('/api/auth/login', b),
    register: b => post('/api/auth/register', b),
    logout: () => post('/api/auth/logout', {}),
    forgotPassword: b => post('/api/auth/forgot-password', b),
    resetPassword: b => post('/api/auth/reset-password', b),
    deleteAccount: () => req('/api/auth/account', { method: 'DELETE' }),
    summary: (y,m) => get(`/api/summary?year=${y}&month=${m}`),
    day: d => get(`/api/day/${d}`),
    upcoming: () => get('/api/upcoming'),
    stats: () => get('/api/stats'),
    getTasks: (date) => get('/api/tasks' + (date ? `?date=${date}` : '')),
    createTask: b => post('/api/tasks', b),
    updateTask: (id, b) => put(`/api/tasks/${id}`, b),
    patchTaskStatus: (id, status) => patch(`/api/tasks/${id}/status`, { status }),
    deleteTask: (id, scope) => del(`/api/tasks/${id}` + (scope === 'all' ? '?scope=all' : '')),
    getNotes: (date) => get('/api/notes' + (date ? `?date=${date}` : '')),
    createNote: b => post('/api/notes', b),
    updateNote: (id, b) => put(`/api/notes/${id}`, b),
    deleteNote: id => del(`/api/notes/${id}`),
    getDeadlines: (date) => get('/api/deadlines' + (date ? `?date=${date}` : '')),
    createDeadline: b => post('/api/deadlines', b),
    updateDeadline: (id, b) => put(`/api/deadlines/${id}`, b),
    deleteDeadline: id => del(`/api/deadlines/${id}`),
  };
})();
