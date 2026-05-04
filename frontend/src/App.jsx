// Main React component — renders the entire Syfer app
// Handles authentication state, vault entries, search/filter, and theme toggling

import { useEffect, useMemo, useState } from 'react';
import { api } from './api';

const initialEntryForm = {
  site_name: '',
  site_username: '',
  password: '',
  category: '',
};

const initialAuthForm = {
  username: '',
  email: '',
  password: '',
};

// Scores a password 0–4 based on length, uppercase, numbers, and special characters
function getPasswordStrength(password) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label = 'Weak';
  if (score === 2) label = 'Fair';
  if (score === 3) label = 'Good';
  if (score === 4) label = 'Strong';

  return { checks, score, label };
}

// Visual password strength bar shown during registration and when adding/editing entries
function PasswordStrengthMeter({ password }) {
  const { checks, score, label } = getPasswordStrength(password);
  const width = `${(score / 4) * 100}%`;

  return (
    <div className="strength-meter" aria-live="polite">
      <div className="strength-meter__bar" aria-hidden="true">
        <span className={`strength-meter__fill strength-meter__fill--${label.toLowerCase()}`} style={{ width }} />
      </div>
      <div className="strength-meter__meta">
        <span className={`strength-meter__label strength-meter__label--${label.toLowerCase()}`}>
          {label}
        </span>
        <span className="strength-meter__hint">{score}/4 checks passed</span>
      </div>
      <ul className="strength-meter__checks">
        <li className={checks.length ? 'pass' : ''}>At least 8 characters</li>
        <li className={checks.uppercase ? 'pass' : ''}>One uppercase letter</li>
        <li className={checks.number ? 'pass' : ''}>One number</li>
        <li className={checks.special ? 'pass' : ''}>One special character</li>
      </ul>
    </div>
  );
}

// Copies text to the clipboard — falls back to a hidden textarea for older browsers
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const fallbackInput = document.createElement('textarea');
  fallbackInput.value = text;
  fallbackInput.setAttribute('readonly', 'true');
  fallbackInput.style.position = 'absolute';
  fallbackInput.style.left = '-9999px';
  document.body.appendChild(fallbackInput);
  fallbackInput.select();
  document.execCommand('copy');
  document.body.removeChild(fallbackInput);
}

