/**
 * TRACKLY — app.js
 * Application entry point. Bootstraps the app on page load.
 * Registers service worker, initializes router, and mounts the UI.
 */

import { initRouter, registerRoute, setNotFound, navigate } from './core/router.js';
import { isAuthenticated, clearSession, getSession, createSession, verifyPassword } from './core/auth.js';
import { openDB, getAll, count } from './core/db.js';
import { appStore } from './core/store.js';
import { debug } from './core/utils.js';
import { initSidebar } from './components/sidebar.js';
import { initTopbar } from './components/topbar.js';

// ============================================================
// SERVICE WORKER REGISTRATION
// ============================================================

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      debug('Service Worker registered:', registration.scope);
    } catch (err) {
      debug('Service Worker registration failed:', err);
    }
  }
}

// ============================================================
// LUCIDE ICONS INIT
// ============================================================

function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    debug('Lucide icons initialized');
  }
}

// ============================================================
// PAGE RENDER HELPERS (Phase 1 — minimal shells)
// ============================================================

/**
 * Set the main content area's HTML and re-initialize icons.
 * @param {string} html
 */
function setContent(html) {
  const main = document.getElementById('main-content');
  if (main) {
    main.innerHTML = html;
    initIcons();
  }
}

/**
 * Render a minimal page shell with a heading.
 * Phase 2 will replace these with full implementations.
 * @param {string} title
 * @param {string} [subtitle]
 */
function renderPageShell(title, subtitle = '') {
  return `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">${title}</h1>
          ${subtitle ? `<p class="page-header__subtitle">${subtitle}</p>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card__body">
          <div class="empty-state">
            <i data-lucide="construction" class="empty-state__icon"></i>
            <p class="empty-state__title">Coming Soon</p>
            <p class="empty-state__text">This module is under development and will be available in a future phase.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Route guard — redirect to login if not authenticated.
 * @returns {boolean} True if authenticated
 */
function requireAuth() {
  if (!isAuthenticated()) {
    navigate('/login');
    return false;
  }
  return true;
}

// ============================================================
// ROUTE REGISTRATION
// ============================================================

function registerAllRoutes() {
  // Root → redirect
  registerRoute('/', () => {
    navigate(isAuthenticated() ? '/dashboard' : '/login');
  });

  // Login
  registerRoute('/login', () => {
    if (isAuthenticated()) {
      navigate('/dashboard');
      return;
    }
    renderLogin();
  });

  // Dashboard
  registerRoute('/dashboard', () => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Dashboard', 'Overview of all projects and activity'));
  });

  // Projects list
  registerRoute('/projects', () => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Projects', 'All projects in your workspace'));
  });

  // Project detail
  registerRoute('/projects/:id', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell(`Project: ${params.id}`, 'Project overview'));
  });

  // Board
  registerRoute('/projects/:id/board', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Kanban Board', `Project ${params.id}`));
  });

  // Backlog
  registerRoute('/projects/:id/backlog', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Backlog', `Project ${params.id}`));
  });

  // Sprint
  registerRoute('/projects/:id/sprint', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Sprint Management', `Project ${params.id}`));
  });

  // Gantt
  registerRoute('/projects/:id/gantt', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Gantt Chart', `Project ${params.id}`));
  });

  // Maintenance
  registerRoute('/projects/:id/maintenance', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Maintenance', `Project ${params.id}`));
  });

  // Reports
  registerRoute('/projects/:id/reports', (params) => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Reports', `Project ${params.id}`));
  });

  // Clients
  registerRoute('/clients', () => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Clients', 'Manage your client accounts'));
  });

  // Assets
  registerRoute('/assets', () => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Assets', 'Company and project asset inventory'));
  });

  // Members
  registerRoute('/members', () => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Members', 'Team member accounts and roles'));
  });

  // Settings
  registerRoute('/settings', () => {
    if (!requireAuth()) return;
    setContent(renderPageShell('Settings', 'System configuration and preferences'));
  });

  // 404 fallback
  setNotFound(({ path }) => {
    setContent(`
      <div class="page-container page-enter">
        <div class="empty-state" style="min-height: 60vh;">
          <i data-lucide="compass" class="empty-state__icon"></i>
          <p class="empty-state__title">Page Not Found</p>
          <p class="empty-state__text">The route <code class="text-mono">${path}</code> does not exist.</p>
          <a href="#/dashboard" class="btn btn--primary">Back to Dashboard</a>
        </div>
      </div>
    `);
    initIcons();
  });
}

