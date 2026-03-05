/**
 * TRACKLY — dashboard.js
 * v2.0: Enhanced dashboard with gradient banner, animated stats, sparklines,
 * interactive charts, team workload, completion rate ring, and recent activity.
 */

import { getAll } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { sanitize, formatRelativeDate, formatDate, debug } from '../core/utils.js';
import { renderBadge } from '../components/badge.js';

// Module-level clock interval ID
let _clockInterval = null;

function getStatusVariant(status) {
  const map = { backlog: 'muted', todo: 'info', in_progress: 'warning', in_review: 'purple', done: 'success', cancelled: 'danger', active: 'success', completed: 'primary', on_hold: 'warning', cancelled: 'danger' };
  return map[status] || 'muted';
}

function getStatusLabel(status) {
  const map = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled', active: 'Active', completed: 'Completed', on_hold: 'On Hold', planning: 'Planning' };
  return map[status] || status;
}

/* ─── Clock ──────────────────────────────────────────────────────────────────── */

function _stopClock() {
  if (_clockInterval) {
    clearInterval(_clockInterval);
    _clockInterval = null;
  }
}

function _startClock() {
  _stopClock();
  const el = document.querySelector('.dashboard-clock__text');
  if (!el) return;
  function _tick() {
    const n = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const datePart = n.toLocaleDateString('en-US', opts);
    const timePart = n.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = `${datePart} · ${timePart}`;
  }
  _tick();
  _clockInterval = setInterval(_tick, 1000);
}

/* ─── SVG Charts ─────────────────────────────────────────────────────────────── */

function _renderDonutChart(data, size = 140) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return '';
  const cx = size / 2, cy = size / 2, r = size / 2 - 12, strokeW = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = data.map((d, i) => {
    const pct = d.value / total;
    const dashLen = circ * pct;
    const dashOff = circ - offset;
    offset += dashLen;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}"
      stroke-width="${strokeW}" stroke-dasharray="${dashLen} ${circ - dashLen}"
      stroke-dashoffset="${dashOff}" stroke-linecap="round"
      style="transition: stroke-dashoffset 0.8s ease ${i * 0.1}s; cursor: pointer;"
      data-label="${sanitize(d.label)}" data-value="${d.value}">
      <title>${sanitize(d.label)}: ${d.value}</title>
    </circle>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" class="dashboard-donut-svg">${arcs.join('')}</svg>`;
}

function _renderBarChart(data) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return data.map(d => {
    const pct = Math.round((d.value / maxVal) * 100);
    return `<div class="dashboard-hbar" data-label="${sanitize(d.label)}" data-value="${d.value}">
      <div class="dashboard-hbar__label">${sanitize(d.label)}</div>
      <div class="dashboard-hbar__track">
        <div class="dashboard-hbar__fill" style="width:${pct}%;background:${d.color};"></div>
      </div>
      <div class="dashboard-hbar__value">${d.value}</div>
    </div>`;
  }).join('');
}

function _renderCompletionRing(completed, total) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r;
  const dashLen = circ * (pct / 100);
  const color = pct >= 75 ? '#16A34A' : pct >= 50 ? '#D97706' : pct >= 25 ? '#0891B2' : '#94A3B8';
  return `<div class="dashboard-completion-ring">
    <svg viewBox="0 0 88 88" width="88" height="88">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--color-border)" stroke-width="7"></circle>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-dasharray="${dashLen} ${circ - dashLen}" stroke-dashoffset="${circ / 4}"
        stroke-linecap="round" style="transition: stroke-dasharray 1s ease;"></circle>
    </svg>
    <div class="dashboard-completion-ring__text">
      <span class="dashboard-completion-ring__pct">${pct}%</span>
      <span class="dashboard-completion-ring__label">Complete</span>
    </div>
  </div>`;
}

/* ─── Main render ────────────────────────────────────────────────────────────── */

