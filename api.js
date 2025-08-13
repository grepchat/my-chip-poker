const API_BASE = (window.API_BASE || 'http://localhost:3001');

async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json', ...(opts.headers||{}) } : (opts.headers||{}),
    ...opts,
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const Auth = {
  me: () => apiFetch('/auth/me'),
  login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, handle, displayName) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, handle, displayName }) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
};

export const Profile = {
  update: (data) => apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  uploadAvatar: (file) => {
    const fd = new FormData(); fd.append('file', file);
    return apiFetch('/users/me/avatar', { method: 'POST', body: fd });
  },
  partners: () => apiFetch('/users/me/partners'),
  addPartner: (partnerHandle) => apiFetch('/users/me/partners', { method: 'POST', body: JSON.stringify({ partnerHandle }) }),
  acceptPartner: (id) => apiFetch(`/partners/${id}/accept`, { method: 'POST' }),
  deletePartner: (id) => apiFetch(`/partners/${id}`, { method: 'DELETE' }),
};

export const Sessions = {
  create: (payload) => apiFetch('/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  listMine: () => apiFetch('/sessions'),
  get: (id) => apiFetch(`/sessions/${id}`),
};