// ============================================================
// LOGIN PAGE — Phase 3: Full authentication implementation
// ============================================================

/**
 * Show or clear a validation error below a field.
 * @param {string} fieldId
 * @param {string|null} message  — null clears the error
 */
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest('.form-group');
  if (!group) return;
  const existing = group.querySelector('.form-error');
  if (existing) existing.remove();
  if (message) {
    field.classList.add('is-invalid');
    const err = document.createElement('p');
    err.className = 'form-error';
    err.textContent = message;
    group.appendChild(err);
  } else {
    field.classList.remove('is-invalid');
  }
}

/**
 * Display a full-width alert inside the login form.
 * @param {string} message
 * @param {'error'|'success'} type
 */
function setLoginAlert(message, type = 'error') {
  const form = document.getElementById('loginForm');
  if (!form) return;
  let alert = form.querySelector('.login-alert');
  if (!alert) {
    alert = document.createElement('div');
    alert.className = 'login-alert';
    form.prepend(alert);
  }
  alert.className = `login-alert login-alert--${type}`;
  alert.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}"></i><span>${message}</span>`;
  initIcons();
}

/**
 * Render the login page and wire up the submit handler.
 */
async function renderLogin() {
  const app = document.getElementById('app');
  if (!app) return;

  // Ensure app shell is cleared — login is full-page
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card card">
        <div class="card__body">
          <div class="login-logo">
            <img src="assets/logo.svg" alt="TRACKLY" class="login-logo__img" />
            <h1 class="login-logo__name">TRACKLY</h1>
            <p class="login-logo__tagline text-muted">Track Everything, Deliver Anything</p>
          </div>
          <form class="login-form" id="loginForm" novalidate>
            <div class="form-group">
              <label class="form-label" for="username">Username <span class="required">*</span></label>
              <input class="form-input" type="text" id="username" name="username"
                placeholder="Enter your username" autocomplete="username" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Password <span class="required">*</span></label>
              <div class="form-input-wrapper">
                <input class="form-input" type="password" id="password" name="password"
                  placeholder="Enter your password" autocomplete="current-password" required />
                <button type="button" class="form-input-reveal" id="togglePassword" aria-label="Toggle password visibility">
                  <i data-lucide="eye" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <label class="form-checkbox">
              <input type="checkbox" id="rememberMe" name="rememberMe" />
              <span>Remember me for 30 days</span>
            </label>
            <button type="submit" class="btn btn--primary btn--login" id="loginSubmitBtn">
              <i data-lucide="log-in" aria-hidden="true"></i>
              <span>Sign In</span>
            </button>
            <p class="login-hint text-muted">
              No account yet? The first-run wizard will create your Admin account automatically.
            </p>
          </form>
        </div>
      </div>
    </div>
  `;

  initIcons();

  // Toggle password visibility
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      const icon = toggleBtn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  }

  // Clear field errors on input
  ['username', 'password'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => setFieldError(id, null));
  });

  // Submit handler
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('loginSubmitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('rememberMe').checked;

    // Client-side validation
    let valid = true;
    if (!username) {
      setFieldError('username', 'Username is required.');
      valid = false;
    }
    if (!password) {
      setFieldError('password', 'Password is required.');
      valid = false;
    }
    if (!valid) return;

    // Loading state
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Signing in…';

    try {
      // Fetch all users and find by username (case-insensitive)
      const users = await getAll('users');
      const user = users.find(
        (u) => u.username && u.username.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        setLoginAlert('Invalid username or password. Please try again.');
        return;
      }

      if (user.status === 'inactive') {
        setLoginAlert('Your account has been deactivated. Contact an administrator.');
        return;
      }

      // Verify password
      const passwordOk = await verifyPassword(password, user.password_hash);
      if (!passwordOk) {
        setLoginAlert('Invalid username or password. Please try again.');
        return;
      }

      // Create session
      createSession(user, remember);

      // Update last_login in DB
      user.last_login = new Date().toISOString();
      try {
        const { update } = await import('./core/db.js');
        await update('users', user);
      } catch (_) { /* non-fatal */ }

      // Redirect based on role
      const dest = (user.role === 'viewer') ? '/projects' : '/dashboard';

      // Mount app shell then navigate
      mountAppShell(user);
      // Register routes and init router (first login — router not yet running)
      registerAllRoutes();
      initRouter();
      navigate(dest);

    } catch (err) {
      debug('Login error:', err);
      setLoginAlert('An unexpected error occurred. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Sign In';
    }
  });
}

// ============================================================
// APP SHELL — renders layout, mounts sidebar & topbar
// ============================================================

/**
 * Render the app shell HTML and mount sidebar/topbar.
 * Called after a successful authentication check.
 * @param {Object} [userObj] - optional user object; if null, reads from session
 */
function mountAppShell(userObj) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="app-shell" id="appShell">
      <aside class="sidebar" id="sidebar" role="complementary" aria-label="Main sidebar"></aside>
      <header class="topbar" id="topbar" role="banner"></header>
      <main class="main-content" id="main-content" role="main">
        <div class="app-loading">
          <div class="app-loading__spinner"></div>
          <p class="app-loading__text">Loading...</p>
        </div>
      </main>
    </div>
  `;

  const handleLogout = () => {
    clearSession();
    // Tear down the shell and show login
    renderLogin();
  };

  initSidebar(document.getElementById('sidebar'), handleLogout);
  initTopbar(document.getElementById('topbar'), userObj, handleLogout);
  initIcons();
}