export async function render(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;

  _stopClock();

  // Skeleton
  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="dashboard-welcome-banner skeleton" style="height:140px;border-radius:var(--radius-lg);"></div>
      <div class="dashboard-stats-grid" style="margin-top:var(--space-6);">
        ${[1, 2, 3, 4, 5, 6].map(() => `<div class="skeleton" style="height:96px;border-radius:var(--radius-md);"></div>`).join('')}
      </div>
    </div>`;

  try {
    const session = getSession();
    const [projects, tasks, members, maintenance, sprints, activityLogs, clients] = await Promise.all([
      getAll('projects').catch(() => []),
      getAll('tasks').catch(() => []),
      getAll('users').catch(() => []),
      getAll('maintenance').catch(() => []),
      getAll('sprints').catch(() => []),
      getAll('activity_log').catch(() => []),
      getAll('clients').catch(() => []),
    ]);

    const userId = session?.userId;
    const now = new Date();

    // --- Stats ---
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const myTasks = tasks.filter(t => Array.isArray(t.assignees) ? t.assignees.includes(userId) : t.assignees === userId);
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && !['done', 'cancelled'].includes(t.status));
    const openBugs = tasks.filter(t => t.type === 'bug' && !['done', 'cancelled'].includes(t.status));
    const openMaint = maintenance.filter(m => ['open', 'in_progress'].includes(m.status));
    const totalMembers = members.length;

    const activeSprint = sprints.find(s => s.status === 'active');
    const myPendingTasks = myTasks.filter(t => !['done', 'cancelled'].includes(t.status)).slice(0, 8);
    const recentProjects = [...projects]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5);

    const currentUser = members.find(u => u.id === userId);
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const displayName = currentUser?.full_name?.split(' ')[0] || session?.username || 'there';

    // --- Chart data ---
    const statusColors = {
      backlog: '#94A3B8', todo: '#0891B2', in_progress: '#D97706',
      in_review: '#7C3AED', done: '#16A34A', cancelled: '#DC2626',
    };
    const statusOrder = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    const donutData = statusOrder.map(s => ({
      label: getStatusLabel(s),
      value: tasks.filter(t => t.status === s).length,
      color: statusColors[s],
    })).filter(d => d.value > 0);

    const priorityColors = { critical: '#DC2626', high: '#D97706', medium: '#0891B2', low: '#64748B' };
    const activeTasks = tasks.filter(t => !['done', 'cancelled'].includes(t.status));
    const barData = ['critical', 'high', 'medium', 'low'].map(p => ({
      label: p.charAt(0).toUpperCase() + p.slice(1),
      value: activeTasks.filter(t => (t.priority || 'medium') === p).length,
      color: priorityColors[p],
    }));

    const donutSvg = _renderDonutChart(donutData);
    const barHtml = _renderBarChart(barData);
    const completionRing = _renderCompletionRing(doneTasks, totalTasks);

    // --- Team workload ---
    const teamWorkload = members.slice(0, 6).map(m => {
      const memberTasks = tasks.filter(t => {
        const assignees = Array.isArray(t.assignees) ? t.assignees : [t.assignees];
        return assignees.includes(m.id) && !['done', 'cancelled'].includes(t.status);
      });
      const initials = (m.full_name || '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
      return { ...m, initials, taskCount: memberTasks.length };
    }).sort((a, b) => b.taskCount - a.taskCount);

    const maxWorkload = Math.max(...teamWorkload.map(m => m.taskCount), 1);

    // --- Activity Timeline ---
    const recentLogs = [...activityLogs]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    const actionIcons = {
      created: 'plus-circle', updated: 'edit-2', deleted: 'trash-2',
      status_changed: 'refresh-cw', sprint_started: 'play-circle',
      sprint_completed: 'check-circle', assigned: 'user-check',
    };
    const dotColors = {
      created: 'var(--color-success)', updated: 'var(--color-primary)',
      deleted: 'var(--color-danger)', status_changed: 'var(--color-warning)',
      sprint_started: 'var(--color-info)', sprint_completed: 'var(--color-success)',
    };

    function buildTimelineItems(logs) {
      return logs.map((log, idx, arr) => {
        const icon = actionIcons[log.action] || 'activity';
        const dotColor = dotColors[log.action] || 'var(--color-text-muted)';
        const proj = log.project_id ? projects.find(p => p.id === log.project_id) : null;
        const actor = sanitize(log.actor_name || 'Someone');
        const entity = sanitize(log.entity_name || log.entity_id || '');
        const type = (log.entity_type || '').replace(/_/g, ' ');
        const amap = {
          created: `created ${type} <strong>${entity}</strong>`,
          updated: `updated ${type} <strong>${entity}</strong>`,
          deleted: `deleted ${type} <strong>${entity}</strong>`,
          status_changed: `changed status of <strong>${entity}</strong>`,
          sprint_started: `started sprint <strong>${entity}</strong>`,
          sprint_completed: `completed sprint <strong>${entity}</strong>`,
        };
        const label = `<strong>${actor}</strong> ${amap[log.action] || sanitize(log.action) + ' ' + entity}`;
        const isLast = idx === arr.length - 1;
        return `<div class="activity-timeline-item">
          <div class="activity-timeline-item__connector">
            <div class="activity-timeline-item__dot" style="background:${dotColor};">
              <i data-lucide="${icon}" aria-hidden="true"></i>
            </div>
            ${isLast ? '' : '<div class="activity-timeline-item__line"></div>'}
          </div>
          <div class="activity-timeline-item__body">
            <p class="activity-timeline-item__text">${label}</p>
            <p class="activity-timeline-item__meta">
              <span class="activity-timeline-item__time" title="${sanitize(formatDate(log.created_at, 'datetime'))}">${sanitize(formatRelativeDate(log.created_at))}</span>
              ${proj ? `<span>·</span><a href="#/projects/${sanitize(proj.id)}" class="text-link">${sanitize(proj.name)}</a>` : ''}
            </p>
          </div>
        </div>`;
      }).join('');
    }

    const SHOW_DEFAULT = 5;
    const hasMore = recentLogs.length > SHOW_DEFAULT;

    // --- Upcoming deadlines ---
    const upcomingDeadlines = tasks
      .filter(t => t.due_date && !['done', 'cancelled'].includes(t.status))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5);

    // Read-only check
    const isReadOnly = session && ['viewer', 'client'].includes(session.role);

    content.innerHTML = `
      <div class="page-container page-enter">
        <!-- Welcome Banner -->
        <div class="dashboard-welcome-banner">
          <div class="dashboard-welcome-banner__content">
            <div class="dashboard-welcome-banner__text">
              <h1 class="dashboard-welcome-banner__greeting">${sanitize(greeting)}, ${sanitize(displayName)} 👋</h1>
              <p class="dashboard-welcome-banner__subtitle">Here's what's happening with your projects today.</p>
              <p id="dashboard-clock" class="dashboard-clock">
                <i data-lucide="clock" aria-hidden="true"></i>
                <span class="dashboard-clock__text"></span>
              </p>
            </div>
            <div class="dashboard-welcome-banner__actions">
              ${isReadOnly ? '' : `<a href="#/projects" class="btn btn--white">
                <i data-lucide="folder-plus" aria-hidden="true"></i> New Project
              </a>`}
            </div>
          </div>
          <div class="dashboard-welcome-banner__decoration">
            <div class="dashboard-welcome-banner__circle dashboard-welcome-banner__circle--1"></div>
            <div class="dashboard-welcome-banner__circle dashboard-welcome-banner__circle--2"></div>
            <div class="dashboard-welcome-banner__circle dashboard-welcome-banner__circle--3"></div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="dashboard-stats-grid" role="list" aria-label="Summary statistics">
          ${statCard('folder-kanban', 'Active Projects', activeProjects, '#/projects', '#6366F1', 'var(--stat-gradient-purple)')}
          ${statCard('list-checks', 'Total Tasks', totalTasks, '#/projects', '#0891B2', 'var(--stat-gradient-cyan)')}
          ${statCard('alert-circle', 'Overdue', overdueTasks.length, '#/projects', '#DC2626', 'var(--stat-gradient-red)', overdueTasks.length > 0 ? 'pulse-danger' : '')}
          ${statCard('bug', 'Open Bugs', openBugs.length, '#/projects', '#D97706', 'var(--stat-gradient-amber)', openBugs.length > 0 ? 'pulse-warning' : '')}
          ${statCard('wrench', 'Maintenance', openMaint.length, '#/projects', '#7C3AED', 'var(--stat-gradient-violet)')}
          ${statCard('users', 'Team Members', totalMembers, '#/members', '#0EA5E9', 'var(--stat-gradient-sky)')}
        </div>

        <!-- Charts Row -->
        <div class="dashboard-charts-row">
          <!-- Task Status Donut -->
          <div class="card dashboard-chart-card">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="pie-chart" aria-hidden="true"></i> Task Distribution
              </h2>
            </div>
            <div class="card__body dashboard-chart-card__body">
              ${donutSvg ? `
                <div class="dashboard-chart__donut-wrap">
                  ${donutSvg}
                  <div class="dashboard-chart__donut-center">
                    <span class="dashboard-chart__donut-total">${tasks.length}</span>
                    <span class="dashboard-chart__donut-label">Tasks</span>
                  </div>
                </div>
                <div class="dashboard-chart__legend">
                  ${donutData.map(d => `
                    <div class="dashboard-chart__legend-item">
                      <span class="dashboard-chart__legend-dot" style="background:${d.color};"></span>
                      <span>${d.label}</span>
                      <span class="dashboard-chart__legend-count">${d.value}</span>
                    </div>`).join('')}
                </div>
              ` : `<div class="dashboard-chart__empty"><i data-lucide="pie-chart" aria-hidden="true"></i> No tasks yet</div>`}
            </div>
          </div>

          <!-- Overall Completion + Priority -->
          <div class="card dashboard-chart-card">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="target" aria-hidden="true"></i> Progress Overview
              </h2>
            </div>
            <div class="card__body dashboard-chart-card__body dashboard-chart-card__body--col">
              <div class="dashboard-progress-overview">
                ${completionRing}
                <div class="dashboard-progress-overview__stats">
                  <div class="dashboard-progress-stat">
                    <span class="dashboard-progress-stat__value">${doneTasks}</span>
                    <span class="dashboard-progress-stat__label">Completed</span>
                  </div>
                  <div class="dashboard-progress-stat">
                    <span class="dashboard-progress-stat__value">${activeTasks.length}</span>
                    <span class="dashboard-progress-stat__label">In Progress</span>
                  </div>
                  <div class="dashboard-progress-stat">
                    <span class="dashboard-progress-stat__value">${overdueTasks.length}</span>
                    <span class="dashboard-progress-stat__label text-danger">Overdue</span>
                  </div>
                </div>
              </div>
              <div class="dashboard-priority-bars">
                <p class="dashboard-priority-bars__title">Active Tasks by Priority</p>
                ${activeTasks.length > 0 ? barHtml : '<p class="text-muted" style="font-size:var(--text-xs);">No active tasks</p>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Main Grid: My Tasks, Recent Projects, Team -->
        <div class="dashboard-main-grid">
          <!-- My Tasks -->
          <div class="card dashboard-widget">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="check-square" aria-hidden="true"></i> My Tasks
              </h2>
              <span class="badge ${myPendingTasks.length > 0 ? 'badge--primary' : 'badge--muted'}">${myPendingTasks.length}</span>
            </div>
            <div class="card__body" style="padding:0;">
              ${myPendingTasks.length === 0
        ? `<div class="empty-state" style="padding:var(--space-10) var(--space-4);">
                    <i data-lucide="check-circle-2" class="empty-state__icon" aria-hidden="true"></i>
                    <p class="empty-state__title">All caught up!</p>
                    <p class="empty-state__text">No tasks assigned to you right now.</p>
                   </div>`
        : `<ul class="dashboard-task-list" aria-label="My tasks">
                    ${myPendingTasks.map(task => {
          const proj = projects.find(p => p.id === task.project_id);
          const isOverdue = task.due_date && new Date(task.due_date) < now;
          return `<li class="dashboard-task-item ${isOverdue ? 'dashboard-task-item--overdue' : ''}">
                        <div class="dashboard-task-item__priority priority-dot priority-dot--${task.priority || 'medium'}" title="${task.priority || 'medium'} priority"></div>
                        <div class="dashboard-task-item__content">
                          <p class="dashboard-task-item__title" title="${sanitize(task.title)}">${sanitize(task.title)}</p>
                          <p class="dashboard-task-item__meta">
                            ${proj ? `<a href="#/projects/${sanitize(proj.id)}/board" class="text-link">${sanitize(proj.name)}</a>` : ''}
                            ${task.due_date ? `<span class="${isOverdue ? 'text-danger' : 'text-muted'}" style="margin-left:var(--space-2);">Due ${formatDate(task.due_date)}</span>` : ''}
                          </p>
                        </div>
                        ${renderBadge(getStatusLabel(task.status), getStatusVariant(task.status))}
                      </li>`;
        }).join('')}
                   </ul>`
      }
            </div>
          </div>

          <!-- Recent Projects -->
          <div class="card dashboard-widget">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="folder" aria-hidden="true"></i> Recent Projects
              </h2>
              <a href="#/projects" class="btn btn--ghost btn--sm">View all</a>
            </div>
            <div class="card__body" style="padding:0;">
              ${recentProjects.length === 0
        ? `<div class="empty-state" style="padding:var(--space-10) var(--space-4);">
                    <i data-lucide="folder-open" class="empty-state__icon" aria-hidden="true"></i>
                    <p class="empty-state__title">No projects yet</p>
                    <p class="empty-state__text">Create your first project to get started.</p>
                    <a href="#/projects" class="btn btn--primary btn--sm" style="margin-top:var(--space-3);">Create Project</a>
                   </div>`
        : `<ul class="dashboard-project-list" aria-label="Recent projects">
                    ${recentProjects.map(proj => {
          const projTasks = tasks.filter(t => t.project_id === proj.id);
          const done = projTasks.filter(t => t.status === 'done').length;
          const total = projTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return `<li class="dashboard-project-item">
                        <a href="#/projects/${sanitize(proj.id)}" class="dashboard-project-item__link" aria-label="Open project ${sanitize(proj.name)}">
                          <div class="dashboard-project-item__cover" style="background:${sanitize(proj.cover_color || 'var(--color-primary)')};"></div>
                          <div class="dashboard-project-item__info">
                            <p class="dashboard-project-item__name">${sanitize(proj.name)}</p>
                            <div class="dashboard-project-progress">
                              <div class="dashboard-project-progress__bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                                <div class="dashboard-project-progress__fill" style="width:${pct}%;"></div>
                              </div>
                              <span class="dashboard-project-progress__label">${pct}%</span>
                            </div>
                          </div>
                          ${renderBadge(getStatusLabel(proj.status), getStatusVariant(proj.status))}
                        </a>
                      </li>`;
        }).join('')}
                   </ul>`
      }
            </div>
          </div>
        </div>

        <!-- Team Workload + Upcoming Deadlines -->
        <div class="dashboard-bottom-grid">
          <!-- Team Workload -->
          <div class="card dashboard-widget">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="bar-chart-3" aria-hidden="true"></i> Team Workload
              </h2>
            </div>
            <div class="card__body">
              ${teamWorkload.length === 0
        ? '<div class="dashboard-chart__empty">No team members yet</div>'
        : `<div class="dashboard-team-workload">
                  ${teamWorkload.map(m => `
                    <div class="dashboard-team-member">
                      <div class="avatar avatar--sm" style="background:var(--color-primary);" title="${sanitize(m.full_name || '')}">
                        ${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(m.initials)}</span>`}
                      </div>
                      <div class="dashboard-team-member__info">
                        <span class="dashboard-team-member__name">${sanitize((m.full_name || '').split(' ')[0])}</span>
                        <div class="dashboard-team-member__bar-track">
                          <div class="dashboard-team-member__bar-fill" style="width:${Math.round((m.taskCount / maxWorkload) * 100)}%;"></div>
                        </div>
                      </div>
                      <span class="dashboard-team-member__count">${m.taskCount}</span>
                    </div>
                  `).join('')}
                </div>`
      }
            </div>
          </div>

          <!-- Upcoming Deadlines -->
          <div class="card dashboard-widget">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="calendar-clock" aria-hidden="true"></i> Upcoming Deadlines
              </h2>
            </div>
            <div class="card__body" style="padding:0;">
              ${upcomingDeadlines.length === 0
        ? `<div class="empty-state" style="padding:var(--space-8) var(--space-4);">
                    <i data-lucide="calendar-check" class="empty-state__icon" aria-hidden="true"></i>
                    <p class="empty-state__title">No upcoming deadlines</p>
                   </div>`
        : `<ul class="dashboard-deadline-list">
                    ${upcomingDeadlines.map(task => {
          const dueDate = new Date(task.due_date);
          const isOverdue = dueDate < now;
          const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          const urgencyClass = isOverdue ? 'danger' : daysLeft <= 3 ? 'warning' : 'muted';
          const proj = projects.find(p => p.id === task.project_id);
          return `<li class="dashboard-deadline-item">
                          <div class="dashboard-deadline-item__icon dashboard-deadline-item__icon--${urgencyClass}">
                            <i data-lucide="${isOverdue ? 'alert-triangle' : 'clock'}" aria-hidden="true"></i>
                          </div>
                          <div class="dashboard-deadline-item__content">
                            <p class="dashboard-deadline-item__title">${sanitize(task.title)}</p>
                            <p class="dashboard-deadline-item__meta">
                              ${proj ? `<span>${sanitize(proj.name)}</span> · ` : ''}
                              <span class="text-${urgencyClass}">${isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}</span>
                            </p>
                          </div>
                          <span class="dashboard-deadline-item__date">${formatDate(task.due_date)}</span>
                        </li>`;
        }).join('')}
                   </ul>`
      }
            </div>
          </div>
        </div>

        ${activeSprint ? `
        <div class="card dashboard-sprint-card">
          <div class="card__header">
            <h2 class="card__title">
              <i data-lucide="zap" aria-hidden="true"></i> Active Sprint
            </h2>
            <span class="badge badge--success">Active</span>
          </div>
          <div class="card__body">
            <div class="sprint-summary">
              <div class="sprint-summary__info">
                <p class="sprint-summary__name">${sanitize(activeSprint.name)}</p>
                <p class="sprint-summary__dates text-muted">
                  ${formatDate(activeSprint.start_date)} — ${formatDate(activeSprint.end_date)}
                </p>
                ${activeSprint.goal ? `<p class="sprint-summary__goal">${sanitize(activeSprint.goal)}</p>` : ''}
              </div>
              ${(() => {
          const proj = projects.find(p => p.id === activeSprint.project_id);
          return proj ? `<a href="#/projects/${sanitize(proj.id)}/sprint" class="btn btn--outline btn--sm">
                  View Sprint
                </a>` : '';
        })()}
            </div>
          </div>
        </div>` : ''}

        <!-- Activity Timeline -->
        ${recentLogs.length === 0 ? '' : `
        <div class="card dashboard-activity-card">
          <div class="card__header">
            <h2 class="card__title">
              <i data-lucide="activity" aria-hidden="true"></i> Recent Activity
            </h2>
          </div>
          <div class="card__body" style="padding:0 var(--space-6);">
            <div class="activity-timeline" id="activity-timeline-list">
              ${buildTimelineItems(recentLogs.slice(0, SHOW_DEFAULT))}
            </div>
            ${hasMore ? `
            <div class="activity-timeline-show-more">
              <button class="btn btn--outline btn--sm" id="activity-show-more-btn" data-expanded="false">
                <i data-lucide="chevron-down" aria-hidden="true"></i>
                Show ${recentLogs.length - SHOW_DEFAULT} more
              </button>
            </div>` : ''}
          </div>
        </div>`}

      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    _startClock();

    // Animate stat values
    document.querySelectorAll('.dashboard-stat-card__value[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      if (target === 0) return;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 30));
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(interval);
      }, 30);
    });

    // Animate horizontal bar fills
    requestAnimationFrame(() => {
      document.querySelectorAll('.dashboard-hbar__fill').forEach(el => {
        const w = el.style.width;
        el.style.width = '0%';
        requestAnimationFrame(() => { el.style.width = w; });
      });
      document.querySelectorAll('.dashboard-team-member__bar-fill').forEach(el => {
        const w = el.style.width;
        el.style.width = '0%';
        requestAnimationFrame(() => { el.style.width = w; });
      });
    });

    // Activity show more/less toggle
    if (hasMore) {
      const btn = document.getElementById('activity-show-more-btn');
      const list = document.getElementById('activity-timeline-list');
      if (btn && list) {
        btn.addEventListener('click', () => {
          const expanded = btn.dataset.expanded === 'true';
          if (!expanded) {
            list.innerHTML = buildTimelineItems(recentLogs);
            btn.innerHTML = '<i data-lucide="chevron-up" aria-hidden="true"></i> Show less';
            btn.classList.add('is-expanded');
            btn.dataset.expanded = 'true';
          } else {
            list.innerHTML = buildTimelineItems(recentLogs.slice(0, SHOW_DEFAULT));
            btn.innerHTML = `<i data-lucide="chevron-down" aria-hidden="true"></i> Show ${recentLogs.length - SHOW_DEFAULT} more`;
            btn.classList.remove('is-expanded');
            btn.dataset.expanded = 'false';
          }
          if (typeof lucide !== 'undefined') lucide.createIcons();
        });
      }
    }

  } catch (err) {
    debug('Dashboard render error:', err);
    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon" aria-hidden="true"></i>
          <p class="empty-state__title">Dashboard failed to load</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function statCard(icon, label, value, href, color, gradient, extraClass = '') {
  return `
    <a href="${href}" class="dashboard-stat-card card ${extraClass}" role="listitem" aria-label="${sanitize(label)}: ${value}">
      <div class="dashboard-stat-card__icon-wrap" style="background:${gradient || color + '1a'};">
        <i data-lucide="${icon}" aria-hidden="true" style="color:${color};"></i>
      </div>
      <div class="dashboard-stat-card__content">
        <p class="dashboard-stat-card__value" data-target="${value}">${value}</p>
        <p class="dashboard-stat-card__label">${sanitize(label)}</p>
      </div>
      <div class="dashboard-stat-card__arrow">
        <i data-lucide="chevron-right" aria-hidden="true"></i>
      </div>
    </a>`;
}

export default { render };
