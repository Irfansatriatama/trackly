/**
 * TRACKLY — dashboard.js
 * v1.6.3: Live clock, Activity Timeline redesign, Task Status & Priority Charts (pure SVG)
 */

import { getAll } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { sanitize, formatRelativeDate, formatDate, debug } from '../core/utils.js';
import { renderBadge } from '../components/badge.js';

// Module-level clock interval ID
let _clockInterval = null;

function getStatusVariant(status) {
  return {
    planning: 'info', active: 'success', maintenance: 'warning', on_hold: 'neutral',
    completed: 'success', cancelled: 'danger', todo: 'info', in_progress: 'warning',
    in_review: 'secondary', done: 'success', backlog: 'neutral', open: 'danger',
    resolved: 'success', closed: 'neutral'
  }[status] || 'neutral';
}

function getStatusLabel(status) {
  const labels = {
    planning: 'Planning', active: 'Active', maintenance: 'Maintenance',
    on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled', todo: 'To Do',
    in_progress: 'In Progress', in_review: 'In Review', done: 'Done', backlog: 'Backlog',
    open: 'Open', resolved: 'Resolved', closed: 'Closed'
  };
  return labels[status] || status;
}

/* ─── Improvement 1: Clock ──────────────────────────────────────────────────── */

function _stopClock() {
  if (_clockInterval !== null) {
    clearInterval(_clockInterval);
    _clockInterval = null;
  }
}

function _startClock() {
  const el = document.getElementById('dashboard-clock');
  if (!el) return;

  function _tick() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mmm = months[now.getMonth()];
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    el.querySelector('.dashboard-clock__text').textContent =
      `${dayName}, ${dd} ${mmm} ${yyyy}  •  ${hh}:${mm}:${ss}`;
  }

  _tick();
  _clockInterval = setInterval(_tick, 1000);
}

/* ─── Improvement 3: SVG Charts ─────────────────────────────────────────────── */

