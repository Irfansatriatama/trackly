/**
 * TRACKLY — reports.js
 * Phase 15: Reports Module
 * Provides 5 report types for a project:
 *   1. Project Progress Report
 *   2. Team Workload Report (bar chart)
 *   3. Sprint Burndown Chart (line chart)
 *   4. Maintenance Summary Report
 *   5. Asset Inventory Report
 * All reports use Chart.js via CDN and support PDF export via window.print().
 * Access: PM/Admin only.
 */

import { getAll, getById } from '../core/db.js';
import { formatDate, sanitize, debug } from '../core/utils.js';
import { getSession } from '../core/auth.js';

// ─── Module State ─────────────────────────────────────────────────────────────

let _projectId    = null;
let _project      = null;
let _client       = null;
let _tasks        = [];
let _sprints      = [];
let _members      = [];
let _maintenance  = [];
let _assets       = [];
let _settings     = {};
let _activeReport = 'progress';
let _chartInstances = {};
let _dateFrom = '';
let _dateTo   = '';

// ─── Chart.js CDN Loader ──────────────────────────────────────────────────────

function ensureChartJs() {
  return new Promise((resolve) => {
    if (typeof Chart !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    script.onload = () => resolve();
    script.onerror = () => { debug('Chart.js failed to load'); resolve(); };
    document.head.appendChild(script);
  });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function render(params = {}) {
  _projectId = params.id;

  const session = getSession();
  if (!session) { window.location.hash = '#/login'; return; }

  if (!['admin', 'pm'].includes(session.role)) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="lock" class="empty-state__icon"></i>
          <p class="empty-state__title">Access Denied</p>
          <p class="empty-state__text">Only PM and Admin can access reports.</p>
          <a href="#/projects/${sanitize(_projectId || '')}" class="btn btn--primary">Back to Project</a>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (!_projectId) { window.location.hash = '#/projects'; return; }

  await ensureChartJs();

  try {
    await loadData();
    renderPage();
  } catch (err) {
    debug('Reports render error:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-triangle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to Load Reports</p>
          <p class="empty-state__text">${sanitize(err.message)}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadData() {
  const [project, allTasks, allSprints, members, allMaint, allAssets, allSettings, allClients] =
    await Promise.all([
      getById('projects', _projectId),
      getAll('tasks'),
      getAll('sprints'),
      getAll('users'),
      getAll('maintenance'),
      getAll('assets'),
      getAll('settings'),
      getAll('clients'),
    ]);

  _project     = project;
  _tasks       = allTasks.filter(t => t.project_id === _projectId);
  _sprints     = allSprints.filter(s => s.project_id === _projectId);
  _members     = members;
  _maintenance = allMaint.filter(m => m.project_id === _projectId);
  _assets      = allAssets.filter(a => a.project_id === _projectId);
  _settings    = Object.fromEntries(allSettings.map(s => [s.key, s.value]));

  if (_project && _project.client_id) {
    _client = allClients.find(c => c.id === _project.client_id) || null;
  }
}

// ─── Page Render ──────────────────────────────────────────────────────────────

function renderPage() {
  const main = document.getElementById('main-content');
  if (!main || !_project) return;

  const projName = sanitize(_project.name || 'Unknown Project');

  main.innerHTML = `
    <div class="page-container page-enter" id="reportsPageRoot">

      <div class="page-header no-print">
        <div class="page-header__info">
          <div class="page-header__breadcrumb">
            <a href="#/projects/${sanitize(_projectId)}" class="breadcrumb-link">
              <i data-lucide="folder" style="width:14px;height:14px;"></i>
              ${projName}
            </a>
            <span class="breadcrumb-sep">/</span>
            <span>Reports</span>
          </div>
          <h1 class="page-header__title">Reports</h1>
          <p class="page-header__subtitle">Analytics and insights for ${projName}</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--outline" onclick="window.print()">
            <i data-lucide="printer"></i>
            Export PDF
          </button>
        </div>
      </div>

      <div class="rpt-tabs no-print" id="rptTabs">
        <button class="rpt-tab is-active" data-report="progress">
          <i data-lucide="bar-chart-2"></i> Project Progress
        </button>
        <button class="rpt-tab" data-report="workload">
          <i data-lucide="users"></i> Team Workload
        </button>
        <button class="rpt-tab" data-report="burndown">
          <i data-lucide="trending-down"></i> Sprint Burndown
        </button>
        <button class="rpt-tab" data-report="maintenance">
          <i data-lucide="wrench"></i> Maintenance Summary
        </button>
        <button class="rpt-tab" data-report="assets">
          <i data-lucide="package"></i> Asset Inventory
        </button>
      </div>

      <div class="rpt-filter-bar no-print" id="rptFilterBar">
        <div class="rpt-filter-group">
          <label class="rpt-filter-label">From</label>
          <input type="date" class="form-input form-input--sm" id="rptDateFrom" value="${_dateFrom}" />
        </div>
        <div class="rpt-filter-group">
          <label class="rpt-filter-label">To</label>
          <input type="date" class="form-input form-input--sm" id="rptDateTo" value="${_dateTo}" />
        </div>
        <button class="btn btn--primary btn--sm" id="btnApplyFilter">
          <i data-lucide="filter"></i> Apply
        </button>
        <button class="btn btn--ghost btn--sm" id="btnClearFilter">
          <i data-lucide="x"></i> Clear
        </button>
      </div>

      <div id="rptContent"></div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.querySelectorAll('.rpt-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rpt-tab').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      _activeReport = btn.dataset.report;
      destroyCharts();
      renderActiveReport();
    });
  });

  document.getElementById('btnApplyFilter').addEventListener('click', () => {
    _dateFrom = document.getElementById('rptDateFrom').value;
    _dateTo   = document.getElementById('rptDateTo').value;
    destroyCharts();
    renderActiveReport();
  });

  document.getElementById('btnClearFilter').addEventListener('click', () => {
    _dateFrom = '';
    _dateTo   = '';
    document.getElementById('rptDateFrom').value = '';
    document.getElementById('rptDateTo').value   = '';
    destroyCharts();
    renderActiveReport();
  });

  renderActiveReport();
}

function destroyCharts() {
  Object.values(_chartInstances).forEach(c => { try { c.destroy(); } catch(_) {} });
  _chartInstances = {};
}

function renderActiveReport() {
  switch (_activeReport) {
    case 'progress':    renderProgressReport();    break;
    case 'workload':    renderWorkloadReport();    break;
    case 'burndown':    renderBurndownReport();    break;
    case 'maintenance': renderMaintenanceReport(); break;
    case 'assets':      renderAssetsReport();      break;
  }
}

function inDateRange(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (_dateFrom && d < new Date(_dateFrom)) return false;
  if (_dateTo   && d > new Date(_dateTo + 'T23:59:59')) return false;
  return true;
}

function statCard(num, label, colorClass) {
  colorClass = colorClass || '';
  return `
    <div class="rpt-stat-card ${colorClass}">
      <span class="rpt-stat-card__num">${num}</span>
      <span class="rpt-stat-card__label">${label}</span>
    </div>`;
}

// ─── 1. Project Progress ──────────────────────────────────────────────────────

function renderProgressReport() {
  const el = document.getElementById('rptContent');
  const tasks = _tasks.filter(t => inDateRange(t.created_at));

  const byStatus = {
    backlog:     tasks.filter(t => t.status === 'backlog').length,
    todo:        tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review:   tasks.filter(t => t.status === 'in_review').length,
    done:        tasks.filter(t => t.status === 'done').length,
    cancelled:   tasks.filter(t => t.status === 'cancelled').length,
  };
  const byPriority = {
    critical: tasks.filter(t => t.priority === 'critical').length,
    high:     tasks.filter(t => t.priority === 'high').length,
    medium:   tasks.filter(t => t.priority === 'medium').length,
    low:      tasks.filter(t => t.priority === 'low').length,
  };
  const byType = {
    story:       tasks.filter(t => t.type === 'story').length,
    task:        tasks.filter(t => t.type === 'task').length,
    bug:         tasks.filter(t => t.type === 'bug').length,
    enhancement: tasks.filter(t => t.type === 'enhancement').length,
    epic:        tasks.filter(t => t.type === 'epic').length,
  };

  const total   = tasks.length;
  const done    = byStatus.done;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'cancelled').length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalSP = tasks.reduce((s, t) => s + (t.story_points || 0), 0);
  const doneSP  = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points || 0), 0);
  const timeMin = tasks.reduce((s, t) => s + (t.time_logged || 0), 0);

  el.innerHTML = `
    ${buildPrintHeader('Project Progress Report')}

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="bar-chart-2"></i> Project Summary</h2>
      <div class="rpt-stat-grid rpt-stat-grid--5">
        ${statCard(total, 'Total Tasks')}
        ${statCard(done, 'Completed', 'rpt-stat-card--success')}
        ${statCard(byStatus.in_progress, 'In Progress', 'rpt-stat-card--warning')}
        ${statCard(overdue, 'Overdue', overdue > 0 ? 'rpt-stat-card--danger' : '')}
        ${statCard(pct + '%', 'Completion', 'rpt-stat-card--info')}
      </div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="percent"></i> Overall Progress</h2>
      <div class="card card--report">
        <div class="card__body">
          <div class="rpt-progress-meta">
            <span>${done} of ${total} tasks completed</span>
            <span class="rpt-progress-pct">${pct}%</span>
          </div>
          <div class="rpt-progress-track">
            <div class="rpt-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="rpt-progress-row">
            <span>Story Points: ${doneSP} / ${totalSP} completed</span>
            <span>Time Logged: ${Math.floor(timeMin / 60)}h ${timeMin % 60}m</span>
          </div>
        </div>
      </div>
    </div>

    <div class="rpt-charts-row">
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">Tasks by Status</h3>
          <div class="rpt-chart-wrap"><canvas id="chartStatus"></canvas></div>
        </div>
      </div>
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">Tasks by Priority</h3>
          <div class="rpt-chart-wrap"><canvas id="chartPriority"></canvas></div>
        </div>
      </div>
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">Tasks by Type</h3>
          <div class="rpt-chart-wrap"><canvas id="chartType"></canvas></div>
        </div>
      </div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="zap"></i> Sprint Overview <span class="rpt-section__badge">${_sprints.length}</span></h2>
      <div class="card card--report"><div class="card__body" style="padding:0">${renderSprintTable()}</div></div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="list"></i> Task List <span class="rpt-section__badge">${tasks.length}</span></h2>
      <div class="card card--report"><div class="card__body" style="padding:0">${renderTaskTable(tasks)}</div></div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (typeof Chart !== 'undefined') {
    _chartInstances['status'] = new Chart(document.getElementById('chartStatus'), {
      type: 'doughnut',
      data: {
        labels: ['Backlog','To Do','In Progress','In Review','Done','Cancelled'],
        datasets: [{ data: Object.values(byStatus), backgroundColor: ['#94A3B8','#3B82F6','#F59E0B','#8B5CF6','#22C55E','#EF4444'], borderWidth: 0 }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }, cutout: '62%', maintainAspectRatio: true }
    });

    _chartInstances['priority'] = new Chart(document.getElementById('chartPriority'), {
      type: 'bar',
      data: {
        labels: ['Critical','High','Medium','Low'],
        datasets: [{ label: 'Tasks', data: Object.values(byPriority), backgroundColor: ['#EF4444','#F97316','#F59E0B','#22C55E'], borderRadius: 6, borderWidth: 0 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: true }
    });

    _chartInstances['type'] = new Chart(document.getElementById('chartType'), {
      type: 'bar',
      data: {
        labels: ['Story','Task','Bug','Enhancement','Epic'],
        datasets: [{ label: 'Tasks', data: Object.values(byType), backgroundColor: '#2563EB', borderRadius: 6, borderWidth: 0 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, indexAxis: 'y', maintainAspectRatio: true }
    });
  }
}

function renderSprintTable() {
  if (_sprints.length === 0) return '<p class="rpt-empty-text">No sprints created.</p>';
  const rows = _sprints.map(sp => {
    const spTasks  = _tasks.filter(t => t.sprint_id === sp.id);
    const spDone   = spTasks.filter(t => t.status === 'done').length;
    const spSP     = spTasks.reduce((s, t) => s + (t.story_points || 0), 0);
    const spDoneSP = spTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points || 0), 0);
    const sc = { planning: 'badge--warning', active: 'badge--success', completed: 'badge--info' }[sp.status] || '';
    return `<tr>
      <td>${sanitize(sp.name)}</td>
      <td><span class="badge ${sc}">${sanitize(sp.status || '')}</span></td>
      <td>${formatDate(sp.start_date)}</td>
      <td>${formatDate(sp.end_date)}</td>
      <td>${spDone} / ${spTasks.length}</td>
      <td>${spDoneSP} / ${spSP} pts</td>
    </tr>`;
  }).join('');
  return `<table class="rpt-table">
    <thead><tr><th>Sprint</th><th>Status</th><th>Start</th><th>End</th><th>Tasks Done</th><th>Story Points</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderTaskTable(tasks) {
  if (tasks.length === 0) return '<p class="rpt-empty-text">No tasks found for the selected period.</p>';
  const rows = tasks.map(t => {
    const assignees = (t.assignees || []).map(id => {
      const m = _members.find(u => u.id === id);
      return m ? sanitize(m.full_name) : sanitize(id);
    }).join(', ');
    const sprint = _sprints.find(s => s.id === t.sprint_id);
    const sc = { done: 'badge--success', in_progress: 'badge--warning', cancelled: 'badge--danger', todo: 'badge--info', in_review: 'badge--secondary', backlog: '' }[t.status] || '';
    const pc = { critical: 'badge--danger', high: 'badge--warning', medium: 'badge--info', low: '' }[t.priority] || '';
    return `<tr>
      <td class="text-mono rpt-id-cell">${sanitize(t.id)}</td>
      <td class="rpt-title-cell">${sanitize(t.title)}</td>
      <td><span class="badge ${sc}">${sanitize(t.status || '')}</span></td>
      <td><span class="badge ${pc}">${sanitize(t.priority || '')}</span></td>
      <td>${sanitize(assignees || '—')}</td>
      <td>${sprint ? sanitize(sprint.name) : '—'}</td>
      <td>${formatDate(t.due_date)}</td>
    </tr>`;
  }).join('');
  return `<table class="rpt-table">
    <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Priority</th><th>Assignee(s)</th><th>Sprint</th><th>Due</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── 2. Team Workload ─────────────────────────────────────────────────────────

function renderWorkloadReport() {
  const el = document.getElementById('rptContent');
  const tasks = _tasks.filter(t => inDateRange(t.created_at));

  const memberIds = new Set();
  tasks.forEach(t => (t.assignees || []).forEach(id => memberIds.add(id)));
  if (_project && Array.isArray(_project.members)) {
    _project.members.forEach(m => memberIds.add(typeof m === 'object' ? m.user_id : m));
  }

  const stats = [...memberIds].map(id => {
    const member = _members.find(m => m.id === id);
    if (!member) return null;
    const assigned = tasks.filter(t => (t.assignees || []).includes(id));
    return {
      member,
      assigned: assigned.length,
      done:    assigned.filter(t => t.status === 'done').length,
      inProg:  assigned.filter(t => t.status === 'in_progress').length,
      todo:    assigned.filter(t => t.status === 'todo').length,
      overdue: assigned.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'cancelled').length,
      hours:   assigned.reduce((s, t) => s + (t.time_logged || 0), 0),
      sp:      assigned.reduce((s, t) => s + (t.story_points || 0), 0),
    };
  }).filter(Boolean).sort((a, b) => b.assigned - a.assigned);

  el.innerHTML = `
    ${buildPrintHeader('Team Workload Report')}

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="users"></i> Workload Overview</h2>
      <div class="rpt-stat-grid">
        ${statCard(stats.length, 'Team Members')}
        ${statCard(tasks.length, 'Total Tasks')}
        ${statCard(stats.length > 0 ? (Math.round(tasks.length / stats.length * 10) / 10) : 0, 'Avg Tasks / Member')}
        ${statCard(stats.reduce((s, m) => s + m.hours, 0) + 'm', 'Total Time Logged')}
      </div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="bar-chart-horizontal"></i> Tasks per Member</h2>
      <div class="card card--report">
        <div class="card__body">
          <div class="rpt-chart-wrap rpt-chart-wrap--tall"><canvas id="chartWorkload"></canvas></div>
        </div>
      </div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="list"></i> Member Details <span class="rpt-section__badge">${stats.length}</span></h2>
      <div class="card card--report">
        <div class="card__body" style="padding:0">
          ${stats.length === 0
            ? '<p class="rpt-empty-text">No team members or assignments found.</p>'
            : `<table class="rpt-table">
              <thead><tr><th>Member</th><th>Role</th><th>Assigned</th><th>Done</th><th>In Progress</th><th>Overdue</th><th>Story Pts</th><th>Time Logged</th></tr></thead>
              <tbody>${stats.map(s => `<tr>
                <td>${sanitize(s.member.full_name)}</td>
                <td><span class="badge">${sanitize(s.member.role)}</span></td>
                <td>${s.assigned}</td>
                <td><span class="rpt-num rpt-num--success">${s.done}</span></td>
                <td><span class="rpt-num rpt-num--warning">${s.inProg}</span></td>
                <td><span class="rpt-num ${s.overdue > 0 ? 'rpt-num--danger' : ''}">${s.overdue}</span></td>
                <td>${s.sp}</td>
                <td>${Math.floor(s.hours / 60)}h ${s.hours % 60}m</td>
              </tr>`).join('')}</tbody>
            </table>`}
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (typeof Chart !== 'undefined' && stats.length > 0) {
    _chartInstances['workload'] = new Chart(document.getElementById('chartWorkload'), {
      type: 'bar',
      data: {
        labels: stats.map(s => s.member.full_name),
        datasets: [
          { label: 'Done',        data: stats.map(s => s.done),   backgroundColor: '#22C55E', borderRadius: 4, borderWidth: 0 },
          { label: 'In Progress', data: stats.map(s => s.inProg), backgroundColor: '#F59E0B', borderRadius: 4, borderWidth: 0 },
          { label: 'To Do',       data: stats.map(s => s.todo),   backgroundColor: '#3B82F6', borderRadius: 4, borderWidth: 0 },
        ]
      },
      options: {
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } },
        maintainAspectRatio: false, responsive: true,
      }
    });
  }
}

// ─── 3. Sprint Burndown ───────────────────────────────────────────────────────

function renderBurndownReport() {
  const el = document.getElementById('rptContent');
  const activeSprints = _sprints.filter(s => s.status === 'active' || s.status === 'completed');
  const defaultId = activeSprints.length > 0 ? activeSprints[activeSprints.length - 1].id : (_sprints[0] ? _sprints[0].id : '');

  el.innerHTML = `
    ${buildPrintHeader('Sprint Burndown Report')}
    <div class="rpt-section no-print">
      <label class="rpt-filter-label">Select Sprint</label>
      <select class="form-input form-input--sm" id="burndownSprintSel" style="max-width:320px;margin-top:6px">
        <option value="">— Select a sprint —</option>
        ${_sprints.map(s => `<option value="${sanitize(s.id)}" ${s.id === defaultId ? 'selected' : ''}>${sanitize(s.name)} (${sanitize(s.status)})</option>`).join('')}
      </select>
    </div>
    <div id="burndownContent"></div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('burndownSprintSel').addEventListener('change', (e) => {
    if (_chartInstances['burndown']) { try { _chartInstances['burndown'].destroy(); } catch(_) {} delete _chartInstances['burndown']; }
    renderBurndownForSprint(e.target.value);
  });

  if (defaultId) renderBurndownForSprint(defaultId);
  else document.getElementById('burndownContent').innerHTML = '<p class="rpt-empty-text">No sprints found. Create sprints first.</p>';
}

function renderBurndownForSprint(sprintId) {
  const content = document.getElementById('burndownContent');
  if (!sprintId) { content.innerHTML = '<p class="rpt-empty-text">Select a sprint above to view its burndown chart.</p>'; return; }

  const sprint  = _sprints.find(s => s.id === sprintId);
  const spTasks = _tasks.filter(t => t.sprint_id === sprintId);
  const totalSP = spTasks.reduce((s, t) => s + (t.story_points || 0), 0);

  if (!sprint || !sprint.start_date || !sprint.end_date) {
    content.innerHTML = '<p class="rpt-empty-text">Sprint is missing start or end date.</p>';
    return;
  }

  const start = new Date(sprint.start_date);
  const end   = new Date(sprint.end_date);
  const days  = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  const idealData = days.map((d, i) => {
    const frac = days.length > 1 ? i / (days.length - 1) : 1;
    return Math.round(totalSP * (1 - frac));
  });

  const actualData = days.map(day => {
    const completedSP = spTasks
      .filter(t => t.status === 'done' && t.completed_at && new Date(t.completed_at) <= day)
      .reduce((s, t) => s + (t.story_points || 0), 0);
    return totalSP - completedSP;
  });

  const doneSP   = spTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.story_points || 0), 0);
  const doneTasks = spTasks.filter(t => t.status === 'done').length;

  content.innerHTML = `
    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="zap"></i> ${sanitize(sprint.name)}</h2>
      <div class="rpt-stat-grid">
        ${statCard(spTasks.length, 'Total Tasks')}
        ${statCard(doneTasks, 'Completed', 'rpt-stat-card--success')}
        ${statCard(totalSP, 'Total Story Points')}
        ${statCard(totalSP - doneSP, 'Points Remaining', (totalSP - doneSP) > 0 ? 'rpt-stat-card--warning' : 'rpt-stat-card--success')}
      </div>
    </div>
    <div class="rpt-section">
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">Burndown — ${sanitize(sprint.name)}</h3>
          <p style="font-size:12px;color:var(--color-text-muted);margin:0 0 12px 0">
            ${formatDate(sprint.start_date)} &rarr; ${formatDate(sprint.end_date)}
          </p>
          <div class="rpt-chart-wrap rpt-chart-wrap--tall"><canvas id="chartBurndown"></canvas></div>
          <div class="rpt-chart-legend">
            <span class="rpt-legend-dot" style="background:#EF4444"></span> Ideal
            <span class="rpt-legend-dot" style="background:#2563EB;margin-left:16px"></span> Actual
          </div>
        </div>
      </div>
    </div>
    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="list"></i> Sprint Tasks</h2>
      <div class="card card--report"><div class="card__body" style="padding:0">${renderTaskTable(spTasks)}</div></div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (typeof Chart !== 'undefined') {
    _chartInstances['burndown'] = new Chart(document.getElementById('chartBurndown'), {
      type: 'line',
      data: {
        labels: days.map(d => `${d.getMonth() + 1}/${d.getDate()}`),
        datasets: [
          { label: 'Ideal',  data: idealData,  borderColor: '#EF4444', borderDash: [6,4], borderWidth: 2, pointRadius: 0, tension: 0, fill: false },
          { label: 'Actual', data: actualData, borderColor: '#2563EB', borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#2563EB', tension: 0.2,
            fill: { target: 'origin', above: 'rgba(37,99,235,0.06)' } },
        ]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Story Points Remaining' } },
          x: { title: { display: true, text: 'Date' } }
        },
        maintainAspectRatio: false, responsive: true,
      }
    });
  }
}

// ─── 4. Maintenance Summary ───────────────────────────────────────────────────

function renderMaintenanceReport() {
  const el = document.getElementById('rptContent');
  const tickets = _maintenance.filter(t => inDateRange(t.reported_date || t.created_at));

  const total    = tickets.length;
  const resolved = tickets.filter(t => ['resolved','closed'].includes(t.status)).length;
  const open     = tickets.filter(t => t.status === 'open').length;

  const byType   = {};
  const byStatus = {};
  tickets.forEach(t => {
    byType[t.type || 'other']     = (byType[t.type || 'other'] || 0) + 1;
    byStatus[t.status || 'open']  = (byStatus[t.status || 'open'] || 0) + 1;
  });

  el.innerHTML = `
    ${buildPrintHeader('Maintenance Summary Report')}

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="wrench"></i> Maintenance Overview</h2>
      <div class="rpt-stat-grid">
        ${statCard(total, 'Total Tickets')}
        ${statCard(open, 'Open', open > 0 ? 'rpt-stat-card--danger' : '')}
        ${statCard(resolved, 'Resolved', 'rpt-stat-card--success')}
        ${statCard(total > 0 ? Math.round((resolved / total) * 100) + '%' : '0%', 'Resolution Rate', 'rpt-stat-card--info')}
      </div>
    </div>

    <div class="rpt-charts-row rpt-charts-row--2">
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">By Type</h3>
          <div class="rpt-chart-wrap"><canvas id="chartMntType"></canvas></div>
        </div>
      </div>
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">By Status</h3>
          <div class="rpt-chart-wrap"><canvas id="chartMntStatus"></canvas></div>
        </div>
      </div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="list"></i> Ticket List <span class="rpt-section__badge">${tickets.length}</span></h2>
      <div class="card card--report"><div class="card__body" style="padding:0">${renderMaintenanceTable(tickets)}</div></div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (typeof Chart !== 'undefined') {
    const typeColors   = { bug: '#EF4444', adjustment: '#F59E0B', enhancement: '#8B5CF6', user_request: '#3B82F6', incident: '#F97316', other: '#94A3B8' };
    const statusColors = { open: '#EF4444', in_progress: '#F59E0B', resolved: '#22C55E', closed: '#64748B', rejected: '#DC2626' };

    if (document.getElementById('chartMntType') && Object.keys(byType).length > 0) {
      _chartInstances['mntType'] = new Chart(document.getElementById('chartMntType'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(byType).map(k => k.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())),
          datasets: [{ data: Object.values(byType), backgroundColor: Object.keys(byType).map(k => typeColors[k] || '#94A3B8'), borderWidth: 0 }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }, cutout: '60%', maintainAspectRatio: true }
      });
    }

    if (document.getElementById('chartMntStatus') && Object.keys(byStatus).length > 0) {
      _chartInstances['mntStatus'] = new Chart(document.getElementById('chartMntStatus'), {
        type: 'bar',
        data: {
          labels: Object.keys(byStatus).map(k => k.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())),
          datasets: [{ label: 'Tickets', data: Object.values(byStatus), backgroundColor: Object.keys(byStatus).map(k => statusColors[k] || '#94A3B8'), borderRadius: 6, borderWidth: 0 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: true }
      });
    }
  }
}

function renderMaintenanceTable(tickets) {
  if (tickets.length === 0) return '<p class="rpt-empty-text">No maintenance tickets found for the selected period.</p>';
  const rows = tickets.map(t => {
    const assignee = t.assigned_to ? ((_members.find(m => m.id === t.assigned_to) || {}).full_name || t.assigned_to) : '—';
    const sc = { open: 'badge--danger', in_progress: 'badge--warning', resolved: 'badge--success', closed: 'badge--info', rejected: '' }[t.status] || '';
    const pc = { critical: 'badge--danger', high: 'badge--warning', medium: 'badge--info', low: '' }[t.priority] || '';
    return `<tr>
      <td class="text-mono rpt-id-cell">${sanitize(t.id)}</td>
      <td class="rpt-title-cell">${sanitize(t.title)}</td>
      <td>${sanitize((t.type || '').replace('_',' '))}</td>
      <td><span class="badge ${sc}">${sanitize(t.status || '')}</span></td>
      <td><span class="badge ${pc}">${sanitize(t.priority || '')}</span></td>
      <td>${sanitize(String(assignee))}</td>
      <td>${formatDate(t.reported_date)}</td>
      <td>${formatDate(t.resolved_date)}</td>
      <td>${t.actual_hours || 0}h</td>
    </tr>`;
  }).join('');
  return `<table class="rpt-table">
    <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Reported</th><th>Resolved</th><th>Hours</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── 5. Asset Inventory ───────────────────────────────────────────────────────

function renderAssetsReport() {
  const el = document.getElementById('rptContent');
  const assets = _assets;

  const total     = assets.length;
  const inUse     = assets.filter(a => a.status === 'in_use').length;
  const available = assets.filter(a => a.status === 'available').length;
  const maint     = assets.filter(a => a.status === 'maintenance').length;
  const now       = Date.now();
  const expiring  = assets.filter(a => a.warranty_expiry && new Date(a.warranty_expiry) > new Date() && new Date(a.warranty_expiry) < new Date(now + 30 * 864e5)).length;

  const byCategory = {};
  const byStatus   = {};
  assets.forEach(a => {
    byCategory[a.category || 'other'] = (byCategory[a.category || 'other'] || 0) + 1;
    byStatus[a.status || 'available'] = (byStatus[a.status || 'available'] || 0) + 1;
  });

  el.innerHTML = `
    ${buildPrintHeader('Asset Inventory Report')}

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="package"></i> Asset Overview</h2>
      <div class="rpt-stat-grid rpt-stat-grid--5">
        ${statCard(total, 'Total Assets')}
        ${statCard(inUse, 'In Use', 'rpt-stat-card--warning')}
        ${statCard(available, 'Available', 'rpt-stat-card--success')}
        ${statCard(maint, 'In Maintenance', 'rpt-stat-card--info')}
        ${statCard(expiring, 'Expiring Soon', expiring > 0 ? 'rpt-stat-card--danger' : '')}
      </div>
    </div>

    <div class="rpt-charts-row rpt-charts-row--2">
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">By Category</h3>
          <div class="rpt-chart-wrap"><canvas id="chartAssetCat"></canvas></div>
        </div>
      </div>
      <div class="card card--report">
        <div class="card__body">
          <h3 class="rpt-chart-title">By Status</h3>
          <div class="rpt-chart-wrap"><canvas id="chartAssetStatus"></canvas></div>
        </div>
      </div>
    </div>

    <div class="rpt-section">
      <h2 class="rpt-section__title"><i data-lucide="list"></i> Asset List <span class="rpt-section__badge">${assets.length}</span></h2>
      <div class="card card--report"><div class="card__body" style="padding:0">${renderAssetsTable(assets)}</div></div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();

  if (typeof Chart !== 'undefined') {
    const catColors    = { hardware: '#2563EB', software: '#7C3AED', license: '#F59E0B', document: '#22C55E', other: '#94A3B8' };
    const statusColors = { available: '#22C55E', in_use: '#F59E0B', maintenance: '#3B82F6', retired: '#94A3B8' };

    if (document.getElementById('chartAssetCat') && Object.keys(byCategory).length > 0) {
      _chartInstances['assetCat'] = new Chart(document.getElementById('chartAssetCat'), {
        type: 'pie',
        data: {
          labels: Object.keys(byCategory).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
          datasets: [{ data: Object.values(byCategory), backgroundColor: Object.keys(byCategory).map(k => catColors[k] || '#94A3B8'), borderWidth: 0 }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }, maintainAspectRatio: true }
      });
    }

    if (document.getElementById('chartAssetStatus') && Object.keys(byStatus).length > 0) {
      _chartInstances['assetStatus'] = new Chart(document.getElementById('chartAssetStatus'), {
        type: 'bar',
        data: {
          labels: Object.keys(byStatus).map(k => k.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())),
          datasets: [{ label: 'Assets', data: Object.values(byStatus), backgroundColor: Object.keys(byStatus).map(k => statusColors[k] || '#94A3B8'), borderRadius: 6, borderWidth: 0 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: true }
      });
    }
  }
}

function renderAssetsTable(assets) {
  if (assets.length === 0) return '<p class="rpt-empty-text">No assets linked to this project.</p>';
  const now = Date.now();
  const rows = assets.map(a => {
    const assignedTo = a.assigned_to ? ((_members.find(m => m.id === a.assigned_to) || {}).full_name || a.assigned_to) : '—';
    const sc = { available: 'badge--success', in_use: 'badge--warning', maintenance: 'badge--info', retired: '' }[a.status] || '';
    const expiry = a.warranty_expiry ? new Date(a.warranty_expiry) : null;
    const isExpiringSoon = expiry && expiry > new Date() && expiry < new Date(now + 30 * 864e5);
    const isExpired = expiry && expiry <= new Date();
    const wc = isExpiringSoon ? 'rpt-warn-text' : (isExpired ? 'rpt-danger-text' : '');
    return `<tr>
      <td class="text-mono rpt-id-cell">${sanitize(a.id)}</td>
      <td class="rpt-title-cell">${sanitize(a.name)}</td>
      <td>${sanitize(a.category || '—')}</td>
      <td><span class="badge ${sc}">${sanitize(a.status || '')}</span></td>
      <td>${sanitize(String(assignedTo))}</td>
      <td>${formatDate(a.purchase_date)}</td>
      <td class="${wc}">${formatDate(a.warranty_expiry)}${isExpiringSoon ? ' !' : ''}</td>
      <td>${a.purchase_price ? '$' + Number(a.purchase_price).toLocaleString() : '—'}</td>
    </tr>`;
  }).join('');
  return `<table class="rpt-table">
    <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Status</th><th>Assigned To</th><th>Purchased</th><th>Warranty</th><th>Value</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── Print Header ─────────────────────────────────────────────────────────────

function buildPrintHeader(reportTitle) {
  const orgName    = _settings['org_name'] || 'TRACKLY';
  const projName   = _project ? (_project.name || '') : '';
  const clientName = _client  ? (_client.company_name || '') : '';
  const today      = formatDate(new Date().toISOString());
  const fromLabel  = _dateFrom ? formatDate(_dateFrom) : 'All time';
  const toLabel    = _dateTo   ? formatDate(_dateTo)   : 'Present';

  return `
    <div class="rpt-print-header print-only">
      <div class="rpt-print-header__top">
        <div>
          <div class="rpt-print-header__org">${sanitize(orgName)}</div>
          <div class="rpt-print-header__title">${sanitize(reportTitle)}</div>
        </div>
        <div class="rpt-print-header__meta">
          <div><strong>Project:</strong> ${sanitize(projName)}</div>
          ${clientName ? `<div><strong>Client:</strong> ${sanitize(clientName)}</div>` : ''}
          <div><strong>Period:</strong> ${sanitize(fromLabel)} &mdash; ${sanitize(toLabel)}</div>
          <div><strong>Generated:</strong> ${sanitize(today)}</div>
        </div>
      </div>
      <hr class="rpt-print-header__divider" />
    </div>
  `;
}

export default { render };
