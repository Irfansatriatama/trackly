/**
 * TRACKLY — gantt.js
 * Phase 11: Gantt Chart
 * Pure DOM + Canvas rendering — no external chart library.
 */

import { getAll, getById, update } from '../core/db.js';
import { formatDate, nowISO, sanitize, debug, buildProjectBanner } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { renderBadge } from '../components/badge.js';
import { getSession } from '../core/auth.js';

// ─── Module State ─────────────────────────────────────────────────────────────
let _projectId  = null;
let _project    = null;
let _tasks      = [];
let _sprints    = [];
let _members    = [];
let _zoom       = 'week';   // 'day' | 'week' | 'month'
let _scrollLeft = 0;
let _filterSprint = 'all';

// Drag state
let _drag = null;

// Layout constants
const ROW_H     = 40;
const LABEL_W   = 260;
const HEADER_H  = 48;

// ─── Entry Point ─────────────────────────────────────────────────────────────

export async function render(params = {}) {
  _projectId = params.id;
  const main = document.getElementById('main-content');
  if (!_projectId) {
    main.innerHTML = _noProject();
    _icons();
    return;
  }

  main.innerHTML = `<div class="page-container page-enter">
    <div class="app-loading"><div class="app-loading__spinner"></div>
    <p class="app-loading__text">Loading Gantt…</p></div></div>`;

  try {
    const [project, allTasks, allSprints, members] = await Promise.all([
      getById('projects', _projectId),
      getAll('tasks'),
      getAll('sprints'),
      getAll('users'),
    ]);

    _project = project;
    _tasks   = allTasks.filter(t => t.project_id === _projectId);
    _sprints = allSprints.filter(s => s.project_id === _projectId)
                         .sort((a, b) => (a.start_date || '') < (b.start_date || '') ? -1 : 1);
    _members = members;

    if (!_project) {
      main.innerHTML = `<div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="folder-x" class="empty-state__icon"></i>
          <p class="empty-state__title">Project not found</p>
          <a href="#/projects" class="btn btn--primary">Back to Projects</a>
        </div></div>`;
      _icons();
      return;
    }

    _renderPage();
  } catch (err) {
    debug('Gantt render error:', err);
    main.innerHTML = `<div class="page-container page-enter">
      <div class="empty-state">
        <i data-lucide="alert-triangle" class="empty-state__icon"></i>
        <p class="empty-state__title">Error loading Gantt</p>
      </div></div>`;
    _icons();
  }
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

function _renderPage() {
  const session = getSession();
  const isAdminOrPM = session && ['admin', 'pm'].includes(session.role);
  const banner = buildProjectBanner(_project, 'gantt', { renderBadge, isAdminOrPM });

  const sprintOptions = _sprints.map(s =>
    `<option value="${sanitize(s.id)}">${sanitize(s.name)}</option>`
  ).join('');

  const html = `
<div class="page-container page-enter" id="gantt-root">
  ${banner}

  <div class="page-header" style="margin-top:var(--space-6);">
    <div class="page-header__info">
      <h1 class="page-header__title"><i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt Chart</h1>
      <p class="page-header__subtitle">${sanitize(_project.name)}</p>
    </div>
    <div class="page-header__actions">
      <button class="btn btn--secondary btn--sm" id="gantt-export-btn">
        <i data-lucide="download" aria-hidden="true"></i> Export PNG
      </button>
    </div>
  </div>

  <div class="gantt-toolbar card">
    <div class="gantt-toolbar__group">
      <span class="gantt-toolbar__label">Zoom</span>
      <div class="btn-group">
        <button class="btn btn--sm ${_zoom==='day'?'btn--primary':'btn--secondary'}" data-zoom="day">Day</button>
        <button class="btn btn--sm ${_zoom==='week'?'btn--primary':'btn--secondary'}" data-zoom="week">Week</button>
        <button class="btn btn--sm ${_zoom==='month'?'btn--primary':'btn--secondary'}" data-zoom="month">Month</button>
      </div>
    </div>
    <div class="gantt-toolbar__group">
      <span class="gantt-toolbar__label">Sprint</span>
      <select class="form-control form-control--sm" id="gantt-sprint-filter">
        <option value="all">All Sprints</option>
        <option value="none">No Sprint</option>
        ${sprintOptions}
      </select>
    </div>
    <div class="gantt-toolbar__group">
      <button class="btn btn--secondary btn--sm" id="gantt-today-btn">
        <i data-lucide="crosshair" aria-hidden="true"></i> Today
      </button>
    </div>
  </div>

  <div class="gantt-wrapper card" id="gantt-wrapper">
    <div class="gantt-chart" id="gantt-chart">
      <div class="gantt-labels" id="gantt-labels"></div>
      <div class="gantt-timeline-wrap" id="gantt-timeline-wrap">
        <canvas class="gantt-canvas" id="gantt-canvas"></canvas>
        <div class="gantt-bars" id="gantt-bars"></div>
      </div>
    </div>
  </div>

  <div class="gantt-legend">
    <span class="gantt-legend__item"><span class="gantt-legend__dot" style="background:var(--color-primary)"></span>Task</span>
    <span class="gantt-legend__item"><span class="gantt-legend__dot" style="background:var(--color-danger)"></span>Overdue</span>
    <span class="gantt-legend__item"><span class="gantt-legend__dot" style="background:var(--color-success)"></span>Done</span>
    <span class="gantt-legend__item"><span class="gantt-legend__dot gantt-legend__dot--diamond"></span>Milestone</span>
    <span class="gantt-legend__item"><span class="gantt-legend__line--today"></span>Today</span>
  </div>
</div>`;

  document.getElementById('main-content').innerHTML = html;
  _icons();
  _bindToolbar();
  _drawGantt();
  setTimeout(_scrollToToday, 100);
}

// ─── Data Helpers ─────────────────────────────────────────────────────────────

function _getVisibleTasks() {
  return _tasks.filter(t => {
    if (_filterSprint === 'none') return !t.sprint_id;
    if (_filterSprint !== 'all') return t.sprint_id === _filterSprint;
    return true;
  }).filter(t => t.start_date || t.due_date);
}

function _getDateRange() {
  const tasks = _getVisibleTasks();
  const sprintsToConsider = _filterSprint === 'all' ? _sprints : (_filterSprint !== 'none' ? _sprints.filter(s => s.id === _filterSprint) : []);

  let min = null, max = null;
  const consider = (d) => {
    if (!d) return;
    const t = new Date(d).getTime();
    if (isNaN(t)) return;
    if (min === null || t < min) min = t;
    if (max === null || t > max) max = t;
  };

  tasks.forEach(t => { consider(t.start_date); consider(t.due_date); });
  sprintsToConsider.forEach(s => { consider(s.start_date); consider(s.end_date); });
  consider(new Date().toISOString());

  if (!min || !max) {
    const now = Date.now();
    min = now - 14 * 86400000;
    max = now + 30 * 86400000;
  }

  const pad = _zoom === 'day' ? 3 : _zoom === 'week' ? 7 : 30;
  return { min: new Date(min - pad * 86400000), max: new Date(max + pad * 86400000) };
}

function _dayWidth() {
  return _zoom === 'day' ? 40 : _zoom === 'week' ? 18 : 8;
}

function _buildRows(tasks) {
  const rows = [];
  const sprints = _filterSprint === 'none' ? [] : (_filterSprint === 'all' ? _sprints : _sprints.filter(s => s.id === _filterSprint));
  const sprintMap = {};
  sprints.forEach(s => { sprintMap[s.id] = []; });
  const noSprint = [];

  tasks.forEach(t => {
    if (t.sprint_id && sprintMap[t.sprint_id] !== undefined) {
      sprintMap[t.sprint_id].push(t);
    } else {
      noSprint.push(t);
    }
  });

  sprints.forEach(s => {
    rows.push({ type: 'sprint', sprint: s });
    sprintMap[s.id].forEach(t => rows.push({ type: 'task', task: t }));
  });

  if (noSprint.length > 0) {
    if (sprints.length > 0) {
      rows.push({ type: 'sprint', sprint: { name: 'No Sprint', id: null, start_date: null, end_date: null } });
    }
    noSprint.forEach(t => rows.push({ type: 'task', task: t }));
  }

  return rows;
}

// ─── Gantt Drawing ────────────────────────────────────────────────────────────

function _drawGantt() {
  const tasks  = _getVisibleTasks();
  const { min, max } = _getDateRange();
  const dayW   = _dayWidth();
  const totalDays = Math.ceil((max - min) / 86400000);
  const totalW = totalDays * dayW;
  const rows   = _buildRows(tasks);
  const totalH = HEADER_H + rows.length * ROW_H + 16;

  // ── Labels ──
  const labelsEl = document.getElementById('gantt-labels');
  labelsEl.innerHTML = _buildLabels(rows, totalH);

  // ── Canvas ──
  const canvas = document.getElementById('gantt-canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = totalW * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width  = totalW + 'px';
  canvas.style.height = totalH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  _drawGrid(ctx, min, max, dayW, totalDays, totalW, totalH, rows);
  _drawTodayLine(ctx, min, dayW, totalH);

  // ── Bars ──
  const barsEl = document.getElementById('gantt-bars');
  barsEl.style.height = totalH + 'px';
  barsEl.style.width  = totalW + 'px';
  barsEl.innerHTML = '';

  rows.forEach((row, i) => {
    if (row.type !== 'task') return;
    _appendBar(barsEl, row.task, i, min, dayW);
  });

  _icons();

  // ── Scroll sync ──
  const wrap = document.getElementById('gantt-timeline-wrap');
  if (wrap) {
    wrap.style.height = totalH + 'px';
    wrap.scrollLeft = _scrollLeft;
    wrap.onscroll = () => { _scrollLeft = wrap.scrollLeft; };
  }

  _bindDrag(barsEl, min, dayW);
}

function _appendBar(container, task, rowIdx, min, dayW) {
  const minTs = min.getTime();
  const startDate = task.start_date ? new Date(task.start_date) : (task.due_date ? new Date(task.due_date) : null);
  const endDate   = task.due_date   ? new Date(task.due_date)   : (task.start_date ? new Date(task.start_date) : null);
  if (!startDate || !endDate) return;

  const left   = Math.round((startDate.getTime() - minTs) / 86400000 * dayW);
  const rawW   = Math.round((endDate.getTime() - startDate.getTime()) / 86400000 * dayW);
  const width  = Math.max(rawW, dayW);
  const top    = HEADER_H + rowIdx * ROW_H + Math.floor((ROW_H - 24) / 2);
  const isDone = task.status === 'done';
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
  const isMilestone = task.type === 'epic' && rawW <= 0;

  if (isMilestone) {
    const el = document.createElement('div');
    el.className = 'gantt-milestone';
    el.dataset.taskId = task.id;
    el.style.cssText = `left:${left - 12}px;top:${top - 2}px`;
    el.title = task.title;
    el.innerHTML = `<i data-lucide="diamond" aria-hidden="true"></i>`;
    container.appendChild(el);
  } else {
    const color = isDone ? 'var(--color-success)' : isOverdue ? 'var(--color-danger)' : _priorityColor(task.priority);
    const el = document.createElement('div');
    el.className = 'gantt-bar' + (isDone ? ' is-done' : '') + (isOverdue ? ' is-overdue' : '');
    el.dataset.taskId = task.id;
    el.style.cssText = `left:${left}px;top:${top}px;width:${width}px;background:${color}`;
    el.title = `${task.title}: ${formatDate(task.start_date)} → ${formatDate(task.due_date)}`;
    el.innerHTML = `<span class="gantt-bar__label">${sanitize(task.title)}</span><div class="gantt-bar__resize" data-resize="true"></div>`;
    container.appendChild(el);
  }
}

function _priorityColor(p) {
  const map = { low: '#93C5FD', medium: '#2563EB', high: '#D97706', critical: '#DC2626' };
  return map[p] || '#2563EB';
}

function _buildLabels(rows, totalH) {
  let html = `<div class="gantt-label-header" style="height:${HEADER_H}px;line-height:${HEADER_H}px">Task</div>`;
  rows.forEach((row, i) => {
    const top = HEADER_H + i * ROW_H;
    if (row.type === 'sprint') {
      html += `<div class="gantt-label gantt-label--sprint" style="top:${top}px;height:${ROW_H}px">
        <i data-lucide="zap" class="gantt-label__icon" aria-hidden="true"></i>
        <span class="gantt-label__name">${sanitize(row.sprint.name || 'Sprint')}</span>
        ${row.sprint.start_date ? `<span class="gantt-label__dates">${formatDate(row.sprint.start_date,'short')} – ${formatDate(row.sprint.end_date,'short')}</span>` : ''}
      </div>`;
    } else {
      const t = row.task;
      const member = _members.find(m => m.id === (Array.isArray(t.assignees) ? t.assignees[0] : null));
      const initials = member ? (member.full_name || '?').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() : '';
      const avatarColor = member?.avatar_color || '#CBD5E1';
      const isDone = t.status === 'done';
      const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !isDone;

      html += `<div class="gantt-label gantt-label--task ${isDone?'is-done':''} ${isOverdue?'is-overdue':''}" style="top:${top}px;height:${ROW_H}px" title="${sanitize(t.title)}">
        <span class="gantt-label__avatar" style="background:${sanitize(avatarColor)}">${initials ? sanitize(initials) : '<i data-lucide="user" style="width:12px;height:12px"></i>'}</span>
        <span class="gantt-label__name">${sanitize(t.title)}</span>
        <span class="gantt-label__badge gantt-label__badge--${sanitize(t.priority||'low')}">${sanitize((t.priority||'').charAt(0).toUpperCase())}</span>
      </div>`;
    }
  });
  return html;
}

function _drawGrid(ctx, min, max, dayW, totalDays, totalW, totalH, rows) {
  const minTs = min.getTime();

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalW, totalH);

  // Row bands
  rows.forEach((row, i) => {
    const y = HEADER_H + i * ROW_H;
    ctx.fillStyle = row.type === 'sprint'
      ? 'rgba(37,99,235,0.05)'
      : (i % 2 === 0 ? '#FAFBFC' : '#FFFFFF');
    ctx.fillRect(0, y, totalW, ROW_H);
  });

  // Vertical grid lines
  const cur = new Date(min);
  cur.setHours(0, 0, 0, 0);
  while (cur.getTime() <= max.getTime()) {
    const x = Math.round((cur.getTime() - minTs) / 86400000 * dayW);
    const dow = cur.getDay();
    const dom = cur.getDate();

    const isWeekend = dow === 0 || dow === 6;
    const isWeekStart = dow === 1;
    const isMonthStart = dom === 1;

    // Weekend shading (day zoom)
    if (_zoom === 'day' && isWeekend) {
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      ctx.fillRect(x, HEADER_H, dayW, totalH - HEADER_H);
    }

    const isMinor = _zoom === 'month' ? !isMonthStart : (_zoom === 'week' ? !isWeekStart : false);
    ctx.strokeStyle = isMinor ? 'rgba(226,232,240,0.5)' : '#E2E8F0';
    ctx.lineWidth   = isMinor ? 0.5 : 1;
    ctx.beginPath(); ctx.moveTo(x, HEADER_H); ctx.lineTo(x, totalH); ctx.stroke();
    cur.setDate(cur.getDate() + 1);
  }

  // Horizontal separators
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 1;
  rows.forEach((_, i) => {
    const y = HEADER_H + (i + 1) * ROW_H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(totalW, y); ctx.stroke();
  });

  // Header background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, totalW, HEADER_H);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, HEADER_H); ctx.lineTo(totalW, HEADER_H); ctx.stroke();

  // Header labels
  const labelCur = new Date(min);
  labelCur.setHours(0, 0, 0, 0);
  while (labelCur.getTime() <= max.getTime()) {
    const x = Math.round((labelCur.getTime() - minTs) / 86400000 * dayW);
    const dow = labelCur.getDay();
    const dom = labelCur.getDate();

    if (_zoom === 'day') {
      ctx.fillStyle = (dow === 0 || dow === 6) ? '#94A3B8' : '#475569';
      ctx.font = dom === 1 ? '600 10px Inter,sans-serif' : '10px Inter,sans-serif';
      ctx.textBaseline = 'middle';
      const label = dom === 1
        ? labelCur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : String(dom);
      ctx.fillText(label, x + 2, HEADER_H / 2);
    } else if (_zoom === 'week') {
      if (dow === 1) {
        ctx.fillStyle = '#475569';
        ctx.font = '600 10px Inter,sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(labelCur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x + 3, 4);
        if (dom <= 7) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '9px Inter,sans-serif';
          ctx.fillText(labelCur.toLocaleDateString('en-US', { month: 'long' }), x + 3, 18);
        }
      }
    } else {
      if (dom === 1) {
        ctx.fillStyle = '#475569';
        ctx.font = '600 10px Inter,sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(labelCur.toLocaleDateString('en-US', { month: 'short' }), x + 3, 4);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '9px Inter,sans-serif';
        ctx.fillText(String(labelCur.getFullYear()), x + 3, 18);
      }
    }
    labelCur.setDate(labelCur.getDate() + 1);
  }
}