function _renderDonutChart(data, size = 120) {
  // data: [{label, value, color}]
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38;   // outer radius
  const r = size * 0.22;   // inner radius (donut hole)
  const stroke = R - r;
  const circumference = 2 * Math.PI * (R - stroke / 2);
  const cr = R - stroke / 2; // circle radius for stroke technique

  let segments = '';
  let offset = 0; // stroke-dashoffset starts at top (rotate -90deg)

  data.forEach(d => {
    if (d.value === 0) return;
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    segments += `<circle
      cx="${cx}" cy="${cy}" r="${cr}"
      fill="none"
      stroke="${d.color}"
      stroke-width="${stroke}"
      stroke-dasharray="${dash.toFixed(3)} ${gap.toFixed(3)}"
      stroke-dashoffset="${(-offset * circumference / (2 * Math.PI * cr) + circumference * 0.25).toFixed(3)}"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dasharray 0.4s;"
    />`;
    offset += pct * 2 * Math.PI * cr;
  });

  // Recalculate properly using standard dashoffset technique
  segments = '';
  let cumulativePct = 0;
  const strokeR = (R + r) / 2;
  const strokeW = R - r;
  const circ = 2 * Math.PI * strokeR;

  data.forEach(d => {
    if (d.value === 0) return;
    const pct = d.value / total;
    const dashLen = pct * circ;
    const gapLen = circ - dashLen;
    // offset = circumference * (1 - cumulativePct) to rotate starting point
    const dashOffset = circ * (1 - cumulativePct);
    segments += `<circle
      cx="${cx}" cy="${cy}" r="${strokeR.toFixed(2)}"
      fill="none"
      stroke="${d.color}"
      stroke-width="${strokeW}"
      stroke-dasharray="${dashLen.toFixed(3)} ${gapLen.toFixed(3)}"
      stroke-dashoffset="${dashOffset.toFixed(3)}"
      transform="rotate(-90 ${cx} ${cy})"
    />`;
    cumulativePct += pct;
  });

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    ${segments}
  </svg>`;
}

function _renderBarChart(data, width = 280, height = null) {
  // data: [{label, value, color}]
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const rowH = 36;
  const labelW = 70;
  const countW = 30;
  const barAreaW = width - labelW - countW - 16;
  const h = height || (data.length * rowH + 16);

  let rows = '';
  data.forEach((d, i) => {
    const y = i * rowH + 8;
    const barW = Math.max((d.value / maxVal) * barAreaW, d.value > 0 ? 4 : 0);
    const barY = y + (rowH - 18) / 2;
    rows += `
      <text x="${labelW - 6}" y="${y + rowH / 2 + 4}" text-anchor="end"
        font-size="11" fill="currentColor" font-family="inherit">${d.label}</text>
      <rect x="${labelW}" y="${barY}" width="${barW.toFixed(1)}" height="18"
        rx="4" fill="${d.color}" opacity="0.9"/>
      <text x="${labelW + barW + 6}" y="${y + rowH / 2 + 4}"
        font-size="11" fill="currentColor" font-family="inherit" font-weight="600">${d.value}</text>
    `;
  });

  return `<svg viewBox="0 0 ${width} ${h}" width="${width}" height="${h}"
    style="color:var(--color-text-muted);overflow:visible;" aria-hidden="true">
    ${rows}
  </svg>`;
}

/* ─── Main render ────────────────────────────────────────────────────────────── */

export async function render(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;

  // Stop any existing clock before re-render
  _stopClock();

  // Show skeleton while loading
  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <div class="skeleton" style="width:200px;height:32px;border-radius:var(--radius-sm);"></div>
          <div class="skeleton" style="width:320px;height:18px;border-radius:var(--radius-sm);margin-top:6px;"></div>
        </div>
      </div>
      <div class="dashboard-stats-grid">
        ${[1, 2, 3, 4].map(() => `<div class="skeleton" style="height:96px;border-radius:var(--radius-md);"></div>`).join('')}
      </div>
    </div>`;

  try {
    const session = getSession();
    const [projects, tasks, members, maintenance, sprints, activityLogs] = await Promise.all([
      getAll('projects').catch(() => []),
      getAll('tasks').catch(() => []),
      getAll('users').catch(() => []),
      getAll('maintenance').catch(() => []),
      getAll('sprints').catch(() => []),
      getAll('activity_log').catch(() => []),
    ]);

    const userId = session?.userId;

    // --- Stats ---
    const now = new Date();
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const myTasks = tasks.filter(t => Array.isArray(t.assignees) ? t.assignees.includes(userId) : t.assignees === userId);
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && !['done', 'cancelled'].includes(t.status));
    const openBugs = tasks.filter(t => t.type === 'bug' && !['done', 'cancelled'].includes(t.status));
    const openMaint = maintenance.filter(m => ['open', 'in_progress'].includes(m.status));

    const activeSprint = sprints.find(s => s.status === 'active');
    const myPendingTasks = myTasks.filter(t => !['done', 'cancelled'].includes(t.status)).slice(0, 8);
    const recentProjects = [...projects]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5);

    const currentUser = members.find(u => u.id === userId);
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const displayName = currentUser?.full_name?.split(' ')[0] || session?.username || 'there';

    // --- Improvement 3: Chart data ---
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
    const barSvg = _renderBarChart(barData);

    // --- Improvement 2: Activity Timeline ---
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

    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="dashboard-welcome">
          <div>
            <h1 class="page-header__title">${sanitize(greeting)}, ${sanitize(displayName)}</h1>
            <p id="dashboard-clock" class="dashboard-clock">
              <i data-lucide="clock" aria-hidden="true"></i>
              <span class="dashboard-clock__text"></span>
            </p>
          </div>
          <div class="page-header__actions">
            <a href="#/projects" class="btn btn--primary">
              <i data-lucide="folder-plus" aria-hidden="true"></i> New Project
            </a>
          </div>
        </div>

        <!-- Stats row -->
        <div class="dashboard-stats-grid" role="list" aria-label="Summary statistics">
          ${statCard('folder', 'Active Projects', activeProjects, '#/projects', 'var(--color-primary)', '')}
          ${statCard('alert-circle', 'Overdue Tasks', overdueTasks.length, '#/projects', 'var(--color-danger)', overdueTasks.length > 0 ? 'badge--danger' : '')}
          ${statCard('bug', 'Open Bugs', openBugs.length, '#/projects', 'var(--color-warning)', openBugs.length > 0 ? 'badge--warning' : '')}
          ${statCard('wrench', 'Open Maintenance', openMaint.length, '#/projects', 'var(--color-info)', '')}
        </div>

        <!-- Improvement 3: Charts row (between stats and main-grid) -->
        <div class="dashboard-charts-row">
          <!-- Chart 1: Task Status Donut -->
          <div class="card dashboard-chart-card">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="pie-chart" aria-hidden="true"></i> Task Status
              </h2>
            </div>
            <div class="card__body">
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
              ` : `<div class="dashboard-chart__empty">No tasks yet</div>`}
            </div>
          </div>

          <!-- Chart 2: Task Priority Bar -->
          <div class="card dashboard-chart-card">
            <div class="card__header">
              <h2 class="card__title">
                <i data-lucide="bar-chart-2" aria-hidden="true"></i> Active Tasks by Priority
              </h2>
            </div>
            <div class="card__body">
              ${activeTasks.length > 0 ? `
                <div class="dashboard-chart__bar-wrap">
                  ${barSvg}
                </div>
              ` : `<div class="dashboard-chart__empty">No active tasks</div>`}
            </div>
          </div>
        </div>

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
          return `<li class="dashboard-task-item">
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

        ${activeSprint ? `
        <div class="card" style="margin-top:var(--space-6);">
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

        <!-- Improvement 2: Activity Timeline -->
        ${recentLogs.length === 0 ? '' : `
        <div class="card" style="margin-top:var(--space-6);">
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

    // Start clock after render
    _startClock();

    // Bind show more/less toggle
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

function statCard(icon, label, value, href, color, badgeClass) {
  return `
    <a href="${href}" class="dashboard-stat-card card" role="listitem" aria-label="${sanitize(label)}: ${value}">
      <div class="dashboard-stat-card__icon" style="color:${color};background:${color}1a;">
        <i data-lucide="${icon}" aria-hidden="true"></i>
      </div>
      <div class="dashboard-stat-card__content">
        <p class="dashboard-stat-card__value">${value}</p>
        <p class="dashboard-stat-card__label">${sanitize(label)}</p>
      </div>
    </a>`;
}

export default { render };
