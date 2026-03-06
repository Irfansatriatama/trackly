/**
 * TRACKLY — backlog.js
 * Phase 8: Task Management & Backlog
 */

import { getAll, getById, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, sanitize, debug, logActivity, buildProjectBanner } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { getSession } from '../core/auth.js';

export const TASK_TYPE_OPTIONS = [
  { value: 'story', label: 'Story', icon: 'book-open' },
  { value: 'task', label: 'Task', icon: 'check-square' },
  { value: 'bug', label: 'Bug', icon: 'bug' },
  { value: 'enhancement', label: 'Enhancement', icon: 'zap' },
  { value: 'epic', label: 'Epic', icon: 'layers' },
];

export const TASK_STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', variant: 'neutral' },
  { value: 'todo', label: 'To Do', variant: 'info' },
  { value: 'in_progress', label: 'In Progress', variant: 'warning' },
  { value: 'in_review', label: 'In Review', variant: 'secondary' },
  { value: 'done', label: 'Done', variant: 'success' },
  { value: 'cancelled', label: 'Cancelled', variant: 'danger' },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#64748B', icon: 'arrow-down' },
  { value: 'medium', label: 'Medium', color: '#0891B2', icon: 'minus' },
  { value: 'high', label: 'High', color: '#D97706', icon: 'arrow-up' },
  { value: 'critical', label: 'Critical', color: '#DC2626', icon: 'alert-triangle' },
];

let _projectId = null;
let _project = null;
let _tasks = [];
let _members = [];
let _sprints = [];
let _allTags = [];
let _sortField = 'created_at';
let _sortDir = 'desc';
let _filterStatus = '';
let _filterPriority = '';
let _filterType = '';
let _isReadOnly = false;
let _filterAssignee = '';
let _searchQuery = '';
let _selectedIds = new Set();
let _detailTaskId = null;

export async function render(params = {}) {
  _projectId = params.id;
  if (!_projectId) {
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">No project specified</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  try {
    const [project, allTasks, members, allSprints] = await Promise.all([
      getById('projects', _projectId),
      getAll('tasks'),
      getAll('users'),
      getAll('sprints'),
    ]);
    _project = project;
    _tasks = allTasks.filter(t => t.project_id === _projectId);
    _members = members;
    _sprints = allSprints.filter(s => s.project_id === _projectId);
    if (!_project) {
      document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="folder-x" class="empty-state__icon"></i><p class="empty-state__title">Project not found</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }
    _computeAllTags();
    _filterStatus = ''; _filterPriority = ''; _filterType = ''; _filterAssignee = '';
    _searchQuery = ''; _selectedIds.clear(); _detailTaskId = null;
    await renderBacklogPage();
  } catch (err) {
    debug('Backlog render error:', err);
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load backlog</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function _computeAllTags() {
  const tagSet = new Set();
  _tasks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
  _allTags = [...tagSet].sort();
}

async function renderBacklogPage() {
  const content = document.getElementById('main-content');
  if (!content) return;
  const session = getSession();
  const isAdminOrPM = session && ['admin', 'pm'].includes(session.role);
  _isReadOnly = session && ['viewer', 'client'].includes(session.role);
  const banner = await buildProjectBanner(_project, 'backlog', { renderBadge, isAdminOrPM });

  content.innerHTML = `
    <div class="page-container page-enter backlog-page project-detail-page">
      ${banner}

      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Backlog</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)} &mdash; ${_tasks.length} task${_tasks.length !== 1 ? 's' : ''} total</p>
        </div>
        <div class="page-header__actions">
          ${_isReadOnly ? '' : `<button class="btn btn--primary" id="btnNewTask"><i data-lucide="plus" aria-hidden="true"></i> New Task</button>`}
        </div>
      </div>

      <div class="project-tab-body">
      <div class="backlog-toolbar" style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
        <div class="backlog-search" style="flex:1;min-width:180px;">
          <i data-lucide="search" class="backlog-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input backlog-search__input" id="backlogSearch" placeholder="Search tasks..." value="${sanitize(_searchQuery)}" autocomplete="off" />
        </div>
        <select class="form-select" id="sortField" style="width:auto;min-width:140px;">
          ${[{ v: 'created_at', l: 'Created' }, { v: 'priority', l: 'Priority' }, { v: 'due_date', l: 'Due Date' }, { v: 'status', l: 'Status' }, { v: 'story_points', l: 'SP' }].map(o => {
    const arrow = _sortField === o.v ? (_sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<option value="${o.v}" ${_sortField === o.v ? 'selected' : ''}>Sort: ${o.l}${arrow}</option>`;
  }).join('')}
        </select>
        <div class="filter-btn-wrap">
          <button class="btn btn--secondary" id="btnOpenFilterModal">
            <i data-lucide="filter" aria-hidden="true"></i> Filter
          </button>
          ${[_filterStatus, _filterPriority, _filterType, _filterAssignee].filter(Boolean).length > 0
      ? `<span class="filter-badge">${[_filterStatus, _filterPriority, _filterType, _filterAssignee].filter(Boolean).length}</span>` : ''}
        </div>
      </div>
      <div class="filter-chips" id="backlogFilterChips" style="padding:0 var(--space-1) var(--space-2);">${renderBacklogFilterChips()}</div>

      ${_isReadOnly ? '' : `<div class="backlog-bulk-bar" id="bulkBar" style="display:none;">
        <span class="backlog-bulk-count" id="bulkCount">0 selected</span>
        <div class="backlog-bulk-actions">
          <select class="form-select backlog-bulk-select" id="bulkStatusChange">
            <option value="">Change Status...</option>
            ${TASK_STATUS_OPTIONS.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
          </select>
          <select class="form-select backlog-bulk-select" id="bulkPriorityChange">
            <option value="">Change Priority...</option>
            ${TASK_PRIORITY_OPTIONS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
          </select>
          <select class="form-select backlog-bulk-select" id="bulkSprintAssign">
            <option value="">Assign to Sprint...</option>
            ${_sprints.filter(s => s.status !== 'completed').map(s => `<option value="${s.id}">${sanitize(s.name)}</option>`).join('')}
            <option value="__none__">Remove from Sprint</option>
          </select>
          <button class="btn btn--danger btn--sm" id="btnBulkDelete"><i data-lucide="trash-2" aria-hidden="true"></i> Delete</button>
          <button class="btn btn--ghost btn--sm" id="btnBulkClear">Clear</button>
        </div>
      </div>`}

      <div id="backlogContent">${renderBacklogContent()}</div>
      </div>
    </div>

    <div class="task-slideover-overlay" id="slideoverOverlay"></div>
    <aside class="task-slideover" id="taskSlideover" aria-label="Task Detail"></aside>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnBannerEditProject')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('trackly:editProject', { detail: { projectId: _project.id } }));
  });
  bindPageEvents();
}

