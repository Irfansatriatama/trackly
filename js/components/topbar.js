/**
 * TRACKLY — topbar.js
 * Phase 23: Added Notification Bell + Dropdown.
 */

import { appStore } from '../core/store.js';

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/meetings': 'Meetings',
  '/clients': 'Clients',
  '/members': 'Members',
  '/assets': 'Assets',
  '/settings': 'Settings',
  '/notes': 'Personal Notes',
  '/notifications': 'Notification Center',
};

function getTitleFromPath(path) {
  if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'projects') {
    const sub = segments[2];
    if (sub) {
      const subTitles = { board: 'Kanban Board', backlog: 'Backlog', sprint: 'Sprint', gantt: 'Gantt Chart', discussion: 'Discussion', maintenance: 'Maintenance', reports: 'Reports', log: 'Activity Log' };
      return subTitles[sub] || 'Project';
    }
    return 'Project Detail';
  }
  return 'TRACKLY';
}

function getInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function buildTopbarHTML(user) {
  const initials = user ? getInitials(user.full_name || user.username || 'User') : 'U';
  const userName = user ? (user.full_name || user.username || 'User') : 'User';
  const userRole = user ? (user.role || 'member') : 'member';
  const isAdmin = userRole === 'admin';

  return `
    <div class="topbar__left">
      <span class="topbar__title" id="topbarTitle">TRACKLY</span>
    </div>
    <div class="topbar__right">

      <!-- Notification Bell -->
      <div class="notif-bell" id="notifBell">
        <button class="btn btn--ghost btn--icon notif-bell__btn" id="notifBellBtn"
          aria-haspopup="true" aria-expanded="false" aria-label="Notifications">
          <i data-lucide="bell" aria-hidden="true"></i>
          <span class="notif-bell__badge" id="notifBadge" style="display:none;">0</span>
        </button>

        <div class="notif-dropdown" id="notifDropdown" aria-hidden="true">
          <div class="notif-dropdown__header">
            <span class="notif-dropdown__title">Notifications</span>
            <button class="btn btn--ghost btn--sm notif-dropdown__mark-all" id="notifMarkAllBtn" disabled>
              Mark all as read
            </button>
          </div>
          <div class="notif-dropdown__list" id="notifList">
            <div class="notif-dropdown__loading">
              <div class="app-loading__spinner" style="width:20px;height:20px;border-width:2px;"></div>
            </div>
          </div>
          <div class="notif-dropdown__footer">
            <a href="#/notifications" class="notif-dropdown__see-all" id="notifSeeAll">
              <i data-lucide="inbox" aria-hidden="true"></i>
              Lihat semua notifikasi
            </a>
          </div>
        </div>
      </div>

      <!-- User Avatar -->
      <button class="btn btn--ghost btn--icon topbar__user-btn" id="topbarUserBtn"
        aria-haspopup="true" aria-expanded="false" aria-label="User menu"
        data-tooltip="Account &amp; settings" title="${userName}">
        <div class="avatar avatar--md" aria-hidden="true">
          <span>${initials}</span>
        </div>
      </button>

      <div class="topbar__dropdown" id="topbarDropdown" role="menu" aria-hidden="true">
        <div class="topbar__dropdown-header">
          <div class="avatar avatar--lg"><span>${initials}</span></div>
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
        ${!isAdmin ? `
        <button class="topbar__dropdown-item" id="topbarChangePasswordBtn" role="menuitem">
          <i data-lucide="key" aria-hidden="true"></i>
          Change Password
        </button>` : ''}
        <div class="topbar__dropdown-divider"></div>
        <button class="topbar__dropdown-item" id="topbarLogoutBtn" role="menuitem">
          <i data-lucide="log-out" aria-hidden="true"></i>
          Sign Out
        </button>
      </div>
    </div>
  `;
}

export function updateTopbarTitle() {
  const titleEl = document.getElementById('topbarTitle');
  if (!titleEl) return;
  const path = window.location.hash.replace(/^#/, '') || '/';
  titleEl.textContent = getTitleFromPath(path);
}

export async function refreshNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  try {
    const { getAll } = await import('../core/db.js');
    const { getSession } = await import('../core/auth.js');
    const session = getSession();
    if (!session) return;
    const all = await getAll('notifications');
    const count = all.filter((n) => n.user_id === session.userId && !n.read).length;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  } catch (_) { /* silent */ }
}

function relativeTimeID(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60000) return 'baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit yang lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam yang lalu`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} hari yang lalu`;
  return `${Math.floor(diff / 604800000)} minggu yang lalu`;
}

