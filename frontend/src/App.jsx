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

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
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

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setIsSubmittingAuth(true);
    setFeedback({ type: '', message: '' });

    try {
      if (authMode === 'register') {
        await api.register(authForm);
      } else {
        await api.login({ username: authForm.username, password: authForm.password });
      }

      const me = await api.me();
      setUser(me);
      setAuthForm(initialAuthForm);
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

  const categories = useMemo(() => {
    const values = entries
      .map((entry) => entry.category)
      .filter((value) => value && value.trim().length > 0);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [entries]);

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
      <div className="orb orb-one" aria-hidden="true" />
      <div className="orb orb-two" aria-hidden="true" />

      <section className="panel">
        <header className="hero">
          <p className="eyebrow">Syfer Password Manager</p>
          <h1>Shield your credentials with a cleaner workflow.</h1>
          <p>
            Your data lives in your own MySQL database and is encrypted server-side before storage.
          </p>
        </header>

        {feedback.message ? <p className={`feedback ${feedback.type}`}>{feedback.message}</p> : null}

        {!user ? (
          <section className="card auth-card">
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
            </div>

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

              {authMode === 'register' ? (
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
                Password
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthInput}
                  required
                />
              </label>

              <button type="submit" className="primary" disabled={isSubmittingAuth}>
                {isSubmittingAuth
                  ? 'Please wait...'
                  : authMode === 'register'
                    ? 'Create account'
                    : 'Login'}
              </button>
            </form>
          </section>
        ) : (
          <section className="dashboard">
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