function renderAppShell() {
  mountAppShell(null);
}

// ============================================================
// SIDEBAR TOGGLE
// ============================================================

function initSidebarToggle() {
  // Toggle is now handled by initSidebar() in sidebar.js
}

// ============================================================
// ACTIVE NAV STATE (delegated to sidebar component)
// ============================================================

function updateActiveNav() {
  // Active state is managed by sidebar.js via hashchange listener.
}

// ============================================================
// DEMO USER SEED — Phase 3 helper
// Seeds default accounts if no users exist so login can be
// demonstrated before Phase 4 (First-Run Wizard) is built.
// ============================================================

async function seedDemoUsersIfEmpty() {
  const userCount = await count('users');
  if (userCount > 0) return;

  const { hashPassword: hp } = await import('./core/auth.js');

  const now = new Date().toISOString();
  const demoUsers = [
    {
      id: 'USR-0001',
      username: 'admin',
      full_name: 'Admin User',
      email: 'admin@trackly.app',
      password_hash: await hp('admin123'),
      role: 'admin',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'USR-0002',
      username: 'pm',
      full_name: 'Project Manager',
      email: 'pm@trackly.app',
      password_hash: await hp('pm123'),
      role: 'pm',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'USR-0003',
      username: 'dev',
      full_name: 'Developer',
      email: 'dev@trackly.app',
      password_hash: await hp('dev123'),
      role: 'developer',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'USR-0004',
      username: 'viewer',
      full_name: 'Client Viewer',
      email: 'viewer@trackly.app',
      password_hash: await hp('viewer123'),
      role: 'viewer',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
  ];

  for (const user of demoUsers) {
    try { await add('users', user); } catch (_) { /* already exists */ }
  }

  debug('Demo users seeded (Phase 3 — replaced by First-Run Wizard in Phase 4)');
}

// ============================================================
// BOOTSTRAP
// ============================================================

async function bootstrap() {
  debug('TRACKLY bootstrap starting');

  // Register service worker
  registerServiceWorker();

  // Open IndexedDB (ensures schema is created)
  try {
    await openDB();
    debug('IndexedDB ready');
  } catch (err) {
    debug('IndexedDB error:', err);
  }

  // Seed demo accounts if DB is empty (Phase 3 — replaced by wizard in Phase 4)
  await seedDemoUsersIfEmpty();

  // Determine initial view
  const auth = isAuthenticated();

  if (!auth) {
    await renderLogin();
    debug('No session — showing login');
    return;
  }

  // Get the current user object for the topbar
  const session = getSession();
  let currentUser = null;
  if (session) {
    try {
      const users = await getAll('users');
      currentUser = users.find((u) => u.id === session.userId) || null;
    } catch (_) { /* non-fatal */ }
  }

  // Render app shell with sidebar + topbar
  mountAppShell(currentUser);

  // Register all routes
  registerAllRoutes();

  // Listen for hash changes
  window.addEventListener('hashchange', updateActiveNav);

  // Init router (dispatches current hash)
  initRouter();
  updateActiveNav();

  debug('TRACKLY ready');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', bootstrap);
