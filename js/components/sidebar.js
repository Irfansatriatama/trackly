/**
 * TRACKLY — sidebar.js
 * Sidebar navigation component.
 * Renders nav links with Lucide icons, handles active state, collapsible toggle.
 * Phase 2 implementation.
 */

import { appStore } from '../core/store.js';

// Navigation items definition
const NAV_ITEMS = [
  {
    section: null,
    items: [
      { route: '/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
      { route: '/projects',  icon: 'folder-kanban',    label: 'Projects' },
    ],
  },
  {
    section: 'Management',
    items: [
      { route: '/clients', icon: 'building-2', label: 'Clients' },
      { route: '/members', icon: 'users',       label: 'Members' },
      { route: '/assets',  icon: 'package',     label: 'Assets' },
    ],
  },
  {
    section: 'System',
    items: [
      { route: '/settings', icon: 'settings', label: 'Settings' },
    ],
  },
];

/**
 * Build the sidebar HTML string.
 * @returns {string}
 */
function buildSidebarHTML() {
  const sectionsHTML = NAV_ITEMS.map(({ section, items }) => {
    const itemsHTML = items.map(({ route, icon, label }) => `
      <a href="#${route}"
         class="sidebar-nav-item"
         data-route="${route}"
         title="${label}"
         aria-label="${label}">
        <i data-lucide="${icon}" class="sidebar-nav-item__icon" aria-hidden="true"></i>
        <span class="sidebar-nav-item__label">${label}</span>
      </a>
    `).join('');

    const labelHTML = section
      ? `<div class="sidebar-nav-label" aria-hidden="true">${section}</div>`
      : '';

    return `<div class="sidebar-nav-section">${labelHTML}${itemsHTML}</div>`;
  }).join('');

  return `
    <div class="sidebar__header">
      <a href="#/dashboard" class="sidebar__logo" aria-label="TRACKLY Home">
        <img src="assets/logo.svg" alt="TRACKLY" width="28" height="28" />
        <span class="sidebar__logo-text">TRACKLY</span>
      </a>
      <button
        class="btn btn--ghost btn--icon"
        id="sidebarToggle"
        aria-label="Toggle sidebar"
        title="Toggle sidebar">
        <i data-lucide="panel-left-close" aria-hidden="true"></i>
      </button>
    </div>

    <nav class="sidebar__nav" aria-label="Main navigation">
      ${sectionsHTML}
    </nav>

    <div class="sidebar__footer">
      <button class="sidebar-nav-item" id="logoutBtn" style="width: 100%;" aria-label="Sign out">
        <i data-lucide="log-out" class="sidebar-nav-item__icon" aria-hidden="true"></i>
        <span class="sidebar-nav-item__label">Sign Out</span>
      </button>
    </div>
  `;
}

/**
 * Update active state on nav items based on current hash.
 */
export function updateSidebarActiveState() {
  const path = window.location.hash.replace(/^#/, '') || '/';
  document.querySelectorAll('.sidebar-nav-item[data-route]').forEach((item) => {
    const route = item.getAttribute('data-route');
    const isActive = route === '/dashboard'
      ? path === '/dashboard' || path === '/'
      : path.startsWith(route);
    item.classList.toggle('is-active', isActive);
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

/**
 * Swap the toggle button icon based on collapsed state.
 * @param {boolean} collapsed
 */
function updateToggleIcon(collapsed) {
  const toggle = document.getElementById('sidebarToggle');
  if (!toggle) return;
  const icon = toggle.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

/**
 * Initialize the sidebar toggle button.
 */
function initToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const shell  = document.getElementById('appShell');
  if (!toggle || !shell) return;

  const collapsed = localStorage.getItem('trackly_sidebar_collapsed') === 'true';
  if (collapsed) shell.classList.add('is-sidebar-collapsed');
  updateToggleIcon(collapsed);

  toggle.addEventListener('click', () => {
    shell.classList.toggle('is-sidebar-collapsed');
    const isCollapsed = shell.classList.contains('is-sidebar-collapsed');
    localStorage.setItem('trackly_sidebar_collapsed', String(isCollapsed));
    appStore.set('sidebarCollapsed', isCollapsed);
    updateToggleIcon(isCollapsed);
  });
}

/**
 * Mount the sidebar into the given element and wire up interactions.
 * @param {HTMLElement} el - The <aside class="sidebar"> element
 * @param {Function} onLogout - Callback invoked when Sign Out is clicked
 */
export function initSidebar(el, onLogout) {
  if (!el) return;

  el.innerHTML = buildSidebarHTML();

  initToggle();

  updateSidebarActiveState();
  window.addEventListener('hashchange', updateSidebarActiveState);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && typeof onLogout === 'function') {
    logoutBtn.addEventListener('click', onLogout);
  }
}

export default { initSidebar, updateSidebarActiveState };