function renderBacklogContent() {
  const filtered = getFilteredTasks();
  if (_tasks.length === 0) {
    return `<div class="empty-state" style="padding:var(--space-16) 0;"><i data-lucide="clipboard-list" class="empty-state__icon"></i><p class="empty-state__title">No tasks yet</p><p class="empty-state__text">Create your first task to start managing this project's backlog.</p><button class="btn btn--primary" id="btnNewTaskEmpty"><i data-lucide="plus" aria-hidden="true"></i> New Task</button></div>`;
  }
  if (filtered.length === 0) {
    return `<div class="empty-state" style="padding:var(--space-10) 0;"><i data-lucide="search-x" class="empty-state__icon"></i><p class="empty-state__title">No tasks match your filters</p><p class="empty-state__text">Try adjusting your search or filter criteria.</p></div>`;
  }
  const allVisible = filtered.length > 0 && filtered.every(t => _selectedIds.has(t.id));
  return `
    <div class="backlog-list">
      <div class="backlog-list__header">
        ${_isReadOnly ? '' : `<label class="backlog-check-wrapper" title="Select all">
          <input type="checkbox" class="backlog-check" id="checkAll" ${allVisible ? 'checked' : ''} />
        </label>`}
        <span class="backlog-col backlog-col--title">Task</span>
        <span class="backlog-col backlog-col--type">Type</span>
        <span class="backlog-col backlog-col--status">Status</span>
        <span class="backlog-col backlog-col--priority">Priority</span>
        <span class="backlog-col backlog-col--assignee">Assignee</span>
        <span class="backlog-col backlog-col--points">SP</span>
        <span class="backlog-col backlog-col--due">Due</span>
        <span class="backlog-col backlog-col--actions"></span>
      </div>
      ${filtered.map(task => renderTaskRow(task)).join('')}
    </div>`;
}

