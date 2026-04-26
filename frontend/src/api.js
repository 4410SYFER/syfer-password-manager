const API_BASE = 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || 'Request failed.';
    throw new Error(message);
  }

  return data;
}

export const api = {
  me: () => request('/auth/me'),
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
  getVault: () => request('/vault'),
  createVaultEntry: (payload) =>
    request('/vault', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateVaultEntry: (id, payload) =>
    request(`/vault/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteVaultEntry: (id) =>
    request(`/vault/${id}`, {
      method: 'DELETE',
    }),
};
