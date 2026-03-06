/**
 * TRACKLY — board.js
 * Phase 9: Kanban Board with native HTML5 Drag & Drop
 */

import { getAll, getById, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, sanitize, debug, getInitials, logActivity, buildProjectBanner } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { getSession } from '../core/auth.js';
import { TASK_TYPE_OPTIONS, TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS } from './backlog.js';

// ─── Module-level state ───────────────────────────────────────────────────────

let _projectId = null;
let _project = null;
let _tasks = [];
let _members = [];
let _sprints = [];
let _allTags = [];

let _filterAssignee = '';
let _filterPriority = '';
let _filterLabel = '';
let _filterSprint = '';
let _searchQuery = '';

let _swimlaneMode = false;
let _isReadOnly = false;

const DEFAULT_COLUMNS = [
  { id: 'backlog', label: 'Backlog', status: 'backlog' },
  { id: 'todo', label: 'To Do', status: 'todo' },
  { id: 'in_progress', label: 'In Progress', status: 'in_progress' },
  { id: 'in_review', label: 'In Review', status: 'in_review' },
  { id: 'done', label: 'Done', status: 'done' },
];

let _columns = [];
let _dragTaskId = null;
let _dragOverCol = null;

// ─── Entry Point ──────────────────────────────────────────────────────────────

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
    _loadColumns();
    _filterAssignee = '';
    _filterPriority = '';
    _filterLabel = '';
    _filterSprint = '';
    _searchQuery = '';
    _swimlaneMode = false;

    const sess = getSession();
    _isReadOnly = sess && ['viewer', 'client'].includes(sess.role);

    await _renderBoardPage();
  } catch (err) {
    debug('Board render error:', err);
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load board</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Column Config ────────────────────────────────────────────────────────────

function _columnsKey() {
  return `trackly_board_cols_${_projectId}`;
}

function _loadColumns() {
  try {
    const stored = localStorage.getItem(_columnsKey());
    _columns = stored ? JSON.parse(stored) : DEFAULT_COLUMNS.map(c => ({ ...c }));
  } catch {
    _columns = DEFAULT_COLUMNS.map(c => ({ ...c }));
  }
}

function _saveColumns() {
  try {
    localStorage.setItem(_columnsKey(), JSON.stringify(_columns));
  } catch { /* quota, non-fatal */ }
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function _computeAllTags() {
  const tagSet = new Set();
  _tasks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
  _allTags = [...tagSet].sort();
}

function _getFilteredTasks() {
  return _tasks.filter(task => {
    const q = _searchQuery.toLowerCase();
    const matchSearch = !q || task.title?.toLowerCase().includes(q) || task.id?.toLowerCase().includes(q) || (task.tags || []).some(t => t.toLowerCase().includes(q));
    const matchAssignee = !_filterAssignee || (task.assignees || []).includes(_filterAssignee);
    const matchPriority = !_filterPriority || task.priority === _filterPriority;
    const matchLabel = !_filterLabel || (task.tags || []).includes(_filterLabel);
    const matchSprint = !_filterSprint || task.sprint_id === _filterSprint;
    return matchSearch && matchAssignee && matchPriority && matchLabel && matchSprint;
  });
}

// ─── Page Render ──────────────────────────────────────────────────────────────

async function _renderBoardPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const session = getSession();
  const isAdminOrPM = session && ['admin', 'pm'].includes(session.role);
  const _isReadOnly = session && ['viewer', 'client'].includes(session.role);
  const banner = await buildProjectBanner(_project, 'board', { renderBadge, isAdminOrPM });

  content.innerHTML = `
    <div class="page-container page-enter board-page project-detail-page">
      ${banner}

      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Board</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)}</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--ghost btn--sm" id="btnToggleSwimlane">
            <i data-lucide="rows" aria-hidden="true"></i> Swimlane
          </button>
          ${_isReadOnly ? '' : `<button class="btn btn--secondary btn--sm" id="btnAddColumn">
            <i data-lucide="columns" aria-hidden="true"></i> Add Column
          </button>
          <button class="btn btn--primary btn--sm" id="btnNewTask">
            <i data-lucide="plus" aria-hidden="true"></i> New Task
          </button>`}
        </div>
      </div>

      <div class="board-filterbar">
        <div class="board-search">
          <i data-lucide="search" class="board-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input board-search__input" id="boardSearch" placeholder="Search tasks..." autocomplete="off" />
        </div>
        <div class="filter-btn-wrap">
          <button class="btn btn--secondary btn--sm" id="btnOpenFilterModal">
            <i data-lucide="filter" aria-hidden="true"></i> Filter
          </button>
          ${[_filterAssignee, _filterPriority, _filterLabel, _filterSprint].filter(Boolean).length > 0
      ? `<span class="filter-badge">${[_filterAssignee, _filterPriority, _filterLabel, _filterSprint].filter(Boolean).length}</span>` : ''}
        </div>
      </div>
      <div class="filter-chips" id="boardFilterChips" style="padding:0 var(--space-1) var(--space-3);">${_renderBoardFilterChips()}</div>

      <div class="board-scroll-wrapper">
        <div class="board-columns" id="boardColumns"></div>
      </div>
    </div>

    <div class="task-slideover-overlay" id="slideoverOverlay"></div>
    <aside class="task-slideover" id="taskSlideover" aria-label="Task Detail"></aside>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnBannerEditProject')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('trackly:editProject', { detail: { projectId: _project.id } }));
  });
  _renderColumns();
  _bindPageEvents();
}

// ─── Columns ──────────────────────────────────────────────────────────────────

function _renderColumns() {
  const container = document.getElementById('boardColumns');
  if (!container) return;

  const filtered = _getFilteredTasks();

  if (_swimlaneMode) {
    _renderSwimlanes(container, filtered);
  } else {
    container.innerHTML = _columns.map(col => _buildColumnHTML(col, filtered)).join('');
    _bindDragAndDrop();
    _bindColumnEvents();
  }

  if (typeof lucide !== 'undefined') lucide.createIcons();

  const btnSwimlane = document.getElementById('btnToggleSwimlane');
  if (btnSwimlane) {
    btnSwimlane.classList.toggle('is-active-toggle', _swimlaneMode);
  }
}

function _buildColumnHTML(col, filteredTasks) {
  const colTasks = filteredTasks.filter(t => t.status === col.status);
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  colTasks.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));

  const wipLimit = col.wip_limit || 0;
  const isOverWip = wipLimit > 0 && colTasks.length > wipLimit;
  const wipIndicator = wipLimit > 0
    ? `<span class="board-col-wip ${isOverWip ? 'board-col-wip--over' : ''}" title="WIP Limit: ${wipLimit}">${colTasks.length}/${wipLimit}</span>`
    : '';

  return `
    <div class="board-column${isOverWip ? ' board-column--wip-over' : ''}" data-col-status="${sanitize(col.status)}" data-col-id="${sanitize(col.id)}">
      <div class="board-column__header">
        <div class="board-column__header-left">
          <span class="board-column__label">${sanitize(col.label)}</span>
          <span class="board-column__count">${colTasks.length}</span>
          ${wipIndicator}
        </div>
        ${_isReadOnly ? '' : `<div class="board-column__header-actions">
          <button class="btn btn--ghost btn--xs btn-col-rename" data-col-id="${sanitize(col.id)}" title="Edit column"><i data-lucide="pencil" aria-hidden="true"></i></button>
          <button class="btn btn--ghost btn--xs btn-col-delete" data-col-id="${sanitize(col.id)}" title="Delete column"><i data-lucide="trash-2" aria-hidden="true"></i></button>
          <button class="btn btn--ghost btn--xs btn-col-add-task" data-col-status="${sanitize(col.status)}" title="Quick add task"><i data-lucide="plus" aria-hidden="true"></i></button>
        </div>`}
      </div>
      <div class="board-column__body" data-col-status="${sanitize(col.status)}" id="col-body-${sanitize(col.id)}">
        ${colTasks.map(task => _buildTaskCardHTML(task)).join('')}
        <div class="board-column__drop-placeholder"></div>
      </div>
    </div>
  `;
}

function _buildTaskCardHTML(task) {
  const priorityOpt = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const typeOpt = TASK_TYPE_OPTIONS.find(t => t.value === task.type);
  const assignees = (task.assignees || []).slice(0, 3).map(uid => _members.find(m => m.id === uid)).filter(Boolean);
  const extraAssign = Math.max(0, (task.assignees || []).length - 3);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['done', 'cancelled'].includes(task.status);
  const checkDone = (task.checklist || []).filter(c => c.done).length;
  const checkTotal = (task.checklist || []).length;
  const sprint = _sprints.find(s => s.id === task.sprint_id);
  const borderColor = priorityOpt ? priorityOpt.color : '#E2E8F0';

  return `
    <div class="board-task-card board-task-card--${sanitize(task.priority || 'low')}"
         draggable="${_isReadOnly ? 'false' : 'true'}"
         data-task-id="${sanitize(task.id)}"
         style="border-left-color:${borderColor};">
      <div class="board-task-card__top">
        <div class="board-task-card__meta-left">
          ${typeOpt ? `<span class="task-type-badge task-type-badge--${sanitize(task.type)} task-type-badge--xs"><i data-lucide="${typeOpt.icon}" aria-hidden="true"></i></span>` : ''}
          <span class="board-task-card__id text-mono">${sanitize(task.id)}</span>
        </div>
        ${priorityOpt ? `<span class="board-task-card__priority" style="color:${priorityOpt.color};" title="${priorityOpt.label}"><i data-lucide="${priorityOpt.icon}" style="width:13px;height:13px;" aria-hidden="true"></i></span>` : ''}
      </div>
      <p class="board-task-card__title">${sanitize(task.title)}</p>
      ${(task.tags || []).length ? `<div class="board-task-card__tags">${(task.tags || []).slice(0, 3).map(tag => `<span class="badge badge--neutral badge--xs">${sanitize(tag)}</span>`).join('')}${task.tags.length > 3 ? `<span class="badge badge--neutral badge--xs">+${task.tags.length - 3}</span>` : ''}</div>` : ''}
      ${sprint ? `<div style="margin-top:var(--space-1);"><span class="badge badge--info badge--xs">${sanitize(sprint.name)}</span></div>` : ''}
      <div class="board-task-card__footer">
        <div class="board-task-card__footer-left">
          ${checkTotal > 0 ? `<span class="board-task-card__meta-pill" title="Checklist"><i data-lucide="check-square" style="width:11px;height:11px;" aria-hidden="true"></i> ${checkDone}/${checkTotal}</span>` : ''}
          ${(task.comments || []).length > 0 ? `<span class="board-task-card__meta-pill" title="Comments"><i data-lucide="message-circle" style="width:11px;height:11px;" aria-hidden="true"></i> ${(task.comments || []).length}</span>` : ''}
          ${task.story_points ? `<span class="board-task-card__meta-pill" title="Story Points">${task.story_points}sp</span>` : ''}
        </div>
        <div class="board-task-card__footer-right">
          ${task.due_date ? `<span class="board-task-card__due ${isOverdue ? 'text-danger' : 'text-muted'}"><i data-lucide="calendar" style="width:11px;height:11px;" aria-hidden="true"></i> ${formatDate(task.due_date)}</span>` : ''}
          <div class="avatar-stack avatar-stack--xs">
            ${assignees.map(m => {
    const ini = getInitials(m.full_name);
    return `<div class="avatar avatar--xs" title="${sanitize(m.full_name)}" style="${m.avatar ? '' : 'background:var(--color-primary);'}">${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(ini)}</span>`}</div>`;
  }).join('')}
            ${extraAssign > 0 ? `<span class="avatar avatar--xs avatar--extra">+${extraAssign}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Swimlanes ────────────────────────────────────────────────────────────────

function _renderSwimlanes(container, filteredTasks) {
  const assigneeMap = new Map();
  filteredTasks.forEach(task => {
    if ((task.assignees || []).length === 0) {
      const key = '__unassigned__';
      if (!assigneeMap.has(key)) assigneeMap.set(key, []);
      assigneeMap.get(key).push(task);
    } else {
      (task.assignees || []).forEach(uid => {
        if (!assigneeMap.has(uid)) assigneeMap.set(uid, []);
        assigneeMap.get(uid).push(task);
      });
    }
  });

  if (assigneeMap.size === 0) {
    container.innerHTML = `<div class="board-empty-state"><i data-lucide="layout-dashboard" class="empty-state__icon"></i><p class="empty-state__title">No tasks match your filters</p></div>`;
    return;
  }

  let html = '<div class="board-swimlanes">';
  html += `<div class="swimlane-header-row">
    <div class="swimlane-label-cell"></div>
    ${_columns.map(col => `<div class="swimlane-col-header">${sanitize(col.label)}</div>`).join('')}
  </div>`;

  assigneeMap.forEach((tasks, uid) => {
    const member = uid === '__unassigned__' ? null : _members.find(m => m.id === uid);
    const name = member ? sanitize(member.full_name) : 'Unassigned';
    const ini = member ? sanitize(getInitials(member.full_name)) : '?';

    html += `<div class="swimlane-row">
      <div class="swimlane-row__label">
        <div class="avatar avatar--sm" style="${member?.avatar ? '' : 'background:var(--color-primary);'}">
          ${member?.avatar ? `<img src="${member.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${ini}</span>`}
        </div>
        <span class="swimlane-row__name">${name}</span>
        <span class="badge badge--neutral badge--xs">${tasks.length}</span>
      </div>
      ${_columns.map(col => {
      const colTasks = tasks.filter(t => t.status === col.status);
      return `<div class="swimlane-row__col">
          ${colTasks.map(t => _buildTaskCardHTML(t)).join('')}
        </div>`;
    }).join('')}
    </div>`;
  });

  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.board-task-card').forEach(card => {
    card.addEventListener('click', () => {
      const task = _tasks.find(t => t.id === card.dataset.taskId);
      if (task) _openTaskDetail(task);
    });
  });
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

function _bindDragAndDrop() {
  document.querySelectorAll('.board-task-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', _handleDragStart);
    card.addEventListener('dragend', _handleDragEnd);
  });

  document.querySelectorAll('.board-column__body').forEach(body => {
    body.addEventListener('dragover', _handleDragOver);
    body.addEventListener('dragleave', _handleDragLeave);
    body.addEventListener('drop', _handleDrop);
  });
}

function _handleDragStart(e) {
  _dragTaskId = e.currentTarget.dataset.taskId;
  e.currentTarget.classList.add('is-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', _dragTaskId);
}

function _handleDragEnd(e) {
  e.currentTarget.classList.remove('is-dragging');
  document.querySelectorAll('.board-column__body.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
  document.querySelectorAll('.board-column__drop-placeholder.is-visible').forEach(el => el.classList.remove('is-visible'));
  _dragTaskId = null;
  _dragOverCol = null;
}

function _handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const body = e.currentTarget;
  if (_dragOverCol !== body) {
    document.querySelectorAll('.board-column__body.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
    document.querySelectorAll('.board-column__drop-placeholder.is-visible').forEach(el => el.classList.remove('is-visible'));
    body.classList.add('is-drag-over');
    const ph = body.querySelector('.board-column__drop-placeholder');
    if (ph) ph.classList.add('is-visible');
    _dragOverCol = body;
  }
}

function _handleDragLeave(e) {
  const body = e.currentTarget;
  if (!body.contains(e.relatedTarget)) {
    body.classList.remove('is-drag-over');
    const ph = body.querySelector('.board-column__drop-placeholder');
    if (ph) ph.classList.remove('is-visible');
    if (_dragOverCol === body) _dragOverCol = null;
  }
}

async function _handleDrop(e) {
  e.preventDefault();
  const body = e.currentTarget;
  body.classList.remove('is-drag-over');
  const ph = body.querySelector('.board-column__drop-placeholder');
  if (ph) ph.classList.remove('is-visible');

  const newStatus = body.dataset.colStatus;
  if (!_dragTaskId || !newStatus) return;

  const task = _tasks.find(t => t.id === _dragTaskId);
  if (!task || task.status === newStatus) return;

  const oldStatus = task.status;
  const oldCompleted = task.completed_at;
  task.status = newStatus;
  task.completed_at = newStatus === 'done' ? (task.completed_at || nowISO()) : null;
  task.updated_at = nowISO();

  _renderColumns();

  try {
    await update('tasks', task);
    const col = _columns.find(c => c.status === newStatus);
    logActivity({ project_id: _projectId, entity_type: 'task', entity_id: task.id, entity_name: task.title, action: 'status_changed', changes: [{ field: 'status', old_value: oldStatus, new_value: newStatus }], metadata: { assignees: task.assignees || [], reporter: task.reporter || null } });
    showToast(`Moved to "${col ? col.label : newStatus}"`, 'success');
  } catch (err) {
    debug('Drop update error:', err);
    task.status = oldStatus;
    task.completed_at = oldCompleted;
    _renderColumns();
    showToast('Failed to update task status', 'error');
  }
}

// ─── Column Events ────────────────────────────────────────────────────────────

function _bindColumnEvents() {
  document.querySelectorAll('.board-task-card').forEach(card => {
    card.addEventListener('click', () => {
      const task = _tasks.find(t => t.id === card.dataset.taskId);
      if (task) _openTaskDetail(task);
    });
  });

  document.querySelectorAll('.btn-col-rename').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _openRenameColumnModal(btn.dataset.colId); });
  });

  document.querySelectorAll('.btn-col-delete').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _handleDeleteColumn(btn.dataset.colId); });
  });

  document.querySelectorAll('.btn-col-add-task').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _openQuickAddTask(btn.dataset.colStatus); });
  });
}

// ─── Page Events ─────────────────────────────────────────────────────────────

function _bindPageEvents() {
  document.getElementById('btnNewTask')?.addEventListener('click', () => _openFullTaskModal(null, null));
  document.getElementById('btnAddColumn')?.addEventListener('click', _openAddColumnModal);
  document.getElementById('btnToggleSwimlane')?.addEventListener('click', () => {
    _swimlaneMode = !_swimlaneMode;
    _renderColumns();
  });
  document.getElementById('boardSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; _renderColumns(); });
  document.getElementById('btnOpenFilterModal')?.addEventListener('click', _openBoardFilterModal);
  document.getElementById('boardFilterChips')?.addEventListener('click', _handleBoardChipRemove);
  document.getElementById('slideoverOverlay')?.addEventListener('click', _closeSlideover);
}

function _renderBoardFilterChips() {
  const chips = [];
  if (_filterAssignee) {
    const lbl = _members.find(m => m.id === _filterAssignee)?.full_name || _filterAssignee;
    chips.push(`<span class="filter-chip" data-key="assignee"><span class="filter-chip__label">Assignee: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterPriority) {
    const lbl = TASK_PRIORITY_OPTIONS.find(p => p.value === _filterPriority)?.label || _filterPriority;
    chips.push(`<span class="filter-chip" data-key="priority"><span class="filter-chip__label">Priority: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterLabel) {
    chips.push(`<span class="filter-chip" data-key="label"><span class="filter-chip__label">Label: ${sanitize(_filterLabel)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterSprint) {
    const lbl = _sprints.find(s => s.id === _filterSprint)?.name || _filterSprint;
    chips.push(`<span class="filter-chip" data-key="sprint"><span class="filter-chip__label">Sprint: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  return chips.join('');
}

function _handleBoardChipRemove(e) {
  const btn = e.target.closest('.filter-chip__remove');
  if (!btn) return;
  const key = btn.closest('.filter-chip')?.dataset.key;
  if (key === 'assignee') _filterAssignee = '';
  if (key === 'priority') _filterPriority = '';
  if (key === 'label') _filterLabel = '';
  if (key === 'sprint') _filterSprint = '';
  _renderColumns(); _updateBoardFilterUI();
}

function _openBoardFilterModal() {
  openModal({
    title: 'Filter Board',
    size: 'md',
    body: `<div class="filter-modal-grid">
      <div class="form-group">
        <label class="form-label" for="fmFilterAssignee">Assignee</label>
        <select class="form-select" id="fmFilterAssignee">
          <option value="">All Assignees</option>
          ${_members.map(m => `<option value="${sanitize(m.id)}" ${_filterAssignee === m.id ? 'selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmFilterPriority">Priority</label>
        <select class="form-select" id="fmFilterPriority">
          <option value="">All Priorities</option>
          ${TASK_PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${_filterPriority === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
        </select>
      </div>
      ${_allTags.length ? `<div class="form-group">
        <label class="form-label" for="fmFilterLabel">Label</label>
        <select class="form-select" id="fmFilterLabel">
          <option value="">All Labels</option>
          ${_allTags.map(tag => `<option value="${sanitize(tag)}" ${_filterLabel === tag ? 'selected' : ''}>${sanitize(tag)}</option>`).join('')}
        </select>
      </div>` : ''}
      ${_sprints.length ? `<div class="form-group">
        <label class="form-label" for="fmFilterSprint">Sprint</label>
        <select class="form-select" id="fmFilterSprint">
          <option value="">All Sprints</option>
          ${_sprints.map(s => `<option value="${sanitize(s.id)}" ${_filterSprint === s.id ? 'selected' : ''}>${sanitize(s.name)}</option>`).join('')}
        </select>
      </div>` : ''}
    </div>`,
    footer: `
      <button class="btn btn--outline" id="btnResetBoardFilter">Reset Filter</button>
      <button class="btn btn--primary" id="btnApplyBoardFilter"><i data-lucide="check" aria-hidden="true"></i> Terapkan Filter</button>`,
  });
  document.getElementById('btnResetBoardFilter')?.addEventListener('click', () => {
    _filterAssignee = ''; _filterPriority = ''; _filterLabel = ''; _filterSprint = '';
    closeModal(); _renderColumns(); _updateBoardFilterUI();
  });
  document.getElementById('btnApplyBoardFilter')?.addEventListener('click', () => {
    _filterAssignee = document.getElementById('fmFilterAssignee')?.value || '';
    _filterPriority = document.getElementById('fmFilterPriority')?.value || '';
    _filterLabel = document.getElementById('fmFilterLabel')?.value || '';
    _filterSprint = document.getElementById('fmFilterSprint')?.value || '';
    closeModal(); _renderColumns(); _updateBoardFilterUI();
  });
}

function _updateBoardFilterUI() {
  const wrap = document.getElementById('btnOpenFilterModal')?.closest('.filter-btn-wrap');
  if (wrap) {
    wrap.querySelector('.filter-badge')?.remove();
    const count = [_filterAssignee, _filterPriority, _filterLabel, _filterSprint].filter(Boolean).length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'filter-badge';
      badge.textContent = count;
      wrap.appendChild(badge);
    }
  }
  const chips = document.getElementById('boardFilterChips');
  if (chips) chips.innerHTML = _renderBoardFilterChips();
}

// ─── Add Column ───────────────────────────────────────────────────────────────

function _openAddColumnModal() {
  openModal({
    title: 'Add Column',
    size: 'sm',
    body: `
      <div class="form-group">
        <label class="form-label" for="newColLabel">Column Name <span class="text-danger">*</span></label>
        <input type="text" class="form-input" id="newColLabel" placeholder="e.g. QA Review" maxlength="40" />
      </div>
    `,
    footer: `
      <button class="btn btn--secondary" id="modalCancel">Cancel</button>
      <button class="btn btn--primary" id="modalSave">Add Column</button>
    `,
  });

  setTimeout(() => document.getElementById('newColLabel')?.focus(), 50);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSave')?.addEventListener('click', () => {
    const label = document.getElementById('newColLabel')?.value.trim();
    if (!label) { showToast('Column name is required', 'warning'); return; }
    const id = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
    _columns.push({ id, label, status: id });
    _saveColumns();
    closeModal();
    _renderColumns();
    showToast(`Column "${label}" added`, 'success');
  });
  document.getElementById('newColLabel')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modalSave')?.click();
  });
}

// ─── Rename Column ────────────────────────────────────────────────────────────

function _openRenameColumnModal(colId) {
  const col = _columns.find(c => c.id === colId);
  if (!col) return;

  openModal({
    title: 'Edit Column',
    size: 'sm',
    body: `
      <div class="form-group">
        <label class="form-label" for="renameColLabel">Column Name <span class="text-danger">*</span></label>
        <input type="text" class="form-input" id="renameColLabel" value="${sanitize(col.label)}" maxlength="40" />
      </div>
      <div class="form-group">
        <label class="form-label" for="renameColWip">WIP Limit <span style="font-weight:400;color:var(--color-text-muted);">(0 = no limit)</span></label>
        <input type="number" class="form-input" id="renameColWip" value="${col.wip_limit || 0}" min="0" max="99" style="max-width:120px;" />
        <p class="form-hint" style="margin-top:4px;">Columns exceeding the WIP limit will show a red warning indicator.</p>
      </div>
    `,
    footer: `
      <button class="btn btn--secondary" id="modalCancel">Cancel</button>
      <button class="btn btn--primary" id="modalSave">Save</button>
    `,
  });

  setTimeout(() => { const el = document.getElementById('renameColLabel'); if (el) { el.focus(); el.select(); } }, 50);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSave')?.addEventListener('click', () => {
    const label = document.getElementById('renameColLabel')?.value.trim();
    if (!label) { showToast('Column name is required', 'warning'); return; }
    const wipInput = parseInt(document.getElementById('renameColWip')?.value, 10);
    col.label = label;
    col.wip_limit = isNaN(wipInput) || wipInput < 0 ? 0 : wipInput;
    _saveColumns();
    closeModal();
    _renderColumns();
    showToast(`Column "${label}" updated`, 'success');
  });
}

// ─── Delete Column ────────────────────────────────────────────────────────────

function _handleDeleteColumn(colId) {
  const col = _columns.find(c => c.id === colId);
  if (!col) return;

  const taskCount = _tasks.filter(t => t.status === col.status).length;
  const msg = taskCount > 0
    ? `Delete column "${col.label}"? ${taskCount} task(s) currently in this column will remain accessible in the backlog.`
    : `Delete column "${col.label}"?`;

  showConfirm({
    title: 'Delete Column',
    message: msg,
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: () => {
      _columns = _columns.filter(c => c.id !== colId);
      _saveColumns();
      _renderColumns();
      showToast(`Column "${col.label}" deleted`, 'info');
    },
  });
}

// ─── Quick Add Task ───────────────────────────────────────────────────────────

function _openQuickAddTask(status) {
  openModal({
    title: 'Quick Add Task',
    size: 'sm',
    body: `
      <div class="form-group">
        <label class="form-label" for="quickTaskTitle">Task Title <span class="text-danger">*</span></label>
        <input type="text" class="form-input" id="quickTaskTitle" placeholder="Enter task title..." maxlength="200" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="quickTaskType">Type</label>
          <select class="form-select" id="quickTaskType">
            ${TASK_TYPE_OPTIONS.map(t => `<option value="${t.value}" ${t.value === 'task' ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="quickTaskPriority">Priority</label>
          <select class="form-select" id="quickTaskPriority">
            ${TASK_PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${p.value === 'medium' ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn--secondary" id="modalCancel">Cancel</button>
      <button class="btn btn--ghost btn--sm" id="modalFull">Full Form</button>
      <button class="btn btn--primary" id="modalSave">Add Task</button>
    `,
  });

  setTimeout(() => document.getElementById('quickTaskTitle')?.focus(), 50);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalFull')?.addEventListener('click', () => {
    closeModal();
    _openFullTaskModal(null, status);
  });
  document.getElementById('modalSave')?.addEventListener('click', async () => {
    const title = document.getElementById('quickTaskTitle')?.value.trim();
    if (!title) { showToast('Title is required', 'warning'); return; }
    await _saveQuickTask({
      title,
      type: document.getElementById('quickTaskType')?.value || 'task',
      priority: document.getElementById('quickTaskPriority')?.value || 'medium',
      status,
    });
    closeModal();
  });
  document.getElementById('quickTaskTitle')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('modalSave')?.click();
  });
}

async function _saveQuickTask({ title, priority, type, status }) {
  const session = getSession();
  const allTasks = await getAll('tasks');
  const id = generateSequentialId('TSK', allTasks);
  const now = nowISO();
  const taskData = {
    id,
    project_id: _projectId,
    title,
    description: '',
    type,
    status,
    priority,
    assignees: [],
    reporter: session?.userId || null,
    sprint_id: null,
    epic_id: null,
    story_points: null,
    start_date: null,
    due_date: null,
    completed_at: status === 'done' ? now : null,
    tags: [],
    attachments: [],
    checklist: [],
    comments: [],
    time_logged: null,
    dependencies: [],
    created_at: now,
    updated_at: now,
  };
  try {
    await add('tasks', taskData);
    _tasks.push(taskData);
    _renderColumns();
    logActivity({ project_id: _projectId, entity_type: 'task', entity_id: taskData.id, entity_name: taskData.title, action: 'created', metadata: { assignees: taskData.assignees || [], reporter: taskData.reporter || null } });
    showToast(`Task "${title}" created`, 'success');
  } catch (err) {
    debug('Quick add error:', err);
    showToast('Failed to create task', 'error');
  }
}

// ─── Full Task Modal ──────────────────────────────────────────────────────────

function _openFullTaskModal(task = null, defaultStatus = null) {
  const isEdit = !!task;
  openModal({
    title: isEdit ? `Edit Task — ${sanitize(task.id)}` : 'New Task',
    size: 'lg',
    body: _buildTaskFormHTML(task, defaultStatus),
    footer: `
      <button class="btn btn--secondary" id="modalCancel">Cancel</button>
      <button class="btn btn--primary" id="modalSave">${isEdit ? 'Save Changes' : 'Create Task'}</button>
    `,
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSave')?.addEventListener('click', () => _handleSaveTaskModal(task));
}

function _buildTaskFormHTML(task, defaultStatus) {
  const statusVal = task?.status || defaultStatus || 'backlog';
  const priorityVal = task?.priority || 'medium';
  const typeVal = task?.type || 'task';

  return `
    <div class="form-group">
      <label class="form-label" for="taskTitle">Title <span class="text-danger">*</span></label>
      <input type="text" class="form-input" id="taskTitle" value="${sanitize(task?.title || '')}" placeholder="Task title..." maxlength="200" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="taskType">Type</label>
        <select class="form-select" id="taskType">
          ${TASK_TYPE_OPTIONS.map(t => `<option value="${t.value}" ${typeVal === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="taskStatus">Status</label>
        <select class="form-select" id="taskStatus">
          ${TASK_STATUS_OPTIONS.map(s => `<option value="${s.value}" ${statusVal === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="taskPriority">Priority</label>
        <select class="form-select" id="taskPriority">
          ${TASK_PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${priorityVal === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="taskDescription">Description</label>
      <textarea class="form-input form-textarea" id="taskDescription" rows="3" placeholder="Task description...">${sanitize(task?.description || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Assignees</label>
        <div id="taskAssigneesWrap" style="max-height:140px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);padding:4px;">
          ${_members.map(m => `<label style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:0.85rem;" onmouseover="this.style.background='var(--color-surface)'" onmouseout="this.style.background='transparent'"><input type="checkbox" class="task-assignee-cb" value="${sanitize(m.id)}" ${(task?.assignees || []).includes(m.id) ? 'checked' : ''} style="accent-color:var(--color-primary);width:15px;height:15px;flex-shrink:0;"><span>${sanitize(m.full_name)}</span></label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="taskSprint">Sprint</label>
        <select class="form-select" id="taskSprint">
          <option value="">None</option>
          ${_sprints.map(s => `<option value="${sanitize(s.id)}" ${task?.sprint_id === s.id ? 'selected' : ''}>${sanitize(s.name)}</option>`).join('')}
        </select>
        <label class="form-label" for="taskStoryPoints" style="margin-top:var(--space-3);">Story Points</label>
        <input type="number" class="form-input" id="taskStoryPoints" value="${task?.story_points ?? ''}" min="0" max="100" placeholder="SP" />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="taskStartDate">Start Date</label>
        <input type="date" class="form-input" id="taskStartDate" value="${task?.start_date ? task.start_date.split('T')[0] : ''}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="taskDueDate">Due Date</label>
        <input type="date" class="form-input" id="taskDueDate" value="${task?.due_date ? task.due_date.split('T')[0] : ''}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="taskTags">Tags <span class="form-hint">(comma-separated)</span></label>
      <input type="text" class="form-input" id="taskTags" value="${sanitize((task?.tags || []).join(', '))}" placeholder="e.g. api, auth, frontend" />
    </div>
  `;
}

async function _handleSaveTaskModal(existingTask) {
  const btn = document.getElementById('modalSave');
  if (btn) btn.disabled = true;

  const title = document.getElementById('taskTitle')?.value.trim();
  if (!title) { showToast('Title is required', 'warning'); if (btn) btn.disabled = false; return; }

  const now = nowISO();
  const allTasks = await getAll('tasks');
  const isEdit = !!existingTask;
  const taskId = isEdit ? existingTask.id : generateSequentialId('TSK', allTasks);
  const assignees = [...document.querySelectorAll('.task-assignee-cb:checked')].map(cb => cb.value);
  const status = document.getElementById('taskStatus')?.value || 'backlog';
  const tagsRaw = document.getElementById('taskTags')?.value || '';
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  const taskData = {
    ...(isEdit ? existingTask : {}),
    id: taskId,
    project_id: _projectId,
    title,
    description: document.getElementById('taskDescription')?.value.trim() || '',
    type: document.getElementById('taskType')?.value || 'task',
    status,
    priority: document.getElementById('taskPriority')?.value || 'medium',
    assignees,
    reporter: isEdit ? existingTask.reporter : (getSession()?.userId || null),
    sprint_id: document.getElementById('taskSprint')?.value || null,
    story_points: parseInt(document.getElementById('taskStoryPoints')?.value, 10) || null,
    start_date: document.getElementById('taskStartDate')?.value || null,
    due_date: document.getElementById('taskDueDate')?.value || null,
    completed_at: status === 'done' ? (existingTask?.completed_at || now) : null,
    tags,
    checklist: isEdit ? (existingTask.checklist || []) : [],
    comments: isEdit ? (existingTask.comments || []) : [],
    attachments: isEdit ? (existingTask.attachments || []) : [],
    time_logged: isEdit ? existingTask.time_logged : null,
    dependencies: isEdit ? (existingTask.dependencies || []) : [],
    created_at: isEdit ? existingTask.created_at : now,
    updated_at: now,
  };

  try {
    if (isEdit) {
      await update('tasks', taskData);
      const i = _tasks.findIndex(t => t.id === taskId);
      if (i !== -1) _tasks[i] = taskData;
      // Detect newly assigned members for personal assignment notifications
      const oldAssignees = existingTask?.assignees || [];
      const newlyAssigned = assignees.filter((uid) => !oldAssignees.includes(uid));
      if (newlyAssigned.length) {
        logActivity({ project_id: _projectId, entity_type: 'task', entity_id: taskId, entity_name: title, action: 'assigned', metadata: { assignees, reporter: taskData.reporter, newly_assigned: newlyAssigned } });
      }
      logActivity({ project_id: _projectId, entity_type: 'task', entity_id: taskId, entity_name: title, action: 'updated', metadata: { assignees, reporter: taskData.reporter } });
      showToast(`Task "${title}" updated`, 'success');
    } else {
      await add('tasks', taskData);
      _tasks.push(taskData);
      logActivity({ project_id: _projectId, entity_type: 'task', entity_id: taskData.id, entity_name: title, action: 'created', metadata: { assignees, reporter: taskData.reporter } });
      showToast(`Task "${title}" created`, 'success');
    }
    _computeAllTags();
    closeModal();
    _renderColumns();
  } catch (err) {
    debug('Save task error:', err);
    showToast('Failed to save task', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ─── Task Detail Slide-over ───────────────────────────────────────────────────

function _openTaskDetail(task) {
  document.getElementById('slideoverOverlay')?.classList.add('is-visible');
  const panel = document.getElementById('taskSlideover');
  if (panel) { panel.classList.add('is-visible'); _renderTaskDetail(task, panel); }
}

function _closeSlideover() {
  document.getElementById('slideoverOverlay')?.classList.remove('is-visible');
  const panel = document.getElementById('taskSlideover');
  if (panel) { panel.classList.remove('is-visible'); panel.innerHTML = ''; }
}

function _renderMarkdown(text) {
  if (!text) return '';
  return sanitize(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function _renderAssigneeChips(assignees) {
  if (!assignees.length) return '<span class="text-muted">Unassigned</span>';
  return assignees.map(m => {
    const ini = getInitials(m.full_name);
    const avatarHtml = m.avatar
      ? '<img src="' + m.avatar + '" alt="" class="avatar__img" />'
      : '<span class="avatar__initials">' + sanitize(ini) + '</span>';
    const bg = m.avatar ? '' : 'background:var(--color-primary);';
    return '<span class="assignee-display"><div class="avatar avatar--xs" style="' + bg + '">' + avatarHtml + '</div> ' + sanitize(m.full_name) + '</span>';
  }).join('');
}

function _renderTaskDetail(task, panel) {
  const typeOpt = TASK_TYPE_OPTIONS.find(t => t.value === task.type);
  const statusOpt = TASK_STATUS_OPTIONS.find(s => s.value === task.status);
  const priorityOpt = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const assignees = (task.assignees || []).map(uid => _members.find(m => m.id === uid)).filter(Boolean);
  const sprint = _sprints.find(s => s.id === task.sprint_id);
  const checkDone = (task.checklist || []).filter(c => c.done).length;
  const checkTotal = (task.checklist || []).length;
  const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;
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
        ${task.description ? `<div class="task-detail__section"><h4 class="task-detail__section-label">Description</h4><div class="task-detail__description">${_renderMarkdown(task.description)}</div></div>` : ''}
        <div class="task-detail__meta-grid">
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Assignees</span><div class="task-detail__meta-value">${_renderAssigneeChips(assignees)}</div></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Start Date</span><span class="task-detail__meta-value">${task.start_date ? formatDate(task.start_date) : '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Due Date</span><span class="task-detail__meta-value${isOverdue ? ' text-danger' : ''}">${task.due_date ? formatDate(task.due_date) : '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Story Points</span><span class="task-detail__meta-value">${task.story_points ?? '—'}</span></div>
          <div class="task-detail__meta-item"><span class="task-detail__meta-label text-muted">Created</span><span class="task-detail__meta-value">${formatDate(task.created_at, 'datetime')}</span></div>
        </div>
        ${checkTotal > 0 ? `
        <div class="task-detail__section">
          <h4 class="task-detail__section-label">Checklist <span class="text-muted">${checkDone}/${checkTotal}</span></h4>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);">
            <div class="progress-bar-sm" style="flex:1;"><div class="progress-bar-sm__fill" style="width:${checkPct}%;"></div></div>
            <span class="text-muted" style="font-size:11px;">${checkPct}%</span>
          </div>
          <div class="task-detail__checklist">
            ${(task.checklist || []).map(item => `<label class="task-detail__checklist-item"><input type="checkbox" ${item.done ? 'checked' : ''} disabled /><span class="${item.done ? 'is-done' : ''}">${sanitize(item.text)}</span></label>`).join('')}
          </div>
        </div>` : ''}
        ${(task.comments || []).length > 0 ? `
        <div class="task-detail__section">
          <h4 class="task-detail__section-label">Comments (${(task.comments || []).length})</h4>
          ${(task.comments || []).map(c => `<div class="task-detail__comment"><span class="text-mono" style="font-size:11px;color:var(--color-text-muted);">${formatDate(c.created_at, 'datetime')}</span><p style="margin:var(--space-1) 0 0;">${_renderMarkdown(c.text)}</p></div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnDetailClose')?.addEventListener('click', _closeSlideover);
  document.getElementById('btnDetailEdit')?.addEventListener('click', () => { _closeSlideover(); _openFullTaskModal(task, null); });
}

export default { render };
