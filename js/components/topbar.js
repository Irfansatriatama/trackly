/**
 * TRACKLY — topbar.js
 * Topbar component: logo slot, page title, user avatar dropdown.
 * Phase 2 implementation.
 */

import { appStore } from '../core/store.js';

// Route-to-title mapping for the topbar page title
const ROUTE_TITLES = {
  '/dashboard':  'Dashboard',
  '/projects':   'Projects',
  '/meetings':   'Meetings',
  '/clients':    'Clients',
  '/members':    'Members',
  '/assets':     'Assets',
  '/settings':   'Settings',
};

/**
 * Derive a display title from the current hash path.
 * @param {string} path
 * @returns {string}
 */
function getTitleFromPath(path) {
  if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];

  // Project sub-routes: /projects/:id/board etc.
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'projects') {
    const sub = segments[2];
    if (sub) {
      const subTitles = {
        board:       'Kanban Board',
        backlog:     'Backlog',
        sprint:      'Sprint',
        gantt:       'Gantt Chart',
        maintenance: 'Maintenance',
        reports:     'Reports',
      };
      return subTitles[sub] || 'Project';
    }
    return 'Project Detail';
  }

  return 'TRACKLY';
}

/**
 * Get initials from a name string for avatar display.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Build topbar HTML.
 * @param {Object} [user]
 * @returns {string}
 */
function buildTopbarHTML(user) {
  const initials = user ? getInitials(user.full_name || user.username || 'User') : 'U';
  const userName = user ? (user.full_name || user.username || 'User') : 'User';
  const userRole = user ? (user.role || 'member') : 'member';

  return `
    <div class="topbar__left">
      <span class="topbar__title" id="topbarTitle">TRACKLY</span>
    </div>
    <div class="topbar__right">
      <button
        class="btn btn--ghost btn--icon topbar__user-btn"
        id="topbarUserBtn"
        aria-haspopup="true"
        aria-expanded="false"
        aria-label="User menu"
        data-tooltip="Account &amp; settings"
        title="${userName}">
        <div class="avatar avatar--md" aria-hidden="true">
          <span>${initials}</span>
        </div>
      </button>

      <div class="topbar__dropdown" id="topbarDropdown" role="menu" aria-hidden="true">
        <div class="topbar__dropdown-header">
          <div class="avatar avatar--lg">
            <span>${initials}</span>
          </div>
          <div>
            <div class="topbar__dropdown-name">${userName}</div>
            <div class="topbar__dropdown-role text-muted">${userRole}</div>
          </div>
        </div>
        <div class="topbar__dropdown-divider"></div>
        <a href="#/guide" class="topbar__dropdown-item" role="menuitem">
          <i data-lucide="book-open" aria-hidden="true"></i>
          User Guide
        </a>
        <a href="#/settings" class="topbar__dropdown-item" role="menuitem">
          <i data-lucide="settings" aria-hidden="true"></i>
          Settings
        </a>
        <div class="topbar__dropdown-divider"></div>
        <button class="topbar__dropdown-item" id="topbarLogoutBtn" role="menuitem">
          <i data-lucide="log-out" aria-hidden="true"></i>
          Sign Out
        </button>
      </div>
    </div>
  `;
}

/**
 * Update the topbar title based on current route.
 */
export function updateTopbarTitle() {
  const titleEl = document.getElementById('topbarTitle');
  if (!titleEl) return;
  const path = window.location.hash.replace(/^#/, '') || '/';
  titleEl.textContent = getTitleFromPath(path);
}

/**
 * Initialize the user dropdown toggle.
 * @param {Function} onLogout
 */
function initDropdown(onLogout) {
  const btn      = document.getElementById('topbarUserBtn');
  const dropdown = document.getElementById('topbarDropdown');
  if (!btn || !dropdown) return;

  const toggle = () => {
    const isOpen = dropdown.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(isOpen));
    dropdown.setAttribute('aria-hidden', String(!isOpen));
  };

  const close = () => {
    dropdown.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const logoutBtn = document.getElementById('topbarLogoutBtn');
  if (logoutBtn && typeof onLogout === 'function') {
    logoutBtn.addEventListener('click', () => {
      close();
      onLogout();
    });
  }
}

/**
 * Mount the topbar into the given element.
 * @param {HTMLElement} el - The <header class="topbar"> element
 * @param {Object} [user] - Current user object from auth
 * @param {Function} [onLogout] - Callback for logout
 */
export function initTopbar(el, user, onLogout) {
  if (!el) return;

  el.innerHTML = buildTopbarHTML(user);

  updateTopbarTitle();
  window.addEventListener('hashchange', updateTopbarTitle);

  initDropdown(onLogout);
}

export default { initTopbar, updateTopbarTitle };