function getNotifHref(notif) {
  const { entity_type, entity_id, project_id } = notif;
  if (entity_type === 'task' && project_id) return `#/projects/${project_id}/backlog`;
  if (entity_type === 'sprint' && project_id) return `#/projects/${project_id}/sprint`;
  if (entity_type === 'meeting' && entity_id) return `#/meetings/${entity_id}`;
  if (entity_type === 'maintenance' && project_id) return `#/projects/${project_id}/maintenance`;
  if (entity_type === 'discussion' && project_id) return `#/projects/${project_id}/discussion`;
  if (entity_type === 'member') return `#/members`;
  if (entity_type === 'client') return `#/clients`;
  if (entity_type === 'asset') return `#/assets`;
  if (entity_type === 'project' && project_id) return `#/projects/${project_id}`;
  return null;
}

async function renderNotifDropdownList() {
  const listEl = document.getElementById('notifList');
  const markAllBtn = document.getElementById('notifMarkAllBtn');
  if (!listEl) return;

  try {
    const { getAll } = await import('../core/db.js');
    const { getSession } = await import('../core/auth.js');
    const session = getSession();
    if (!session) return;

    const all = await getAll('notifications');
    const mine = all
      .filter((n) => n.user_id === session.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    if (markAllBtn) markAllBtn.disabled = !mine.some((n) => !n.read);

    if (!mine.length) {
      listEl.innerHTML = `
        <div class="notif-empty">
          <i data-lucide="bell-off" class="notif-empty__icon" aria-hidden="true"></i>
          <p>Tidak ada notifikasi</p>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    listEl.innerHTML = mine.map((n) => {
      const ini = (n.actor_name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      const href = getNotifHref(n) || '';
      return `
        <div class="notif-item ${n.read ? '' : 'is-unread'}" data-id="${n.id}" data-href="${href}" role="button" tabindex="0">
          <div class="notif-item__avatar">
            <div class="avatar avatar--sm"><span>${ini}</span></div>
            ${!n.read ? '<span class="notif-item__dot" aria-hidden="true"></span>' : ''}
          </div>
          <div class="notif-item__body">
            <p class="notif-item__message">${n.message}</p>
            <span class="notif-item__time">${relativeTimeID(n.created_at)}</span>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.notif-item').forEach((el) => {
      const handler = async () => {
        const nid = el.dataset.id;
        const href = el.dataset.href;
        el.classList.remove('is-unread');
        el.querySelector('.notif-item__dot')?.remove();
        try {
          const { getById, update } = await import('../core/db.js');
          const notif = await getById('notifications', nid);
          if (notif && !notif.read) { notif.read = true; await update('notifications', notif); }
        } catch (_) { /* silent */ }
        refreshNotifBadge();
        closeNotifDropdown();
        if (href) window.location.hash = href;
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handler(); });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (_) {
    listEl.innerHTML = `<p class="text-muted" style="padding:var(--space-4);">Gagal memuat notifikasi</p>`;
  }
}

function closeNotifDropdown() {
  const btn = document.getElementById('notifBellBtn');
  const dd = document.getElementById('notifDropdown');
  if (!dd) return;
  dd.classList.remove('is-open');
  dd.setAttribute('aria-hidden', 'true');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function initNotifBell() {
  const btn = document.getElementById('notifBellBtn');
  const dd = document.getElementById('notifDropdown');
  const markAllBtn = document.getElementById('notifMarkAllBtn');
  if (!btn || !dd) return;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = dd.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(isOpen));
    dd.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) {
      await renderNotifDropdownList();
      await refreshNotifBadge();
    }
  });

  markAllBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const { getAll, update } = await import('../core/db.js');
      const { getSession } = await import('../core/auth.js');
      const session = getSession();
      if (!session) return;
      const all = await getAll('notifications');
      const unread = all.filter((n) => n.user_id === session.userId && !n.read);
      for (const n of unread) { n.read = true; await update('notifications', n); }
      await renderNotifDropdownList();
      await refreshNotifBadge();
    } catch (_) { /* silent */ }
  });

  document.addEventListener('click', (e) => {
    const bell = document.getElementById('notifBell');
    if (bell && !bell.contains(e.target)) closeNotifDropdown();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNotifDropdown(); });
  document.getElementById('notifSeeAll')?.addEventListener('click', closeNotifDropdown);
}

function initDropdown(onLogout) {
  const btn = document.getElementById('topbarUserBtn');
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

  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  const logoutBtn = document.getElementById('topbarLogoutBtn');
  if (logoutBtn && typeof onLogout === 'function') {
    logoutBtn.addEventListener('click', () => { close(); onLogout(); });
  }

  const changePassBtn = document.getElementById('topbarChangePasswordBtn');
  if (changePassBtn) {
    changePassBtn.addEventListener('click', async () => {
      close();
      const { openChangePasswordModal } = await import('../modules/profile.js');
      openChangePasswordModal();
    });
  }
}

export function initTopbar(el, user, onLogout) {
  if (!el) return;
  el.innerHTML = buildTopbarHTML(user);
  updateTopbarTitle();
  window.addEventListener('hashchange', updateTopbarTitle);
  initDropdown(onLogout);
  initNotifBell();
  refreshNotifBadge();
}

export default { initTopbar, updateTopbarTitle, refreshNotifBadge };
