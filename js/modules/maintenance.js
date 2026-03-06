/**
 * TRACKLY — maintenance.js
 * Phase 12 → Phase 21 → Phase 26
 * Phase 26: Board Kanban view, 6+2 status pipeline, view toggle (List/Board) per project,
 *   drag & drop with role-based permission, filter bar, form revamp.
 */

import { getAll, getById, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, formatRelativeDate, sanitize, debug, logActivity, getInitials, buildProjectBanner } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { getSession } from '../core/auth.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'user_request', label: 'User Request' },
  { value: 'incident', label: 'Incident' },
];

const TICKET_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const MAIN_PIPELINE_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'on_check', label: 'On Check' },
  { value: 'need_revision', label: 'Need Revision' },
  { value: 'completed', label: 'Completed' },
];

const PARKING_LOT_STATUSES = [
  { value: 'canceled', label: 'Canceled' },
  { value: 'on_hold', label: 'On Hold' },
];

const TICKET_STATUS_OPTIONS = [
  ...MAIN_PIPELINE_STATUSES,
  ...PARKING_LOT_STATUSES,
];

const TICKET_SEVERITY_OPTIONS = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
];

const STATUS_PIPELINE = ['backlog', 'in_progress', 'awaiting_approval', 'on_check', 'need_revision', 'completed'];

const ID_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function formatDateID(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return String(dateStr);
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Module State ─────────────────────────────────────────────────────────────

let _projectId = null;
let _project = null;
let _tickets = [];
let _members = [];
let _filterStatus = '';
let _filterType = '';
let _filterPriority = '';
let _filterSeverity = '';
let _searchQuery = '';
let _pendingAttachments = [];
let _currentView = 'board';

// Board filter state
let _boardFilterPriority = '';
let _boardFilterType = '';
let _boardFilterSeverity = '';
let _boardFilterAssignee = '';

// Drag state
let _dragTicketId = null;
let _dragOverCol = null;

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function render(params = {}) {
  _projectId = params.id;
  const session = getSession();
  if (!session) { window.location.hash = '#/login'; return; }

  if (!_projectId) {
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">No project specified</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  try {
    [_project, _tickets, _members] = await Promise.all([
      getById('projects', _projectId),
      getAll('maintenance'),
      getAll('users'),
    ]);

    if (!_project) {
      document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="folder-x" class="empty-state__icon"></i><p class="empty-state__title">Project not found</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const allowedPhases = ['running', 'maintenance'];
    if (!allowedPhases.includes(_project.phase) && _project.status !== 'maintenance') {
      document.getElementById('main-content').innerHTML = `
        <div class="page-container page-enter">
          ${_buildSubnav()}
          <div class="empty-state" style="margin-top:var(--space-10);">
            <i data-lucide="wrench" class="empty-state__icon"></i>
            <p class="empty-state__title">Maintenance module not available</p>
            <p class="empty-state__text">This module is only available for projects in <strong>Running</strong> or <strong>Maintenance</strong> phase.</p>
            <a href="#/projects/${sanitize(_projectId)}" class="btn btn--primary">Back to Overview</a>
          </div>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    _tickets = _tickets.filter(t => t.project_id === _projectId);

    // Role-based visibility
    if (session.role === 'developer') {
      _tickets = _tickets.filter(t => {
        if (!t.pic_dev_ids || t.pic_dev_ids.length === 0) return true;
        return t.pic_dev_ids.includes(session.userId);
      });
    }

    _filterStatus = ''; _filterType = ''; _filterPriority = ''; _filterSeverity = ''; _searchQuery = '';
    _boardFilterPriority = ''; _boardFilterType = ''; _boardFilterSeverity = ''; _boardFilterAssignee = '';

    // Restore view preference
    try {
      const stored = localStorage.getItem(`trackly_maintenance_view_${_projectId}`);
      _currentView = stored === 'list' ? 'list' : 'board';
    } catch { _currentView = 'board'; }

    await renderMaintenancePage();
  } catch (err) {
    debug('Maintenance render error:', err);
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load maintenance tickets</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function _saveViewPref(view) {
  try { localStorage.setItem(`trackly_maintenance_view_${_projectId}`, view); } catch { }
}

// ─── Page Render ─────────────────────────────────────────────────────────────

async function renderMaintenancePage() {
  const session = getSession();
  const canCreate = session && ['admin', 'pm'].includes(session.role);
  const isAdminOrPM = session && ['admin', 'pm'].includes(session.role);
  const content = document.getElementById('main-content');
  if (!content) return;
  const stats = _computeStats();
  const banner = await buildProjectBanner(_project, 'maintenance', { renderBadge, isAdminOrPM });

  content.innerHTML = `
    <div class="page-container page-enter project-detail-page">
      ${banner}
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Maintenance</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)} — Live system ticket tracking</p>
        </div>
        <div class="page-header__actions">
          <div class="mnt-view-toggle">
            <button class="btn btn--secondary btn--sm mnt-view-btn${_currentView === 'list' ? ' is-active' : ''}" data-view="list">
              <i data-lucide="list" aria-hidden="true"></i> List
            </button>
            <button class="btn btn--secondary btn--sm mnt-view-btn${_currentView === 'board' ? ' is-active' : ''}" data-view="board">
              <i data-lucide="columns" aria-hidden="true"></i> Board
            </button>
          </div>
          ${canCreate ? `<button class="btn btn--primary" id="btnNewTicket"><i data-lucide="plus" aria-hidden="true"></i> New Ticket</button>` : ''}
          ${isAdminOrPM ? `<a href="#/projects/${sanitize(_projectId)}/maintenance-report" class="btn btn--outline"><i data-lucide="file-text" aria-hidden="true"></i> Generate Report</a>` : ''}
        </div>
      </div>
      <div class="project-tab-body">
        <div class="mnt-stats-row">
          <div class="mnt-stat-card"><span class="mnt-stat-card__num">${stats.total}</span><span class="mnt-stat-card__label">Total</span></div>
          <div class="mnt-stat-card mnt-stat-card--open"><span class="mnt-stat-card__num">${stats.backlog}</span><span class="mnt-stat-card__label">Backlog</span></div>
          <div class="mnt-stat-card mnt-stat-card--progress"><span class="mnt-stat-card__num">${stats.in_progress}</span><span class="mnt-stat-card__label">In Progress</span></div>
          <div class="mnt-stat-card mnt-stat-card--resolved"><span class="mnt-stat-card__num">${stats.completed}</span><span class="mnt-stat-card__label">Completed</span></div>
          <div class="mnt-stat-card mnt-stat-card--closed"><span class="mnt-stat-card__num">${stats.canceled + stats.on_hold}</span><span class="mnt-stat-card__label">Parked</span></div>
        </div>
        <div id="mntViewContainer">
          ${_currentView === 'board' ? _renderBoardView() : _renderListView()}
        </div>
      </div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnBannerEditProject')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('trackly:editProject', { detail: { projectId: _project.id } }));
  });
  _bindPageEvents();
}

