/**
 * TRACKLY — notifications.js
 * Phase 23: Notification Center full page (#/notifications).
 */

import { getAll, getById, update } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { refreshNotifBadge } from '../components/topbar.js';

const PAGE_SIZE = 30;

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

function renderNotifItem(n) {
  const ini = (n.actor_name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const href = getNotifHref(n) || '';
  return `
    <div class="notif-page-item ${n.read ? '' : 'is-unread'}" data-id="${n.id}" data-href="${href}" role="button" tabindex="0">
      <div class="notif-item__avatar">
        <div class="avatar avatar--sm"><span>${ini}</span></div>
        ${!n.read ? '<span class="notif-item__dot" aria-hidden="true"></span>' : ''}
      </div>
      <div class="notif-item__body">
        <p class="notif-item__message">${n.message}</p>
        <span class="notif-item__time">${relativeTimeID(n.created_at)}</span>
      </div>
      ${!n.read ? '<span class="notif-page-item__unread-label">Baru</span>' : ''}
    </div>`;
}

function renderEmptyState(tab) {
  const msg = tab === 'unread' ? 'Tidak ada notifikasi yang belum dibaca' : 'Tidak ada notifikasi';
  return `
    <div class="notif-page-empty">
      <i data-lucide="bell-off" aria-hidden="true"></i>
      <p>${msg}</p>
    </div>`;
}

export async function render() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const session = getSession();
  if (!session) return;

  main.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Notification Center</h1>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--secondary" id="notifPageMarkAllBtn">
            <i data-lucide="check-check" aria-hidden="true"></i>
            Mark All as Read
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card__body">
          <!-- Tab filter -->
          <div class="notif-page-tabs" id="notifPageTabs">
            <button class="notif-page-tab is-active" data-tab="all">Semua</button>
            <button class="notif-page-tab" data-tab="unread">Belum Dibaca</button>
          </div>

          <!-- List -->
          <div id="notifPageList" class="notif-page-list">
            <div class="app-loading"><div class="app-loading__spinner"></div></div>
          </div>

          <!-- Pagination -->
          <div class="notif-page-pagination" id="notifPagePagination"></div>
        </div>
      </div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  let currentTab = 'all';
  let currentPage = 1;
  let allNotifs = [];

  async function loadData() {
    const all = await getAll('notifications');
    allNotifs = all
      .filter((n) => n.user_id === session.userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100);
    renderPage();
  }

  function renderPage() {
    const listEl = document.getElementById('notifPageList');
    const paginEl = document.getElementById('notifPagePagination');
    const markAllBtn = document.getElementById('notifPageMarkAllBtn');
    if (!listEl) return;

    const filtered = currentTab === 'unread'
      ? allNotifs.filter((n) => !n.read)
      : allNotifs;

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const paginated = filtered.slice(start, start + PAGE_SIZE);

    // Mark all button
    const hasUnread = allNotifs.some((n) => !n.read);
    if (markAllBtn) markAllBtn.disabled = !hasUnread;

    if (!paginated.length) {
      listEl.innerHTML = renderEmptyState(currentTab);
    } else {
      listEl.innerHTML = paginated.map(renderNotifItem).join('');
      // Wire item clicks
      listEl.querySelectorAll('.notif-page-item').forEach((el) => {
        const handler = async () => {
          const nid = el.dataset.id;
          const href = el.dataset.href;
          el.classList.remove('is-unread');
          el.querySelector('.notif-item__dot')?.remove();
          el.querySelector('.notif-page-item__unread-label')?.remove();
          try {
            const notif = await getById('notifications', nid);
            if (notif && !notif.read) { notif.read = true; await update('notifications', notif); }
            // Update in-memory
            const idx = allNotifs.findIndex((n) => n.id === nid);
            if (idx !== -1) allNotifs[idx].read = true;
          } catch (_) { /* silent */ }
          refreshNotifBadge();
          if (href) { window.location.hash = href; }
        };
        el.addEventListener('click', handler);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handler(); });
      });
    }

    // Pagination
    if (paginEl) {
      if (totalPages <= 1) {
        paginEl.innerHTML = '';
      } else {
        let pages = '';
        for (let i = 1; i <= totalPages; i++) {
          pages += `<button class="btn btn--sm ${i === currentPage ? 'btn--primary' : 'btn--ghost'} notif-pag-btn" data-page="${i}">${i}</button>`;
        }
        paginEl.innerHTML = `
          <button class="btn btn--sm btn--ghost notif-pag-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" aria-hidden="true"></i>
          </button>
          ${pages}
          <button class="btn btn--sm btn--ghost notif-pag-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right" aria-hidden="true"></i>
          </button>`;
        paginEl.querySelectorAll('.notif-pag-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const pg = parseInt(btn.dataset.page, 10);
            if (pg >= 1 && pg <= totalPages) { currentPage = pg; renderPage(); }
          });
        });
      }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Tab switching
  document.getElementById('notifPageTabs')?.addEventListener('click', (e) => {
    const tab = e.target.dataset.tab;
    if (!tab) return;
    currentTab = tab;
    currentPage = 1;
    document.querySelectorAll('.notif-page-tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
    renderPage();
  });

  // Mark all
  document.getElementById('notifPageMarkAllBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('notifPageMarkAllBtn');
    if (btn) btn.disabled = true;
    try {
      const unread = allNotifs.filter((n) => !n.read);
      for (const n of unread) {
        n.read = true;
        await update('notifications', n);
      }
      refreshNotifBadge();
      // Re-fetch from Firestore so the in-memory list is in sync with the server
      await loadData();
    } catch (_) { /* silent */ }
    finally {
      if (btn) btn.disabled = false;
    }
  });


  await loadData();
}

export default { render };
