/**
 * TRACKLY — sprint.js
 * Phase 10: Sprint Management
 */

import { getAll, getById, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, sanitize, debug, logActivity } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { TASK_STATUS_OPTIONS, TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from './backlog.js';

let _projectId = null;
let _project   = null;
let _sprints   = [];
let _tasks     = [];
let _members   = [];
let _activeTab = 'list';
let _planningSprintId = null;
let _planningSearch = '';
let _dragTaskId = null;
let _dragSource = null;

export async function render(params = {}) {
  _projectId = params.id;
  if (!_projectId) {
    document.getElementById('main-content').innerHTML = '<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">No project specified</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>';
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
    _tasks   = allTasks.filter(t => t.project_id === _projectId);
    _members = members;
    _sprints = allSprints.filter(s => s.project_id === _projectId)
      .sort((a, b) => (a.created_at || '') < (b.created_at || '') ? -1 : 1);
    if (!_project) {
      document.getElementById('main-content').innerHTML = '<div class="page-container page-enter"><div class="empty-state"><i data-lucide="folder-x" class="empty-state__icon"></i><p class="empty-state__title">Project not found</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }
    const active = _sprints.find(s => s.status === 'active');
    if (!_planningSprintId && _sprints.length > 0) {
      _planningSprintId = active?.id || _sprints[0].id;
    }
    _renderPage();
  } catch (err) {
    debug('Sprint render error:', err);
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function _renderPage() {
  const content = document.getElementById('main-content');
  if (!content) return;
  const id = sanitize(_projectId);
  const showMaintenance = ['running','maintenance'].includes(_project.phase) || _project.status === 'maintenance';
  const activeSprint = _sprints.find(s => s.status === 'active');

  content.innerHTML = `
    <div class="page-container page-enter sprint-page">
      <div class="project-subnav">
        <a class="project-subnav__link" href="#/projects/${id}"><i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview</a>
        <a class="project-subnav__link" href="#/projects/${id}/board"><i data-lucide="kanban" aria-hidden="true"></i> Board</a>
        <a class="project-subnav__link" href="#/projects/${id}/backlog"><i data-lucide="list" aria-hidden="true"></i> Backlog</a>
        <a class="project-subnav__link is-active" href="#/projects/${id}/sprint"><i data-lucide="zap" aria-hidden="true"></i> Sprint</a>
        <a class="project-subnav__link" href="#/projects/${id}/gantt"><i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt</a>
        <a class="project-subnav__link" href="#/projects/${id}/discussion"><i data-lucide="message-circle" aria-hidden="true"></i> Discussion</a>
        ${showMaintenance ? `<a class="project-subnav__link" href="#/projects/${id}/maintenance"><i data-lucide="wrench" aria-hidden="true"></i> Maintenance</a>` : ''}
        <a class="project-subnav__link" href="#/projects/${id}/reports"><i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports</a>
      </div>
      <div class="page-header" style="margin-top:var(--space-4);">
        <div class="page-header__info">
          <h1 class="page-header__title">Sprint Management</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)} &mdash; ${_sprints.length} sprint${_sprints.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnNewSprint"><i data-lucide="plus" aria-hidden="true"></i> New Sprint</button>
        </div>
      </div>
      ${activeSprint ? _renderActiveBanner(activeSprint) : ''}
      <div class="sprint-tabs">
        <button class="sprint-tab${_activeTab==='list'?' is-active':''}" data-tab="list"><i data-lucide="list" aria-hidden="true"></i> Sprints</button>
        <button class="sprint-tab${_activeTab==='planning'?' is-active':''}" data-tab="planning"><i data-lucide="move" aria-hidden="true"></i> Planning</button>
        <button class="sprint-tab${_activeTab==='board'?' is-active':''}" data-tab="board"><i data-lucide="kanban" aria-hidden="true"></i> Sprint Board</button>
        <button class="sprint-tab${_activeTab==='velocity'?' is-active':''}" data-tab="velocity"><i data-lucide="bar-chart-2" aria-hidden="true"></i> Velocity</button>
      </div>
      <div class="sprint-view" id="sprintView">${_renderActiveTabContent()}</div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindPageEvents();
  if (_activeTab === 'velocity') requestAnimationFrame(() => _drawVelocityChart());
  if (_activeTab === 'planning') requestAnimationFrame(() => _bindPlanningDragDrop());
  if (_activeTab === 'board')    requestAnimationFrame(() => _bindSprintBoardDragDrop());
}

function _renderActiveBanner(sprint) {
  const sprintTasks = _tasks.filter(t => t.sprint_id === sprint.id);
  const doneTasks   = sprintTasks.filter(t => t.status === 'done');
  const pct = sprintTasks.length > 0 ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;
  const daysLeft = sprint.end_date ? Math.ceil((new Date(sprint.end_date) - new Date()) / 86400000) : null;
  return `
    <div class="active-sprint-banner">
      <div class="active-sprint-banner__icon"><i data-lucide="zap" aria-hidden="true"></i></div>
      <div class="active-sprint-banner__info">
        <div class="active-sprint-banner__title">Active Sprint</div>
        <div class="active-sprint-banner__name">${sanitize(sprint.name)}</div>
        <div class="active-sprint-banner__meta">
          ${sprint.end_date ? `Ends ${formatDate(sprint.end_date)} ${daysLeft !== null ? `(${daysLeft > 0 ? daysLeft+' days left' : daysLeft === 0 ? 'ends today' : Math.abs(daysLeft)+' days overdue'})` : ''}` : 'No end date set'}
          &nbsp;&bull;&nbsp; ${doneTasks.length}/${sprintTasks.length} tasks done &nbsp;&bull;&nbsp; ${pct}%
        </div>
      </div>
      <div class="active-sprint-banner__actions">
        <button class="btn btn--secondary btn--sm" id="btnViewBoard"><i data-lucide="kanban" aria-hidden="true"></i> Board</button>
        <button class="btn btn--danger btn--sm" id="btnCompleteSprint" data-id="${sanitize(sprint.id)}"><i data-lucide="flag" aria-hidden="true"></i> Complete Sprint</button>
      </div>
    </div>`;
}

function _renderActiveTabContent() {
  switch (_activeTab) {
    case 'list':     return _renderSprintList();
    case 'planning': return _renderPlanningView();
    case 'board':    return _renderSprintBoardTab();
    case 'velocity': return _renderVelocityTab();
    default:         return _renderSprintList();
  }
}

function _renderSprintList() {
  if (_sprints.length === 0) {
    return `<div class="sprint-list-empty"><div class="empty-state"><i data-lucide="zap" class="empty-state__icon"></i><p class="empty-state__title">No sprints yet</p><p class="empty-state__text">Create your first sprint to start planning and tracking work.</p><button class="btn btn--primary" id="btnNewSprintEmpty"><i data-lucide="plus" aria-hidden="true"></i> Create Sprint</button></div></div>`;
  }
  return `<div class="sprint-list">${_sprints.map(s => _renderSprintCard(s)).join('')}</div>`;
}

function _renderSprintCard(sprint) {
  const sprintTasks = _tasks.filter(t => t.sprint_id === sprint.id);
  const doneTasks   = sprintTasks.filter(t => t.status === 'done');
  const totalSP     = sprintTasks.reduce((s, t) => s + (t.story_points || 0), 0);
  const doneSP      = doneTasks.reduce((s, t) => s + (t.story_points || 0), 0);
  const pct         = sprintTasks.length > 0 ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;
  const statusBadge = { planning:'badge--neutral', active:'badge--success', completed:'badge--info' }[sprint.status] || 'badge--neutral';
  const statusLabel = { planning:'Planning', active:'Active', completed:'Completed' }[sprint.status] || sprint.status;
  const canActivate = sprint.status === 'planning' && !_sprints.find(s => s.status === 'active');
  const canComplete = sprint.status === 'active';
  const canReopen   = sprint.status === 'completed';
  return `
    <div class="sprint-card" data-sprint-id="${sanitize(sprint.id)}">
      <div class="sprint-card__header">
        <span class="badge ${statusBadge}">${statusLabel}</span>
        <span class="sprint-card__name">${sanitize(sprint.name)}</span>
        <div class="sprint-card__meta">
          ${sprint.start_date ? `<span class="sprint-card__meta-item"><i data-lucide="calendar" aria-hidden="true"></i>${formatDate(sprint.start_date)}</span>` : ''}
          ${sprint.end_date   ? `<span class="sprint-card__meta-item">&rarr; ${formatDate(sprint.end_date)}</span>` : ''}
          <span class="sprint-card__meta-item"><i data-lucide="check-square" aria-hidden="true"></i>${sprintTasks.length} task${sprintTasks.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="sprint-card__actions">
          ${canActivate ? `<button class="btn btn--success btn--sm btn-activate-sprint" data-id="${sanitize(sprint.id)}"><i data-lucide="play" aria-hidden="true"></i> Start</button>` : ''}
          ${canComplete ? `<button class="btn btn--danger btn--sm btn-complete-sprint" data-id="${sanitize(sprint.id)}"><i data-lucide="flag" aria-hidden="true"></i> Complete</button>` : ''}
          ${canReopen   ? `<button class="btn btn--ghost btn--sm btn-reopen-sprint" data-id="${sanitize(sprint.id)}"><i data-lucide="rotate-ccw" aria-hidden="true"></i> Reopen</button>` : ''}
          <button class="btn btn--ghost btn--sm btn-plan-sprint" data-id="${sanitize(sprint.id)}" title="Open Planning"><i data-lucide="move" aria-hidden="true"></i></button>
          <button class="btn btn--ghost btn--sm btn-edit-sprint" data-id="${sanitize(sprint.id)}" title="Edit"><i data-lucide="pencil" aria-hidden="true"></i></button>
          <button class="btn btn--ghost btn--sm btn-delete-sprint" data-id="${sanitize(sprint.id)}" title="Delete"><i data-lucide="trash-2" aria-hidden="true"></i></button>
        </div>
      </div>
      <div class="sprint-card__body">
        ${sprint.goal ? `<div class="sprint-card__goal">"${sanitize(sprint.goal)}"</div>` : ''}
        <div class="sprint-card__stats">
          <div class="sprint-stat"><span class="sprint-stat__label">Total Tasks</span><span class="sprint-stat__value">${sprintTasks.length}</span></div>
          <div class="sprint-stat"><span class="sprint-stat__label">Done</span><span class="sprint-stat__value sprint-stat__value--success">${doneTasks.length}</span></div>
          <div class="sprint-stat"><span class="sprint-stat__label">Remaining</span><span class="sprint-stat__value${sprintTasks.length - doneTasks.length > 0 ? ' sprint-stat__value--warning' : ''}">${sprintTasks.length - doneTasks.length}</span></div>
          <div class="sprint-stat"><span class="sprint-stat__label">Story Points</span><span class="sprint-stat__value">${doneSP}/${totalSP} SP</span></div>
        </div>
        ${sprintTasks.length > 0 ? `<div class="sprint-progress-row"><div class="sprint-progress-bar"><div class="sprint-progress-bar__fill" style="width:${pct}%;"></div></div><span class="sprint-progress-pct">${pct}%</span></div>` : ''}
        ${sprint.retro_notes ? `<div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--color-surface);border-radius:var(--radius-sm);border:1px solid var(--color-border);"><div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-muted);margin-bottom:var(--space-1);">RETROSPECTIVE</div><div style="font-size:var(--text-sm);color:var(--color-text);">${sanitize(sprint.retro_notes)}</div></div>` : ''}
      </div>
    </div>`;
}

function _renderPlanningView() {
  const planningSprints = _sprints.filter(s => s.status !== 'completed');
  if (planningSprints.length === 0) {
    return `<div class="sprint-list-empty"><div class="empty-state"><i data-lucide="move" class="empty-state__icon"></i><p class="empty-state__title">No active or planning sprints</p><p class="empty-state__text">Create a sprint first, then use planning to drag tasks into it.</p><button class="btn btn--primary" id="btnNewSprintPlan"><i data-lucide="plus" aria-hidden="true"></i> Create Sprint</button></div></div>`;
  }
  const selectedSprint = _sprints.find(s => s.id === _planningSprintId) || planningSprints[0];
  if (!_planningSprintId) _planningSprintId = selectedSprint.id;
  const backlogTasks = _tasks.filter(t => !t.sprint_id && !['done','cancelled'].includes(t.status));
  const sprintTasks  = _tasks.filter(t => t.sprint_id === selectedSprint.id);
  const q = _planningSearch.toLowerCase();
  const filteredBacklog = q ? backlogTasks.filter(t => t.title?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q)) : backlogTasks;
  const totalSP = sprintTasks.reduce((s, t) => s + (t.story_points || 0), 0);
  return `
    <div style="margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
      <label class="form-label" style="margin:0;white-space:nowrap;">Planning sprint:</label>
      <select class="form-select" id="planningSprintSelect" style="max-width:300px;">
        ${planningSprints.map(s => `<option value="${sanitize(s.id)}" ${s.id === _planningSprintId ? 'selected' : ''}>${sanitize(s.name)} (${s.status})</option>`).join('')}
      </select>
      <span class="text-muted" style="font-size:var(--text-sm);">${sprintTasks.length} tasks &bull; ${totalSP} SP total</span>
    </div>
    <div class="sprint-planning">
      <div class="sprint-planning__pane">
        <div class="sprint-planning__pane-header">
          <i data-lucide="list" aria-hidden="true" style="width:16px;height:16px;color:var(--color-text-muted);"></i>
          <span class="sprint-planning__pane-title">Backlog (unassigned)</span>
          <span class="sprint-planning__pane-count">${filteredBacklog.length}</span>
        </div>
        <div class="planning-search">
          <i data-lucide="search" class="planning-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input planning-search__input" id="planningSearch" placeholder="Search backlog..." value="${sanitize(_planningSearch)}" autocomplete="off" />
        </div>
        <div class="sprint-planning__pane-body" id="planBacklogPane" data-pane="backlog">
          ${filteredBacklog.length === 0 ? `<div class="sprint-planning__empty"><i data-lucide="check-circle" aria-hidden="true"></i><span class="sprint-planning__empty-text">${q ? 'No tasks match your search' : 'All tasks are assigned to a sprint'}</span></div>` : filteredBacklog.map(t => _renderPlanTaskCard(t, 'backlog')).join('')}
        </div>
      </div>
      <div class="sprint-planning__pane">
        <div class="sprint-planning__pane-header">
          <i data-lucide="zap" aria-hidden="true" style="width:16px;height:16px;color:var(--color-primary);"></i>
          <span class="sprint-planning__pane-title">${sanitize(selectedSprint.name)}</span>
          <span class="sprint-planning__pane-count">${sprintTasks.length}</span>
        </div>
        <div class="sprint-planning__pane-body" id="planSprintPane" data-pane="sprint" data-sprint-id="${sanitize(selectedSprint.id)}">
          ${sprintTasks.length === 0 ? `<div class="sprint-planning__empty"><i data-lucide="move" aria-hidden="true"></i><span class="sprint-planning__empty-text">Drag tasks here to add to sprint</span></div>` : sprintTasks.map(t => _renderPlanTaskCard(t, 'sprint')).join('')}
        </div>
      </div>
    </div>`;
}

function _renderPlanTaskCard(task, pane) {
  const priorityOpt = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const typeOpt     = TASK_TYPE_OPTIONS.find(t => t.value === task.type);
  return `
    <div class="plan-task-card" draggable="true" data-task-id="${sanitize(task.id)}" data-pane="${pane}" data-priority="${sanitize(task.priority || 'medium')}">
      <div class="plan-task-card__title">${sanitize(task.title)}</div>
      <div class="plan-task-card__meta">
        <span class="plan-task-card__id">${sanitize(task.id)}</span>
        ${typeOpt ? `<span class="badge badge--neutral" style="font-size:10px;padding:1px 6px;">${typeOpt.label}</span>` : ''}
        ${priorityOpt ? `<span style="font-size:10px;color:${priorityOpt.color};font-weight:600;">${priorityOpt.label}</span>` : ''}
        ${task.story_points ? `<span class="plan-task-card__sp">${task.story_points} SP</span>` : ''}
      </div>
    </div>`;
}

function _renderSprintBoardTab() {
  const activeSprint = _sprints.find(s => s.status === 'active');
  if (!activeSprint) {
    return `<div class="sprint-list-empty"><div class="empty-state"><i data-lucide="kanban" class="empty-state__icon"></i><p class="empty-state__title">No active sprint</p><p class="empty-state__text">Start a sprint from the Sprints list to view the sprint board.</p></div></div>`;
  }
  const sprintTasks = _tasks.filter(t => t.sprint_id === activeSprint.id);
  const columns = [
    { id: 'todo',        label: 'To Do',       status: 'todo' },
    { id: 'in_progress', label: 'In Progress',  status: 'in_progress' },
    { id: 'in_review',   label: 'In Review',    status: 'in_review' },
    { id: 'done',        label: 'Done',         status: 'done' },
  ];
  const boardHtml = columns.map(col => {
    const colTasks = sprintTasks.filter(t => t.status === col.status);
    return `
      <div class="board-col" style="min-width:220px;flex:1;">
        <div class="board-col__header" style="background:var(--color-surface);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-2);display:flex;align-items:center;gap:var(--space-2);">
          <span style="font-weight:600;font-size:var(--text-sm);flex:1;">${sanitize(col.label)}</span>
          <span class="badge badge--neutral">${colTasks.length}</span>
        </div>
        <div class="sprint-board-col-body" data-status="${col.status}" style="display:flex;flex-direction:column;gap:var(--space-2);min-height:60px;padding:var(--space-2);border:2px dashed transparent;border-radius:var(--radius-sm);transition:border-color 100ms,background 100ms;">
          ${colTasks.map(t => _renderSprintBoardCard(t)).join('')}
        </div>
      </div>`;
  }).join('');
  return `
    <div style="padding:var(--space-3) 0;">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
        <span class="badge badge--success">Active</span>
        <span style="font-weight:600;">${sanitize(activeSprint.name)}</span>
        ${activeSprint.end_date ? `<span class="text-muted" style="font-size:var(--text-sm);">Ends ${formatDate(activeSprint.end_date)}</span>` : ''}
      </div>
      <div style="display:flex;gap:var(--space-3);overflow-x:auto;">${boardHtml}</div>
    </div>`;
}

function _renderSprintBoardCard(task) {
  const priorityOpt = TASK_PRIORITY_OPTIONS.find(p => p.value === task.priority);
  const assignees   = (task.assignees || []).slice(0, 2).map(uid => _members.find(m => m.id === uid)).filter(Boolean);
  return `
    <div class="sprint-board-card" draggable="true" data-task-id="${sanitize(task.id)}" style="border-left:3px solid ${priorityOpt?.color || '#E2E8F0'};background:var(--color-card);border-radius:var(--radius-sm);padding:var(--space-3);cursor:grab;box-shadow:var(--shadow-card);transition:transform 100ms,box-shadow 100ms;">
      <div style="font-size:var(--text-xs);color:var(--color-text-muted);font-family:'JetBrains Mono',monospace;margin-bottom:var(--space-1);">${sanitize(task.id)}</div>
      <div style="font-size:var(--text-sm);font-weight:500;color:var(--color-text);margin-bottom:var(--space-2);line-height:1.4;">${sanitize(task.title)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;gap:var(--space-1);">
          ${assignees.map(m => { const ini=(m.full_name||'?').split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join(''); return `<div class="avatar avatar--xs" title="${sanitize(m.full_name)}" style="${m.avatar?'':'background:var(--color-primary);'}">${m.avatar?`<img src="${m.avatar}" alt="" class="avatar__img" />`:`<span class="avatar__initials">${sanitize(ini)}</span>`}</div>`; }).join('')}
        </div>
        ${task.story_points ? `<span style="font-size:10px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:99px;padding:1px 6px;color:var(--color-text-muted);font-weight:600;">${task.story_points} SP</span>` : ''}
      </div>
    </div>`;
}

function _renderVelocityTab() {
  const completed = _sprints.filter(s => s.status !== 'planning');
  if (completed.length === 0) {
    return `<div class="sprint-list-empty"><div class="empty-state"><i data-lucide="bar-chart-2" class="empty-state__icon"></i><p class="empty-state__title">No velocity data yet</p><p class="empty-state__text">Start and complete a sprint to see velocity metrics here.</p></div></div>`;
  }
  const lastSprint = _sprints[_sprints.length - 1];
  return `
    <div class="velocity-chart-wrapper">
      <div class="velocity-chart-title">Sprint Velocity (Story Points)</div>
      <div class="velocity-chart-canvas-wrap">
        <canvas id="velocityCanvas" width="700" height="260"></canvas>
      </div>
      <div style="display:flex;gap:var(--space-4);margin-top:var(--space-3);font-size:var(--text-xs);color:var(--color-text-muted);">
        <span style="display:flex;align-items:center;gap:6px;"><span style="width:14px;height:14px;background:#CBD5E1;border-radius:3px;display:inline-block;"></span> Committed SP</span>
        <span style="display:flex;align-items:center;gap:6px;"><span style="width:14px;height:14px;background:#2563EB;border-radius:3px;display:inline-block;"></span> Completed SP</span>
      </div>
    </div>
    <div class="retro-section">
      <div class="retro-section__title"><i data-lucide="message-square" aria-hidden="true"></i> Retrospective Notes</div>
      <div style="margin-bottom:var(--space-3);">
        <label class="form-label">Select sprint:</label>
        <select class="form-select" id="retroSprintSelect" style="max-width:300px;">
          ${_sprints.map(s => `<option value="${sanitize(s.id)}" ${s.id === lastSprint?.id ? 'selected' : ''}>${sanitize(s.name)} (${s.status})</option>`).join('')}
        </select>
      </div>
      <div id="retroContent">${_renderRetroContent(lastSprint)}</div>
    </div>`;
}

function _renderRetroContent(sprint) {
  if (!sprint) return '';
  return `
    <textarea class="form-textarea" id="retroNotesInput" rows="5" placeholder="What went well? What could be improved? Action items..." style="width:100%;">${sanitize(sprint.retro_notes || '')}</textarea>
    <div style="display:flex;justify-content:flex-end;margin-top:var(--space-3);">
      <button class="btn btn--primary btn--sm" id="btnSaveRetro" data-sprint-id="${sanitize(sprint.id)}">
        <i data-lucide="save" aria-hidden="true"></i> Save Notes
      </button>
    </div>`;
}

function _drawVelocityChart() {
  const canvas = document.getElementById('velocityCanvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const displaySprints = _sprints.filter(s => s.status !== 'planning').slice(-8);
  if (displaySprints.length === 0) return;
  const data = displaySprints.map(sprint => {
    const st = _tasks.filter(t => t.sprint_id === sprint.id);
    return {
      name:      sprint.name,
      committed: st.reduce((s, t) => s + (t.story_points || 0), 0),
      completed: st.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points || 0), 0),
    };
  });
  const W = canvas.offsetWidth || 700;
  canvas.width = W;
  const H = 260;
  const PAD = { top: 30, right: 20, bottom: 55, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.flatMap(d => [d.committed, d.completed]), 1);
  const yMax   = Math.ceil(maxVal * 1.2) || 10;
  const barGroupW = chartW / data.length;
  const barW = Math.min(barGroupW * 0.32, 32);
  ctx.clearRect(0, 0, W, H);
  // Grid
  ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = PAD.top + chartH - (i / 5) * chartH;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + chartW, y); ctx.stroke();
    ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round((i / 5) * yMax), PAD.left - 6, y + 4);
  }
  // Bars
  data.forEach((d, i) => {
    const cx = PAD.left + i * barGroupW + barGroupW / 2;
    const committedH = (d.committed / yMax) * chartH;
    const completedH = (d.completed / yMax) * chartH;
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - barW - 2, PAD.top + chartH - committedH, barW, committedH, [3,3,0,0]);
    else ctx.rect(cx - barW - 2, PAD.top + chartH - committedH, barW, committedH);
    ctx.fill();
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx + 2, PAD.top + chartH - completedH, barW, completedH, [3,3,0,0]);
    else ctx.rect(cx + 2, PAD.top + chartH - completedH, barW, completedH);
    ctx.fill();
    if (d.completed > 0) {
      ctx.fillStyle = '#1D4ED8'; ctx.font = 'bold 10px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d.completed, cx + 2 + barW / 2, PAD.top + chartH - completedH - 5);
    }
    ctx.fillStyle = '#64748B'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
    const lbl = d.name.length > 11 ? d.name.slice(0,11) + '…' : d.name;
    ctx.fillText(lbl, cx, PAD.top + chartH + 18);
  });
}

function _openSprintModal(sprint = null) {
  const isEdit = !!sprint;
  const body = `
    <form id="sprintForm" novalidate>
      <div class="form-group">
        <label class="form-label" for="sName">Sprint Name <span class="required">*</span></label>
        <input class="form-input" type="text" id="sName" placeholder="e.g. Sprint 1" value="${sanitize(sprint?.name || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="sGoal">Sprint Goal</label>
        <textarea class="form-textarea" id="sGoal" rows="2" placeholder="What is this sprint trying to achieve?">${sanitize(sprint?.goal || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="sStartDate">Start Date</label>
          <input class="form-input" type="date" id="sStartDate" value="${sprint?.start_date || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="sEndDate">End Date</label>
          <input class="form-input" type="date" id="sEndDate" value="${sprint?.end_date || ''}" />
        </div>
      </div>
    </form>`;
  openModal({
    title: isEdit ? `Edit Sprint — ${sanitize(sprint.name)}` : 'New Sprint',
    size: 'md', body,
    footer: `<button class="btn btn--secondary" id="btnCancelSprint">Cancel</button><button class="btn btn--primary" id="btnSaveSprint"><i data-lucide="${isEdit?'save':'plus'}" aria-hidden="true"></i> ${isEdit ? 'Save Changes' : 'Create Sprint'}</button>`,
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnCancelSprint')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveSprint')?.addEventListener('click', () => _handleSaveSprint(sprint));
}

async function _handleSaveSprint(existing) {
  const btn  = document.getElementById('btnSaveSprint');
  const name = document.getElementById('sName')?.value.trim();
  if (!name) {
    const f = document.getElementById('sName'); const g = f?.closest('.form-group');
    if (g) { g.querySelector('.form-error')?.remove(); const e = document.createElement('p'); e.className='form-error'; e.textContent='Sprint name is required.'; g.appendChild(e); }
    return;
  }
  if (btn) btn.disabled = true;
  try {
    const allSprints = await getAll('sprints');
    const now = nowISO(); const isEdit = !!existing;
    const sprintData = {
      id:         isEdit ? existing.id : generateSequentialId('SPR', allSprints),
      project_id: _projectId,
      name,
      goal:       document.getElementById('sGoal')?.value.trim() || '',
      start_date: document.getElementById('sStartDate')?.value || null,
      end_date:   document.getElementById('sEndDate')?.value || null,
      status:     isEdit ? existing.status : 'planning',
      retro_notes:existing?.retro_notes || '',
      created_at: isEdit ? existing.created_at : now,
      updated_at: now,
    };
    if (isEdit) {
      await update('sprints', sprintData);
      const i = _sprints.findIndex(s => s.id === sprintData.id); if (i !== -1) _sprints[i] = sprintData;
      logActivity({ project_id: _projectId, entity_type: 'sprint', entity_id: sprintData.id, entity_name: name, action: 'updated' });
      showToast(`Sprint "${name}" updated.`, 'success');
    } else {
      await add('sprints', sprintData);
      _sprints.push(sprintData);
      if (!_planningSprintId) _planningSprintId = sprintData.id;
      logActivity({ project_id: _projectId, entity_type: 'sprint', entity_id: sprintData.id, entity_name: name, action: 'created' });
      showToast(`Sprint "${name}" created.`, 'success');
    }
    closeModal(); _renderPage();
  } catch (err) { debug('Save sprint error:', err); showToast('Failed to save sprint.', 'error'); }
  finally { if (btn) btn.disabled = false; }
}

async function _handleActivateSprint(sprintId) {
  if (_sprints.find(s => s.status === 'active')) { showToast('Another sprint is already active. Complete it first.', 'error'); return; }
  const sprint = _sprints.find(s => s.id === sprintId);
  if (!sprint) return;
  showConfirm({
    title: 'Start Sprint',
    message: `Start <strong>${sanitize(sprint.name)}</strong>? This will make it the active sprint.`,
    confirmLabel: 'Start Sprint', confirmVariant: 'success',
    onConfirm: async () => {
      try {
        const updated = { ...sprint, status: 'active', updated_at: nowISO() };
        await update('sprints', updated);
        const i = _sprints.findIndex(s => s.id === sprintId); if (i !== -1) _sprints[i] = updated;
        logActivity({ project_id: _projectId, entity_type: 'sprint', entity_id: sprintId, entity_name: sprint.name, action: 'sprint_started' });
        showToast(`Sprint "${sprint.name}" is now active.`, 'success'); _renderPage();
      } catch { showToast('Failed to start sprint.', 'error'); }
    },
  });
}

async function _handleCompleteSprint(sprintId) {
  const sprint = _sprints.find(s => s.id === sprintId);
  if (!sprint) return;
  const sprintTasks = _tasks.filter(t => t.sprint_id === sprintId);
  const unfinished  = sprintTasks.filter(t => !['done','cancelled'].includes(t.status));
  const nextSprints = _sprints.filter(s => s.status === 'planning' && s.id !== sprintId);
  const unfinishedHtml = unfinished.length > 0
    ? `<div style="margin:var(--space-3) 0;">
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-2);">${unfinished.length} unfinished task(s) will be:</p>
        <div style="display:flex;gap:var(--space-4);margin-bottom:var(--space-2);">
          <label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);cursor:pointer;"><input type="radio" name="unfinishedAction" value="backlog" checked /> Move to Backlog</label>
          ${nextSprints.length > 0 ? `<label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);cursor:pointer;"><input type="radio" name="unfinishedAction" value="next" /> Move to Next Sprint</label>` : ''}
        </div>
        ${nextSprints.length > 0 ? `<div id="nextSprintSelectWrap" style="display:none;margin-bottom:var(--space-2);"><label class="form-label">Next Sprint:</label><select class="form-select" id="nextSprintId">${nextSprints.map(s => `<option value="${sanitize(s.id)}">${sanitize(s.name)}</option>`).join('')}</select></div>` : ''}
        <div class="complete-sprint-tasks">
          ${unfinished.map(t => `<div class="complete-sprint-task-item"><span class="complete-sprint-task-item__id">${sanitize(t.id)}</span><span class="complete-sprint-task-item__title">${sanitize(t.title)}</span>${t.story_points ? `<span style="font-size:10px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:99px;padding:1px 6px;color:var(--color-text-muted);font-weight:600;flex-shrink:0;">${t.story_points} SP</span>` : ''}</div>`).join('')}
        </div>
       </div>`
    : '<p style="font-size:var(--text-sm);color:var(--color-success);margin:var(--space-2) 0;display:flex;align-items:center;gap:var(--space-2);"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> All tasks are done!</p>';

  openModal({
    title: 'Complete Sprint', size: 'md',
    body: `<p>Complete <strong>${sanitize(sprint.name)}</strong>?</p>${unfinishedHtml}<div class="form-group" style="margin-top:var(--space-3);"><label class="form-label" for="completedRetroNotes">Retrospective Notes (optional)</label><textarea class="form-textarea" id="completedRetroNotes" rows="3" placeholder="What went well? What could be improved?">${sanitize(sprint.retro_notes || '')}</textarea></div>`,
    footer: `<button class="btn btn--secondary" id="btnCancelComplete">Cancel</button><button class="btn btn--danger" id="btnConfirmComplete"><i data-lucide="flag" aria-hidden="true"></i> Complete Sprint</button>`,
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.querySelectorAll('input[name="unfinishedAction"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const wrap = document.getElementById('nextSprintSelectWrap');
      if (wrap) wrap.style.display = radio.value === 'next' ? 'block' : 'none';
    });
  });
  document.getElementById('btnCancelComplete')?.addEventListener('click', closeModal);
  document.getElementById('btnConfirmComplete')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnConfirmComplete'); if (btn) btn.disabled = true;
    try {
      const action = document.querySelector('input[name="unfinishedAction"]:checked')?.value || 'backlog';
      const nextSprintId = action === 'next' ? document.getElementById('nextSprintId')?.value : null;
      const retroNotes   = document.getElementById('completedRetroNotes')?.value.trim() || '';
      const now = nowISO();
      for (const task of unfinished) {
        const updated = { ...task, sprint_id: nextSprintId || null, updated_at: now };
        await update('tasks', updated);
        const ti = _tasks.findIndex(t => t.id === task.id); if (ti !== -1) _tasks[ti] = updated;
      }
      const updatedSprint = { ...sprint, status: 'completed', retro_notes: retroNotes, updated_at: now };
      await update('sprints', updatedSprint);
      const si = _sprints.findIndex(s => s.id === sprintId); if (si !== -1) _sprints[si] = updatedSprint;
      logActivity({ project_id: _projectId, entity_type: 'sprint', entity_id: sprintId, entity_name: sprint.name, action: 'sprint_completed' });
      showToast(`Sprint "${sprint.name}" completed.`, 'success');
      closeModal(); _activeTab = 'list'; _renderPage();
    } catch (err) { debug('Complete sprint error:', err); showToast('Failed to complete sprint.', 'error'); }
    finally { if (btn) btn.disabled = false; }
  });
}

async function _handleDeleteSprint(sprintId) {
  const sprint = _sprints.find(s => s.id === sprintId); if (!sprint) return;
  const taskCount = _tasks.filter(t => t.sprint_id === sprintId).length;
  showConfirm({
    title: 'Delete Sprint',
    message: `Delete <strong>${sanitize(sprint.name)}</strong>?${taskCount > 0 ? ` <br><span style="color:var(--color-warning);">${taskCount} task(s) will be returned to backlog.</span>` : ''}`,
    confirmLabel: 'Delete', confirmVariant: 'danger',
    onConfirm: async () => {
      try {
        const sprintTasks = _tasks.filter(t => t.sprint_id === sprintId);
        for (const task of sprintTasks) {
          const u = { ...task, sprint_id: null, updated_at: nowISO() };
          await update('tasks', u);
          const i = _tasks.findIndex(t => t.id === task.id); if (i !== -1) _tasks[i] = u;
        }
        await remove('sprints', sprintId);
        _sprints = _sprints.filter(s => s.id !== sprintId);
        if (_planningSprintId === sprintId) _planningSprintId = _sprints[0]?.id || null;
        logActivity({ project_id: _projectId, entity_type: 'sprint', entity_id: sprintId, entity_name: sprint.name, action: 'deleted' });
        showToast(`Sprint "${sprint.name}" deleted.`, 'success'); _renderPage();
      } catch { showToast('Failed to delete sprint.', 'error'); }
    },
  });
}

async function _handleReopenSprint(sprintId) {
  const sprint = _sprints.find(s => s.id === sprintId); if (!sprint) return;
  if (_sprints.find(s => s.status === 'active')) { showToast('Another sprint is already active. Complete it first.', 'error'); return; }
  showConfirm({
    title: 'Reopen Sprint', message: `Reopen <strong>${sanitize(sprint.name)}</strong> and set back to planning?`,
    confirmLabel: 'Reopen',
    onConfirm: async () => {
      try {
        const u = { ...sprint, status: 'planning', updated_at: nowISO() };
        await update('sprints', u);
        const i = _sprints.findIndex(s => s.id === sprintId); if (i !== -1) _sprints[i] = u;
        showToast(`Sprint "${sprint.name}" reopened.`, 'success'); _renderPage();
      } catch { showToast('Failed to reopen sprint.', 'error'); }
    },
  });
}

function _bindPageEvents() {
  document.getElementById('btnNewSprint')?.addEventListener('click', () => _openSprintModal(null));
  document.getElementById('btnNewSprintEmpty')?.addEventListener('click', () => _openSprintModal(null));
  document.getElementById('btnNewSprintPlan')?.addEventListener('click', () => _openSprintModal(null));
  document.getElementById('btnViewBoard')?.addEventListener('click', () => { _activeTab = 'board'; _renderPage(); });
  document.getElementById('btnCompleteSprint')?.addEventListener('click', e => _handleCompleteSprint(e.currentTarget.dataset.id));
  document.querySelectorAll('.sprint-tab').forEach(tab => {
    tab.addEventListener('click', () => { _activeTab = tab.dataset.tab; _renderPage(); });
  });
  const sprintList = document.querySelector('.sprint-list');
  if (sprintList) {
    sprintList.addEventListener('click', e => {
      const btn = e.target.closest('button[data-id]'); if (!btn) return;
      const id = btn.dataset.id;
      if (btn.classList.contains('btn-activate-sprint')) _handleActivateSprint(id);
      if (btn.classList.contains('btn-complete-sprint')) _handleCompleteSprint(id);
      if (btn.classList.contains('btn-delete-sprint'))  _handleDeleteSprint(id);
      if (btn.classList.contains('btn-reopen-sprint'))  _handleReopenSprint(id);
      if (btn.classList.contains('btn-edit-sprint')) { const sprint = _sprints.find(s => s.id === id); if (sprint) _openSprintModal(sprint); }
      if (btn.classList.contains('btn-plan-sprint'))  { _planningSprintId = id; _activeTab = 'planning'; _renderPage(); }
    });
  }
  document.getElementById('planningSprintSelect')?.addEventListener('change', e => { _planningSprintId = e.target.value; _renderPage(); });
  document.getElementById('planningSearch')?.addEventListener('input', e => { _planningSearch = e.target.value; _refreshPlanningPanes(); });
  document.getElementById('retroSprintSelect')?.addEventListener('change', e => {
    const sprint = _sprints.find(s => s.id === e.target.value);
    const retro  = document.getElementById('retroContent');
    if (retro && sprint) { retro.innerHTML = _renderRetroContent(sprint); if (typeof lucide !== 'undefined') lucide.createIcons(); _bindRetroSave(); }
  });
  _bindRetroSave();
}

function _bindRetroSave() {
  document.getElementById('btnSaveRetro')?.addEventListener('click', async e => {
    const sprintId = e.currentTarget.dataset.sprintId;
    const notes    = document.getElementById('retroNotesInput')?.value.trim() || '';
    const sprint   = _sprints.find(s => s.id === sprintId); if (!sprint) return;
    try {
      const u = { ...sprint, retro_notes: notes, updated_at: nowISO() };
      await update('sprints', u);
      const i = _sprints.findIndex(s => s.id === sprintId); if (i !== -1) _sprints[i] = u;
      showToast('Retrospective notes saved.', 'success');
    } catch { showToast('Failed to save notes.', 'error'); }
  });
}

function _bindPlanningDragDrop() {
  const backlogPane = document.getElementById('planBacklogPane');
  const sprintPane  = document.getElementById('planSprintPane');
  if (!backlogPane || !sprintPane) return;
  const panes = [backlogPane, sprintPane];
  document.querySelectorAll('.plan-task-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => {
      _dragTaskId = card.dataset.taskId; _dragSource = card.dataset.pane;
      card.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      panes.forEach(p => p.classList.remove('is-drag-over'));
    });
  });
  panes.forEach(pane => {
    pane.addEventListener('dragover', e => { e.preventDefault(); pane.classList.add('is-drag-over'); });
    pane.addEventListener('dragleave', e => { if (!pane.contains(e.relatedTarget)) pane.classList.remove('is-drag-over'); });
    pane.addEventListener('drop', async e => {
      e.preventDefault(); pane.classList.remove('is-drag-over');
      const targetPane   = pane.dataset.pane;
      const targetSprint = pane.dataset.sprintId || null;
      if (!_dragTaskId || _dragSource === targetPane) return;
      const task = _tasks.find(t => t.id === _dragTaskId); if (!task) return;
      const newSprintId = targetPane === 'sprint' ? targetSprint : null;
      try {
        const u = { ...task, sprint_id: newSprintId, updated_at: nowISO() };
        await update('tasks', u);
        const i = _tasks.findIndex(t => t.id === _dragTaskId); if (i !== -1) _tasks[i] = u;
        showToast(newSprintId ? 'Task added to sprint.' : 'Task returned to backlog.', 'success');
        _refreshPlanningPanes();
      } catch { showToast('Failed to move task.', 'error'); }
      _dragTaskId = null; _dragSource = null;
    });
  });
}

function _refreshPlanningPanes() {
  const q = _planningSearch.toLowerCase();
  const selectedSprint = _sprints.find(s => s.id === _planningSprintId);
  const backlogTasks   = _tasks.filter(t => !t.sprint_id && !['done','cancelled'].includes(t.status));
  const sprintTasks    = selectedSprint ? _tasks.filter(t => t.sprint_id === _planningSprintId) : [];
  const filteredBacklog = q ? backlogTasks.filter(t => t.title?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q)) : backlogTasks;
  const bp = document.getElementById('planBacklogPane');
  const sp = document.getElementById('planSprintPane');
  if (bp) {
    bp.innerHTML = filteredBacklog.length === 0
      ? `<div class="sprint-planning__empty"><i data-lucide="check-circle" aria-hidden="true"></i><span class="sprint-planning__empty-text">${q?'No tasks match':'All tasks assigned'}</span></div>`
      : filteredBacklog.map(t => _renderPlanTaskCard(t, 'backlog')).join('');
    const bh = bp.closest('.sprint-planning__pane')?.querySelector('.sprint-planning__pane-count');
    if (bh) bh.textContent = filteredBacklog.length;
  }
  if (sp) {
    sp.innerHTML = sprintTasks.length === 0
      ? `<div class="sprint-planning__empty"><i data-lucide="move" aria-hidden="true"></i><span class="sprint-planning__empty-text">Drag tasks here</span></div>`
      : sprintTasks.map(t => _renderPlanTaskCard(t, 'sprint')).join('');
    const sh = sp.closest('.sprint-planning__pane')?.querySelector('.sprint-planning__pane-count');
    if (sh) sh.textContent = sprintTasks.length;
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindPlanningDragDrop();
}

function _bindSprintBoardDragDrop() {
  let dragCardId = null;
  document.querySelectorAll('.sprint-board-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => { dragCardId = card.dataset.taskId; card.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
    card.addEventListener('dragend', () => {
      card.style.opacity = '';
      document.querySelectorAll('.sprint-board-col-body').forEach(c => { c.style.borderColor='transparent'; c.style.background=''; });
    });
  });
  document.querySelectorAll('.sprint-board-col-body').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.style.borderColor='var(--color-primary)'; col.style.background='#EFF6FF'; });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) { col.style.borderColor='transparent'; col.style.background=''; } });
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.style.borderColor='transparent'; col.style.background='';
      if (!dragCardId) return;
      const newStatus = col.dataset.status;
      const task = _tasks.find(t => t.id === dragCardId);
      if (!task || task.status === newStatus) return;
      try {
        const u = { ...task, status: newStatus, updated_at: nowISO() };
        if (newStatus === 'done' && !task.completed_at) u.completed_at = nowISO();
        if (newStatus !== 'done') u.completed_at = null;
        await update('tasks', u);
        const i = _tasks.findIndex(t => t.id === dragCardId); if (i !== -1) _tasks[i] = u;
        showToast('Task status updated.', 'success'); _renderPage();
      } catch { showToast('Failed to update task.', 'error'); }
      dragCardId = null;
    });
  });
}

export default { render };
