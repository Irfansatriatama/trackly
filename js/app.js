/**
 * TRACKLY — app.js
 * Application entry point. Bootstraps the app on page load.
 * Registers service worker, initializes router, and mounts the UI.
 */

import { initRouter, registerRoute, setNotFound, navigate } from './core/router.js';
import { isAuthenticated, clearSession } from './core/auth.js';
import { openDB } from './core/db.js';
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
// LOGIN PAGE (Phase 1 shell — full implementation in Phase 3)
// ============================================================

function renderLogin() {
  const app = document.getElementById('app');
  if (!app) return;

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
              <input class="form-input" type="password" id="password" name="password"
                placeholder="Enter your password" autocomplete="current-password" required />
            </div>
            <label class="form-checkbox">
              <input type="checkbox" id="rememberMe" name="rememberMe" />
              <span>Remember me for 30 days</span>
            </label>
            <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: var(--space-4)">
              <i data-lucide="log-in"></i>
              Sign In
            </button>
            <p class="login-hint text-muted">
              No account yet? The first-run wizard will set up your Admin account.
            </p>
          </form>
        </div>
      </div>
    </div>
  `;

  initIcons();

  // Demo: clicking Sign In shows a toast-like message (full auth in Phase 3)
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = document.createElement('p');
    msg.textContent = 'Authentication will be fully implemented in Phase 3.';
    msg.style.cssText = 'color: var(--color-warning); text-align: center; margin-top: var(--space-3); font-size: var(--text-xs);';
    const existing = document.querySelector('.login-notice');
    if (existing) existing.remove();
    msg.className = 'login-notice';
    document.getElementById('loginForm').appendChild(msg);
  });
}

// ============================================================
// APP SHELL (Phase 2 — renders layout, mounts sidebar & topbar components)
// ============================================================

function renderAppShell() {
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
  // This function is kept for compatibility with the bootstrap sequence.
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

  // Determine initial view
  const auth = isAuthenticated();

  if (!auth) {
    renderLogin();
    debug('No session — showing login');
    return;
  }

  // Render app shell skeleton
  renderAppShell();

  // Mount sidebar and topbar components
  const handleLogout = () => {
    clearSession();
    navigate('/login');
    // Re-bootstrap to show login page
    const app = document.getElementById('app');
    if (app) app.innerHTML = '';
    renderLogin();
  };

  initSidebar(document.getElementById('sidebar'), handleLogout);
  initTopbar(document.getElementById('topbar'), null, handleLogout);

  initIcons();

  // Register all routes
  registerAllRoutes();

  // Listen for hash changes to update nav state
  window.addEventListener('hashchange', updateActiveNav);

  // Init router (dispatches current hash)
  initRouter();
  updateActiveNav();

  debug('TRACKLY ready');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', bootstrap);