function _buildSubnav() {
  const id = sanitize(_projectId);
  const session = getSession();
  const showMaint = _project && ['running', 'maintenance'].includes(_project.phase);
  const showLog = session && ['admin', 'pm'].includes(session.role);
  return `
    <div class="project-subnav">
      <a class="project-subnav__link" href="#/projects/${id}"><i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview</a>
      <a class="project-subnav__link" href="#/projects/${id}/board"><i data-lucide="kanban" aria-hidden="true"></i> Board</a>
      <a class="project-subnav__link" href="#/projects/${id}/backlog"><i data-lucide="list" aria-hidden="true"></i> Backlog</a>
      <a class="project-subnav__link" href="#/projects/${id}/sprint"><i data-lucide="zap" aria-hidden="true"></i> Sprint</a>
      <a class="project-subnav__link" href="#/projects/${id}/gantt"><i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt</a>
      <a class="project-subnav__link" href="#/projects/${id}/discussion"><i data-lucide="message-circle" aria-hidden="true"></i> Discussion</a>
      ${showMaint ? `<a class="project-subnav__link is-active" href="#/projects/${id}/maintenance"><i data-lucide="wrench" aria-hidden="true"></i> Maintenance</a>` : ''}
      <a class="project-subnav__link" href="#/projects/${id}/reports"><i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports</a>
      ${showLog ? `<a class="project-subnav__link" href="#/projects/${id}/log"><i data-lucide="activity" aria-hidden="true"></i> Log</a>` : ''}
    </div>`;
}

