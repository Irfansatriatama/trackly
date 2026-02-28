/**
 * TRACKLY — log.js
 * Phase 18: Audit Trail — Per-project activity log viewer.
 * Admin/PM only. Timeline list, filter bar, pagination, diff display.
 */

import { getAll, getByIndex } from '../core/db.js';
import { sanitize, formatDate, formatRelativeDate, toTitleCase } from '../core/utils.js';
import { getSession } from '../core/auth.js';
import { getInitials } from '../core/utils.js';

const PAGE_SIZE = 50;

let _logs = [];
let _users = [];
let _projectId = null;
let _filterEntityType = '';
let _filterActorId = '';
let _filterAction = '';
let _filterDateFrom = '';
let _filterDateTo = '';
let _currentPage = 1;

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

    // Build project subnav if inside a project
    let subnavHtml = '';
    if (_projectId && project) {
      const coverColor = project.cover_color || '#2563EB';
      const { render: renderProjectsModule } = await import('./projects.js');
      // We'll render inline subnav ourselves
      subnavHtml = _renderProjectHeader(project, coverColor);
    }

    _currentPage = 1;
    _filterEntityType = '';
    _filterActorId = '';
    _filterAction = '';
    _filterDateFrom = '';
    _filterDateTo = '';

    content.innerHTML = `
      <div class="page-container page-enter">
        ${subnavHtml}
        <div class="page-header">
          <div class="page-header__info">
            <h1 class="page-header__title">
              <i data-lucide="clock" aria-hidden="true"></i>
              Activity Log${project ? ` — ${sanitize(project.name)}` : ' (Global)'}
            </h1>
            <p class="page-header__subtitle">Complete history of actions${project ? ' in this project' : ' across all projects'}.</p>
          </div>
        </div>
        ${_renderFilterBar()}
        <div id="logContent"></div>
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
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

// ─── Project Header (Subnav) ──────────────────────────────────────────────────

function _renderProjectHeader(project, coverColor) {
  const showMaintenance = ['running','maintenance'].includes(project.phase) || ['maintenance'].includes(project.status);
  return `
    <div class="project-detail-banner" style="background:${sanitize(coverColor)};">
      <div class="project-detail-banner__content">
        <div class="project-detail-banner__breadcrumb">
          <a href="#/projects" class="project-breadcrumb-link">
            <i data-lucide="folder" aria-hidden="true"></i> Projects
          </a>
          <i data-lucide="chevron-right" aria-hidden="true"></i>
          <span>${sanitize(project.name)}</span>
        </div>
        <h1 class="project-detail-banner__title">${sanitize(project.name)}</h1>
      </div>
    </div>
    <div class="project-subnav">
      <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}">
        <i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/board">
        <i data-lucide="kanban" aria-hidden="true"></i> Board
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/backlog">
        <i data-lucide="list" aria-hidden="true"></i> Backlog
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/sprint">
        <i data-lucide="zap" aria-hidden="true"></i> Sprint
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/gantt">
        <i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt
      </a>
      ${showMaintenance ? `<a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/maintenance">
        <i data-lucide="wrench" aria-hidden="true"></i> Maintenance
      </a>` : ''}
      <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/reports">
        <i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports
      </a>
      <a class="project-subnav__link is-active" href="#/projects/${sanitize(project.id)}/log">
        <i data-lucide="clock" aria-hidden="true"></i> Log
      </a>
    </div>`;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function _renderFilterBar() {
  const uniqueActors = [...new Map(_logs.map(l => [l.actor_id, { id: l.actor_id, name: l.actor_name }])).values()];
  const entityTypes = [...new Set(_logs.map(l => l.entity_type))].filter(Boolean);
  const actions = [...new Set(_logs.map(l => l.action))].filter(Boolean);

  return `
    <div class="log-filter-bar card" style="margin-bottom:var(--space-4);">
      <div class="log-filter-bar__inner">
        <div class="form-group" style="margin:0;min-width:140px;">
          <label class="form-label" for="logFilterEntity">Entity Type</label>
          <select class="form-select" id="logFilterEntity">
            <option value="">All types</option>
            ${entityTypes.map(t => `<option value="${sanitize(t)}">${sanitize(toTitleCase(t))}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;min-width:140px;">
          <label class="form-label" for="logFilterActor">Actor</label>
          <select class="form-select" id="logFilterActor">
            <option value="">All users</option>
            ${uniqueActors.map(a => `<option value="${sanitize(a.id || '')}">${sanitize(a.name || 'Unknown')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;min-width:140px;">
          <label class="form-label" for="logFilterAction">Action</label>
          <select class="form-select" id="logFilterAction">
            <option value="">All actions</option>
            ${actions.map(a => `<option value="${sanitize(a)}">${sanitize(toTitleCase(a.replace(/_/g,' ')))}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0;min-width:130px;">
          <label class="form-label" for="logFilterDateFrom">From</label>
          <input type="date" class="form-input" id="logFilterDateFrom" />
        </div>
        <div class="form-group" style="margin:0;min-width:130px;">
          <label class="form-label" for="logFilterDateTo">To</label>
          <input type="date" class="form-input" id="logFilterDateTo" />
        </div>
        <button class="btn btn--outline btn--sm" id="logFilterReset" style="align-self:flex-end;">
          <i data-lucide="x" aria-hidden="true"></i> Reset
        </button>
      </div>
    </div>`;
}

function _bindFilterBar() {
  const applyFilter = () => {
    _filterEntityType = document.getElementById('logFilterEntity')?.value || '';
    _filterActorId    = document.getElementById('logFilterActor')?.value || '';
    _filterAction     = document.getElementById('logFilterAction')?.value || '';
    _filterDateFrom   = document.getElementById('logFilterDateFrom')?.value || '';
    _filterDateTo     = document.getElementById('logFilterDateTo')?.value || '';
    _currentPage = 1;
    _renderLogContent();
  };

  ['logFilterEntity','logFilterActor','logFilterAction','logFilterDateFrom','logFilterDateTo']
    .forEach(id => document.getElementById(id)?.addEventListener('change', applyFilter));

  document.getElementById('logFilterReset')?.addEventListener('click', () => {
    ['logFilterEntity','logFilterActor','logFilterAction'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['logFilterDateFrom','logFilterDateTo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    applyFilter();
  });
}

// ─── Log Content ──────────────────────────────────────────────────────────────

function _getFilteredLogs() {
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
    return true;
  });
}

function _renderLogContent() {
  const container = document.getElementById('logContent');
  if (!container) return;

  const filtered = _getFilteredLogs();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (_currentPage > totalPages) _currentPage = totalPages;

  const start = (_currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="card__body">
          <div class="empty-state">
            <i data-lucide="activity" class="empty-state__icon" aria-hidden="true"></i>
            <p class="empty-state__title">No activity yet</p>
            <p class="empty-state__text">Actions performed in this project will appear here.</p>
          </div>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="card__header">
        <span class="card__title">
          <i data-lucide="list" aria-hidden="true"></i>
          ${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}
        </span>
        <span class="text-muted" style="font-size:var(--text-sm);">
          Page ${_currentPage} of ${totalPages}
        </span>
      </div>
      <div class="log-timeline">
        ${page.map(log => _renderLogEntry(log)).join('')}
      </div>
      ${totalPages > 1 ? _renderPagination(totalPages) : ''}
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Pagination events
  container.querySelector('#logPrevBtn')?.addEventListener('click', () => {
    if (_currentPage > 1) { _currentPage--; _renderLogContent(); }
  });
  container.querySelector('#logNextBtn')?.addEventListener('click', () => {
    if (_currentPage < totalPages) { _currentPage++; _renderLogContent(); }
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

function _renderLogEntry(log) {
  const actor = _users.find(u => u.id === log.actor_id);
  const initials = actor ? (actor.full_name ? actor.full_name.split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join('') : '?') : (log.actor_name?.[0]?.toUpperCase() || '?');
  const actorName = sanitize(log.actor_name || 'Unknown');
  const actionIcon = _getActionIcon(log.action);
  const actionLabel = _buildActionLabel(log);
  const hasChanges = Array.isArray(log.changes) && log.changes.length > 0;

  return `
    <div class="log-entry">
      <div class="log-entry__avatar" title="${actorName}">
        ${actor?.avatar
          ? `<img src="${actor.avatar}" alt="${actorName}" class="log-entry__avatar-img" />`
          : `<span class="log-entry__avatar-initials">${initials}</span>`}
      </div>
      <div class="log-entry__line"></div>
      <div class="log-entry__body">
        <div class="log-entry__header">
          <span class="log-entry__action-icon">
            <i data-lucide="${actionIcon}" aria-hidden="true"></i>
          </span>
          <span class="log-entry__text">${actionLabel}</span>
          <span class="log-entry__time" title="${sanitize(formatDate(log.created_at, 'datetime'))}">
            ${sanitize(formatRelativeDate(log.created_at))}
          </span>
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
          ? `<p class="log-entry__meta">${Object.entries(log.metadata).map(([k,v]) => `<span>${sanitize(toTitleCase(k))}: ${sanitize(String(v))}</span>`).join(' · ')}</p>`
          : ''}
      </div>
    </div>`;
}

function _buildActionLabel(log) {
  const actor = `<strong>${sanitize(log.actor_name || 'Someone')}</strong>`;
  const entity = log.entity_name ? `<strong>${sanitize(log.entity_name)}</strong>` : `<em>${sanitize(log.entity_id || '')}</em>`;
  const entityType = toTitleCase(log.entity_type || '');

  const actionMap = {
    'created':          `${actor} created ${entityType} ${entity}`,
    'updated':          `${actor} updated ${entityType} ${entity}`,
    'deleted':          `${actor} deleted ${entityType} ${entity}`,
    'status_changed':   `${actor} changed status of ${entityType} ${entity}`,
    'assigned':         `${actor} assigned ${entityType} ${entity}`,
    'unassigned':       `${actor} unassigned ${entityType} ${entity}`,
    'commented':        `${actor} commented on ${entityType} ${entity}`,
    'uploaded':         `${actor} uploaded a file to ${entityType} ${entity}`,
    'sprint_started':   `${actor} started Sprint ${entity}`,
    'sprint_completed': `${actor} completed Sprint ${entity}`,
    'member_added':     `${actor} added member to ${entity}`,
    'member_removed':   `${actor} removed member from ${entity}`,
  };

  return actionMap[log.action] || `${actor} performed <em>${sanitize(log.action)}</em> on ${entityType} ${entity}`;
}

function _getActionIcon(action) {
  const map = {
    'created':          'plus-circle',
    'updated':          'edit-2',
    'deleted':          'trash-2',
    'status_changed':   'refresh-cw',
    'assigned':         'user-check',
    'unassigned':       'user-minus',
    'commented':        'message-circle',
    'uploaded':         'upload',
    'sprint_started':   'play-circle',
    'sprint_completed': 'check-circle',
    'member_added':     'user-plus',
    'member_removed':   'user-minus',
  };
  return map[action] || 'activity';
}

function _renderDiffValue(val) {
  if (val === null || val === undefined || val === '') return `<span class="log-diff-empty">—</span>`;
  if (Array.isArray(val)) return sanitize(val.join(', '));
  return sanitize(String(val));
}

function _renderPagination(totalPages) {
  return `
    <div class="log-pagination">
      <button class="btn btn--outline btn--sm" id="logPrevBtn" ${_currentPage <= 1 ? 'disabled' : ''}>
        <i data-lucide="chevron-left" aria-hidden="true"></i> Previous
      </button>
      <span class="log-pagination__info">Page ${_currentPage} / ${totalPages}</span>
      <button class="btn btn--outline btn--sm" id="logNextBtn" ${_currentPage >= totalPages ? 'disabled' : ''}>
        Next <i data-lucide="chevron-right" aria-hidden="true"></i>
      </button>
    </div>`;
}

export default { render };