function renderTaskRow(task) {
  const isSelected = _selectedIds.has(task.id);
  const statusOpt = TASK_STATUS_OPTIONS.find(s => s.value === task.status);
  const priorityOpt = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const typeOpt = TASK_TYPE_OPTIONS.find(t => t.value === task.type);
  const assignees = (task.assignees || []).slice(0, 3).map(uid => _members.find(m => m.id === uid)).filter(Boolean);
  const extraAssignees = Math.max(0, (task.assignees || []).length - 3);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['done', 'cancelled'].includes(task.status);
  const checklistDone = (task.checklist || []).filter(c => c.done).length;
  const checklistTotal = (task.checklist || []).length;
  const sprint = _sprints.find(s => s.id === task.sprint_id);
  const btnClass = statusOpt ? `badge--${statusOpt.variant}` : 'badge--neutral';

  return `
    <div class="backlog-row${isSelected ? ' is-selected' : ''}" data-task-id="${sanitize(task.id)}">
      ${_isReadOnly ? '' : `<div class="backlog-col backlog-col--check" onclick="event.stopPropagation()">
        <input type="checkbox" class="task-check" data-id="${sanitize(task.id)}" ${isSelected ? 'checked' : ''} />
      </div>`}
      <div class="backlog-col backlog-col--title">
        <div class="backlog-task-title-group">
          <span class="backlog-task-id text-mono">${sanitize(task.id)}</span>
          <span class="backlog-task-title">${sanitize(task.title)}</span>
          <div class="backlog-task-meta">
            ${sprint ? `<span class="badge badge--info badge--xs">${sanitize(sprint.name)}</span>` : ''}
            ${(task.tags || []).slice(0, 2).map(tag => `<span class="badge badge--neutral badge--xs">${sanitize(tag)}</span>`).join('')}
            ${checklistTotal > 0 ? `<span class="backlog-meta-pill text-muted"><i data-lucide="check-square" style="width:11px;height:11px;"></i> ${checklistDone}/${checklistTotal}</span>` : ''}
            ${(task.comments || []).length > 0 ? `<span class="backlog-meta-pill text-muted"><i data-lucide="message-circle" style="width:11px;height:11px;"></i> ${(task.comments || []).length}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="backlog-col backlog-col--type">
        ${typeOpt ? `<span class="task-type-badge task-type-badge--${sanitize(task.type)}"><i data-lucide="${typeOpt.icon}" aria-hidden="true"></i> ${typeOpt.label}</span>` : '—'}
      </div>
      <div class="backlog-col backlog-col--status" onclick="event.stopPropagation()">
        ${_isReadOnly ? `<span class="badge ${btnClass}">${statusOpt?.label || task.status}</span>` : `<select class="backlog-status-select" data-id="${sanitize(task.id)}">
          ${TASK_STATUS_OPTIONS.map(s => `<option value="${s.value}" ${s.value === task.status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>`}
      </div>
      <div class="backlog-col backlog-col--priority">
        ${priorityOpt ? `<span class="priority-badge" style="color:${priorityOpt.color};"><i data-lucide="${priorityOpt.icon}" aria-hidden="true"></i> ${priorityOpt.label}</span>` : '—'}
      </div>
      <div class="backlog-col backlog-col--assignee">
        <div class="avatar-stack">
          ${assignees.map(m => { const initials = (m.full_name || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join(''); return `<div class="avatar avatar--xs" title="${sanitize(m.full_name)}" style="${m.avatar ? '' : 'background:var(--color-primary);'}">${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(initials)}</span>`}</div>`; }).join('')}
          ${extraAssignees > 0 ? `<span class="avatar avatar--xs avatar--extra">+${extraAssignees}</span>` : ''}
          ${assignees.length === 0 ? '<span class="text-muted" style="font-size:11px;">—</span>' : ''}
        </div>
      </div>
      <div class="backlog-col backlog-col--points">
        <span class="story-points-badge${task.story_points ? '' : ' text-muted'}">${task.story_points || '—'}</span>
      </div>
      <div class="backlog-col backlog-col--due">
        <span class="${isOverdue ? 'text-danger' : 'text-muted'}" style="font-size:var(--text-xs);">${task.due_date ? formatDate(task.due_date) : '—'}</span>
      </div>
      <div class="backlog-col backlog-col--actions" onclick="event.stopPropagation()">
        ${_isReadOnly ? '' : `<button class="btn btn--ghost btn--xs btn-edit-task" data-id="${sanitize(task.id)}" title="Edit"><i data-lucide="pencil" aria-hidden="true"></i></button>
        <button class="btn btn--ghost btn--xs btn-delete-task" data-id="${sanitize(task.id)}" title="Delete"><i data-lucide="trash-2" aria-hidden="true"></i></button>`}
      </div>
    </div>`;
}

function getFilteredTasks() {
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const STATUS_ORDER = { backlog: 0, todo: 1, in_progress: 2, in_review: 3, done: 4, cancelled: 5 };
  let result = _tasks.filter(task => {
    const q = _searchQuery.toLowerCase();
    const matchSearch = !q || task.title?.toLowerCase().includes(q) || task.id?.toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q) || (task.tags || []).some(t => t.toLowerCase().includes(q));
    const matchStatus = !_filterStatus || task.status === _filterStatus;
    const matchPriority = !_filterPriority || task.priority === _filterPriority;
    const matchType = !_filterType || task.type === _filterType;
    const matchAssignee = !_filterAssignee || (task.assignees || []).includes(_filterAssignee);
    return matchSearch && matchStatus && matchPriority && matchType && matchAssignee;
  });
  result.sort((a, b) => {
    let aVal, bVal;
    if (_sortField === 'priority') { aVal = PRIORITY_ORDER[a.priority] ?? 99; bVal = PRIORITY_ORDER[b.priority] ?? 99; }
    else if (_sortField === 'status') { aVal = STATUS_ORDER[a.status] ?? 99; bVal = STATUS_ORDER[b.status] ?? 99; }
    else if (_sortField === 'due_date') { aVal = a.due_date ? new Date(a.due_date).getTime() : Infinity; bVal = b.due_date ? new Date(b.due_date).getTime() : Infinity; }
    else if (_sortField === 'story_points') { aVal = a.story_points || 0; bVal = b.story_points || 0; }
    else { aVal = a.created_at || ''; bVal = b.created_at || ''; }
    const dir = _sortDir === 'asc' ? 1 : -1;
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
  });
  return result;
}

function bindPageEvents() {
  document.getElementById('btnNewTask')?.addEventListener('click', () => openTaskModal(null));
  document.getElementById('backlogSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; refreshContent(); });
  document.getElementById('btnOpenFilterModal')?.addEventListener('click', openBacklogFilterModal);
  document.getElementById('backlogFilterChips')?.addEventListener('click', handleBacklogChipRemove);
  document.getElementById('sortField')?.addEventListener('change', async e => {
    const newField = e.target.value;
    if (newField === _sortField) { _sortDir = _sortDir === 'asc' ? 'desc' : 'asc'; }
    else { _sortField = newField; _sortDir = 'desc'; }
    await renderBacklogPage();
  });
  const bc = document.getElementById('backlogContent');
  if (bc) { bc.addEventListener('click', handleListClick); bc.addEventListener('change', handleListChange); }
  document.getElementById('btnBulkDelete')?.addEventListener('click', handleBulkDelete);
  document.getElementById('btnBulkClear')?.addEventListener('click', () => { _selectedIds.clear(); refreshContent(); });
  document.getElementById('bulkStatusChange')?.addEventListener('change', handleBulkStatusChange);
  document.getElementById('bulkPriorityChange')?.addEventListener('change', handleBulkPriorityChange);
  document.getElementById('bulkSprintAssign')?.addEventListener('change', handleBulkSprintAssign);
  document.getElementById('slideoverOverlay')?.addEventListener('click', closeSlideover);
}

function renderBacklogFilterChips() {
  const chips = [];
  if (_filterStatus) {
    const lbl = TASK_STATUS_OPTIONS.find(s => s.value === _filterStatus)?.label || _filterStatus;
    chips.push(`<span class="filter-chip" data-key="status"><span class="filter-chip__label">Status: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterPriority) {
    const lbl = TASK_PRIORITY_OPTIONS.find(p => p.value === _filterPriority)?.label || _filterPriority;
    chips.push(`<span class="filter-chip" data-key="priority"><span class="filter-chip__label">Priority: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterType) {
    const lbl = TASK_TYPE_OPTIONS.find(t => t.value === _filterType)?.label || _filterType;
    chips.push(`<span class="filter-chip" data-key="type"><span class="filter-chip__label">Type: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterAssignee) {
    const lbl = _members.find(m => m.id === _filterAssignee)?.full_name || _filterAssignee;
    chips.push(`<span class="filter-chip" data-key="assignee"><span class="filter-chip__label">Assignee: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  return chips.join('');
}

function handleBacklogChipRemove(e) {
  const btn = e.target.closest('.filter-chip__remove');
  if (!btn) return;
  const key = btn.closest('.filter-chip')?.dataset.key;
  if (key === 'status') _filterStatus = '';
  if (key === 'priority') _filterPriority = '';
  if (key === 'type') _filterType = '';
  if (key === 'assignee') _filterAssignee = '';
  refreshContent(); updateBacklogFilterUI();
}

function openBacklogFilterModal() {
  openModal({
    title: 'Filter Tasks',
    size: 'md',
    body: `<div class="filter-modal-grid">
      <div class="form-group">
        <label class="form-label" for="fmFilterStatus">Status</label>
        <select class="form-select" id="fmFilterStatus">
          <option value="">All Status</option>
          ${TASK_STATUS_OPTIONS.map(s => `<option value="${s.value}" ${_filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmFilterPriority">Priority</label>
        <select class="form-select" id="fmFilterPriority">
          <option value="">All Priority</option>
          ${TASK_PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${_filterPriority === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmFilterType">Type</label>
        <select class="form-select" id="fmFilterType">
          <option value="">All Types</option>
          ${TASK_TYPE_OPTIONS.map(t => `<option value="${t.value}" ${_filterType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmFilterAssignee">Assignee</label>
        <select class="form-select" id="fmFilterAssignee">
          <option value="">All Assignees</option>
          ${_members.map(m => `<option value="${m.id}" ${_filterAssignee === m.id ? 'selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
        </select>
      </div>
    </div>`,
    footer: `
      <button class="btn btn--outline" id="btnResetBacklogFilter">Reset Filter</button>
      <button class="btn btn--primary" id="btnApplyBacklogFilter"><i data-lucide="check" aria-hidden="true"></i> Terapkan Filter</button>`,
  });
  document.getElementById('btnResetBacklogFilter')?.addEventListener('click', () => {
    _filterStatus = ''; _filterPriority = ''; _filterType = ''; _filterAssignee = '';
    closeModal(); refreshContent(); updateBacklogFilterUI();
  });
  document.getElementById('btnApplyBacklogFilter')?.addEventListener('click', () => {
    _filterStatus = document.getElementById('fmFilterStatus')?.value || '';
    _filterPriority = document.getElementById('fmFilterPriority')?.value || '';
    _filterType = document.getElementById('fmFilterType')?.value || '';
    _filterAssignee = document.getElementById('fmFilterAssignee')?.value || '';
    closeModal(); refreshContent(); updateBacklogFilterUI();
  });
}

function updateBacklogFilterUI() {
  const wrap = document.getElementById('btnOpenFilterModal')?.closest('.filter-btn-wrap');
  if (wrap) {
    wrap.querySelector('.filter-badge')?.remove();
    const count = [_filterStatus, _filterPriority, _filterType, _filterAssignee].filter(Boolean).length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'filter-badge';
      badge.textContent = count;
      wrap.appendChild(badge);
    }
  }
  const chips = document.getElementById('backlogFilterChips');
  if (chips) chips.innerHTML = renderBacklogFilterChips();
}

function handleListClick(e) {
  const editBtn = e.target.closest('.btn-edit-task');
  const deleteBtn = e.target.closest('.btn-delete-task');
  const row = e.target.closest('.backlog-row');
  if (editBtn) { e.stopPropagation(); const task = _tasks.find(t => t.id === editBtn.dataset.id); if (task) openTaskModal(task); return; }
  if (deleteBtn) { e.stopPropagation(); const task = _tasks.find(t => t.id === deleteBtn.dataset.id); if (task) handleDeleteTask(task); return; }
  const btnNewTaskEmpty = e.target.closest('#btnNewTaskEmpty');
  if (btnNewTaskEmpty) { openTaskModal(null); return; }
  if (row && !e.target.closest('.backlog-check-wrapper') && !e.target.closest('select') && !e.target.closest('button')) {
    const task = _tasks.find(t => t.id === row.dataset.taskId);
    if (task) openTaskDetail(task);
  }
}

function handleListChange(e) {
  const checkbox = e.target.closest('.task-check');
  const checkAll = e.target.closest('#checkAll');
  const statusSelect = e.target.closest('.backlog-status-select');
  if (checkAll) { const filtered = getFilteredTasks(); if (checkAll.checked) filtered.forEach(t => _selectedIds.add(t.id)); else filtered.forEach(t => _selectedIds.delete(t.id)); updateBulkBar(); document.querySelectorAll('.backlog-row').forEach(row => { const id = row.dataset.taskId; row.classList.toggle('is-selected', _selectedIds.has(id)); }); document.querySelectorAll('.task-check').forEach(cb => { cb.checked = _selectedIds.has(cb.dataset.id); }); return; }
  if (checkbox) { const id = checkbox.dataset.id; if (checkbox.checked) _selectedIds.add(id); else _selectedIds.delete(id); updateBulkBar(); const row = document.querySelector(`.backlog-row[data-task-id="${id}"]`); if (row) row.classList.toggle('is-selected', checkbox.checked); return; }
  if (statusSelect) { const task = _tasks.find(t => t.id === statusSelect.dataset.id); if (task) handleInlineStatusChange(task, statusSelect.value); }
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  const countEl = document.getElementById('bulkCount');
  if (bar) bar.classList.toggle('is-visible', _selectedIds.size > 0);
  if (countEl) countEl.textContent = _selectedIds.size;
}

function refreshContent() {
  const container = document.getElementById('backlogContent');
  if (!container) return;
  container.innerHTML = renderBacklogContent();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  container.addEventListener('click', handleListClick);
  container.addEventListener('change', handleListChange);
  updateBulkBar();
}

async function handleInlineStatusChange(task, newStatus) {
  try {
    const updated = { ...task, status: newStatus, updated_at: nowISO() };
    if (newStatus === 'done' && !task.completed_at) updated.completed_at = nowISO();
    if (newStatus !== 'done') updated.completed_at = null;
    await update('tasks', updated);
    const idx = _tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) _tasks[idx] = updated;
    showToast('Task status updated.', 'success');
  } catch { showToast('Failed to update status.', 'error'); }
}

async function handleBulkStatusChange(e) {
  const val = e.target.value; if (!val || _selectedIds.size === 0) return; e.target.value = '';
  const toUpdate = _tasks.filter(t => _selectedIds.has(t.id));
  try { for (const task of toUpdate) { const u = { ...task, status: val, updated_at: nowISO() }; if (val === 'done' && !task.completed_at) u.completed_at = nowISO(); await update('tasks', u); const i = _tasks.findIndex(t => t.id === task.id); if (i !== -1) _tasks[i] = u; } showToast(`${toUpdate.length} task(s) updated.`, 'success'); _selectedIds.clear(); refreshContent(); } catch { showToast('Bulk update failed.', 'error'); }
}

async function handleBulkPriorityChange(e) {
  const val = e.target.value; if (!val || _selectedIds.size === 0) return; e.target.value = '';
  const toUpdate = _tasks.filter(t => _selectedIds.has(t.id));
  try { for (const task of toUpdate) { const u = { ...task, priority: val, updated_at: nowISO() }; await update('tasks', u); const i = _tasks.findIndex(t => t.id === task.id); if (i !== -1) _tasks[i] = u; } showToast(`${toUpdate.length} task(s) priority updated.`, 'success'); _selectedIds.clear(); refreshContent(); } catch { showToast('Bulk priority update failed.', 'error'); }
}

async function handleBulkSprintAssign(e) {
  const val = e.target.value; if (!val || _selectedIds.size === 0) return; e.target.value = '';
  const sprintId = val === '__none__' ? null : val;
  const toUpdate = _tasks.filter(t => _selectedIds.has(t.id));
  try { for (const task of toUpdate) { const u = { ...task, sprint_id: sprintId, updated_at: nowISO() }; await update('tasks', u); const i = _tasks.findIndex(t => t.id === task.id); if (i !== -1) _tasks[i] = u; } showToast(sprintId ? `${toUpdate.length} task(s) assigned to sprint.` : `${toUpdate.length} task(s) removed from sprint.`, 'success'); _selectedIds.clear(); refreshContent(); } catch { showToast('Sprint assignment failed.', 'error'); }
}

async function handleBulkDelete() {
  if (_selectedIds.size === 0) return;
  showConfirm({
    title: 'Delete Tasks', message: `Delete <strong>${_selectedIds.size} task(s)</strong>? This cannot be undone.`, confirmLabel: 'Delete', confirmVariant: 'danger', onConfirm: async () => {
      try { for (const id of _selectedIds) await remove('tasks', id); _tasks = _tasks.filter(t => !_selectedIds.has(t.id)); _selectedIds.clear(); _computeAllTags(); showToast('Tasks deleted.', 'success'); refreshContent(); } catch { showToast('Delete failed.', 'error'); }
    }
  });
}

async function handleDeleteTask(task) {
  showConfirm({
    title: 'Delete Task', message: `Delete <strong>${sanitize(task.title)}</strong>?`, confirmLabel: 'Delete', confirmVariant: 'danger', onConfirm: async () => {
      try { await remove('tasks', task.id); _tasks = _tasks.filter(t => t.id !== task.id); _computeAllTags(); logActivity({ project_id: _projectId, entity_type: 'task', entity_id: task.id, entity_name: task.title, action: 'deleted' }); showToast(`"${task.title}" deleted.`, 'success'); if (_detailTaskId === task.id) closeSlideover(); refreshContent(); } catch { showToast('Delete failed.', 'error'); }
    }
  });
}

// ---- TASK MODAL ----

function openTaskModal(task) {
  const isEdit = !!task;
  const session = getSession();
  let _modalTags = task ? [...(task.tags || [])] : [];
  let _checklist = task ? (task.checklist || []).map(c => ({ ...c })) : [];
  let _comments = task ? (task.comments || []).map(c => ({ ...c })) : [];

  const projectMembers = (_project.members || []).map(m => { const uid = m.user_id || m; return _members.find(u => u.id === uid); }).filter(Boolean);
  const sprintOptions = _sprints.filter(s => s.status !== 'completed');

  const formHtml = `
    <form id="taskForm" novalidate>
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label class="form-label" for="tType">Type</label>
          <select class="form-select" id="tType">${TASK_TYPE_OPTIONS.map(t => `<option value="${t.value}" ${(task?.type || 'task') === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:4;">
          <label class="form-label" for="tTitle">Title <span class="required">*</span></label>
          <input class="form-input" type="text" id="tTitle" placeholder="What needs to be done?" value="${sanitize(task?.title || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="tDescription">Description <span class="form-help-inline">(Markdown supported)</span></label>
        <textarea class="form-textarea" id="tDescription" rows="4" placeholder="Describe this task...">${sanitize(task?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="tStatus">Status</label>
          <select class="form-select" id="tStatus">${TASK_STATUS_OPTIONS.map(s => `<option value="${s.value}" ${(task?.status || 'backlog') === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="tPriority">Priority</label>
          <select class="form-select" id="tPriority">${TASK_PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${(task?.priority || 'medium') === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="tPoints">Story Points</label>
          <input class="form-input" type="number" id="tPoints" min="0" max="999" placeholder="—" value="${task?.story_points ?? ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Assignees</label>
        <div id="assigneePicker" style="max-height:140px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:4px;">
          ${projectMembers.length === 0 ? '<p class="text-muted" style="font-size:var(--text-sm);padding:8px;">No members in this project.</p>' : projectMembers.map(m => {
    const isSel = (task?.assignees || []).includes(m.id);
    return `<label style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:0.85rem;" onmouseover="this.style.background='var(--color-surface)'" onmouseout="this.style.background='transparent'"><input type="checkbox" class="task-assignee-cb" value="${sanitize(m.id)}" ${isSel ? 'checked' : ''} style="accent-color:var(--color-primary);width:15px;height:15px;flex-shrink:0;"><span>${sanitize(m.full_name)}</span></label>`;
  }).join('')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="tReporter">Reporter</label>
          <select class="form-select" id="tReporter"><option value="">— None —</option>${_members.map(m => `<option value="${m.id}" ${(task?.reporter || session?.userId) === m.id ? 'selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="tSprint">Sprint</label>
          <select class="form-select" id="tSprint"><option value="">— No Sprint —</option>${sprintOptions.map(s => `<option value="${s.id}" ${task?.sprint_id === s.id ? 'selected' : ''}>${sanitize(s.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="tStartDate">Start Date</label>
          <input class="form-input" type="date" id="tStartDate" value="${task?.start_date || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="tDueDate">Due Date</label>
          <input class="form-input" type="date" id="tDueDate" value="${task?.due_date || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="tTimeLogged">Time Logged (min)</label>
          <input class="form-input" type="number" id="tTimeLogged" min="0" placeholder="0" value="${task?.time_logged || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="tTagInput">Tags</label>
        <div class="tag-input-wrapper" id="tagInputWrapper">
          <div class="tag-input-chips" id="tagInputChips">${_modalTags.map(tag => `<span class="tag-chip">${sanitize(tag)}<button type="button" class="tag-chip__remove" data-tag="${sanitize(tag)}"><i data-lucide="x" style="width:10px;height:10px;"></i></button></span>`).join('')}</div>
          <input class="tag-input__field" type="text" id="tTagInput" placeholder="Add tag, press Enter..." autocomplete="off" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Checklist</label>
        <div class="checklist-widget">
          <div class="checklist-items" id="checklistItems">${_checklist.map((item, idx) => renderChecklistItemEdit(item, idx)).join('')}</div>
          <div class="checklist-add-row">
            <input class="form-input checklist-add-input" type="text" id="checklistAddInput" placeholder="Add checklist item..." />
            <button type="button" class="btn btn--ghost btn--sm" id="btnAddChecklistItem"><i data-lucide="plus" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>
      ${isEdit ? `
      <div class="form-group">
        <label class="form-label">Comments</label>
        <div class="comments-section">
          <div class="comments-list" id="commentsList">${_comments.map(c => renderCommentView(c)).join('')}${_comments.length === 0 ? '<p class="text-muted" style="font-size:var(--text-sm);">No comments yet.</p>' : ''}</div>
          <div class="comment-add-row">
            <textarea class="form-textarea" id="commentAddInput" rows="2" placeholder="Write a comment..."></textarea>
            <button type="button" class="btn btn--secondary btn--sm" id="btnAddComment"><i data-lucide="send" aria-hidden="true"></i> Add Comment</button>
          </div>
        </div>
      </div>` : ''}
    </form>`;

  openModal({ title: isEdit ? `Edit Task \u2014 ${sanitize(task.id)}` : 'New Task', size: 'lg', body: formHtml, footer: `<button class="btn btn--secondary" id="btnCancelTask">Cancel</button><button class="btn btn--primary" id="btnSaveTask"><i data-lucide="${isEdit ? 'save' : 'plus'}" aria-hidden="true"></i> ${isEdit ? 'Save Changes' : 'Create Task'}</button>` });
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Assignee chips logic removed since we use standard checkboxes now
  // Tags
  const tagInput = document.getElementById('tTagInput');
  const tagChipsEl = document.getElementById('tagInputChips');
  function refreshTagChips() {
    if (!tagChipsEl) return;
    tagChipsEl.innerHTML = _modalTags.map(tag => `<span class="tag-chip">${sanitize(tag)}<button type="button" class="tag-chip__remove" data-tag="${sanitize(tag)}"><i data-lucide="x" style="width:10px;height:10px;"></i></button></span>`).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  tagInput?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const val = tagInput.value.trim().toLowerCase().replace(/,/g, ''); if (val && !_modalTags.includes(val)) { _modalTags.push(val); refreshTagChips(); } tagInput.value = ''; } });
  tagChipsEl?.addEventListener('click', e => { const rb = e.target.closest('.tag-chip__remove'); if (rb) { _modalTags = _modalTags.filter(t => t !== rb.dataset.tag); refreshTagChips(); } });

  // Checklist
  function refreshChecklistItems() {
    const el = document.getElementById('checklistItems'); if (!el) return;
    el.innerHTML = _checklist.map((item, idx) => renderChecklistItemEdit(item, idx)).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    el.querySelectorAll('.checklist-item-check').forEach(cb => { cb.addEventListener('change', e => { const idx = parseInt(e.target.dataset.idx); if (!isNaN(idx)) _checklist[idx].done = e.target.checked; }); });
    el.querySelectorAll('.checklist-item-remove').forEach(btn => { btn.addEventListener('click', e => { const idx = parseInt(btn.dataset.idx); if (!isNaN(idx)) { _checklist.splice(idx, 1); refreshChecklistItems(); } }); });
  }
  // Initial bind
  document.getElementById('checklistItems')?.querySelectorAll('.checklist-item-check').forEach(cb => { cb.addEventListener('change', e => { const idx = parseInt(e.target.dataset.idx); if (!isNaN(idx)) _checklist[idx].done = e.target.checked; }); });
  document.getElementById('checklistItems')?.querySelectorAll('.checklist-item-remove').forEach(btn => { btn.addEventListener('click', e => { const idx = parseInt(btn.dataset.idx); if (!isNaN(idx)) { _checklist.splice(idx, 1); refreshChecklistItems(); } }); });
  document.getElementById('btnAddChecklistItem')?.addEventListener('click', () => { const inp = document.getElementById('checklistAddInput'); const text = inp?.value.trim(); if (text) { _checklist.push({ text, done: false }); inp.value = ''; refreshChecklistItems(); } });
  document.getElementById('checklistAddInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddChecklistItem')?.click(); } });

  // Comments
  if (isEdit) {
    document.getElementById('btnAddComment')?.addEventListener('click', () => {
      const inp = document.getElementById('commentAddInput'); const text = inp?.value.trim(); if (!text) return;
      const s = getSession(); const author = _members.find(m => m.id === s?.userId);
      _comments.push({ id: `CMT-${Date.now()}`, author_id: s?.userId || null, author_name: author?.full_name || 'Unknown', text, created_at: nowISO() });
      inp.value = '';
      const listEl = document.getElementById('commentsList'); if (listEl) { listEl.innerHTML = _comments.map(c => renderCommentView(c)).join(''); }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }

  document.getElementById('btnCancelTask')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveTask')?.addEventListener('click', () => handleSaveTask(task, isEdit, _modalTags, _checklist, _comments));
}

function renderChecklistItemEdit(item, idx) {
  return `<div class="checklist-item-row"><input type="checkbox" class="checklist-item-check" data-idx="${idx}" ${item.done ? 'checked' : ''} /><span class="checklist-item-text${item.done ? ' is-done' : ''}">${sanitize(item.text)}</span><button type="button" class="checklist-item-remove btn btn--ghost btn--xs" data-idx="${idx}" title="Remove"><i data-lucide="x" style="width:12px;height:12px;" aria-hidden="true"></i></button></div>`;
}

function renderCommentView(c) {
  return `<div class="comment-item"><div class="comment-item__header"><span class="comment-item__author">${sanitize(c.author_name || 'Unknown')}</span><span class="comment-item__time text-muted">${formatDate(c.created_at, 'datetime')}</span></div><p class="comment-item__text">${sanitize(c.text)}</p></div>`;
}

async function handleSaveTask(existing, isEdit, tags, checklist, comments) {
  const btn = document.getElementById('btnSaveTask');
  const title = document.getElementById('tTitle')?.value.trim() || '';
  if (!title) { setModalFieldError('tTitle', 'Task title is required.'); return; }
  const type = document.getElementById('tType')?.value || 'task';
  const description = document.getElementById('tDescription')?.value.trim() || '';
  const status = document.getElementById('tStatus')?.value || 'backlog';
  const priority = document.getElementById('tPriority')?.value || 'medium';
  const story_points = parseInt(document.getElementById('tPoints')?.value) || null;
  const reporter = document.getElementById('tReporter')?.value || null;
  const sprint_id = document.getElementById('tSprint')?.value || null;
  const start_date = document.getElementById('tStartDate')?.value || null;
  const due_date = document.getElementById('tDueDate')?.value || null;
  const time_logged = parseInt(document.getElementById('tTimeLogged')?.value) || 0;
  const assignees = [...document.querySelectorAll('.task-assignee-cb:checked')].map(cb => cb.value);
  if (btn) btn.disabled = true;
  try {
    const now = nowISO();
    const allTasks = await getAll('tasks');
    const taskId = isEdit ? existing.id : generateSequentialId('TSK', allTasks);
    const session = getSession();
    const taskData = { id: taskId, project_id: _projectId, title, description, type, status, priority, assignees, reporter: reporter || session?.userId || null, sprint_id: sprint_id || null, epic_id: existing?.epic_id || null, story_points, start_date, due_date, completed_at: status === 'done' ? (existing?.completed_at || now) : null, tags, attachments: existing?.attachments || [], checklist, comments, time_logged, dependencies: existing?.dependencies || [], created_at: existing?.created_at || now, updated_at: now };
    if (isEdit) {
      await update('tasks', taskData);
      const i = _tasks.findIndex(t => t.id === taskId); if (i !== -1) _tasks[i] = taskData;
      const changes = [];
      if (existing) { for (const f of ['title', 'status', 'priority', 'type', 'due_date', 'assignees', 'sprint_id']) { const ov = JSON.stringify(existing[f] || ''), nv = JSON.stringify(taskData[f] || ''); if (ov !== nv) changes.push({ field: f, old_value: existing[f], new_value: taskData[f] }); } }
      logActivity({ project_id: _projectId, entity_type: 'task', entity_id: taskId, entity_name: title, action: 'updated', changes });
      showToast(`Task "${title}" updated.`, 'success');
    } else {
      await add('tasks', taskData);
      _tasks.push(taskData);
      logActivity({ project_id: _projectId, entity_type: 'task', entity_id: taskId, entity_name: title, action: 'created' });
      showToast(`Task "${title}" created.`, 'success');
    }
    _computeAllTags(); closeModal(); refreshContent();
    if (_detailTaskId === taskId) { const u = _tasks.find(t => t.id === taskId); if (u) renderTaskDetail(u); }
  } catch (err) { debug('Save task error:', err); showToast('Failed to save task.', 'error'); }
  finally { if (btn) btn.disabled = false; }
}

// ---- TASK DETAIL SLIDE-OVER ----

function openTaskDetail(task) {
  _detailTaskId = task.id;
  document.getElementById('slideoverOverlay')?.classList.add('is-visible');
  const panel = document.getElementById('taskSlideover');
  if (panel) panel.classList.add('is-visible');
  renderTaskDetail(task);
}

function closeSlideover() {
  _detailTaskId = null;
  document.getElementById('slideoverOverlay')?.classList.remove('is-visible');
  const panel = document.getElementById('taskSlideover');
  if (panel) { panel.classList.remove('is-visible'); panel.innerHTML = ''; }
}

function renderMarkdown(text) {
  if (!text) return '';
  return sanitize(text).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}

function renderTaskDetail(task) {
  const panel = document.getElementById('taskSlideover'); if (!panel) return;
  const typeOpt = TASK_TYPE_OPTIONS.find(t => t.value === task.type);
  const statusOpt = TASK_STATUS_OPTIONS.find(s => s.value === task.status);
  const priorityOpt = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const assigneeUsers = (task.assignees || []).map(uid => _members.find(m => m.id === uid)).filter(Boolean);
  const reporterUser = _members.find(m => m.id === task.reporter);
  const sprint = _sprints.find(s => s.id === task.sprint_id);
  const checklistDone = (task.checklist || []).filter(c => c.done).length;
  const checklistTotal = (task.checklist || []).length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['done', 'cancelled'].includes(task.status);

  panel.innerHTML = `
    <div class="task-detail">
      <div class="task-detail__topbar">
        <div class="task-detail__id-type">
          <span class="text-mono" style="font-size:var(--text-xs);color:var(--color-text-muted);">${sanitize(task.id)}</span>
          ${typeOpt ? `<span class="task-type-badge task-type-badge--${sanitize(task.type)}"><i data-lucide="${typeOpt.icon}" aria-hidden="true"></i> ${typeOpt.label}</span>` : ''}
        </div>
        <div class="task-detail__actions">
          <button class="btn btn--secondary btn--sm" id="btnDetailEdit"><i data-lucide="pencil" aria-hidden="true"></i> Edit</button>
          <button class="btn btn--ghost btn--sm" id="btnDetailClose" aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="task-detail__body">
        <h2 class="task-detail__title">${sanitize(task.title)}</h2>
        <div class="task-detail__badges">
          ${statusOpt ? renderBadge(statusOpt.label, statusOpt.variant) : ''}
          ${priorityOpt ? `<span class="priority-badge" style="color:${priorityOpt.color};font-size:var(--text-xs);font-weight:600;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="${priorityOpt.icon}" style="width:14px;height:14px;" aria-hidden="true"></i>${priorityOpt.label}</span>` : ''}
          ${sprint ? `<span class="badge badge--info">${sanitize(sprint.name)}</span>` : ''}
          ${(task.tags || []).map(tag => `<span class="badge badge--neutral">${sanitize(tag)}</span>`).join('')}
        </div>
        ${task.description ? `<div class="task-detail__section"><h4 class="task-detail__section-label">Description</h4><div class="task-detail__description">${renderMarkdown(task.description)}</div></div>` : ''}
        <div class="task-detail__meta-grid">
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Assignees</span><div class="task-detail__meta-value">${assigneeUsers.length > 0 ? assigneeUsers.map(m => { const ini = (m.full_name || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join(''); return `<span class="assignee-display"><div class="avatar avatar--xs" style="${m.avatar ? '' : 'background:var(--color-primary);'}">${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(ini)}</span>`}</div> ${sanitize(m.full_name)}</span>`; }).join('') : '<span class="text-muted">Unassigned</span>'}</div></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Reporter</span><span class="task-detail__meta-value">${reporterUser ? sanitize(reporterUser.full_name) : '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Start Date</span><span class="task-detail__meta-value">${task.start_date ? formatDate(task.start_date) : '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Due Date</span><span class="task-detail__meta-value${isOverdue ? ' text-danger' : ''}">${task.due_date ? formatDate(task.due_date) : '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Story Points</span><span class="task-detail__meta-value">${task.story_points ?? '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Time Logged</span><span class="task-detail__meta-value">${task.time_logged ? `${task.time_logged} min` : '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Created</span><span class="task-detail__meta-value">${formatDate(task.created_at, 'datetime')}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Updated</span><span class="task-detail__meta-value">${formatDate(task.updated_at, 'datetime')}</span></div>
        </div>
        ${checklistTotal > 0 ? `
        <div class="task-detail__section">
          <h4 class="task-detail__section-label">Checklist <span class="text-muted" id="detailChecklistCount">${checklistDone}/${checklistTotal}</span></h4>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);">
            <div class="progress-bar-sm" style="flex:1;"><div class="progress-bar-sm__fill" id="detailChecklistFill" style="width:${checklistPct}%;"></div></div>
            <span class="text-muted" style="font-size:11px;" id="detailChecklistPct">${checklistPct}%</span>
          </div>
          <div class="task-detail__checklist">
            ${(task.checklist || []).map(item => `<label class="task-detail__checklist-item"><input type="checkbox" class="detail-checklist-check" ${item.done ? 'checked' : ''} data-text="${sanitize(item.text)}" /><span class="${item.done ? 'is-done' : ''}">${sanitize(item.text)}</span></label>`).join('')}
          </div>
        </div>` : ''}
        ${(task.comments || []).length > 0 ? `
        <div class="task-detail__section">
          <h4 class="task-detail__section-label">Comments</h4>
          ${(task.comments || []).map(c => renderCommentView(c)).join('')}
        </div>` : ''}
      </div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnDetailClose')?.addEventListener('click', closeSlideover);
  document.getElementById('btnDetailEdit')?.addEventListener('click', () => { closeSlideover(); openTaskModal(task); });

  panel.querySelectorAll('.detail-checklist-check').forEach(cb => {
    cb.addEventListener('change', async e => {
      if (typeof _isReadOnly !== 'undefined' && _isReadOnly) {
        e.target.checked = !e.target.checked;
        if (typeof showToast !== 'undefined') showToast('You do not have permission to edit this checklist', 'warning');
        return;
      }
      const text = e.target.dataset.text; const checked = e.target.checked;
      const taskCopy = { ...task, checklist: (task.checklist || []).map(item => item.text === text ? { ...item, done: checked } : item), updated_at: nowISO() };
      try {
        await update('tasks', taskCopy);
        const i = _tasks.findIndex(t => t.id === task.id); if (i !== -1) { _tasks[i] = taskCopy; task.checklist = taskCopy.checklist; }
        e.target.closest('label')?.querySelector('span')?.classList.toggle('is-done', checked);
        const newDone = taskCopy.checklist.filter(c => c.done).length; const newPct = Math.round((newDone / taskCopy.checklist.length) * 100);
        const fillEl = document.getElementById('detailChecklistFill'); if (fillEl) fillEl.style.width = `${newPct}%`;
        const countEl = document.getElementById('detailChecklistCount'); if (countEl) countEl.textContent = `${newDone}/${taskCopy.checklist.length}`;
        const pctEl = document.getElementById('detailChecklistPct'); if (pctEl) pctEl.textContent = `${newPct}%`;
      } catch { /* non-fatal */ }
    });
  });
}

function setModalFieldError(fieldId, message) {
  const field = document.getElementById(fieldId); if (!field) return;
  const group = field.closest('.form-group'); if (!group) return;
  group.querySelector('.form-error')?.remove();
  field.classList.add('is-invalid');
  const err = document.createElement('p'); err.className = 'form-error'; err.textContent = message; group.appendChild(err);
}

export default { render };
