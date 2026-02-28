/**
 * TRACKLY — maintenance.js
 * Phase 12: Maintenance Module
 * Ticket CRUD for projects in "running" or "maintenance" phase.
 * Access: PM/Admin (full), Developer (assigned tickets — update status/notes), Viewer (none).
 */

import { getAll, getById, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, formatRelativeDate, sanitize, debug, logActivity } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { getSession } from '../core/auth.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_TYPE_OPTIONS = [
  { value: 'bug',          label: 'Bug' },
  { value: 'adjustment',   label: 'Adjustment' },
  { value: 'enhancement',  label: 'Enhancement' },
  { value: 'user_request', label: 'User Request' },
  { value: 'incident',     label: 'Incident' },
];

const TICKET_PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const TICKET_STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
  { value: 'rejected',    label: 'Rejected' },
];

const STATUS_PIPELINE = ['open', 'in_progress', 'resolved', 'closed'];

// ─── Module State ─────────────────────────────────────────────────────────────

let _projectId   = null;
let _project     = null;
let _tickets     = [];
let _members     = [];
let _filterStatus   = '';
let _filterType     = '';
let _filterPriority = '';
let _searchQuery    = '';

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function render(params = {}) {
  _projectId = params.id;

  const session = getSession();
  if (!session) { window.location.hash = '#/login'; return; }

  if (session.role === 'viewer') {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="lock" class="empty-state__icon"></i>
          <p class="empty-state__title">Access Denied</p>
          <p class="empty-state__text">You do not have permission to view the Maintenance module.</p>
          <a href="#/projects/${sanitize(_projectId)}" class="btn btn--primary">Back to Project</a>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (!_projectId) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter"><div class="empty-state">
        <i data-lucide="alert-circle" class="empty-state__icon"></i>
        <p class="empty-state__title">No project specified</p>
        <a href="#/projects" class="btn btn--primary">Back to Projects</a>
      </div></div>`;
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
      document.getElementById('main-content').innerHTML = `
        <div class="page-container page-enter"><div class="empty-state">
          <i data-lucide="folder-x" class="empty-state__icon"></i>
          <p class="empty-state__title">Project not found</p>
          <a href="#/projects" class="btn btn--primary">Back to Projects</a>
        </div></div>`;
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
    _filterStatus = '';
    _filterType = '';
    _filterPriority = '';
    _searchQuery = '';
    renderMaintenancePage();
  } catch (err) {
    debug('Maintenance render error:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter"><div class="empty-state">
        <i data-lucide="alert-circle" class="empty-state__icon"></i>
        <p class="empty-state__title">Failed to load maintenance tickets</p>
        <p class="empty-state__text">${sanitize(String(err.message))}</p>
      </div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Page Render ─────────────────────────────────────────────────────────────

function renderMaintenancePage() {
  const session = getSession();
  const canCreate = session && ['admin', 'pm', 'developer'].includes(session.role);
  const content = document.getElementById('main-content');
  if (!content) return;
  const stats = _computeStats();

  content.innerHTML = `
    <div class="page-container page-enter">
      ${_buildSubnav()}

      <div class="page-header" style="margin-top:var(--space-6);">
        <div class="page-header__info">
          <h1 class="page-header__title">Maintenance</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)} — Live system ticket tracking</p>
        </div>
        <div class="page-header__actions">
          ${canCreate ? `<button class="btn btn--primary" id="btnNewTicket">
            <i data-lucide="plus" aria-hidden="true"></i> New Ticket
          </button>` : ''}
          <a href="#/projects/${sanitize(_projectId)}/reports" class="btn btn--outline">
            <i data-lucide="file-text" aria-hidden="true"></i> Generate Report
          </a>
        </div>
      </div>

      <div class="mnt-stats-row">
        <div class="mnt-stat-card">
          <span class="mnt-stat-card__num">${stats.total}</span>
          <span class="mnt-stat-card__label">Total</span>
        </div>
        <div class="mnt-stat-card mnt-stat-card--open">
          <span class="mnt-stat-card__num">${stats.open}</span>
          <span class="mnt-stat-card__label">Open</span>
        </div>
        <div class="mnt-stat-card mnt-stat-card--progress">
          <span class="mnt-stat-card__num">${stats.in_progress}</span>
          <span class="mnt-stat-card__label">In Progress</span>
        </div>
        <div class="mnt-stat-card mnt-stat-card--resolved">
          <span class="mnt-stat-card__num">${stats.resolved}</span>
          <span class="mnt-stat-card__label">Resolved</span>
        </div>
        <div class="mnt-stat-card mnt-stat-card--closed">
          <span class="mnt-stat-card__num">${stats.closed}</span>
          <span class="mnt-stat-card__label">Closed</span>
        </div>
      </div>

      <div class="mnt-toolbar">
        <div class="projects-search">
          <i data-lucide="search" class="projects-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input projects-search__input" id="mntSearch"
            placeholder="Search tickets..." value="${sanitize(_searchQuery)}" autocomplete="off" />
        </div>
        <div class="projects-filters">
          <select class="form-select" id="mntFilterStatus">
            <option value="">All Status</option>
            ${TICKET_STATUS_OPTIONS.map(s => `<option value="${s.value}" ${_filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <select class="form-select" id="mntFilterType">
            <option value="">All Types</option>
            ${TICKET_TYPE_OPTIONS.map(t => `<option value="${t.value}" ${_filterType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
          <select class="form-select" id="mntFilterPriority">
            <option value="">All Priority</option>
            ${TICKET_PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${_filterPriority === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="mntTicketList">${_renderTicketList()}</div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindPageEvents();
}

function _buildSubnav() {
  const id = sanitize(_projectId);
  const showMaint = _project && ['running', 'maintenance'].includes(_project.phase);
  return `
    <div class="project-subnav">
      <a class="project-subnav__link" href="#/projects/${id}"><i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview</a>
      <a class="project-subnav__link" href="#/projects/${id}/board"><i data-lucide="kanban" aria-hidden="true"></i> Board</a>
      <a class="project-subnav__link" href="#/projects/${id}/backlog"><i data-lucide="list" aria-hidden="true"></i> Backlog</a>
      <a class="project-subnav__link" href="#/projects/${id}/sprint"><i data-lucide="zap" aria-hidden="true"></i> Sprint</a>
      <a class="project-subnav__link" href="#/projects/${id}/gantt"><i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt</a>
      ${showMaint ? `<a class="project-subnav__link is-active" href="#/projects/${id}/maintenance"><i data-lucide="wrench" aria-hidden="true"></i> Maintenance</a>` : ''}
      <a class="project-subnav__link" href="#/projects/${id}/reports"><i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports</a>
    </div>`;
}

function _computeStats() {
  return {
    total:       _tickets.length,
    open:        _tickets.filter(t => t.status === 'open').length,
    in_progress: _tickets.filter(t => t.status === 'in_progress').length,
    resolved:    _tickets.filter(t => t.status === 'resolved').length,
    closed:      _tickets.filter(t => t.status === 'closed').length,
  };
}

function _getFilteredTickets() {
  return _tickets.filter(t => {
    if (_filterStatus   && t.status   !== _filterStatus)   return false;
    if (_filterType     && t.type     !== _filterType)     return false;
    if (_filterPriority && t.priority !== _filterPriority) return false;
    if (_searchQuery) {
      const q = _searchQuery.toLowerCase();
      const assignee = _members.find(m => m.id === t.assigned_to);
      const haystack = [t.id, t.title, t.description, t.reported_by, assignee?.full_name].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function _renderTicketList() {
  const tickets = _getFilteredTickets();
  if (tickets.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-16) var(--space-6);">
        <i data-lucide="ticket" class="empty-state__icon"></i>
        <p class="empty-state__title">${_tickets.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}</p>
        <p class="empty-state__text">${_tickets.length === 0 ? 'Create your first maintenance ticket to get started.' : 'Try adjusting your search or filter criteria.'}</p>
      </div>`;
  }
  return `
    <div class="mnt-table-wrap">
      <table class="mnt-table">
        <thead>
          <tr>
            <th style="width:110px;">ID</th>
            <th>Title</th>
            <th style="width:110px;">Type</th>
            <th style="width:100px;">Priority</th>
            <th style="width:110px;">Status</th>
            <th style="width:130px;">Assigned To</th>
            <th style="width:120px;">Reported</th>
            <th style="width:80px;">Hours</th>
            <th style="width:80px;"></th>
          </tr>
        </thead>
        <tbody>${tickets.map(t => _renderTicketRow(t)).join('')}</tbody>
      </table>
    </div>`;
}

function _renderTicketRow(t) {
  const assignee      = _members.find(m => m.id === t.assigned_to);
  const typeBadge     = renderBadge(_getLabelFor(TICKET_TYPE_OPTIONS, t.type),     _getTypeVariant(t.type));
  const priorityBadge = renderBadge(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority), _getPriorityVariant(t.priority));
  const statusBadge   = renderBadge(_getLabelFor(TICKET_STATUS_OPTIONS,   t.status),   _getStatusVariant(t.status));
  const session = getSession();
  const canEdit = session && (['admin', 'pm'].includes(session.role) ||
    (session.role === 'developer' && t.assigned_to === session.userId));

  return `
    <tr class="mnt-table__row" data-id="${sanitize(t.id)}">
      <td><span class="text-mono text-sm">${sanitize(t.id)}</span></td>
      <td>
        <button class="mnt-ticket-title btn-link-style btn-view-ticket" data-id="${sanitize(t.id)}">${sanitize(t.title)}</button>
        ${t.notes ? `<p class="text-muted text-xs" style="margin:2px 0 0;">${sanitize(t.notes.substring(0, 60))}${t.notes.length > 60 ? '...' : ''}</p>` : ''}
      </td>
      <td>${typeBadge}</td>
      <td>${priorityBadge}</td>
      <td>${statusBadge}</td>
      <td><span class="text-sm">${assignee ? sanitize(assignee.full_name) : '<span class="text-muted">—</span>'}</span></td>
      <td class="text-muted text-sm">${t.reported_date ? formatDate(t.reported_date) : '—'}</td>
      <td class="text-muted text-sm">${t.actual_hours != null ? `${t.actual_hours}h` : (t.estimated_hours != null ? `~${t.estimated_hours}h` : '—')}</td>
      <td>
        <div class="mnt-row-actions">
          <button class="btn btn--ghost btn--sm btn-view-ticket" data-id="${sanitize(t.id)}" title="View">
            <i data-lucide="eye" aria-hidden="true"></i>
          </button>
          ${canEdit ? `
          <button class="btn btn--ghost btn--sm btn-edit-ticket" data-id="${sanitize(t.id)}" title="Edit">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-delete-ticket" data-id="${sanitize(t.id)}" title="Delete">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
}

// ─── Events ───────────────────────────────────────────────────────────────────

function _bindPageEvents() {
  document.getElementById('btnNewTicket')?.addEventListener('click', () => _openTicketModal(null));

  document.getElementById('mntSearch')?.addEventListener('input', e => {
    _searchQuery = e.target.value;
    _refreshList();
  });

  document.getElementById('mntFilterStatus')?.addEventListener('change', e => { _filterStatus = e.target.value; _refreshList(); });
  document.getElementById('mntFilterType')?.addEventListener('change',   e => { _filterType   = e.target.value; _refreshList(); });
  document.getElementById('mntFilterPriority')?.addEventListener('change', e => { _filterPriority = e.target.value; _refreshList(); });

  document.getElementById('mntTicketList')?.addEventListener('click', e => {
    const viewBtn = e.target.closest('.btn-view-ticket');
    const editBtn = e.target.closest('.btn-edit-ticket');
    const delBtn  = e.target.closest('.btn-delete-ticket');
    if (viewBtn)      _openTicketDetail(viewBtn.dataset.id);
    else if (editBtn) _openTicketModal(editBtn.dataset.id);
    else if (delBtn)  _deleteTicket(delBtn.dataset.id);
  });
}

function _refreshList() {
  const el = document.getElementById('mntTicketList');
  if (!el) return;
  el.innerHTML = _renderTicketList();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _refreshStats() {
  const stats = _computeStats();
  const keys = ['total', 'open', 'in_progress', 'resolved', 'closed'];
  document.querySelectorAll('.mnt-stat-card').forEach((card, i) => {
    const numEl = card.querySelector('.mnt-stat-card__num');
    if (numEl && keys[i]) numEl.textContent = stats[keys[i]];
  });
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function _openTicketDetail(ticketId) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;

  const session = getSession();
  const canEdit = session && (['admin', 'pm'].includes(session.role) ||
    (session.role === 'developer' && t.assigned_to === session.userId));

  const assignee      = _members.find(m => m.id === t.assigned_to);
  const typeBadge     = renderBadge(_getLabelFor(TICKET_TYPE_OPTIONS, t.type),     _getTypeVariant(t.type));
  const priorityBadge = renderBadge(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority), _getPriorityVariant(t.priority));
  const statusBadge   = renderBadge(_getLabelFor(TICKET_STATUS_OPTIONS,   t.status),   _getStatusVariant(t.status));

  const pipelineHtml = STATUS_PIPELINE.map((s, idx) => {
    const curIdx = STATUS_PIPELINE.indexOf(t.status);
    const cls = idx < curIdx ? 'done' : idx === curIdx ? 'active' : '';
    const line = idx < STATUS_PIPELINE.length - 1 ? '<div class="mnt-pipeline__line"></div>' : '';
    return `<div class="mnt-pipeline__step mnt-pipeline__step--${cls}">
      <div class="mnt-pipeline__dot"></div>
      <span>${_getLabelFor(TICKET_STATUS_OPTIONS, s)}</span>
    </div>${line}`;
  }).join('');

  const activity = (t.activity_log || []).slice().reverse();
  const activityHtml = activity.length
    ? activity.map(a => `
        <div class="mnt-activity-item">
          <i data-lucide="circle-dot" class="mnt-activity-item__icon" aria-hidden="true"></i>
          <div>
            <span class="mnt-activity-item__text">${sanitize(a.text)}</span>
            <span class="mnt-activity-item__time text-muted text-xs"> · ${formatRelativeDate(a.at)}</span>
          </div>
        </div>`).join('')
    : '<p class="text-muted text-sm">No activity yet.</p>';

  let nextStatusHtml = '';
  if (canEdit && !['closed', 'rejected'].includes(t.status)) {
    const curIdx = STATUS_PIPELINE.indexOf(t.status);
    const nextStatus = STATUS_PIPELINE[curIdx + 1];
    if (nextStatus) {
      nextStatusHtml += `<button class="btn btn--success btn-advance-status" data-id="${sanitize(t.id)}" data-next="${sanitize(nextStatus)}">
        <i data-lucide="arrow-right" aria-hidden="true"></i> Mark as ${_getLabelFor(TICKET_STATUS_OPTIONS, nextStatus)}
      </button>`;
    }
    nextStatusHtml += `<button class="btn btn--ghost btn-reject-ticket" data-id="${sanitize(t.id)}" style="margin-left:6px;">
      <i data-lucide="x-circle" aria-hidden="true"></i> Reject
    </button>`;
  }

  const body = `
    <div class="mnt-detail">
      <div class="mnt-detail__header">
        <span class="text-mono text-sm text-muted">${sanitize(t.id)}</span>
        <div class="mnt-detail__badges">${typeBadge} ${priorityBadge} ${statusBadge}</div>
      </div>
      <div class="mnt-pipeline">${pipelineHtml}</div>
      ${nextStatusHtml ? `<div class="mnt-detail__next-actions">${nextStatusHtml}</div>` : ''}
      <div class="mnt-detail__grid">
        <div class="mnt-detail__main">
          ${t.description ? `<div class="mnt-detail__section">
            <h4 class="mnt-detail__section-title">Description</h4>
            <p class="mnt-detail__desc">${sanitize(t.description).replace(/\n/g, '<br>')}</p>
          </div>` : ''}
          ${t.resolution_notes ? `<div class="mnt-detail__section">
            <h4 class="mnt-detail__section-title">Resolution Notes</h4>
            <div class="mnt-detail__resolution">${sanitize(t.resolution_notes).replace(/\n/g, '<br>')}</div>
          </div>` : ''}
          ${t.notes ? `<div class="mnt-detail__section">
            <h4 class="mnt-detail__section-title">Internal Notes</h4>
            <p class="text-muted text-sm">${sanitize(t.notes).replace(/\n/g, '<br>')}</p>
          </div>` : ''}
          ${canEdit ? `<div class="mnt-detail__section">
            <h4 class="mnt-detail__section-title">Update Resolution Notes</h4>
            <textarea class="form-input" id="detailResolutionNote" rows="3"
              placeholder="Describe what was done to resolve this ticket..." style="resize:vertical;">${sanitize(t.resolution_notes || '')}</textarea>
            <button class="btn btn--primary btn--sm" id="btnSaveResolution" data-id="${sanitize(t.id)}" style="margin-top:8px;">
              <i data-lucide="save" aria-hidden="true"></i> Save Notes
            </button>
          </div>` : ''}
          <div class="mnt-detail__section">
            <h4 class="mnt-detail__section-title">Activity Log</h4>
            <div class="mnt-activity">${activityHtml}</div>
          </div>
        </div>
        <div class="mnt-detail__sidebar">
          <div class="mnt-detail__meta-group">
            ${_metaItem('Reported By', sanitize(t.reported_by || '—'))}
            ${_metaItem('Reported Date', t.reported_date ? formatDate(t.reported_date) : '—')}
            ${_metaItem('Assigned To', assignee ? sanitize(assignee.full_name) : '—')}
            ${_metaItem('Est. Hours', t.estimated_hours != null ? `${t.estimated_hours}h` : '—')}
            ${_metaItem('Actual Hours', t.actual_hours != null ? `${t.actual_hours}h` : '—')}
            ${t.cost_estimate != null ? _metaItem('Cost Estimate', `Rp ${Number(t.cost_estimate).toLocaleString('id-ID')}`) : ''}
            ${_metaItem('Resolved Date', t.resolved_date ? formatDate(t.resolved_date) : '—')}
            ${_metaItem('Created', formatRelativeDate(t.created_at))}
            ${_metaItem('Updated', formatRelativeDate(t.updated_at))}
          </div>
        </div>
      </div>
    </div>`;

  const footer = canEdit
    ? `<button class="btn btn--outline btn-edit-from-detail" data-id="${sanitize(t.id)}"><i data-lucide="pencil" aria-hidden="true"></i> Edit</button>
       <button class="btn btn--primary" id="btnCloseDetail">Close</button>`
    : `<button class="btn btn--primary" id="btnCloseDetail">Close</button>`;

  openModal({ title: sanitize(t.title), body, footer, size: 'lg' });
  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('btnCloseDetail')?.addEventListener('click', closeModal);
  document.querySelector('.btn-edit-from-detail')?.addEventListener('click', e => {
    closeModal();
    _openTicketModal(e.currentTarget.dataset.id);
  });
  document.querySelector('.btn-advance-status')?.addEventListener('click', async e => {
    const id = e.currentTarget.dataset.id;
    const next = e.currentTarget.dataset.next;
    await _advanceStatus(id, next);
    closeModal();
    _openTicketDetail(id);
  });
  document.querySelector('.btn-reject-ticket')?.addEventListener('click', async e => {
    await _advanceStatus(e.currentTarget.dataset.id, 'rejected');
    closeModal();
  });
  document.getElementById('btnSaveResolution')?.addEventListener('click', async e => {
    const note = document.getElementById('detailResolutionNote')?.value.trim();
    await _saveResolutionNote(e.currentTarget.dataset.id, note);
    closeModal();
    _openTicketDetail(e.currentTarget.dataset.id);
  });
}

function _metaItem(label, value) {
  return `<div class="mnt-detail__meta-item">
    <span class="mnt-detail__meta-label">${label}</span>
    <span class="mnt-detail__meta-value">${value}</span>
  </div>`;
}

// ─── Status Advance & Resolution ─────────────────────────────────────────────

async function _advanceStatus(ticketId, newStatus) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const updated = { ...t, status: newStatus, updated_at: nowISO(),
    resolved_date: ['resolved', 'closed'].includes(newStatus) && !t.resolved_date ? nowISO() : t.resolved_date,
    activity_log: [...(t.activity_log || []), { text: `Status changed to ${_getLabelFor(TICKET_STATUS_OPTIONS, newStatus)}`, at: nowISO() }],
  };
  await update('maintenance', updated);
  Object.assign(t, updated);
  logActivity({ project_id: t.project_id, entity_type: 'maintenance', entity_id: ticketId, entity_name: t.title, action: 'status_changed', changes: [{ field: 'status', old_value: t.status, new_value: newStatus }] });
  showToast(`Ticket marked as ${_getLabelFor(TICKET_STATUS_OPTIONS, newStatus)}`, 'success');
  _refreshList();
  _refreshStats();
}

async function _saveResolutionNote(ticketId, note) {
  const t = _tickets.find(x => x.id === ticketId);
  if (!t) return;
  const updated = { ...t, resolution_notes: note, updated_at: nowISO(),
    activity_log: [...(t.activity_log || []), { text: 'Resolution notes updated', at: nowISO() }],
  };
  await update('maintenance', updated);
  Object.assign(t, updated);
  showToast('Resolution notes saved', 'success');
  _refreshList();
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

function _openTicketModal(ticketId) {
  const isEdit = !!ticketId;
  const t = isEdit ? _tickets.find(x => x.id === ticketId) : null;
  const session = getSession();

  if (isEdit && session.role === 'developer' && t?.assigned_to !== session.userId) {
    showToast('You can only edit tickets assigned to you.', 'warning');
    return;
  }

  const isPmAdmin = session && ['admin', 'pm'].includes(session.role);

  const body = `
    <form id="mntTicketForm" autocomplete="off">
      <div class="form-group">
        <label class="form-label" for="mntTitle">Title <span class="text-danger">*</span></label>
        <input type="text" class="form-input" id="mntTitle" required
          value="${sanitize(t?.title || '')}" placeholder="Brief description of the issue" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mntType">Type <span class="text-danger">*</span></label>
          <select class="form-select" id="mntType">
            ${TICKET_TYPE_OPTIONS.map(o => `<option value="${o.value}" ${t?.type === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="mntPriority">Priority <span class="text-danger">*</span></label>
          <select class="form-select" id="mntPriority">
            ${TICKET_PRIORITY_OPTIONS.map(o => `<option value="${o.value}" ${(t?.priority || 'medium') === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
        ${isEdit ? `<div class="form-group">
          <label class="form-label" for="mntStatus">Status</label>
          <select class="form-select" id="mntStatus">
            ${TICKET_STATUS_OPTIONS.map(o => `<option value="${o.value}" ${t?.status === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label" for="mntDescription">Description</label>
        <textarea class="form-input" id="mntDescription" rows="3" style="resize:vertical;"
          placeholder="Detailed description of the issue...">${sanitize(t?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mntReportedBy">Reported By</label>
          <input type="text" class="form-input" id="mntReportedBy"
            value="${sanitize(t?.reported_by || '')}" placeholder="Name of reporter" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mntReportedDate">Reported Date</label>
          <input type="date" class="form-input" id="mntReportedDate"
            value="${t?.reported_date ? t.reported_date.substring(0,10) : _todayStr()}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mntAssignedTo">Assigned To</label>
          <select class="form-select" id="mntAssignedTo">
            <option value="">— Unassigned —</option>
            ${_members.filter(m => m.status === 'active' && ['developer','pm','admin'].includes(m.role))
              .map(m => `<option value="${sanitize(m.id)}" ${t?.assigned_to === m.id ? 'selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="mntEstHours">Est. Hours</label>
          <input type="number" class="form-input" id="mntEstHours" min="0" step="0.5"
            value="${t?.estimated_hours ?? ''}" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mntActHours">Actual Hours</label>
          <input type="number" class="form-input" id="mntActHours" min="0" step="0.5"
            value="${t?.actual_hours ?? ''}" placeholder="0" />
        </div>
      </div>
      ${isPmAdmin ? `<div class="form-group">
        <label class="form-label" for="mntCostEstimate">Cost Estimate (IDR)</label>
        <input type="number" class="form-input" id="mntCostEstimate" min="0" step="1000"
          value="${t?.cost_estimate ?? ''}" placeholder="0" />
      </div>` : ''}
      <div class="form-group">
        <label class="form-label" for="mntResolutionNotes">Resolution Notes</label>
        <textarea class="form-input" id="mntResolutionNotes" rows="2" style="resize:vertical;"
          placeholder="What was done to fix or resolve this issue...">${sanitize(t?.resolution_notes || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="mntNotes">Internal Notes</label>
        <textarea class="form-input" id="mntNotes" rows="2" style="resize:vertical;"
          placeholder="Private notes visible to team only...">${sanitize(t?.notes || '')}</textarea>
      </div>
    </form>`;

  openModal({
    title: isEdit ? `Edit Ticket — ${sanitize(t.id)}` : 'New Maintenance Ticket',
    body,
    footer: `<button class="btn btn--outline" id="btnCancelTicket">Cancel</button>
             <button class="btn btn--primary" id="btnSaveTicket">${isEdit ? 'Save Changes' : 'Create Ticket'}</button>`,
    size: 'lg',
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnCancelTicket')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveTicket')?.addEventListener('click', () => _handleSaveTicket(t || null));
}

async function _handleSaveTicket(existing) {
  const title = document.getElementById('mntTitle')?.value.trim();
  if (!title) { showToast('Title is required.', 'error'); return; }

  const newStatus = document.getElementById('mntStatus')?.value || existing?.status || 'open';

  const ticket = {
    id:               existing?.id || await _nextTicketId(),
    project_id:       _projectId,
    title,
    description:      document.getElementById('mntDescription')?.value.trim() || '',
    type:             document.getElementById('mntType')?.value || 'bug',
    priority:         document.getElementById('mntPriority')?.value || 'medium',
    status:           newStatus,
    reported_by:      document.getElementById('mntReportedBy')?.value.trim() || '',
    reported_date:    document.getElementById('mntReportedDate')?.value || null,
    resolved_date:    existing?.resolved_date || null,
    assigned_to:      document.getElementById('mntAssignedTo')?.value || null,
    estimated_hours:  _parseNum(document.getElementById('mntEstHours')?.value),
    actual_hours:     _parseNum(document.getElementById('mntActHours')?.value),
    cost_estimate:    _parseNum(document.getElementById('mntCostEstimate')?.value),
    notes:            document.getElementById('mntNotes')?.value.trim() || '',
    resolution_notes: document.getElementById('mntResolutionNotes')?.value.trim() || '',
    created_at:       existing?.created_at || nowISO(),
    updated_at:       nowISO(),
    activity_log:     [...(existing?.activity_log || [])],
  };

  if (!existing) {
    ticket.activity_log.push({ text: 'Ticket created', at: nowISO() });
  } else if (existing.status !== newStatus) {
    ticket.activity_log.push({ text: `Status changed from ${_getLabelFor(TICKET_STATUS_OPTIONS, existing.status)} to ${_getLabelFor(TICKET_STATUS_OPTIONS, newStatus)}`, at: nowISO() });
    if (['resolved', 'closed'].includes(newStatus) && !ticket.resolved_date) {
      ticket.resolved_date = nowISO();
    }
  }

  try {
    if (existing) {
      await update('maintenance', ticket);
      const idx = _tickets.findIndex(x => x.id === ticket.id);
      if (idx !== -1) _tickets[idx] = ticket;
      logActivity({ project_id: ticket.project_id, entity_type: 'maintenance', entity_id: ticket.id, entity_name: ticket.title, action: 'updated' });
      showToast('Ticket updated successfully.', 'success');
    } else {
      await add('maintenance', ticket);
      _tickets.push(ticket);
      logActivity({ project_id: ticket.project_id, entity_type: 'maintenance', entity_id: ticket.id, entity_name: ticket.title, action: 'created' });
      showToast('Ticket created successfully.', 'success');
    }
    closeModal();
    _refreshList();
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
  const confirmed = await showConfirm({
    title: 'Delete Ticket',
    message: `Delete ticket <strong>${sanitize(t.id)}</strong>? This cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
  });
  if (!confirmed) return;
  try {
    await remove('maintenance', ticketId);
    _tickets = _tickets.filter(x => x.id !== ticketId);
    logActivity({ project_id: t.project_id, entity_type: 'maintenance', entity_id: ticketId, entity_name: t.title, action: 'deleted' });
    showToast('Ticket deleted.', 'success');
    _refreshList();
    _refreshStats();
  } catch (err) {
    showToast('Failed to delete ticket: ' + err.message, 'error');
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function _nextTicketId() {
  const all = await getAll('maintenance');
  return generateSequentialId('MNT', all);
}

function _parseNum(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function _todayStr() {
  return new Date().toISOString().substring(0, 10);
}

function _getLabelFor(options, value) {
  return options.find(o => o.value === value)?.label || value || '—';
}

function _getTypeVariant(type) {
  return { bug:'danger', adjustment:'warning', enhancement:'primary', user_request:'info', incident:'danger' }[type] || 'neutral';
}

function _getPriorityVariant(p) {
  return { low:'neutral', medium:'warning', high:'danger', critical:'danger' }[p] || 'neutral';
}

function _getStatusVariant(s) {
  return { open:'warning', in_progress:'info', resolved:'success', closed:'neutral', rejected:'danger' }[s] || 'neutral';
}

export default { render };
