/**
 * TRACKLY — dashboard.js
 * Phase 16: Full Dashboard — Live stats, My Tasks, Recent Activity.
 */

import { getAll } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { sanitize, formatRelativeDate, formatDate, debug } from '../core/utils.js';
import { renderBadge } from '../components/badge.js';

function getStatusVariant(status) {
  return { planning:'info', active:'success', maintenance:'warning', on_hold:'neutral',
    completed:'success', cancelled:'danger', todo:'info', in_progress:'warning',
    in_review:'secondary', done:'success', backlog:'neutral', open:'danger',
    resolved:'success', closed:'neutral' }[status] || 'neutral';
}

function getStatusLabel(status) {
  const labels = { planning:'Planning', active:'Active', maintenance:'Maintenance',
    on_hold:'On Hold', completed:'Completed', cancelled:'Cancelled', todo:'To Do',
    in_progress:'In Progress', in_review:'In Review', done:'Done', backlog:'Backlog',
    open:'Open', resolved:'Resolved', closed:'Closed' };
  return labels[status] || status;
}

export async function render(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;

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
        ${[1,2,3,4].map(()=>`<div class="skeleton" style="height:96px;border-radius:var(--radius-md);"></div>`).join('')}
      </div>
    </div>`;

  try {
    const session = getSession();
    const [projects, tasks, members, maintenance, sprints] = await Promise.all([
      getAll('projects').catch(()=>[]),
      getAll('tasks').catch(()=>[]),
      getAll('users').catch(()=>[]),
      getAll('maintenance').catch(()=>[]),
      getAll('sprints').catch(()=>[]),
    ]);

    const userId = session?.userId;
    const userRole = session?.role || 'viewer';

    // --- Stats ---
    const now = new Date();
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const myTasks = tasks.filter(t => Array.isArray(t.assignees) ? t.assignees.includes(userId) : t.assignees === userId);
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && !['done','cancelled'].includes(t.status));
    const openBugs = tasks.filter(t => t.type === 'bug' && !['done','cancelled'].includes(t.status));
    const openMaint = maintenance.filter(m => ['open','in_progress'].includes(m.status));

    // Active sprint
    const activeSprint = sprints.find(s => s.status === 'active');

    // My tasks (not done)
    const myPendingTasks = myTasks.filter(t => !['done','cancelled'].includes(t.status)).slice(0, 8);

    // Recent projects
    const recentProjects = [...projects]
      .sort((a,b) => new Date(b.updated_at||b.created_at) - new Date(a.updated_at||a.created_at))
      .slice(0, 5);

    // Build greeting
    const currentUser = members.find(u => u.id === userId);
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const displayName = currentUser?.full_name?.split(' ')[0] || session?.username || 'there';

    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="dashboard-welcome">
          <div>
            <h1 class="page-header__title">${sanitize(greeting)}, ${sanitize(displayName)}</h1>
            <p class="page-header__subtitle">${formatDate(now.toISOString(), 'DD MMM YYYY')} — Here is your project overview</p>
          </div>
          <div class="page-header__actions">
            <a href="#/projects" class="btn btn--primary">
              <i data-lucide="folder-plus" aria-hidden="true"></i> New Project
            </a>
          </div>
        </div>

        <!-- Stats row -->
        <div class="dashboard-stats-grid" role="list" aria-label="Summary statistics">
          ${statCard('folder','Active Projects', activeProjects, '#/projects', 'var(--color-primary)', '')}
          ${statCard('alert-circle','Overdue Tasks', overdueTasks.length, '#/projects', 'var(--color-danger)', overdueTasks.length > 0 ? 'badge--danger' : '')}
          ${statCard('bug','Open Bugs', openBugs.length, '#/projects', 'var(--color-warning)', openBugs.length > 0 ? 'badge--warning' : '')}
          ${statCard('wrench','Open Maintenance', openMaint.length, '#/projects', 'var(--color-info)', '')}
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
                      const pct = total > 0 ? Math.round((done/total)*100) : 0;
                      return `<li class="dashboard-project-item">
                        <a href="#/projects/${sanitize(proj.id)}" class="dashboard-project-item__link" aria-label="Open project ${sanitize(proj.name)}">
                          <div class="dashboard-project-item__cover" style="background:${sanitize(proj.cover_color||'var(--color-primary)')};"></div>
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

      </div>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
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