function _computeStats() {
  return {
    total: _tickets.length,
    backlog: _tickets.filter(t => t.status === 'backlog').length,
    in_progress: _tickets.filter(t => t.status === 'in_progress').length,
    awaiting_approval: _tickets.filter(t => t.status === 'awaiting_approval').length,
    on_check: _tickets.filter(t => t.status === 'on_check').length,
    need_revision: _tickets.filter(t => t.status === 'need_revision').length,
    completed: _tickets.filter(t => t.status === 'completed').length,
    canceled: _tickets.filter(t => t.status === 'canceled').length,
    on_hold: _tickets.filter(t => t.status === 'on_hold').length,
  };
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────

function _renderListView() {
  return `
    <div class="mnt-toolbar">
      <div class="projects-search">
        <i data-lucide="search" class="projects-search__icon" aria-hidden="true"></i>
        <input type="text" class="form-input projects-search__input" id="mntSearch"
          placeholder="Search tickets..." value="${sanitize(_searchQuery)}" autocomplete="off" />
      </div>
      <div class="filter-trigger-wrap">
        <div class="filter-trigger-row">
          <div class="filter-btn-wrap">
            <button class="btn btn--secondary" id="btnOpenFilterModal">
              <i data-lucide="filter" aria-hidden="true"></i> Filter
            </button>
            ${[_filterStatus, _filterType, _filterPriority, _filterSeverity].filter(Boolean).length > 0 ? `<span class="filter-badge">${[_filterStatus, _filterType, _filterPriority, _filterSeverity].filter(Boolean).length}</span>` : ''}
          </div>
        </div>
        <div class="filter-chips" id="mntFilterChips">${_renderMntFilterChips()}</div>
      </div>
    </div>
    <div id="mntTicketList">${_renderTicketList()}</div>`;
}

function _getFilteredTickets() {
  return _tickets.filter(t => {
    if (_filterStatus && t.status !== _filterStatus) return false;
    if (_filterType && t.type !== _filterType) return false;
    if (_filterPriority && t.priority !== _filterPriority) return false;
    if (_filterSeverity && t.severity !== _filterSeverity) return false;
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      const devNames = (t.pic_dev_ids || []).map(id => _members.find(m => m.id === id)?.full_name || '').join(' ');
      const orderedBy = _members.find(m => m.id === t.ordered_by)?.full_name || '';
      const picClientUser = _members.find(m => m.id === t.pic_client);
      const picClientName = picClientUser?.full_name || t.pic_client || '';
      const haystack = [t.id, t.title, t.description, t.reported_by, picClientName, devNames, orderedBy].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function _renderTicketList() {
  const tickets = _getFilteredTickets();
  if (tickets.length === 0) {
    return `<div class="empty-state" style="padding:var(--space-16) var(--space-6);">
      <i data-lucide="ticket" class="empty-state__icon"></i>
      <p class="empty-state__title">${_tickets.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}</p>
      <p class="empty-state__text">${_tickets.length === 0 ? 'Create your first maintenance ticket to get started.' : 'Try adjusting your search or filter criteria.'}</p>
    </div>`;
  }
  return `
    <div class="mnt-table-wrap">
      <table class="mnt-table">
        <thead><tr>
          <th style="width:110px;">ID</th><th>Title</th><th style="width:90px;">Type</th>
          <th style="width:90px;">Severity</th><th style="width:100px;">Priority</th>
          <th style="width:140px;">Status</th><th style="width:130px;">PIC Dev</th>
          <th style="width:110px;">Due Date</th><th style="width:80px;">Hours</th><th style="width:80px;"></th>
        </tr></thead>
        <tbody>${tickets.map(t => _renderTicketRow(t)).join('')}</tbody>
      </table>
    </div>`;
}

function _renderTicketRow(t) {
  const typeBadge = renderBadge(_getLabelFor(TICKET_TYPE_OPTIONS, t.type), _getTypeVariant(t.type));
  const priorityBadge = renderBadge(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority), _getPriorityVariant(t.priority));
  const statusBadge = renderBadge(_getLabelFor(TICKET_STATUS_OPTIONS, t.status), _getStatusVariant(t.status));
  const severityBadge = t.severity
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;background:${t.severity === 'major' ? '#FEF3C7' : '#F1F5F9'};color:${t.severity === 'major' ? '#D97706' : '#64748B'};border:1px solid ${t.severity === 'major' ? '#FDE68A' : '#CBD5E1'};">${t.severity === 'major' ? 'Major' : 'Minor'}</span>`
    : '<span class="text-muted">—</span>';
  const devNames = (t.pic_dev_ids || []).map(id => _members.find(m => m.id === id)?.full_name || '').filter(Boolean).join(', ');
  const session = getSession();
  const canEdit = session && (['admin', 'pm'].includes(session.role) || (session.role === 'developer' && (t.pic_dev_ids || []).includes(session.userId)));
  return `
    <tr class="mnt-table__row" data-id="${sanitize(t.id)}">
      <td><span class="text-mono text-sm">${sanitize(t.ticket_number || t.id)}</span></td>
      <td>
        <button class="mnt-ticket-title btn-link-style btn-view-ticket" data-id="${sanitize(t.id)}">${sanitize(t.title)}</button>
        ${t.attachments && t.attachments.length > 0 ? `<span style="margin-left:4px;font-size:11px;color:var(--color-text-muted);"><i data-lucide="paperclip" style="width:11px;height:11px;vertical-align:middle;"></i> ${t.attachments.length}</span>` : ''}
      </td>
      <td>${typeBadge}</td><td>${severityBadge}</td><td>${priorityBadge}</td><td>${statusBadge}</td>
      <td><span class="text-sm text-muted">${devNames || '—'}</span></td>
      <td class="text-muted text-sm">${t.due_date ? formatDateID(t.due_date) : '—'}</td>
      <td class="text-muted text-sm">${t.actual_hours != null ? `${t.actual_hours}h` : (t.estimated_hours != null ? `~${t.estimated_hours}h` : '—')}</td>
      <td>
        <div class="mnt-row-actions">
          <button class="btn btn--ghost btn--sm btn-view-ticket" data-id="${sanitize(t.id)}" title="View"><i data-lucide="eye" aria-hidden="true"></i></button>
          ${canEdit ? `
          <button class="btn btn--ghost btn--sm btn-edit-ticket" data-id="${sanitize(t.id)}" title="Edit"><i data-lucide="pencil" aria-hidden="true"></i></button>
          <button class="btn btn--ghost btn--sm btn-delete-ticket" data-id="${sanitize(t.id)}" title="Delete"><i data-lucide="trash-2" aria-hidden="true"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
}

// ─── BOARD VIEW ───────────────────────────────────────────────────────────────

function _renderBoardView() {
  const session = getSession();
  const developers = _members.filter(m => m.role === 'developer' && m.status !== 'inactive');
  return `
    <div class="mnt-board-wrap">
      <div class="mnt-board-filterbar">
        <span class="mnt-board-filterbar__label">Filter:</span>
        <select class="form-select mnt-board-filter" id="mntBoardFilterPriority">
          <option value="">Priority (All)</option>
          ${TICKET_PRIORITY_OPTIONS.map(o => `<option value="${o.value}"${_boardFilterPriority === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <select class="form-select mnt-board-filter" id="mntBoardFilterType">
          <option value="">Type (All)</option>
          ${TICKET_TYPE_OPTIONS.map(o => `<option value="${o.value}"${_boardFilterType === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <select class="form-select mnt-board-filter" id="mntBoardFilterSeverity">
          <option value="">Severity (All)</option>
          ${TICKET_SEVERITY_OPTIONS.map(o => `<option value="${o.value}"${_boardFilterSeverity === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
        <select class="form-select mnt-board-filter" id="mntBoardFilterAssignee">
          <option value="">Assignee (All)</option>
          ${developers.map(m => `<option value="${sanitize(m.id)}"${_boardFilterAssignee === m.id ? ' selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
        </select>
        <button class="btn btn--ghost btn--sm" id="mntBoardFilterReset">Reset</button>
      </div>
      <div class="mnt-pipeline-section">
        <div class="mnt-board-scroll">
          <div class="mnt-board-columns">
            ${MAIN_PIPELINE_STATUSES.map(s => _renderBoardColumn(s, false)).join('')}
          </div>
        </div>
      </div>
      <div class="mnt-parking-lot">
        <div class="mnt-parking-lot__header">
          <i data-lucide="parking-circle" aria-hidden="true"></i>
          <span>Parking Lot</span>
        </div>
        <div class="mnt-parking-lot__columns">
          ${PARKING_LOT_STATUSES.map(s => _renderBoardColumn(s, true)).join('')}
        </div>
      </div>
    </div>`;
}

function _getBoardFilteredTickets() {
  return _tickets.filter(t => {
    if (_boardFilterPriority && t.priority !== _boardFilterPriority) return false;
    if (_boardFilterType && t.type !== _boardFilterType) return false;
    if (_boardFilterSeverity && t.severity !== _boardFilterSeverity) return false;
    if (_boardFilterAssignee && !(t.pic_dev_ids || []).includes(_boardFilterAssignee)) return false;
    return true;
  });
}

function _renderBoardColumn(statusObj, isParkingLot) {
  const colTickets = _getBoardFilteredTickets().filter(t => t.status === statusObj.value);
  return `
    <div class="mnt-board-column${isParkingLot ? ' mnt-board-column--parking' : ''}">
      <div class="mnt-board-column__header">
        <span class="mnt-board-column__label">${sanitize(statusObj.label)}</span>
        <span class="mnt-board-column__count">${colTickets.length}</span>
      </div>
      <div class="mnt-board-column__body" data-col-status="${statusObj.value}">
        <div class="board-column__drop-placeholder"></div>
        ${colTickets.map(t => _renderBoardCard(t)).join('')}
      </div>
    </div>`;
}

function _renderBoardCard(t) {
  const session = getSession();
  const today = _todayStr();
  const isOverdue = t.due_date && t.due_date < today && !['completed', 'canceled'].includes(t.status);
  let canDrag = false;
  if (session) {
    if (['admin', 'pm'].includes(session.role)) canDrag = true;
    else if (session.role === 'developer' && (t.pic_dev_ids || []).includes(session.userId)) canDrag = true;
  }
  const firstDev = _members.find(m => m.id === (t.pic_dev_ids || [])[0]);
  const devName = firstDev ? sanitize(firstDev.full_name) : 'Unassigned';

  return `
    <div class="mnt-board-card${canDrag ? '' : ' is-locked'}"
         draggable="${canDrag}"
         data-ticket-id="${sanitize(t.id)}"
         data-priority="${sanitize(t.priority || 'medium')}">
      <div class="mnt-board-card__badges">
        <span class="mnt-card-badge mnt-card-badge--type">${sanitize(_getLabelFor(TICKET_TYPE_OPTIONS, t.type))}</span>
        <span class="mnt-card-badge mnt-card-badge--priority mnt-card-badge--priority-${sanitize(t.priority || 'medium')}">${sanitize(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority))}</span>
        ${t.severity ? `<span class="mnt-card-badge mnt-card-badge--severity mnt-card-badge--severity-${sanitize(t.severity)}">${sanitize(_getLabelFor(TICKET_SEVERITY_OPTIONS, t.severity))}</span>` : ''}
      </div>
      <div class="mnt-board-card__title">${sanitize(t.title)}</div>
      <div class="mnt-board-card__meta">
        <span class="mnt-board-card__due${isOverdue ? ' is-overdue' : ''}">
          ${isOverdue ? '<i data-lucide="alert-triangle" style="width:12px;height:12px;vertical-align:middle;" aria-hidden="true"></i>' : '📅'}
          ${t.due_date ? formatDateID(t.due_date) : '—'}
        </span>
        <span class="mnt-board-card__dev">👤 ${devName}</span>
      </div>
      <div class="mnt-board-card__id">${sanitize(t.ticket_number || t.id)}</div>
    </div>`;
}

function _rerenderBoard() {
  const container = document.getElementById('mntViewContainer');
  if (!container) return;
  container.innerHTML = _renderBoardView();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindBoardEvents();
}

// ─── Events ───────────────────────────────────────────────────────────────────

function _bindPageEvents() {
  document.querySelectorAll('.mnt-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      _currentView = view;
      _saveViewPref(view);
      document.querySelectorAll('.mnt-view-btn').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
      const container = document.getElementById('mntViewContainer');
      if (container) {
        container.innerHTML = view === 'board' ? _renderBoardView() : _renderListView();
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (view === 'board') _bindBoardEvents(); else _bindListEvents();
      }
    });
  });
  document.getElementById('btnNewTicket')?.addEventListener('click', () => _openTicketModal(null));
  if (_currentView === 'list') _bindListEvents();
  if (_currentView === 'board') _bindBoardEvents();
}

function _bindListEvents() {
  document.getElementById('mntSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; _refreshList(); });
  document.getElementById('btnOpenFilterModal')?.addEventListener('click', _openMntFilterModal);
  document.getElementById('mntFilterChips')?.addEventListener('click', _handleMntChipRemove);
  document.getElementById('mntTicketList')?.addEventListener('click', e => {
    const viewBtn = e.target.closest('.btn-view-ticket');
    const editBtn = e.target.closest('.btn-edit-ticket');
    const delBtn = e.target.closest('.btn-delete-ticket');
    if (viewBtn) _openTicketDetail(viewBtn.dataset.id);
    else if (editBtn) _openTicketModal(editBtn.dataset.id);
    else if (delBtn) _deleteTicket(delBtn.dataset.id);
  });
}

function _bindBoardEvents() {
  document.getElementById('mntBoardFilterPriority')?.addEventListener('change', e => { _boardFilterPriority = e.target.value; _rerenderBoard(); });
  document.getElementById('mntBoardFilterType')?.addEventListener('change', e => { _boardFilterType = e.target.value; _rerenderBoard(); });
  document.getElementById('mntBoardFilterSeverity')?.addEventListener('change', e => { _boardFilterSeverity = e.target.value; _rerenderBoard(); });
  document.getElementById('mntBoardFilterAssignee')?.addEventListener('change', e => { _boardFilterAssignee = e.target.value; _rerenderBoard(); });
  document.getElementById('mntBoardFilterReset')?.addEventListener('click', () => {
    _boardFilterPriority = ''; _boardFilterType = ''; _boardFilterSeverity = ''; _boardFilterAssignee = '';
    _rerenderBoard();
  });
  document.querySelectorAll('.mnt-board-card').forEach(card => {
    card.addEventListener('click', e => {
      if (card.dataset.wasDragged === 'true') { card.dataset.wasDragged = 'false'; return; }
      _openTicketDetail(card.dataset.ticketId);
    });
  });
  _bindDragAndDrop();
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

function _bindDragAndDrop() {
  document.querySelectorAll('.mnt-board-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', _handleDragStart);
    card.addEventListener('dragend', _handleDragEnd);
  });
  document.querySelectorAll('.mnt-board-column__body').forEach(body => {
    body.addEventListener('dragover', _handleDragOver);
    body.addEventListener('dragleave', _handleDragLeave);
    body.addEventListener('drop', _handleDrop);
  });
}

function _handleDragStart(e) {
  _dragTicketId = e.currentTarget.dataset.ticketId;
  e.currentTarget.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _dragTicketId);
}

function _handleDragEnd(e) {
  e.currentTarget.classList.remove('is-dragging');
  setTimeout(() => { if (e.currentTarget) e.currentTarget.dataset.wasDragged = 'true'; }, 0);
  document.querySelectorAll('.mnt-board-column__body.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
  document.querySelectorAll('.board-column__drop-placeholder.is-visible').forEach(el => el.classList.remove('is-visible'));
  _dragTicketId = null; _dragOverCol = null;
}

function _handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const body = e.currentTarget;
  if (_dragOverCol !== body) {
    document.querySelectorAll('.mnt-board-column__body.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
    document.querySelectorAll('.board-column__drop-placeholder.is-visible').forEach(el => el.classList.remove('is-visible'));
    body.classList.add('is-drag-over');
    body.querySelector('.board-column__drop-placeholder')?.classList.add('is-visible');
    _dragOverCol = body;
  }
}

function _handleDragLeave(e) {
  const body = e.currentTarget;
  if (!body.contains(e.relatedTarget)) {
    body.classList.remove('is-drag-over');
    body.querySelector('.board-column__drop-placeholder')?.classList.remove('is-visible');
    if (_dragOverCol === body) _dragOverCol = null;
  }
}

async function _handleDrop(e) {
  e.preventDefault();
  const body = e.currentTarget;
  body.classList.remove('is-drag-over');
  body.querySelector('.board-column__drop-placeholder')?.classList.remove('is-visible');

  const newStatus = body.dataset.colStatus;
  if (!_dragTicketId || !newStatus) return;
  const ticket = _tickets.find(t => t.id === _dragTicketId);
  if (!ticket || ticket.status === newStatus) return;

  const oldStatus = ticket.status;
  const oldLabel = _getLabelFor(TICKET_STATUS_OPTIONS, oldStatus);
  const newLabel = _getLabelFor(TICKET_STATUS_OPTIONS, newStatus);
  ticket.status = newStatus;
  ticket.updated_at = nowISO();
  ticket.activity_log = [...(ticket.activity_log || []), { text: `Status changed from ${oldLabel} to ${newLabel}`, at: nowISO() }];
  _rerenderBoard();

  try {
    await update('maintenance', ticket);
    const session = getSession();
    logActivity({ project_id: _projectId, entity_type: 'maintenance', entity_id: ticket.id, entity_name: ticket.title, action: 'status_changed', changes: [{ field: 'status', old_value: oldStatus, new_value: newStatus }] });
    showToast(`${ticket.id} moved to "${newLabel}"`, 'success');
    _refreshStats();
  } catch (err) {
    debug('Drop error:', err);
    ticket.status = oldStatus;
    _rerenderBoard();
    showToast('Failed to update ticket status', 'error');
  }
}

// ─── List Filter ─────────────────────────────────────────────────────────────

function _renderMntFilterChips() {
  const chips = [];
  if (_filterStatus) chips.push(`<span class="filter-chip" data-key="status"><span class="filter-chip__label">Status: ${sanitize(TICKET_STATUS_OPTIONS.find(s => s.value === _filterStatus)?.label || _filterStatus)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  if (_filterType) chips.push(`<span class="filter-chip" data-key="type"><span class="filter-chip__label">Type: ${sanitize(TICKET_TYPE_OPTIONS.find(t => t.value === _filterType)?.label || _filterType)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  if (_filterPriority) chips.push(`<span class="filter-chip" data-key="priority"><span class="filter-chip__label">Priority: ${sanitize(TICKET_PRIORITY_OPTIONS.find(p => p.value === _filterPriority)?.label || _filterPriority)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  if (_filterSeverity) chips.push(`<span class="filter-chip" data-key="severity"><span class="filter-chip__label">Severity: ${sanitize(TICKET_SEVERITY_OPTIONS.find(s => s.value === _filterSeverity)?.label || _filterSeverity)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  return chips.join('');
}

function _handleMntChipRemove(e) {
  const btn = e.target.closest('.filter-chip__remove');
  if (!btn) return;
  const key = btn.closest('.filter-chip')?.dataset.key;
  if (key === 'status') _filterStatus = '';
  if (key === 'type') _filterType = '';
  if (key === 'priority') _filterPriority = '';
  if (key === 'severity') _filterSeverity = '';
  _refreshList(); _updateMntFilterUI();
}

function _openMntFilterModal() {
  openModal({
    title: 'Filter Maintenance', size: 'md',
    body: `<div class="filter-modal-grid">
      <div class="form-group"><label class="form-label" for="fmMntFilterStatus">Status</label>
        <select class="form-select" id="fmMntFilterStatus"><option value="">All Status</option>
          ${TICKET_STATUS_OPTIONS.map(s => `<option value="${s.value}"${_filterStatus === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label" for="fmMntFilterType">Type</label>
        <select class="form-select" id="fmMntFilterType"><option value="">All Types</option>
          ${TICKET_TYPE_OPTIONS.map(t => `<option value="${t.value}"${_filterType === t.value ? ' selected' : ''}>${t.label}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label" for="fmMntFilterPriority">Priority</label>
        <select class="form-select" id="fmMntFilterPriority"><option value="">All Priority</option>
          ${TICKET_PRIORITY_OPTIONS.map(p => `<option value="${p.value}"${_filterPriority === p.value ? ' selected' : ''}>${p.label}</option>`).join('')}
        </select></div>
      <div class="form-group"><label class="form-label" for="fmMntFilterSeverity">Severity</label>
        <select class="form-select" id="fmMntFilterSeverity"><option value="">All Severity</option>
          ${TICKET_SEVERITY_OPTIONS.map(s => `<option value="${s.value}"${_filterSeverity === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}
        </select></div>
    </div>`,
    footer: `<button class="btn btn--outline" id="btnResetMntFilter">Reset Filter</button><button class="btn btn--primary" id="btnApplyMntFilter"><i data-lucide="check" aria-hidden="true"></i> Terapkan Filter</button>`,
  });
  document.getElementById('btnResetMntFilter')?.addEventListener('click', () => {
    _filterStatus = ''; _filterType = ''; _filterPriority = ''; _filterSeverity = '';
    closeModal(); _refreshList(); _updateMntFilterUI();
  });
  document.getElementById('btnApplyMntFilter')?.addEventListener('click', () => {
    _filterStatus = document.getElementById('fmMntFilterStatus')?.value || '';
    _filterType = document.getElementById('fmMntFilterType')?.value || '';
    _filterPriority = document.getElementById('fmMntFilterPriority')?.value || '';
    _filterSeverity = document.getElementById('fmMntFilterSeverity')?.value || '';
    closeModal(); _refreshList(); _updateMntFilterUI();
  });
}

function _updateMntFilterUI() {
  const wrap = document.getElementById('btnOpenFilterModal')?.closest('.filter-btn-wrap');
  if (wrap) {
    wrap.querySelector('.filter-badge')?.remove();
    const count = [_filterStatus, _filterType, _filterPriority, _filterSeverity].filter(Boolean).length;
    if (count > 0) { const badge = document.createElement('span'); badge.className = 'filter-badge'; badge.textContent = count; wrap.appendChild(badge); }
  }
  const chips = document.getElementById('mntFilterChips');
  if (chips) chips.innerHTML = _renderMntFilterChips();
}

function _refreshList() {
  const el = document.getElementById('mntTicketList');
  if (!el) return;
  el.innerHTML = _renderTicketList();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindListEvents();
}

function _refreshStats() {
  const stats = _computeStats();
  const cards = document.querySelectorAll('.mnt-stat-card');
  const keys = ['total', 'backlog', 'in_progress', 'completed'];
  cards.forEach((card, i) => {
    const numEl = card.querySelector('.mnt-stat-card__num');
    if (numEl && keys[i] !== undefined) numEl.textContent = stats[keys[i]] ?? '';
  });
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function _openTicketDetail(ticketId) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const session = getSession();
  const canEdit = session && (['admin', 'pm'].includes(session.role) || (session.role === 'developer' && (t.pic_dev_ids || []).includes(session.userId)));
  const typeBadge = renderBadge(_getLabelFor(TICKET_TYPE_OPTIONS, t.type), _getTypeVariant(t.type));
  const priorityBadge = renderBadge(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority), _getPriorityVariant(t.priority));
  const statusBadge = renderBadge(_getLabelFor(TICKET_STATUS_OPTIONS, t.status), _getStatusVariant(t.status));
  const severityBadge = t.severity
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;background:${t.severity === 'major' ? '#FEF3C7' : '#F1F5F9'};color:${t.severity === 'major' ? '#D97706' : '#64748B'};border:1px solid ${t.severity === 'major' ? '#FDE68A' : '#CBD5E1'};">${t.severity === 'major' ? 'Major' : 'Minor'}</span>`
    : '';

  const curInPipeline = STATUS_PIPELINE.includes(t.status);
  const pipelineHtml = STATUS_PIPELINE.map((s, idx) => {
    const curIdx = STATUS_PIPELINE.indexOf(t.status);
    const cls = !curInPipeline ? '' : (idx < curIdx ? 'done' : idx === curIdx ? 'active' : '');
    const line = idx < STATUS_PIPELINE.length - 1 ? '<div class="mnt-pipeline__line"></div>' : '';
    return `<div class="mnt-pipeline__step mnt-pipeline__step--${cls}"><div class="mnt-pipeline__dot"></div><span>${_getLabelFor(TICKET_STATUS_OPTIONS, s)}</span></div>${line}`;
  }).join('');

  const picDevHtml = (t.pic_dev_ids || []).length > 0
    ? (t.pic_dev_ids || []).map(id => {
      const m = _members.find(m => m.id === id); if (!m) return '';
      const colors = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#0891B2'];
      const color = colors[(m.full_name?.charCodeAt(0) || 0) % colors.length];
      const initials = (m.full_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      return `<span style="background:${color}18;color:${color};border:1px solid ${color}40;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:5px;margin:2px 2px 2px 0;"><span style="width:18px;height:18px;background:${color};border-radius:50%;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;">${sanitize(initials)}</span>${sanitize(m.full_name)}</span>`;
    }).join('')
    : '<span class="text-muted">—</span>';

  const orderedByUser = _members.find(m => m.id === t.ordered_by);
  const picClientUser = _members.find(m => m.id === t.pic_client);

  const activity = (t.activity_log || []).slice().reverse();
  const activityHtml = activity.length
    ? activity.map(a => `<div class="mnt-activity-item"><i data-lucide="circle-dot" class="mnt-activity-item__icon" aria-hidden="true"></i><div><span class="mnt-activity-item__text">${sanitize(a.text)}</span><span class="mnt-activity-item__time text-muted text-xs"> · ${formatRelativeDate(a.at)}</span></div></div>`).join('')
    : '<p class="text-muted text-sm">No activity yet.</p>';

  let nextStatusHtml = '';
  if (canEdit && curInPipeline) {
    const curIdx = STATUS_PIPELINE.indexOf(t.status);
    const nextStatus = STATUS_PIPELINE[curIdx + 1];
    if (nextStatus) {
      nextStatusHtml += `<button class="btn btn--success btn-advance-status" data-id="${sanitize(t.id)}" data-next="${sanitize(nextStatus)}"><i data-lucide="arrow-right" aria-hidden="true"></i> Mark as ${_getLabelFor(TICKET_STATUS_OPTIONS, nextStatus)}</button>`;
    }
  }
  if (canEdit && !['canceled', 'on_hold'].includes(t.status)) {
    nextStatusHtml += `<button class="btn btn--ghost btn-park-ticket" data-id="${sanitize(t.id)}" data-next="on_hold" style="margin-left:6px;"><i data-lucide="pause-circle" aria-hidden="true"></i> On Hold</button>
    <button class="btn btn--ghost btn-park-ticket" data-id="${sanitize(t.id)}" data-next="canceled" style="margin-left:4px;color:var(--color-danger);"><i data-lucide="x-circle" aria-hidden="true"></i> Cancel</button>`;
  }

  const attachHtml = (t.attachments || []).length > 0
    ? `<div class="mnt-detail__section"><h4 class="mnt-detail__section-title">Attachments (${t.attachments.length})</h4><div style="display:flex;flex-direction:column;gap:6px;">${(t.attachments || []).map(att => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--color-surface);border-radius:var(--radius-sm);border:1px solid var(--color-border);"><i data-lucide="${_getMimeIcon(att.mime_type)}" style="width:16px;height:16px;color:var(--color-primary);flex-shrink:0;" aria-hidden="true"></i><div style="flex:1;min-width:0;"><a href="${sanitize(att.data)}" download="${sanitize(att.name)}" style="font-size:13px;font-weight:500;color:var(--color-primary);text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(att.name)}</a><span style="font-size:11px;color:var(--color-text-muted);">${_formatBytes(att.size || 0)}</span></div><i data-lucide="download" style="width:14px;height:14px;color:var(--color-text-muted);flex-shrink:0;" aria-hidden="true"></i></div>`).join('')}</div></div>`
    : '';

  const body = `
    <div class="mnt-detail">
      <div class="mnt-detail__header">
        <span class="text-mono text-sm text-muted">${sanitize(t.ticket_number || t.id)}</span>
        <div class="mnt-detail__badges">${typeBadge} ${severityBadge} ${priorityBadge} ${statusBadge}</div>
      </div>
      <div class="mnt-pipeline">${pipelineHtml}</div>
      ${nextStatusHtml ? `<div class="mnt-detail__next-actions">${nextStatusHtml}</div>` : ''}
      <div class="mnt-detail__grid">
        <div class="mnt-detail__main">
          ${t.description ? `<div class="mnt-detail__section"><h4 class="mnt-detail__section-title">Description</h4><p class="mnt-detail__desc">${sanitize(t.description).replace(/\n/g, '<br>')}</p></div>` : ''}
          ${t.resolution_notes ? `<div class="mnt-detail__section"><h4 class="mnt-detail__section-title">Resolution Notes</h4><div class="mnt-detail__resolution">${sanitize(t.resolution_notes).replace(/\n/g, '<br>')}</div></div>` : ''}
          ${t.notes ? `<div class="mnt-detail__section"><h4 class="mnt-detail__section-title">Internal Notes</h4><p class="text-muted text-sm">${sanitize(t.notes).replace(/\n/g, '<br>')}</p></div>` : ''}
          ${attachHtml}
          ${canEdit ? `<div class="mnt-detail__section"><h4 class="mnt-detail__section-title">Update Resolution Notes</h4><textarea class="form-input" id="detailResolutionNote" rows="3" placeholder="Describe what was done to resolve this ticket..." style="resize:vertical;">${sanitize(t.resolution_notes || '')}</textarea><button class="btn btn--primary btn--sm" id="btnSaveResolution" data-id="${sanitize(t.id)}" style="margin-top:8px;"><i data-lucide="save" aria-hidden="true"></i> Save Notes</button></div>` : ''}
          <div class="mnt-detail__section"><h4 class="mnt-detail__section-title">Activity Log</h4><div class="mnt-activity">${activityHtml}</div></div>
        </div>
        <div class="mnt-detail__sidebar">
          <div class="mnt-detail__meta-group">
            ${_metaItem('Reported By', sanitize(t.reported_by || '—'))}
            ${_metaItem('Reported Date', t.reported_date ? formatDateID(t.reported_date) : '—')}
            ${_metaItem('Assigned Date', t.assigned_date ? formatDateID(t.assigned_date) : '—')}
            ${_metaItem('Due Date', t.due_date ? `<strong style="color:var(--color-danger)">${formatDateID(t.due_date)}</strong>` : '—')}
            ${_metaItem('Ordered By (PM/Admin)', orderedByUser ? sanitize(orderedByUser.full_name) : '—')}
            <div class="mnt-detail__meta-item"><span class="mnt-detail__meta-label">PIC Dev</span><span class="mnt-detail__meta-value" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${picDevHtml}</span></div>
            ${_metaItem('PIC Client', picClientUser ? sanitize(picClientUser.full_name) : (t.pic_client ? sanitize(t.pic_client) : '—'))}
            ${_metaItem('Est. Hours', t.estimated_hours != null ? `${t.estimated_hours}h` : '—')}
            ${_metaItem('Actual Hours', t.actual_hours != null ? `${t.actual_hours}h` : '—')}
            ${t.cost_estimate != null ? _metaItem('Cost Estimate', `Rp ${Number(t.cost_estimate).toLocaleString('id-ID')}`) : ''}
            ${_metaItem('Resolved Date', t.resolved_date ? formatDateID(t.resolved_date) : '—')}
            ${_metaItem('Created', formatRelativeDate(t.created_at))}
            ${_metaItem('Updated', formatRelativeDate(t.updated_at))}
          </div>
        </div>
      </div>
    </div>`;

  const footer = canEdit
    ? `<button class="btn btn--outline btn-edit-from-detail" data-id="${sanitize(t.id)}"><i data-lucide="pencil" aria-hidden="true"></i> Edit</button><button class="btn btn--primary" id="btnCloseDetail">Close</button>`
    : `<button class="btn btn--primary" id="btnCloseDetail">Close</button>`;

  openModal({ title: sanitize(t.title), body, footer, size: 'lg' });
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnCloseDetail')?.addEventListener('click', closeModal);
  document.querySelector('.btn-edit-from-detail')?.addEventListener('click', e => { closeModal(); _openTicketModal(e.currentTarget.dataset.id); });
  document.querySelector('.btn-advance-status')?.addEventListener('click', async e => {
    const id = e.currentTarget.dataset.id, next = e.currentTarget.dataset.next;
    await _advanceStatus(id, next); closeModal(); _openTicketDetail(id);
  });
  document.querySelectorAll('.btn-park-ticket').forEach(btn => {
    btn.addEventListener('click', async e => { await _advanceStatus(e.currentTarget.dataset.id, e.currentTarget.dataset.next); closeModal(); });
  });
  document.getElementById('btnSaveResolution')?.addEventListener('click', async e => {
    const note = document.getElementById('detailResolutionNote')?.value.trim();
    await _saveResolutionNote(e.currentTarget.dataset.id, note); closeModal(); _openTicketDetail(e.currentTarget.dataset.id);
  });
}

function _getMimeIcon(mime) {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('pdf')) return 'file-text';
  if (mime.includes('word') || mime.includes('document')) return 'file-text';
  if (mime.includes('zip') || mime.includes('compressed')) return 'archive';
  return 'paperclip';
}
function _formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
function _metaItem(label, value) {
  return `<div class="mnt-detail__meta-item"><span class="mnt-detail__meta-label">${label}</span><span class="mnt-detail__meta-value">${value}</span></div>`;
}

// ─── Status Advance ───────────────────────────────────────────────────────────

async function _advanceStatus(ticketId, newStatus) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const oldStatus = t.status;
  const updated = {
    ...t, status: newStatus, updated_at: nowISO(),
    resolved_date: newStatus === 'completed' && !t.resolved_date ? nowISO() : t.resolved_date,
    activity_log: [...(t.activity_log || []), { text: `Status changed to ${_getLabelFor(TICKET_STATUS_OPTIONS, newStatus)}`, at: nowISO() }],
  };
  await update('maintenance', updated);
  Object.assign(t, updated);
  logActivity({ project_id: t.project_id, entity_type: 'maintenance', entity_id: ticketId, entity_name: t.title, action: 'status_changed', changes: [{ field: 'status', old_value: oldStatus, new_value: newStatus }] });
  showToast(`Ticket marked as ${_getLabelFor(TICKET_STATUS_OPTIONS, newStatus)}`, 'success');
  _refreshList(); _refreshStats();
  if (_currentView === 'board') _rerenderBoard();
}

async function _saveResolutionNote(ticketId, note) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const updated = {
    ...t, resolution_notes: note, updated_at: nowISO(),
    activity_log: [...(t.activity_log || []), { text: 'Resolution notes updated', at: nowISO() }],
  };
  await update('maintenance', updated);
  Object.assign(t, updated);
  showToast('Resolution notes saved', 'success');
  _refreshList();
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

async function _openTicketModal(ticketId) {
  const isEdit = !!ticketId;
  const t = isEdit ? _tickets.find(x => x.id === ticketId) : null;
  const session = getSession();

  if (isEdit && session.role === 'developer' && !(t?.pic_dev_ids || []).includes(session.userId)) {
    showToast('You can only edit tickets assigned to you.', 'warning'); return;
  }

  const isPmAdmin = session && ['admin', 'pm'].includes(session.role);
  const developers = _members.filter(m => m.status !== 'inactive' && m.role === 'developer');
  const viewers = _members.filter(m => m.status !== 'inactive' && ['viewer', 'client'].includes(m.role));
  const pmAdmins = _members.filter(m => m.status !== 'inactive' && ['admin', 'pm'].includes(m.role));
  const picDevSelected = t?.pic_dev_ids || [];
  _pendingAttachments = t ? [...(t.attachments || [])] : [];

  const body = `
    <form id="mntTicketForm" autocomplete="off">
      <div class="form-group"><label class="form-label" for="mntTitle">Title <span class="text-danger">*</span></label>
        <input type="text" class="form-input" id="mntTitle" required value="${sanitize(t?.title || '')}" placeholder="Brief description of the issue" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="mntType">Type <span class="text-danger">*</span></label>
          <select class="form-select" id="mntType">${TICKET_TYPE_OPTIONS.map(o => `<option value="${o.value}"${t?.type === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label" for="mntSeverity">Severity</label>
          <select class="form-select" id="mntSeverity"><option value="">— None —</option>${TICKET_SEVERITY_OPTIONS.map(o => `<option value="${o.value}"${t?.severity === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label" for="mntPriority">Priority <span class="text-danger">*</span></label>
          <select class="form-select" id="mntPriority">${TICKET_PRIORITY_OPTIONS.map(o => `<option value="${o.value}"${(t?.priority || 'medium') === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}</select></div>
        ${isEdit ? `<div class="form-group"><label class="form-label" for="mntStatus">Status</label>
          <select class="form-select" id="mntStatus">${TICKET_STATUS_OPTIONS.map(o => `<option value="${o.value}"${t?.status === o.value ? ' selected' : ''}>${o.label}</option>`).join('')}</select></div>` : ''}
      </div>
      <div class="form-group"><label class="form-label" for="mntDescription">Description</label>
        <textarea class="form-input" id="mntDescription" rows="3" style="resize:vertical;" placeholder="Detailed description of the issue...">${sanitize(t?.description || '')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="mntReportedBy">Reported By</label>
          <input type="text" class="form-input" id="mntReportedBy" value="${sanitize(t?.reported_by || '')}" placeholder="Name of reporter" /></div>
        <div class="form-group"><label class="form-label" for="mntReportedDate">Reported Date</label>
          <input type="date" class="form-input" id="mntReportedDate" value="${t?.reported_date ? t.reported_date.substring(0, 10) : _todayStr()}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="mntAssignedDate">Assigned Date</label>
          <input type="date" class="form-input" id="mntAssignedDate" value="${t?.assigned_date ? t.assigned_date.substring(0, 10) : ''}" /></div>
        <div class="form-group"><label class="form-label" for="mntDueDate">Due Date</label>
          <input type="date" class="form-input" id="mntDueDate" value="${t?.due_date ? t.due_date.substring(0, 10) : ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="mntOrderedBy">Reported By (PM/Admin)</label>
          <select class="form-select" id="mntOrderedBy"><option value="">— None —</option>
            ${pmAdmins.map(m => `<option value="${sanitize(m.id)}"${t?.ordered_by === m.id ? ' selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label" for="mntPicClient">PIC Client</label>
          <select class="form-select" id="mntPicClient"><option value="">— None —</option>
            ${viewers.map(m => `<option value="${sanitize(m.id)}"${t?.pic_client === m.id ? ' selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-group">
        <label class="form-label">PIC Developer <span class="text-muted" style="font-weight:400;font-size:12px;">— selected devs can see this ticket (leave empty = all devs)</span></label>
        ${developers.length > 3 ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <input type="text" class="form-input" id="picDevSearch" placeholder="Search developer..." style="flex:1;padding:4px 8px;font-size:0.8rem;" autocomplete="off" />
          <button type="button" class="btn btn--ghost btn--xs" id="btnToggleAllDevs" style="white-space:nowrap;font-size:0.75rem;">${picDevSelected.length === developers.length ? 'Deselect All' : 'Select All'}</button>
        </div>` : ''}
        <div id="picDevListWrap" style="max-height:140px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:4px;">
          ${developers.length === 0 ? '<span class="text-muted text-sm" style="padding:8px;display:block;">No developers found</span>' : developers.map(m => `<label class="pic-dev-item" data-name="${sanitize(m.full_name.toLowerCase())}" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:0.85rem;" onmouseover="this.style.background='var(--color-surface)'" onmouseout="this.style.background='transparent'"><input type="checkbox" name="picDev" value="${sanitize(m.id)}"${picDevSelected.includes(m.id) ? ' checked' : ''} style="accent-color:var(--color-primary);width:15px;height:15px;flex-shrink:0;" /><span>${sanitize(m.full_name)}</span></label>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="mntEstHours">Est. Hours</label>
          <input type="number" class="form-input" id="mntEstHours" min="0" step="0.5" value="${t?.estimated_hours ?? ''}" placeholder="0" /></div>
        <div class="form-group"><label class="form-label" for="mntActHours">Actual Hours</label>
          <input type="number" class="form-input" id="mntActHours" min="0" step="0.5" value="${t?.actual_hours ?? ''}" placeholder="0" /></div>
        ${isPmAdmin ? `<div class="form-group"><label class="form-label" for="mntCostEstimate">Cost Estimate (IDR)</label>
          <input type="number" class="form-input" id="mntCostEstimate" min="0" step="1000" value="${t?.cost_estimate ?? ''}" placeholder="0" /></div>` : ''}
      </div>
      <div class="form-group"><label class="form-label" for="mntResolutionNotes">Resolution Notes</label>
        <textarea class="form-input" id="mntResolutionNotes" rows="2" style="resize:vertical;" placeholder="What was done to fix or resolve this issue...">${sanitize(t?.resolution_notes || '')}</textarea></div>
      <div class="form-group"><label class="form-label" for="mntNotes">Internal Notes</label>
        <textarea class="form-input" id="mntNotes" rows="2" style="resize:vertical;" placeholder="Private notes visible to team only...">${sanitize(t?.notes || '')}</textarea></div>
      <div class="form-group">
        <label class="form-label">Attachments <span class="text-muted" style="font-weight:400;font-size:12px;">(max 5MB per file)</span></label>
        <div style="margin-bottom:8px;"><label for="mntFileInput" class="btn btn--outline btn--sm" style="cursor:pointer;"><i data-lucide="paperclip" aria-hidden="true"></i> Attach Files</label>
          <input type="file" id="mntFileInput" multiple style="display:none;" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" /></div>
        <div id="mntAttachmentList">${_renderPendingAttachments()}</div>
      </div>
    </form>`;

  openModal({
    title: isEdit ? `Edit Ticket — ${sanitize(t.id)}` : 'New Maintenance Ticket', body,
    footer: `<button class="btn btn--outline" id="btnCancelTicket">Cancel</button><button class="btn btn--primary" id="btnSaveTicket">${isEdit ? 'Save Changes' : 'Create Ticket'}</button>`,
    size: 'lg',
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('picDevSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.pic-dev-item').forEach(lbl => {
      lbl.style.display = (lbl.dataset.name || '').includes(q) ? '' : 'none';
    });
  });
  document.getElementById('btnToggleAllDevs')?.addEventListener('click', () => {
    const cbs = document.querySelectorAll('input[name="picDev"]');
    const allChecked = Array.from(cbs).every(cb => cb.checked);
    cbs.forEach(cb => cb.checked = !allChecked);
    const btn = document.getElementById('btnToggleAllDevs');
    if (btn) btn.textContent = allChecked ? 'Select All' : 'Deselect All';
  });
  document.getElementById('btnCancelTicket')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveTicket')?.addEventListener('click', () => _handleSaveTicket(t || null));
  document.getElementById('mntFileInput')?.addEventListener('change', async (e) => { await _handleFileAttach(e.target.files); e.target.value = ''; });
}

function _renderPendingAttachments() {
  if (_pendingAttachments.length === 0) return '';
  return _pendingAttachments.map((att, idx) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--color-surface);border-radius:var(--radius-sm);border:1px solid var(--color-border);margin-bottom:4px;"><i data-lucide="${_getMimeIcon(att.mime_type)}" style="width:15px;height:15px;color:var(--color-primary);flex-shrink:0;" aria-hidden="true"></i><span class="text-sm" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(att.name)}</span><span class="text-muted text-xs">${_formatBytes(att.size || 0)}</span><button type="button" class="btn btn--ghost btn--xs mnt-att-remove" data-att-idx="${idx}" style="color:var(--color-danger);padding:2px 4px;"><i data-lucide="x" aria-hidden="true"></i></button></div>`).join('');
}

function _refreshPendingAttachments() {
  const list = document.getElementById('mntAttachmentList');
  if (list) {
    list.innerHTML = _renderPendingAttachments();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    list.querySelectorAll('.mnt-att-remove').forEach(btn => {
      btn.addEventListener('click', () => { _pendingAttachments.splice(parseInt(btn.getAttribute('data-att-idx')), 1); _refreshPendingAttachments(); });
    });
  }
}

async function _handleFileAttach(files) {
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) { showToast(`"${file.name}" exceeds 5MB limit.`, 'warning'); continue; }
    try {
      showToast(`Uploading ${file.name}...`, 'info');
      const { uploadFile } = await import('../core/cloudinary.js');
      const data = await uploadFile(file, file.name);
      _pendingAttachments.push({ name: file.name, data, size: file.size, mime_type: file.type });
      showToast(`Uploaded ${file.name}`, 'success');
    } catch { showToast(`Failed to upload "${file.name}".`, 'error'); }
  }
  _refreshPendingAttachments();
}

async function _handleSaveTicket(existing) {
  const title = document.getElementById('mntTitle')?.value.trim();
  if (!title) { showToast('Title is required.', 'error'); return; }
  const newStatus = document.getElementById('mntStatus')?.value || existing?.status || 'backlog';
  const pic_dev_ids = Array.from(document.querySelectorAll('input[name="picDev"]:checked')).map(cb => cb.value);

  const ticket = {
    id: existing?.id || await _nextTicketId(),
    project_id: _projectId, title,
    description: document.getElementById('mntDescription')?.value.trim() || '',
    type: document.getElementById('mntType')?.value || 'bug',
    severity: document.getElementById('mntSeverity')?.value || null,
    priority: document.getElementById('mntPriority')?.value || 'medium',
    status: newStatus,
    reported_by: document.getElementById('mntReportedBy')?.value.trim() || '',
    reported_date: document.getElementById('mntReportedDate')?.value || null,
    assigned_date: document.getElementById('mntAssignedDate')?.value || null,
    due_date: document.getElementById('mntDueDate')?.value || null,
    ordered_by: document.getElementById('mntOrderedBy')?.value || null,
    pic_dev_ids,
    pic_client: document.getElementById('mntPicClient')?.value || '',
    resolved_date: existing?.resolved_date || null,
    assigned_to: existing?.assigned_to || pic_dev_ids[0] || null,
    estimated_hours: _parseNum(document.getElementById('mntEstHours')?.value),
    actual_hours: _parseNum(document.getElementById('mntActHours')?.value),
    cost_estimate: _parseNum(document.getElementById('mntCostEstimate')?.value),
    notes: document.getElementById('mntNotes')?.value.trim() || '',
    resolution_notes: document.getElementById('mntResolutionNotes')?.value.trim() || '',
    attachments: _pendingAttachments,
    ticket_number: existing?.ticket_number || await _generateTicketNumber(),
    created_at: existing?.created_at || nowISO(),
    updated_at: nowISO(),
    activity_log: [...(existing?.activity_log || [])],
  };

  if (!existing) {
    ticket.activity_log.push({ text: 'Ticket created', at: nowISO() });
  } else if (existing.status !== newStatus) {
    ticket.activity_log.push({ text: `Status changed from ${_getLabelFor(TICKET_STATUS_OPTIONS, existing.status)} to ${_getLabelFor(TICKET_STATUS_OPTIONS, newStatus)}`, at: nowISO() });
    if (newStatus === 'completed' && !ticket.resolved_date) ticket.resolved_date = nowISO();
  }

  try {
    if (existing) {
      await update('maintenance', ticket);
      const idx = _tickets.findIndex(x => x.id === ticket.id);
      if (idx !== -1) _tickets[idx] = ticket;
      logActivity({
        project_id: ticket.project_id, entity_type: 'maintenance', entity_id: ticket.id, entity_name: ticket.title, action: 'updated',
        changes: [{ field: 'severity', old_value: existing.severity, new_value: ticket.severity }, { field: 'pic_dev_ids', old_value: (existing.pic_dev_ids || []).join(','), new_value: pic_dev_ids.join(',') }, { field: 'pic_client', old_value: existing.pic_client, new_value: ticket.pic_client }, { field: 'due_date', old_value: existing.due_date, new_value: ticket.due_date }, { field: 'ordered_by', old_value: existing.ordered_by, new_value: ticket.ordered_by }]
      });
      showToast('Ticket updated successfully.', 'success');
    } else {
      await add('maintenance', ticket);
      _tickets.push(ticket);
      logActivity({ project_id: ticket.project_id, entity_type: 'maintenance', entity_id: ticket.id, entity_name: ticket.title, action: 'created' });
      showToast('Ticket created successfully.', 'success');
    }
    closeModal();
    if (_currentView === 'board') _rerenderBoard(); else _refreshList();
    _refreshStats();
  } catch (err) {
    debug('Save ticket error:', err);
    showToast('Failed to save ticket: ' + err.message, 'error');
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function _deleteTicket(ticketId) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const confirmed = await showConfirm({ title: 'Delete Ticket', message: `Delete ticket <strong>${sanitize(t.id)}</strong>? This cannot be undone.`, confirmText: 'Delete', danger: true });
  if (!confirmed) return;
  try {
    await remove('maintenance', ticketId);
    _tickets = _tickets.filter(x => x.id !== ticketId);
    logActivity({ project_id: t.project_id, entity_type: 'maintenance', entity_id: ticketId, entity_name: t.title, action: 'deleted' });
    showToast('Ticket deleted.', 'success');
    _refreshList(); _refreshStats();
  } catch (err) { showToast('Failed to delete ticket: ' + err.message, 'error'); }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _nextTicketId() {
  const all = await getAll('maintenance');
  return generateSequentialId('MNT', all);
}
function _parseNum(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(val); return isNaN(n) ? null : n;
}
function _todayStr() { return new Date().toISOString().substring(0, 10); }
function _getLabelFor(options, value) { return options.find(o => o.value === value)?.label || value || '—'; }

async function _generateTicketNumber() {
  const projectTickets = _tickets.filter(t => t.project_id === _projectId);
  const maxSeq = projectTickets.reduce((max, t) => {
    if (!t.ticket_number) return max;
    const parts = t.ticket_number.split('-');
    const seq = parseInt(parts[parts.length - 1], 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);
  const nextSeqStr = String(maxSeq + 1).padStart(4, '0');

  const getInitials = (name) => {
    if (!name) return 'UNK';
    return name.split(' ').map(w => w[0]).filter(c => /[a-zA-Z]/.test(c)).join('').substring(0, 2).toUpperCase();
  };

  const projInitials = getInitials(_project.name);
  if (_project.parent_id) {
    try {
      const parent = await getById('projects', _project.parent_id);
      const parentInitials = getInitials(parent.name);
      return `${parentInitials}-${projInitials}-${nextSeqStr}`;
    } catch {
      return `${projInitials}-${nextSeqStr}`;
    }
  }
  return `${projInitials}-${nextSeqStr}`;
}

function _getTypeVariant(type) { return { bug: 'danger', adjustment: 'warning', enhancement: 'primary', user_request: 'info', incident: 'danger' }[type] || 'neutral'; }
function _getPriorityVariant(p) { return { low: 'neutral', medium: 'warning', high: 'danger', critical: 'danger' }[p] || 'neutral'; }
function _getStatusVariant(s) {
  return {
    backlog: 'neutral', in_progress: 'info', awaiting_approval: 'warning', on_check: 'info', need_revision: 'warning', completed: 'success', canceled: 'danger', on_hold: 'neutral',
    open: 'warning', resolved: 'success', closed: 'neutral', rejected: 'danger'
  }[s] || 'neutral';
}

export default { render };
