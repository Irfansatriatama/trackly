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

  // Setup wizard (first-run) — also accessible directly
  registerRoute('/setup', async () => {
    if (isAuthenticated()) { navigate('/dashboard'); return; }
    const firstRun = await isFirstRun();
    if (!firstRun) { navigate('/login'); return; }
    renderWizard();
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

  // Projects list — Phase 7 full implementation
  registerRoute('/projects', async () => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading projects...</p></div></div>');
    const { render: renderProjects } = await import('./modules/projects.js');
    await renderProjects({});
  });

  // Project detail — Phase 7 full implementation
  registerRoute('/projects/:id', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading project...</p></div></div>');
    const { render: renderProjects } = await import('./modules/projects.js');
    await renderProjects({ id: params.id });
  });

  // Board
  registerRoute('/projects/:id/board', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading board...</p></div></div>');
    const { render: renderBoard } = await import('./modules/board.js');
    await renderBoard({ id: params.id });
  });

  // Backlog — Phase 8 full implementation
  registerRoute('/projects/:id/backlog', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading backlog...</p></div></div>');
    const { render: renderBacklog } = await import('./modules/backlog.js');
    await renderBacklog({ id: params.id });
  });

  // Sprint — Phase 10 full implementation
  registerRoute('/projects/:id/sprint', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading sprints...</p></div></div>');
    const { render: renderSprint } = await import('./modules/sprint.js');
    await renderSprint({ id: params.id });
  });

  // Gantt
  registerRoute('/projects/:id/gantt', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading Gantt…</p></div></div>');
    const { render: renderGantt } = await import('./modules/gantt.js');
    await renderGantt({ id: params.id });
  });

  // Maintenance — Phase 12 full implementation
  registerRoute('/projects/:id/maintenance', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading maintenance...</p></div></div>');
    const { render: renderMaintenance } = await import('./modules/maintenance.js');
    await renderMaintenance({ id: params.id });
  });

  // Reports — Phase 15: Full Reports Module (Progress, Workload, Burndown, Maintenance, Assets)
  registerRoute('/projects/:id/reports', async (params) => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading report...</p></div></div>');
    const { render: renderReports } = await import('./modules/reports.js');
    await renderReports({ id: params.id });
  });

  // Clients
  // Clients — Phase 6 full implementation
  registerRoute('/clients', async () => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading clients...</p></div></div>');
    const { render: renderClients } = await import('./modules/clients.js');
    await renderClients({});
  });

  // Assets
  // Assets — Phase 14 full implementation
  registerRoute('/assets', async () => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading assets...</p></div></div>');
    const { render: renderAssets } = await import('./modules/assets.js');
    await renderAssets({});
  });

  // Members — Phase 5 full implementation
  registerRoute('/members', async () => {
    if (!requireAuth()) return;
    setContent('<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading members…</p></div></div>');
    const { render: renderMembers } = await import('./modules/members.js');
    await renderMembers({});
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
  // If no users exist, redirect to wizard instead
  const firstRun = await isFirstRun();
  if (firstRun) {
    renderWizard();
    return;
  }

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
// FIRST-RUN WIZARD — Phase 4
// Detects empty user store and shows a 3-step setup wizard.
// ============================================================

/**
 * Check if this is the first run (no users in DB).
 * @returns {Promise<boolean>}
 */
async function isFirstRun() {
  const userCount = await count('users');
  return userCount === 0;
}

/**
 * Show/clear a validation error for wizard fields.
 * @param {string} fieldId
 * @param {string|null} message
 */
function setWizardFieldError(fieldId, message) {
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
 * Advance the wizard to step N (1-based).
 * @param {number} step
 */
function wizardGoTo(step) {
  // Update dot states
  document.querySelectorAll('.wizard-step__dot').forEach((dot, i) => {
    const idx = i + 1;
    dot.classList.remove('is-active', 'is-done');
    if (idx === step) dot.classList.add('is-active');
    else if (idx < step) dot.classList.add('is-done');
  });

  // Update connector lines
  document.querySelectorAll('.wizard-step__line').forEach((line, i) => {
    line.classList.toggle('is-done', i + 1 < step);
  });

  // Show correct pane
  document.querySelectorAll('.wizard-pane').forEach((pane, i) => {
    pane.classList.toggle('is-active', i + 1 === step);
  });
}

/**
 * Render and wire the First-Run Wizard.
 */
function renderWizard() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="wizard-page">
      <div class="wizard-card card">
        <div class="card__body">
          <div class="wizard-header">
            <div class="wizard-logo">
              <img src="assets/logo.svg" alt="TRACKLY" class="wizard-logo__img" />
              <span class="wizard-logo__name">TRACKLY</span>
            </div>
          </div>

          <!-- Step indicators -->
          <div class="wizard-steps" aria-label="Setup progress">
            <div class="wizard-step">
              <div class="wizard-step__dot is-active" aria-label="Step 1: Welcome">1</div>
            </div>
            <div class="wizard-step__line"></div>
            <div class="wizard-step">
              <div class="wizard-step__dot" aria-label="Step 2: Create account">2</div>
            </div>
            <div class="wizard-step__line"></div>
            <div class="wizard-step">
              <div class="wizard-step__dot" aria-label="Step 3: Done">3</div>
            </div>
          </div>

          <!-- Step 1: Welcome -->
          <div class="wizard-pane is-active" id="wizardStep1">
            <h2 class="wizard-pane__title">Welcome to TRACKLY</h2>
            <p class="wizard-pane__subtitle">
              Your all-in-one project management system for IT consultant teams.
              Let's get you set up in just a few steps.
            </p>
            <ul class="wizard-pane__features">
              <li class="wizard-feature">
                <div class="wizard-feature__icon"><i data-lucide="layout-dashboard"></i></div>
                <div class="wizard-feature__text">
                  <strong>Projects &amp; Boards</strong>
                  <span>Manage sprints, Kanban boards, and Gantt charts in one place.</span>
                </div>
              </li>
              <li class="wizard-feature">
                <div class="wizard-feature__icon"><i data-lucide="users"></i></div>
                <div class="wizard-feature__text">
                  <strong>Team Management</strong>
                  <span>Assign roles, track workloads, and collaborate across projects.</span>
                </div>
              </li>
              <li class="wizard-feature">
                <div class="wizard-feature__icon"><i data-lucide="wifi-off"></i></div>
                <div class="wizard-feature__text">
                  <strong>Works Offline</strong>
                  <span>Install as a PWA — all data stored locally, no server required.</span>
                </div>
              </li>
            </ul>
            <div class="wizard-actions">
              <button class="btn btn--primary" id="wizardNext1">
                Get Started
                <i data-lucide="arrow-right" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <!-- Step 2: Create Admin Account -->
          <div class="wizard-pane" id="wizardStep2">
            <h2 class="wizard-pane__title">Create Your Admin Account</h2>
            <p class="wizard-pane__subtitle">
              This will be the primary administrator account. You can add more team members after setup.
            </p>
            <form id="wizardForm" novalidate>
              <div class="form-group">
                <label class="form-label" for="wFullName">Full Name <span class="required">*</span></label>
                <input class="form-input" type="text" id="wFullName" placeholder="e.g. Ahmad Fauzi"
                  autocomplete="name" />
              </div>
              <div class="form-group">
                <label class="form-label" for="wUsername">Username <span class="required">*</span></label>
                <input class="form-input" type="text" id="wUsername" placeholder="e.g. admin"
                  autocomplete="username" spellcheck="false" />
              </div>
              <div class="form-group">
                <label class="form-label" for="wEmail">Email <span class="required">*</span></label>
                <input class="form-input" type="email" id="wEmail" placeholder="e.g. admin@company.com"
                  autocomplete="email" />
              </div>
              <div class="form-group">
                <label class="form-label" for="wPassword">Password <span class="required">*</span></label>
                <div class="form-input-wrapper">
                  <input class="form-input" type="password" id="wPassword" placeholder="Minimum 8 characters"
                    autocomplete="new-password" />
                  <button type="button" class="form-input-reveal" id="wTogglePass" aria-label="Toggle password visibility">
                    <i data-lucide="eye" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="wConfirmPassword">Confirm Password <span class="required">*</span></label>
                <input class="form-input" type="password" id="wConfirmPassword" placeholder="Re-enter your password"
                  autocomplete="new-password" />
              </div>
            </form>
            <div class="wizard-actions">
              <button class="btn btn--ghost" id="wizardBack2">
                <i data-lucide="arrow-left" aria-hidden="true"></i>
                Back
              </button>
              <button class="btn btn--primary" id="wizardNext2">
                Create Account
                <i data-lucide="user-check" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <!-- Step 3: Success -->
          <div class="wizard-pane" id="wizardStep3">
            <div class="wizard-success">
              <div class="wizard-success__icon">
                <i data-lucide="check" aria-hidden="true"></i>
              </div>
              <h2 class="wizard-success__title">You're all set!</h2>
              <p class="wizard-success__text">
                Your Admin account has been created. TRACKLY is ready to use.
                Head to your dashboard to start managing projects.
              </p>
            </div>
            <div class="wizard-actions" style="justify-content: center;">
              <button class="btn btn--primary btn--lg" id="wizardGoToDashboard">
                <i data-lucide="layout-dashboard" aria-hidden="true"></i>
                Go to Dashboard
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  initIcons();

  // Step 1 → 2
  document.getElementById('wizardNext1').addEventListener('click', () => {
    wizardGoTo(2);
  });

  // Step 2 → 1 (back)
  document.getElementById('wizardBack2').addEventListener('click', () => {
    wizardGoTo(1);
  });

  // Toggle password visibility
  const togglePassBtn = document.getElementById('wTogglePass');
  const passInput = document.getElementById('wPassword');
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener('click', () => {
      const hidden = passInput.type === 'password';
      passInput.type = hidden ? 'text' : 'password';
      const icon = togglePassBtn.querySelector('[data-lucide]');
      if (icon) {
        icon.setAttribute('data-lucide', hidden ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    });
  }

  // Clear field errors on input
  ['wFullName', 'wUsername', 'wEmail', 'wPassword', 'wConfirmPassword'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => setWizardFieldError(id, null));
  });

  // Step 2 → 3 (create account)
  document.getElementById('wizardNext2').addEventListener('click', async () => {
    const fullName = document.getElementById('wFullName').value.trim();
    const username = document.getElementById('wUsername').value.trim();
    const email = document.getElementById('wEmail').value.trim();
    const password = document.getElementById('wPassword').value;
    const confirmPassword = document.getElementById('wConfirmPassword').value;

    // Validation
    let valid = true;
    if (!fullName) { setWizardFieldError('wFullName', 'Full name is required.'); valid = false; }
    if (!username) {
      setWizardFieldError('wUsername', 'Username is required.'); valid = false;
    } else if (!/^[a-z0-9_.-]{3,30}$/i.test(username)) {
      setWizardFieldError('wUsername', 'Username must be 3–30 characters (letters, numbers, _ . - only).'); valid = false;
    }
    if (!email) {
      setWizardFieldError('wEmail', 'Email is required.'); valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWizardFieldError('wEmail', 'Enter a valid email address.'); valid = false;
    }
    if (!password) {
      setWizardFieldError('wPassword', 'Password is required.'); valid = false;
    } else if (password.length < 8) {
      setWizardFieldError('wPassword', 'Password must be at least 8 characters.'); valid = false;
    }
    if (password && confirmPassword !== password) {
      setWizardFieldError('wConfirmPassword', 'Passwords do not match.'); valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById('wizardNext2');
    btn.disabled = true;
    btn.querySelector('span') && (btn.textContent = 'Creating…');

    try {
      const { hashPassword: hp } = await import('./core/auth.js');
      const { add: dbAdd } = await import('./core/db.js');
      const now = new Date().toISOString();

      const adminUser = {
        id: 'USR-0001',
        username,
        full_name: fullName,
        email,
        password_hash: await hp(password),
        phone_number: '',
        avatar: '',
        company: '',
        department: '',
        position: 'Administrator',
        role: 'admin',
        project_roles: {},
        bio: '',
        linkedin: '',
        github: '',
        status: 'active',
        last_login: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        created_at: now,
        updated_at: now,
      };

      await dbAdd('users', adminUser);
      debug('Admin user created via wizard:', adminUser.username);

      wizardGoTo(3);
      initIcons();

      // Wire dashboard button (mounted inside step 3 pane)
      document.getElementById('wizardGoToDashboard').addEventListener('click', async () => {
        const { createSession } = await import('./core/auth.js');
        createSession(adminUser, false);
        mountAppShell(adminUser);
        registerAllRoutes();
        initRouter();
        navigate('/dashboard');
      });

    } catch (err) {
      debug('Wizard create user error:', err);
      setWizardFieldError('wUsername', 'Failed to create account. Please try again.');
    } finally {
      btn.disabled = false;
    }
  });
}

// ============================================================
// PWA INSTALL BANNER — Phase 4
// ============================================================

let _deferredInstallPrompt = null;

function initPWAInstallBanner() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    hidePWABanner();
    debug('PWA installed');
  });
}

