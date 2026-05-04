// API helper module — all communication between the React frontend and the Express backend
// Every function sends a fetch request to the backend and returns the parsed JSON response

const API_BASE = 'http://localhost:3001/api';

// Central request function used by all API calls below
// credentials: 'include' sends the session cookie with every request so the server knows who is logged in
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

  // If the server returned an error status, throw it so the UI can display the message
  if (!response.ok) {
    const message = data?.error || data?.message || response.statusText || 'Request failed.';
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Check if the user is currently logged in (called on page load)
  me: () => request('/auth/me'),

  // Create a new account
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Log in with username and password
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reset master password using username + email verification
  resetPassword: (payload) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // End the session and clear the cookie
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),

  // Fetch all saved vault entries (passwords are decrypted server-side before being sent)
  getVault: () => request('/vault'),

  // Save a new password entry to the vault
  createVaultEntry: (payload) =>
    request('/vault', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Update an existing vault entry by its ID
  updateVaultEntry: (id, payload) =>
    request(`/vault/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Delete a vault entry by its ID
  deleteVaultEntry: (id) =>
    request(`/vault/${id}`, {
      method: 'DELETE',
    }),
};