function _drawTodayLine(ctx, min, dayW, totalH) {
  const minTs = min.getTime();
  const todayX = Math.round((Date.now() - minTs) / 86400000 * dayW);

  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(todayX, 0); ctx.lineTo(todayX, totalH); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(todayX, HEADER_H - 6, 4, 0, Math.PI * 2);
  ctx.fill();

  // "Today" label
  ctx.fillStyle = '#EF4444';
  ctx.font = '600 9px Inter,sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('TODAY', todayX + 4, 2);
}

// ─── Drag & Resize ────────────────────────────────────────────────────────────

function _bindDrag(barsEl, min, dayW) {
  barsEl.addEventListener('mousedown', e => {
    const bar = e.target.closest('.gantt-bar');
    if (!bar) return;

    const taskId = bar.dataset.taskId;
    const task   = _tasks.find(t => t.id === taskId);
    if (!task) return;

    const isResize = e.target.dataset.resize === 'true';
    _drag = {
      type: isResize ? 'resize' : 'move',
      taskId, task, bar,
      startX: e.clientX,
      origLeft:  parseFloat(bar.style.left),
      origWidth: parseFloat(bar.style.width),
      origStartDate: task.start_date,
      origEndDate:   task.due_date,
      dayW,
      accDelta: 0,
    };

    bar.classList.add('is-dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', _handleDragMove);
  document.addEventListener('mouseup',   _handleDragEnd);
}

function _handleDragMove(e) {
  if (!_drag) return;
  const delta = e.clientX - _drag.startX;

  if (_drag.type === 'move') {
    _drag.bar.style.left = Math.max(0, _drag.origLeft + delta) + 'px';
  } else {
    const newW = Math.max(_drag.dayW, _drag.origWidth + delta);
    _drag.bar.style.width = newW + 'px';
  }
}

async function _handleDragEnd(e) {
  if (!_drag) return;

  const delta = e.clientX - _drag.startX;
  const deltaDays = Math.round(delta / _drag.dayW);

  if (deltaDays !== 0) {
    const task = _drag.task;
    const MS   = 86400000;

    if (_drag.type === 'move') {
      if (task.start_date) {
        task.start_date = new Date(new Date(task.start_date).getTime() + deltaDays * MS).toISOString().slice(0, 10);
      }
      if (task.due_date) {
        task.due_date = new Date(new Date(task.due_date).getTime() + deltaDays * MS).toISOString().slice(0, 10);
      }
    } else {
      if (task.due_date) {
        const newEnd = new Date(new Date(task.due_date).getTime() + deltaDays * MS);
        const start  = task.start_date ? new Date(task.start_date) : null;
        if (!start || newEnd >= start) {
          task.due_date = newEnd.toISOString().slice(0, 10);
        }
      }
    }

    task.updated_at = nowISO();
    try {
      await update('tasks', task);
      showToast('Task dates updated', 'success');
    } catch (err) {
      debug('Gantt save error:', err);
      showToast('Failed to save task dates', 'error');
    }
  }

  _drag.bar.classList.remove('is-dragging');
  _drag = null;
  _drawGantt();
}

// ─── Today Scroll ─────────────────────────────────────────────────────────────

function _scrollToToday() {
  const { min } = _getDateRange();
  const dayW = _dayWidth();
  const todayX = Math.round((Date.now() - min.getTime()) / 86400000 * dayW);
  const wrap = document.getElementById('gantt-timeline-wrap');
  if (wrap) {
    const target = Math.max(0, todayX - wrap.clientWidth / 2);
    wrap.scrollLeft = target;
    _scrollLeft = target;
  }
}

// ─── Export PNG ───────────────────────────────────────────────────────────────

function _exportPNG() {
  const canvas = document.getElementById('gantt-canvas');
  const labelsEl = document.getElementById('gantt-labels');
  if (!canvas) { showToast('Nothing to export', 'warning'); return; }

  const dpr = window.devicePixelRatio || 1;
  const cW  = canvas.width / dpr;
  const cH  = canvas.height / dpr;

  const out = document.createElement('canvas');
  out.width  = (LABEL_W + cW) * dpr;
  out.height = cH * dpr;

  const ctx = out.getContext('2d');
  ctx.scale(dpr, dpr);

  // White bg
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LABEL_W + cW, cH);

  // Labels bg
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, LABEL_W, cH);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(LABEL_W - 1, 0); ctx.lineTo(LABEL_W - 1, cH); ctx.stroke();

  // Header label
  ctx.fillStyle = '#64748B';
  ctx.font = '600 11px Inter,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Task', 16, HEADER_H / 2);

  // Task label rows
  const rows = _buildRows(_getVisibleTasks());
  rows.forEach((row, i) => {
    const y = HEADER_H + i * ROW_H + ROW_H / 2;
    if (row.type === 'sprint') {
      ctx.fillStyle = '#2563EB';
      ctx.font = '600 11px Inter,sans-serif';
      ctx.fillText(('\u26A1 ' + (row.sprint.name || 'Sprint')).substring(0, 32), 12, y);
    } else {
      ctx.fillStyle = '#0F172A';
      ctx.font = '12px Inter,sans-serif';
      ctx.fillText((row.task.title || '').substring(0, 32), 16, y);
    }
  });

  // Gantt grid
  ctx.drawImage(canvas, LABEL_W, 0, cW, cH);

  // Bars
  document.querySelectorAll('.gantt-bar').forEach(bar => {
    const left  = parseFloat(bar.style.left) + LABEL_W;
    const top   = parseFloat(bar.style.top);
    const width = parseFloat(bar.style.width);
    ctx.fillStyle = bar.style.background || '#2563EB';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(left, top, width, 24, 5);
    else ctx.rect(left, top, width, 24);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px Inter,sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText((bar.querySelector('.gantt-bar__label')?.textContent || '').substring(0, 24), left + 8, top + 12);
  });

  out.toBlob(blob => {
    if (!blob) { showToast('Export failed', 'error'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-${(_project?.name || 'chart').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Gantt exported as PNG', 'success');
  });
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function _bindToolbar() {
  document.querySelectorAll('[data-zoom]').forEach(btn => {
    btn.addEventListener('click', () => {
      _zoom = btn.dataset.zoom;
      document.querySelectorAll('[data-zoom]').forEach(b => {
        b.className = 'btn btn--sm ' + (b === btn ? 'btn--primary' : 'btn--secondary');
      });
      _drawGantt();
      setTimeout(_scrollToToday, 50);
    });
  });

  const sprintFilter = document.getElementById('gantt-sprint-filter');
  if (sprintFilter) {
    sprintFilter.value = _filterSprint;
    sprintFilter.addEventListener('change', () => {
      _filterSprint = sprintFilter.value;
      _drawGantt();
    });
  }

  const todayBtn = document.getElementById('gantt-today-btn');
  if (todayBtn) todayBtn.addEventListener('click', _scrollToToday);

  const exportBtn = document.getElementById('gantt-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', _exportPNG);
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

function _icons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }

function _noProject() {
  return `<div class="page-container page-enter">
    <div class="empty-state">
      <i data-lucide="alert-circle" class="empty-state__icon"></i>
      <p class="empty-state__title">No project specified</p>
      <a href="#/projects" class="btn btn--primary">Back to Projects</a>
    </div></div>`;
}

export default { render };
