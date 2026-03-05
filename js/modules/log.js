/**
 * TRACKLY — log.js
 * Phase 27: Audit Trail — Enhanced with show-more, search, and improved timeline UI.
 * Admin/PM only. Timeline list, filter bar, search, show-more.
 */

import { getAll, getByIndex } from '../core/db.js';
import { sanitize, formatDate, formatRelativeDate, toTitleCase, getInitials, buildProjectBanner } from '../core/utils.js';
import { getSession } from '../core/auth.js';
import { renderBadge } from '../components/badge.js';
import { openModal, closeModal } from '../components/modal.js';

const INITIAL_SHOW = 5;
const LOAD_MORE_COUNT = 10;

let _logs = [];
let _users = [];
let _projectId = null;
let _filterEntityType = '';
let _filterActorId = '';
let _filterAction = '';
let _filterDateFrom = '';
let _filterDateTo = '';
let _searchQuery = '';
let _visibleCount = INITIAL_SHOW;

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function render(params) {
  _projectId = params?.id || null;
  const content = document.getElementById('main-content');
  if (!content) return;

  // Role guard
  const session = getSession();
  if (!session || !['admin', 'pm'].includes(session.role)) {
    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="lock" class="empty-state__icon" aria-hidden="true"></i>
          <p class="empty-state__title">Access Restricted</p>
          <p class="empty-state__text">The activity log is only visible to Admin and PM users.</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading activity log...</p></div>
    </div>`;

  try {
    const [allLogs, allUsers, project] = await Promise.all([
      _projectId ? getByIndex('activity_log', 'project_id', _projectId) : getAll('activity_log'),
      getAll('users'),
      _projectId ? (await getAll('projects')).find(p => p.id === _projectId) : null,
    ]);

    _logs = allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    _users = allUsers;

    // Build project banner if inside a project
    let bannerHtml = '';
    if (_projectId && project) {
      const session = getSession();
      const isAdminOrPM = session && ['admin', 'pm'].includes(session.role);
      bannerHtml = await buildProjectBanner(project, 'log', { renderBadge, isAdminOrPM });
    }

    _visibleCount = INITIAL_SHOW;
    _searchQuery = '';
    _filterEntityType = '';
    _filterActorId = '';
    _filterAction = '';
    _filterDateFrom = '';
    _filterDateTo = '';

    content.innerHTML = `
      <div class="page-container page-enter${bannerHtml ? ' project-detail-page' : ''}">
        ${bannerHtml}
        <div class="page-header">
          <div class="page-header__info">
            <h1 class="page-header__title">
              <i data-lucide="clock" aria-hidden="true"></i>
              Activity Log${project ? ` — ${sanitize(project.name)}` : ' (Global)'}
            </h1>
            <p class="page-header__subtitle">Complete history of actions${project ? ' in this project' : ' across all projects'}.</p>
          </div>
        </div>
        <div class="project-tab-body">
        <div class="log-toolbar" style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-4);">
          <div class="log-search" style="flex:1;min-width:180px;position:relative;">
            <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--color-text-tertiary);pointer-events:none;" aria-hidden="true"></i>
            <input type="text" class="form-input" id="logSearchInput" placeholder="Search by actor, entity, or action..." style="padding-left:32px;" autocomplete="off" />
          </div>
          <div class="filter-btn-wrap">
            <button class="btn btn--secondary" id="btnOpenLogFilter">
              <i data-lucide="filter" aria-hidden="true"></i> Filter
            </button>
            ${[_filterEntityType, _filterActorId, _filterAction, _filterDateFrom, _filterDateTo].filter(Boolean).length > 0
        ? `<span class="filter-badge">${[_filterEntityType, _filterActorId, _filterAction, _filterDateFrom, _filterDateTo].filter(Boolean).length}</span>` : ''}
          </div>
        </div>
        <div class="filter-chips" id="logFilterChips">${_renderLogFilterChips()}</div>
        <div id="logContent"></div>
        </div>
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    if (_projectId && project) {
      document.getElementById('btnBannerEditProject')?.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('trackly:editProject', { detail: { projectId: project.id } }));
      });
    }
    _bindFilterBar();
    _renderLogContent();
  } catch (err) {
    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to load log</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function _renderLogFilterChips() {
  const uniqueActors = [...new Map(_logs.map(l => [l.actor_id, { id: l.actor_id, name: l.actor_name }])).values()];
  const chips = [];
  if (_filterEntityType) chips.push(`<span class="filter-chip" data-key="entity"><span class="filter-chip__label">Entity: ${sanitize(toTitleCase(_filterEntityType))}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  if (_filterActorId) {
    const actor = uniqueActors.find(a => a.id === _filterActorId);
    chips.push(`<span class="filter-chip" data-key="actor"><span class="filter-chip__label">Actor: ${sanitize(actor?.name || _filterActorId)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterAction) chips.push(`<span class="filter-chip" data-key="action"><span class="filter-chip__label">Action: ${sanitize(toTitleCase(_filterAction.replace(/_/g, ' ')))}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  if (_filterDateFrom) chips.push(`<span class="filter-chip" data-key="dateFrom"><span class="filter-chip__label">From: ${sanitize(_filterDateFrom)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  if (_filterDateTo) chips.push(`<span class="filter-chip" data-key="dateTo"><span class="filter-chip__label">To: ${sanitize(_filterDateTo)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  return chips.join('');
}

function _bindFilterBar() {
  document.getElementById('btnOpenLogFilter')?.addEventListener('click', _openLogFilterModal);
  document.getElementById('logFilterChips')?.addEventListener('click', _handleLogChipRemove);
  document.getElementById('logSearchInput')?.addEventListener('input', (e) => {
    _searchQuery = e.target.value;
    _visibleCount = INITIAL_SHOW;
    _renderLogContent();
  });
}

function _handleLogChipRemove(e) {
  const btn = e.target.closest('.filter-chip__remove');
  if (!btn) return;
  const key = btn.closest('.filter-chip')?.dataset.key;
  if (key === 'entity') _filterEntityType = '';
  if (key === 'actor') _filterActorId = '';
  if (key === 'action') _filterAction = '';
  if (key === 'dateFrom') _filterDateFrom = '';
  if (key === 'dateTo') _filterDateTo = '';
  _visibleCount = INITIAL_SHOW; _renderLogContent(); _updateLogFilterUI();
}

function _openLogFilterModal() {
  const uniqueActors = [...new Map(_logs.map(l => [l.actor_id, { id: l.actor_id, name: l.actor_name }])).values()];
  const entityTypes = [...new Set(_logs.map(l => l.entity_type))].filter(Boolean);
  const actions = [...new Set(_logs.map(l => l.action))].filter(Boolean);

  openModal({
    title: 'Filter Audit Log',
    size: 'md',
    body: `<div class="filter-modal-grid">
      <div class="form-group">
        <label class="form-label" for="fmLogFilterEntity">Entity Type</label>
        <select class="form-select" id="fmLogFilterEntity">
          <option value="">All types</option>
          ${entityTypes.map(t => `<option value="${sanitize(t)}" ${_filterEntityType === t ? 'selected' : ''}>${sanitize(toTitleCase(t))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmLogFilterActor">Actor</label>
        <select class="form-select" id="fmLogFilterActor">
          <option value="">All users</option>
          ${uniqueActors.map(a => `<option value="${sanitize(a.id || '')}" ${_filterActorId === (a.id || '') ? 'selected' : ''}>${sanitize(a.name || 'Unknown')}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmLogFilterAction">Action</label>
        <select class="form-select" id="fmLogFilterAction">
          <option value="">All actions</option>
          ${actions.map(a => `<option value="${sanitize(a)}" ${_filterAction === a ? 'selected' : ''}>${sanitize(toTitleCase(a.replace(/_/g, ' ')))}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmLogFilterDateFrom">From</label>
        <input type="date" class="form-input" id="fmLogFilterDateFrom" value="${sanitize(_filterDateFrom)}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="fmLogFilterDateTo">To</label>
        <input type="date" class="form-input" id="fmLogFilterDateTo" value="${sanitize(_filterDateTo)}" />
      </div>
    </div>`,
    footer: `
      <button class="btn btn--outline" id="btnResetLogFilter">Reset Filter</button>
      <button class="btn btn--primary" id="btnApplyLogFilter"><i data-lucide="check" aria-hidden="true"></i> Apply Filter</button>`,
  });
  document.getElementById('btnResetLogFilter')?.addEventListener('click', () => {
    _filterEntityType = ''; _filterActorId = ''; _filterAction = ''; _filterDateFrom = ''; _filterDateTo = '';
    closeModal(); _visibleCount = INITIAL_SHOW; _renderLogContent(); _updateLogFilterUI();
  });
  document.getElementById('btnApplyLogFilter')?.addEventListener('click', () => {
    _filterEntityType = document.getElementById('fmLogFilterEntity')?.value || '';
    _filterActorId = document.getElementById('fmLogFilterActor')?.value || '';
    _filterAction = document.getElementById('fmLogFilterAction')?.value || '';
    _filterDateFrom = document.getElementById('fmLogFilterDateFrom')?.value || '';
    _filterDateTo = document.getElementById('fmLogFilterDateTo')?.value || '';
    closeModal(); _visibleCount = INITIAL_SHOW; _renderLogContent(); _updateLogFilterUI();
  });
}

function _updateLogFilterUI() {
  const wrap = document.getElementById('btnOpenLogFilter')?.closest('.filter-btn-wrap');
  if (wrap) {
    wrap.querySelector('.filter-badge')?.remove();
    const count = [_filterEntityType, _filterActorId, _filterAction, _filterDateFrom, _filterDateTo].filter(Boolean).length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'filter-badge';
      badge.textContent = count;
      wrap.appendChild(badge);
    }
  }
  const chips = document.getElementById('logFilterChips');
  if (chips) chips.innerHTML = _renderLogFilterChips();
}

// ─── Log Content ──────────────────────────────────────────────────────────────

function _getFilteredLogs() {
  const q = _searchQuery.toLowerCase().trim();
  return _logs.filter(log => {
    if (_filterEntityType && log.entity_type !== _filterEntityType) return false;
    if (_filterActorId && log.actor_id !== _filterActorId) return false;
    if (_filterAction && log.action !== _filterAction) return false;
    if (_filterDateFrom) {
      const logDate = log.created_at?.slice(0, 10);
      if (!logDate || logDate < _filterDateFrom) return false;
    }
    if (_filterDateTo) {
      const logDate = log.created_at?.slice(0, 10);
      if (!logDate || logDate > _filterDateTo) return false;
    }
    if (q) {
      const actorMatch = (log.actor_name || '').toLowerCase().includes(q);
      const entityMatch = (log.entity_name || '').toLowerCase().includes(q);
      const actionMatch = (log.action || '').toLowerCase().replace(/_/g, ' ').includes(q);
      const entityTypeMatch = (log.entity_type || '').toLowerCase().includes(q);
      if (!actorMatch && !entityMatch && !actionMatch && !entityTypeMatch) return false;
    }
    return true;
  });
}

function _renderLogContent() {
  const container = document.getElementById('logContent');
  if (!container) return;

  const filtered = _getFilteredLogs();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="card__body">
          <div class="empty-state">
            <i data-lucide="activity" class="empty-state__icon" aria-hidden="true"></i>
            <p class="empty-state__title">No activity found</p>
            <p class="empty-state__text">${_searchQuery ? 'No results match your search.' : 'Actions performed in this project will appear here.'}</p>
          </div>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  const visible = filtered.slice(0, _visibleCount);
  const remaining = filtered.length - _visibleCount;

  container.innerHTML = `
    <div class="card">
      <div class="card__header" style="display:flex;align-items:center;justify-content:space-between;">
        <span class="card__title">
          <i data-lucide="activity" aria-hidden="true"></i>
          ${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}
        </span>
        <span class="text-muted" style="font-size:var(--text-sm);">
          Showing ${Math.min(_visibleCount, filtered.length)} of ${filtered.length}
        </span>
      </div>
      <div class="log-timeline">
        ${visible.map(log => _renderLogEntry(log)).join('')}
      </div>
      ${remaining > 0 ? `
        <div style="padding:var(--space-3);text-align:center;border-top:1px solid var(--color-border);">
          <button class="btn btn--outline btn--sm" id="logShowMoreBtn" style="border-radius:999px;padding:6px 20px;gap:6px;">
            <i data-lucide="chevron-down" style="width:14px;height:14px;" aria-hidden="true"></i>
            Show ${Math.min(remaining, LOAD_MORE_COUNT)} more
          </button>
        </div>` : ''}
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Show more button
  container.querySelector('#logShowMoreBtn')?.addEventListener('click', () => {
    _visibleCount += LOAD_MORE_COUNT;
    _renderLogContent();
  });

  // Toggle diff
  container.querySelectorAll('.log-entry__diff-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const diffEl = btn.closest('.log-entry').querySelector('.log-entry__diff');
      if (diffEl) {
        const isHidden = diffEl.style.display === 'none' || !diffEl.style.display;
        diffEl.style.display = isHidden ? 'block' : 'none';
        btn.textContent = isHidden ? 'Hide changes' : 'Show changes';
      }
    });
  });
}

const ACTION_COLORS = {
  'created': '#16A34A',
  'updated': '#2563EB',
  'deleted': '#DC2626',
  'status_changed': '#D97706',
  'assigned': '#0891B2',
  'unassigned': '#7C3AED',
  'commented': '#2563EB',
  'uploaded': '#0891B2',
  'sprint_started': '#16A34A',
  'sprint_completed': '#16A34A',
  'member_added': '#0891B2',
  'member_removed': '#DC2626',
};

function _renderLogEntry(log) {
  const actor = _users.find(u => u.id === log.actor_id);
  const initials = actor ? (actor.full_name ? actor.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('') : '?') : (log.actor_name?.[0]?.toUpperCase() || '?');
  const actorName = sanitize(log.actor_name || 'Unknown');
  const actionIcon = _getActionIcon(log.action);
  const actionLabel = _buildActionLabel(log);
  const hasChanges = Array.isArray(log.changes) && log.changes.length > 0;
  const iconColor = ACTION_COLORS[log.action] || 'var(--color-text-tertiary)';

  return `
    <div class="log-entry">
      <div class="log-entry__icon-dot" style="background:${iconColor};">
        <i data-lucide="${actionIcon}" style="width:12px;height:12px;color:#fff;" aria-hidden="true"></i>
      </div>
      <div class="log-entry__body">
        <div class="log-entry__header">
          <div class="log-entry__avatar" title="${actorName}">
            ${actor?.avatar
      ? `<img src="${actor.avatar}" alt="${actorName}" class="log-entry__avatar-img" />`
      : `<span class="log-entry__avatar-initials">${initials}</span>`}
          </div>
          <div class="log-entry__text-wrap">
            <span class="log-entry__text">${actionLabel}</span>
            <span class="log-entry__time" title="${sanitize(formatDate(log.created_at, 'datetime'))}">
              ${sanitize(formatRelativeDate(log.created_at))}
            </span>
          </div>
        </div>
        ${hasChanges ? `
          <button class="log-entry__diff-toggle" type="button">Show changes</button>
          <div class="log-entry__diff" style="display:none;">
            <table class="log-diff-table">
              <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
              <tbody>
                ${log.changes.map(c => `
                  <tr>
                    <td class="log-diff-table__field">${sanitize(toTitleCase(String(c.field || '')))}</td>
                    <td class="log-diff-table__old">${_renderDiffValue(c.old_value)}</td>
                    <td class="log-diff-table__new">${_renderDiffValue(c.new_value)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}
        ${log.metadata && Object.keys(log.metadata).length > 0
      ? `<p class="log-entry__meta">${Object.entries(log.metadata).map(([k, v]) => `<span>${sanitize(toTitleCase(k))}: ${sanitize(String(v))}</span>`).join(' · ')}</p>`
      : ''}
      </div>
    </div>`;
}

function _buildActionLabel(log) {
  const actor = `<strong>${sanitize(log.actor_name || 'Someone')}</strong>`;
  const entity = log.entity_name ? `<strong>${sanitize(log.entity_name)}</strong>` : `<em>${sanitize(log.entity_id || '')}</em>`;
  const entityType = toTitleCase(log.entity_type || '');

  const actionMap = {
    'created': `${actor} created ${entityType} ${entity}`,
    'updated': `${actor} updated ${entityType} ${entity}`,
    'deleted': `${actor} deleted ${entityType} ${entity}`,
    'status_changed': `${actor} changed status of ${entityType} ${entity}`,
    'assigned': `${actor} assigned ${entityType} ${entity}`,
    'unassigned': `${actor} unassigned ${entityType} ${entity}`,
    'commented': `${actor} commented on ${entityType} ${entity}`,
    'uploaded': `${actor} uploaded a file to ${entityType} ${entity}`,
    'sprint_started': `${actor} started Sprint ${entity}`,
    'sprint_completed': `${actor} completed Sprint ${entity}`,
    'member_added': `${actor} added member to ${entity}`,
    'member_removed': `${actor} removed member from ${entity}`,
  };

  return actionMap[log.action] || `${actor} performed <em>${sanitize(log.action)}</em> on ${entityType} ${entity}`;
}

function _getActionIcon(action) {
  const map = {
    'created': 'plus-circle',
    'updated': 'edit-2',
    'deleted': 'trash-2',
    'status_changed': 'refresh-cw',
    'assigned': 'user-check',
    'unassigned': 'user-minus',
    'commented': 'message-circle',
    'uploaded': 'upload',
    'sprint_started': 'play-circle',
    'sprint_completed': 'check-circle',
    'member_added': 'user-plus',
    'member_removed': 'user-minus',
  };
  return map[action] || 'activity';
}

function _renderDiffValue(val) {
  if (val === null || val === undefined || val === '') return `<span class="log-diff-empty">—</span>`;
  if (Array.isArray(val)) return sanitize(val.join(', '));
  return sanitize(String(val));
}

export default { render };