function showInstallBanner() {
  if (document.getElementById('pwaInstallBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.className = 'pwa-install-banner';
  banner.setAttribute('role', 'complementary');
  banner.setAttribute('aria-label', 'Install TRACKLY as an app');
  banner.innerHTML = `
    <img src="assets/icons/icon-192.png" alt="" class="pwa-install-banner__icon" />
    <div class="pwa-install-banner__text">
      <p class="pwa-install-banner__title">Install TRACKLY</p>
      <p class="pwa-install-banner__sub">Works offline &amp; loads faster</p>
    </div>
    <div class="pwa-install-banner__actions">
      <button class="btn btn--primary btn--sm" id="pwaInstallBtn">Install</button>
      <button class="btn btn--ghost btn--sm" id="pwaDismissBtn" aria-label="Dismiss">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </div>
  `;
  document.body.appendChild(banner);
  initIcons();

  document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
    if (!_deferredInstallPrompt) return;
    _deferredInstallPrompt.prompt();
    const { outcome } = await _deferredInstallPrompt.userChoice;
    debug('PWA install outcome:', outcome);
    _deferredInstallPrompt = null;
    hidePWABanner();
  });

  document.getElementById('pwaDismissBtn').addEventListener('click', () => {
    hidePWABanner();
  });
}

function hidePWABanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.remove();
}

// ============================================================
// BOOTSTRAP
// ============================================================

async function bootstrap() {
  debug('TRACKLY bootstrap starting');

  // Register service worker
  registerServiceWorker();

  // Init PWA install banner listener
  initPWAInstallBanner();

  // Open IndexedDB (ensures schema is created)
  try {
    await openDB();
    debug('IndexedDB ready');
  } catch (err) {
    debug('IndexedDB error:', err);
  }

  // Phase 4: First-run detection — show wizard if no users exist
  const firstRun = await isFirstRun();
  if (firstRun) {
    debug('First run detected — showing setup wizard');
    renderWizard();
    return;
  }

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