function App() {
  // ── State ──────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    return window.localStorage.getItem('syfer-theme') || 'light';
  });
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryForm, setEntryForm] = useState(initialEntryForm);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editForm, setEditForm] = useState(initialEntryForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // ── Effects ─────────────────────────────────────────────────────
  // Apply the selected theme to the body and save it to localStorage
  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem('syfer-theme', theme);
  }, [theme]);

  // On page load, check if the user is already logged in and restore their vault
  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await api.me();
        setUser(me);
        await loadEntries();
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function loadEntries() {
    const data = await api.getVault();
    setEntries(data);
  }

  function handleAuthInput(event) {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEntryInput(event) {
    const { name, value } = event.target;
    setEntryForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditInput(event) {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Auth Handlers ────────────────────────────────────────────────
  // Handles register, login, and password reset form submissions
  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsSubmittingAuth(true);
    setFeedback({ type: '', message: '' });

    try {
      if (authMode === 'register') {
        await api.register(authForm);
      } else if (authMode === 'reset') {
        await api.resetPassword({
          username: authForm.username,
          email: authForm.email,
          password: authForm.password,
        });
      } else {
        await api.login({ username: authForm.username, password: authForm.password });
      }

      setAuthForm(initialAuthForm);
      if (authMode === 'reset') {
        setAuthMode('login');
        setFeedback({ type: 'success', message: 'Password reset successfully. You can now log in.' });
        return;
      }

      const me = await api.me();
      setUser(me);
      await loadEntries();
      setFeedback({ type: 'success', message: `Welcome, ${me.username}.` });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
      setUser(null);
      setEntries([]);
      setFeedback({ type: 'success', message: 'You are now logged out.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  }

  // ── Vault Handlers ───────────────────────────────────────────────
  // Submits a new vault entry to the backend
  async function handleEntrySubmit(event) {
    event.preventDefault();
    setIsSubmittingEntry(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.createVaultEntry(entryForm);
      setEntryForm(initialEntryForm);
      await loadEntries();
      setFeedback({ type: 'success', message: 'Vault entry added.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsSubmittingEntry(false);
    }
  }

  async function handleDeleteEntry(id) {
    try {
      await api.deleteVaultEntry(id);
      if (editingEntryId === id) {
        setEditingEntryId(null);
        setEditForm(initialEntryForm);
      }
      await loadEntries();
      setFeedback({ type: 'success', message: 'Entry deleted.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    }
  }

  function startEditing(entry) {
    setEditingEntryId(entry.id);
    setEditForm({
      site_name: entry.site_name || '',
      site_username: entry.site_username || '',
      password: entry.password || '',
      category: entry.category || '',
    });
    setFeedback({ type: '', message: '' });
  }

  function cancelEditing() {
    setEditingEntryId(null);
    setEditForm(initialEntryForm);
  }

  async function handleEditSubmit(event, entryId) {
    event.preventDefault();
    setIsUpdatingEntry(true);
    setFeedback({ type: '', message: '' });

    try {
      await api.updateVaultEntry(entryId, editForm);
      setEditingEntryId(null);
      setEditForm(initialEntryForm);
      await loadEntries();
      setFeedback({ type: 'success', message: 'Entry updated.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setIsUpdatingEntry(false);
    }
  }

  async function handleCopyPassword(password) {
    try {
      await copyText(password);
      setFeedback({ type: 'success', message: 'Password copied to clipboard.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    }
  }

  // ── Derived State ────────────────────────────────────────────────
  // Build a unique sorted list of categories from all vault entries for the filter dropdown
  const categories = useMemo(() => {
    const values = entries
      .map((entry) => entry.category)
      .filter((value) => value && value.trim().length > 0);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Filter entries by the search query and selected category
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesQuery =
        !query ||
        entry.site_name?.toLowerCase().includes(query) ||
        entry.site_username?.toLowerCase().includes(query) ||
        entry.category?.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === 'all' || entry.category?.toLowerCase() === categoryFilter.toLowerCase();

      return matchesQuery && matchesCategory;
    });
  }, [entries, search, categoryFilter]);

  if (isLoading) {
    return (
      <main className="app-shell loading-screen">
        <p>Booting Syfer vault...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <nav className="top-nav" aria-label="Primary">
        <a className="top-nav__brand" href="#home">
          Syfer Vault
        </a>
        <div className="top-nav__links">
          <a href="#home">Home</a>
          {user ? (
            <>
              <a href="#vault">Vault</a>
              <button type="button" className="top-nav__button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <a href="#auth">Sign in</a>
          )}
          <button type="button" className="top-nav__button top-nav__button--theme" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </nav>

      <div className="orb orb-one" aria-hidden="true" />
      <div className="orb orb-two" aria-hidden="true" />

      <section className="panel" id="home">
        {!user ? (
          <section className="landing-layout">
            <header className="hero hero--landing">
              <p className="eyebrow">Syfer Password Manager</p>
              <h1>Secure storage with a calmer, cleaner workflow.</h1>
              <p>
                Keep passwords encrypted in your own MySQL database, organize them by category,
                and move from sign-in to vault management without noise.
              </p>

              <div className="feature-grid" aria-label="Highlights">
                <article className="feature-card">
                  <strong>Encrypted vault</strong>
                  <span>AES-protected passwords stored server-side.</span>
                </article>
                <article className="feature-card">
                  <strong>Fast organization</strong>
                  <span>Search, filter, and group entries by category.</span>
                </article>
                <article className="feature-card">
                  <strong>Simple sessions</strong>
                  <span>Login and registration stay lightweight and direct.</span>
                </article>
              </div>
            </header>

            <div className="landing-rail">
              <p className="landing-rail__eyebrow">Ready when you are</p>
              <p className="landing-rail__text">
                Sign in to unlock your vault, or create an account to get started.
              </p>
              <a className="landing-rail__cta" href="#auth">
                Go to sign in
              </a>
            </div>
          </section>
        ) : (
          <header className="hero hero--dashboard">
            <p className="eyebrow">Syfer Password Manager</p>
            <h1>Shield your credentials with a cleaner workflow.</h1>
            <p>
              Your data lives in your own MySQL database and is encrypted server-side before storage.
            </p>
          </header>
        )}

        {feedback.message ? <p className={`feedback ${feedback.type}`}>{feedback.message}</p> : null}

        {!user ? (
          <section className="card auth-card" id="auth">
            <div className="mode-toggle" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
              <button
                type="button"
                className={authMode === 'reset' ? 'active' : ''}
                onClick={() => setAuthMode('reset')}
              >
                Reset password
              </button>
            </div>

            <p className="auth-help">
              {authMode === 'login'
                ? 'Use your username and password to sign in.'
                : authMode === 'register'
                  ? 'Create your account and choose a strong master password.'
                  : 'Enter your username and email to set a new master password.'}
            </p>

            <form className="grid-form" onSubmit={handleAuthSubmit}>
              <label>
                Username
                <input
                  type="text"
                  name="username"
                  value={authForm.username}
                  onChange={handleAuthInput}
                  required
                />
              </label>

              {authMode !== 'login' ? (
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthInput}
                    required
                  />
                </label>
              ) : null}

              <label>
                {authMode === 'reset' ? 'New password' : 'Password'}
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthInput}
                  required
                />
              </label>

              {authMode === 'register' || authMode === 'reset' ? (
                <PasswordStrengthMeter password={authForm.password} />
              ) : null}

              {authMode === 'login' ? (
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setAuthMode('reset')}
                >
                  Forgot your password?
                </button>
              ) : (
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setAuthMode('login')}
                >
                  Back to login
                </button>
              )}

              <button type="submit" className="primary" disabled={isSubmittingAuth}>
                {isSubmittingAuth
                  ? 'Please wait...'
                  : authMode === 'register'
                    ? 'Create account'
                    : authMode === 'reset'
                      ? 'Reset password'
                    : 'Login'}
              </button>
            </form>
          </section>
        ) : (
          <section className="dashboard" id="vault">
            <div className="dash-head card">
              <div>
                <p className="eyebrow">Session Active</p>
                <h2>{user.username}'s Vault</h2>
              </div>
              <button type="button" className="ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>

            <div className="dash-layout">
              <section className="card">
                <h3>Add New Entry</h3>
                <form className="grid-form" onSubmit={handleEntrySubmit}>
                  <label>
                    Site Name
                    <input
                      type="text"
                      name="site_name"
                      value={entryForm.site_name}
                      onChange={handleEntryInput}
                      required
                    />
                  </label>

                  <label>
                    Site Username
                    <input
                      type="text"
                      name="site_username"
                      value={entryForm.site_username}
                      onChange={handleEntryInput}
                    />
                  </label>

                  <label>
                    Password
                    <input
                      type="text"
                      name="password"
                      value={entryForm.password}
                      onChange={handleEntryInput}
                      required
                    />
                  </label>

                  <PasswordStrengthMeter password={entryForm.password} />

                  <label>
                    Category
                    <input
                      type="text"
                      name="category"
                      placeholder="Work, social, finance"
                      value={entryForm.category}
                      onChange={handleEntryInput}
                    />
                  </label>

                  <button type="submit" className="primary" disabled={isSubmittingEntry}>
                    {isSubmittingEntry ? 'Saving...' : 'Save Entry'}
                  </button>
                </form>
              </section>

              <section className="card">
                <div className="vault-controls">
                  <h3>Vault Entries</h3>
                  <div className="control-row">
                    <input
                      type="search"
                      placeholder="Search by site, username, category"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                    >
                      <option value="all">All categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="entries">
                  {filteredEntries.length === 0 ? (
                    <p className="empty">No matching entries found.</p>
                  ) : (
                    filteredEntries.map((entry) => (
                      <article key={entry.id} className="entry">
                        {editingEntryId === entry.id ? (
                          <form className="grid-form" onSubmit={(event) => handleEditSubmit(event, entry.id)}>
                            <label>
                              Site Name
                              <input
                                type="text"
                                name="site_name"
                                value={editForm.site_name}
                                onChange={handleEditInput}
                                required
                              />
                            </label>

                            <label>
                              Site Username
                              <input
                                type="text"
                                name="site_username"
                                value={editForm.site_username}
                                onChange={handleEditInput}
                              />
                            </label>

                            <label>
                              Password
                              <input
                                type="text"
                                name="password"
                                value={editForm.password}
                                onChange={handleEditInput}
                                required
                              />
                            </label>

                            <PasswordStrengthMeter password={editForm.password} />

                            <label>
                              Category
                              <input
                                type="text"
                                name="category"
                                value={editForm.category}
                                onChange={handleEditInput}
                              />
                            </label>

                            <div className="entry-actions">
                              <button type="submit" className="primary" disabled={isUpdatingEntry}>
                                {isUpdatingEntry ? 'Saving...' : 'Save changes'}
                              </button>
                              <button type="button" className="ghost" onClick={cancelEditing}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="entry-head">
                              <h4>{entry.site_name || 'Untitled site'}</h4>
                              {entry.category ? <span className="badge">{entry.category}</span> : null}
                            </div>
                            <p>
                              <strong>Username:</strong> {entry.site_username || 'N/A'}
                            </p>
                            <p>
                              <strong>Password:</strong> {entry.password}
                            </p>
                            <div className="entry-actions">
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => handleCopyPassword(entry.password || '')}
                              >
                                Copy
                              </button>
                              <button type="button" className="ghost" onClick={() => startEditing(entry)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => handleDeleteEntry(entry.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </article>
                    ))
                  )}
                </div>

                <p className="hint">Tip: use Edit to update any saved credential in place.</p>
              </section>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
