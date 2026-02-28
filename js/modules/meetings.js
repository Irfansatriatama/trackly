/**
 * TRACKLY — meetings.js
 * Phase 19: Meeting Agenda & Notulensi
 * Calendar view, meeting CRUD, agenda checklist, notulensi (Markdown/file),
 * action items with "Create Task" conversion.
 */

import { getAll, add, update, remove, getById } from '../core/db.js';
import {
  generateSequentialId, nowISO, formatDate, formatRelativeDate,
  getInitials, sanitize, logActivity, ID_PREFIX
} from '../core/utils.js';
import { getSession } from '../core/auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { renderAvatar } from '../components/avatar.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _meetings = [];
let _users = [];
let _projects = [];
let _viewMode = 'month'; // 'month' | 'week'
let _selectedDate = null; // 'YYYY-MM-DD'
let _calendarDate = null; // Date object (first day of displayed period)

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_TYPES = {
  internal:      'Internal',
  client_meeting: 'Client Meeting',
  sprint_review: 'Sprint Review',
  retrospective: 'Retrospective',
  other:         'Other',
};

const MEETING_STATUSES = {
  scheduled: { label: 'Scheduled', color: 'info' },
  ongoing:   { label: 'Ongoing',   color: 'warning' },
  done:      { label: 'Done',      color: 'success' },
  cancelled: { label: 'Cancelled', color: 'danger' },
};

const MEETING_TYPE_COLORS = {
  internal:      '#2563EB',
  client_meeting:'#7C3AED',
  sprint_review: '#16A34A',
  retrospective: '#D97706',
  other:         '#64748B',
};

// ─── Role Guard Helper ────────────────────────────────────────────────────────

function requireAdminPm() {
  const session = getSession();
  return session && ['admin', 'pm'].includes(session.role);
}

// ─── Main Render (Calendar Page) ─────────────────────────────────────────────

export async function render(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (!requireAdminPm()) {
    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="lock" class="empty-state__icon" aria-hidden="true"></i>
          <p class="empty-state__title">Access Restricted</p>
          <p class="empty-state__text">Meetings are only visible to Admin and PM users.</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  try {
    [_meetings, _users, _projects] = await Promise.all([
      getAll('meetings'),
      getAll('users'),
      getAll('projects'),
    ]);

    const today = new Date();
    if (!_selectedDate) _selectedDate = toDateStr(today);
    if (!_calendarDate) _calendarDate = new Date(today.getFullYear(), today.getMonth(), 1);

    content.innerHTML = buildCalendarPageHTML();
    bindCalendarEvents();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    content.innerHTML = `<div class="page-container"><div class="empty-state"><p class="empty-state__title">Error loading meetings</p><p class="empty-state__text">${sanitize(String(err))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Calendar Page HTML ───────────────────────────────────────────────────────

function buildCalendarPageHTML() {
  return `
    <div class="page-container page-enter meetings-page">
      <div class="page-header">
        <div class="page-header__left">
          <h1 class="page-header__title">
            <i data-lucide="calendar" aria-hidden="true"></i>
            Meetings
          </h1>
          <p class="page-header__subtitle">Schedule, manage, and document team meetings</p>
        </div>
        <div class="page-header__actions">
          <div class="btn-group" role="group" aria-label="Calendar view toggle">
            <button class="btn btn--sm ${_viewMode === 'month' ? 'btn--primary' : 'btn--ghost'}" id="viewMonthBtn" aria-pressed="${_viewMode === 'month'}">
              <i data-lucide="calendar" aria-hidden="true"></i> Month
            </button>
            <button class="btn btn--sm ${_viewMode === 'week' ? 'btn--primary' : 'btn--ghost'}" id="viewWeekBtn" aria-pressed="${_viewMode === 'week'}">
              <i data-lucide="columns" aria-hidden="true"></i> Week
            </button>
          </div>
          <button class="btn btn--primary" id="newMeetingBtn">
            <i data-lucide="plus" aria-hidden="true"></i>
            New Meeting
          </button>
        </div>
      </div>

      <div class="meetings-layout">
        <!-- Left: Calendar Panel -->
        <div class="meetings-calendar-panel card">
          <div class="card__body">
            ${buildMiniCalendarHTML()}
          </div>
        </div>

        <!-- Right: Day's Meetings -->
        <div class="meetings-day-panel">
          ${buildDayPanelHTML()}
        </div>
      </div>
    </div>
  `;
}

function buildMiniCalendarHTML() {
  if (_viewMode === 'week') return buildWeekCalendarHTML();
  return buildMonthCalendarHTML();
}

function buildMonthCalendarHTML() {
  const year = _calendarDate.getFullYear();
  const month = _calendarDate.getMonth();

  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Days of week header
  const dayHeaders = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d =>
    `<div class="mini-cal__day-header">${d}</div>`
  ).join('');

  // First day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Meeting days set for quick lookup
  const meetingDays = new Set(
    _meetings
      .filter(m => {
        const d = new Date(m.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(m => new Date(m.date).getDate())
  );

  let cells = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells += '<div class="mini-cal__cell mini-cal__cell--empty"></div>';
  }

  const todayStr = toDateStr(new Date());

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isSelected = dateStr === _selectedDate;
    const isToday = dateStr === todayStr;
    const hasMeetings = meetingDays.has(day);
    const classes = [
      'mini-cal__cell',
      isSelected ? 'mini-cal__cell--selected' : '',
      isToday ? 'mini-cal__cell--today' : '',
      hasMeetings ? 'mini-cal__cell--has-events' : '',
    ].filter(Boolean).join(' ');

    cells += `<div class="${classes}" data-date="${dateStr}" role="button" tabindex="0" aria-label="${dateStr}${isToday ? ' (today)' : ''}">${day}</div>`;
  }

  return `
    <div class="mini-cal">
      <div class="mini-cal__nav">
        <button class="btn btn--ghost btn--sm btn--icon" id="calPrevBtn" aria-label="Previous month">
          <i data-lucide="chevron-left" aria-hidden="true"></i>
        </button>
        <span class="mini-cal__month-label">${monthName}</span>
        <button class="btn btn--ghost btn--sm btn--icon" id="calNextBtn" aria-label="Next month">
          <i data-lucide="chevron-right" aria-hidden="true"></i>
        </button>
      </div>
      <div class="mini-cal__grid">
        ${dayHeaders}
        ${cells}
      </div>
    </div>
  `;
}

function buildWeekCalendarHTML() {
  // Find the week containing _selectedDate
  const selected = _selectedDate ? new Date(_selectedDate) : new Date();
  const dayOfWeek = selected.getDay();
  const weekStart = new Date(selected);
  weekStart.setDate(selected.getDate() - dayOfWeek);

  const todayStr = toDateStr(new Date());

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }

  const weekLabel = `${formatDate(weekStart)} – ${formatDate(days[6])}`;

  const dayCells = days.map(d => {
    const dateStr = toDateStr(d);
    const isSelected = dateStr === _selectedDate;
    const isToday = dateStr === todayStr;
    const count = _meetings.filter(m => m.date === dateStr).length;
    const dayName = d.toLocaleString('default', { weekday: 'short' });
    const classes = ['week-day-cell',
      isSelected ? 'week-day-cell--selected' : '',
      isToday ? 'week-day-cell--today' : '',
    ].filter(Boolean).join(' ');
    return `
      <div class="${classes}" data-date="${dateStr}" role="button" tabindex="0" aria-label="${dateStr}">
        <span class="week-day-cell__name">${dayName}</span>
        <span class="week-day-cell__num">${d.getDate()}</span>
        ${count > 0 ? `<span class="week-day-cell__dot" aria-label="${count} meeting(s)"></span>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="week-cal">
      <div class="mini-cal__nav">
        <button class="btn btn--ghost btn--sm btn--icon" id="calPrevBtn" aria-label="Previous week">
          <i data-lucide="chevron-left" aria-hidden="true"></i>
        </button>
        <span class="mini-cal__month-label" style="font-size:var(--text-sm)">${weekLabel}</span>
        <button class="btn btn--ghost btn--sm btn--icon" id="calNextBtn" aria-label="Next week">
          <i data-lucide="chevron-right" aria-hidden="true"></i>
        </button>
      </div>
      <div class="week-cal__days">${dayCells}</div>
    </div>
  `;
}

function buildDayPanelHTML() {
  const dayMeetings = _meetings
    .filter(m => m.date === _selectedDate)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const displayDate = _selectedDate
    ? new Date(_selectedDate + 'T00:00:00').toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'No date selected';

  const isEmpty = dayMeetings.length === 0;

  const meetingCards = isEmpty
    ? `<div class="empty-state empty-state--sm">
         <i data-lucide="calendar-off" class="empty-state__icon" aria-hidden="true"></i>
         <p class="empty-state__title">No meetings on this day</p>
         <p class="empty-state__text">Click "New Meeting" to schedule one.</p>
       </div>`
    : dayMeetings.map(m => buildMeetingCardHTML(m)).join('');

  return `
    <div class="meetings-day-header">
      <h2 class="meetings-day-title">${displayDate}</h2>
      <span class="badge badge--info">${dayMeetings.length} meeting${dayMeetings.length !== 1 ? 's' : ''}</span>
    </div>
    <div class="meetings-day-list" id="dayMeetingsList">
      ${meetingCards}
    </div>
  `;
}

function buildMeetingCardHTML(meeting) {
  const statusInfo = MEETING_STATUSES[meeting.status] || MEETING_STATUSES.scheduled;
  const typeLabel = MEETING_TYPES[meeting.type] || meeting.type;
  const typeColor = MEETING_TYPE_COLORS[meeting.type] || '#64748B';

  const attendeeAvatars = (meeting.attendee_ids || []).slice(0, 4).map(uid => {
    const user = _users.find(u => u.id === uid);
    if (!user) return '';
    return renderAvatar({ name: user.full_name, src: user.avatar, size: 'sm' });
  }).join('');
  const extraAttendees = (meeting.attendee_ids || []).length > 4
    ? `<span class="avatar avatar--sm avatar--overflow">+${(meeting.attendee_ids || []).length - 4}</span>` : '';

  const projectLinks = (meeting.project_ids || []).map(pid => {
    const proj = _projects.find(p => p.id === pid);
    return proj ? `<span class="badge badge--ghost" style="font-size:11px">${sanitize(proj.name)}</span>` : '';
  }).join('');

  const agendaCount = (meeting.agenda_items || []).length;
  const doneCnt = (meeting.agenda_items || []).filter(a => a.done).length;

  return `
    <div class="meeting-card card" data-meeting-id="${meeting.id}" role="article">
      <div class="meeting-card__type-bar" style="background:${typeColor}" aria-hidden="true"></div>
      <div class="card__body meeting-card__body">
        <div class="meeting-card__top">
          <div class="meeting-card__info">
            <a href="#/meetings/${meeting.id}" class="meeting-card__title">${sanitize(meeting.title)}</a>
            <div class="meeting-card__meta">
              <span class="text-muted text-sm">
                <i data-lucide="clock" aria-hidden="true"></i>
                ${meeting.start_time || '--'} – ${meeting.end_time || '--'}
              </span>
              ${meeting.location ? `<span class="text-muted text-sm"><i data-lucide="map-pin" aria-hidden="true"></i> ${sanitize(meeting.location)}</span>` : ''}
            </div>
          </div>
          <div class="meeting-card__badges">
            ${renderBadge(typeLabel, 'ghost')}
            ${renderBadge(statusInfo.label, statusInfo.color)}
          </div>
        </div>

        ${projectLinks ? `<div class="meeting-card__projects">${projectLinks}</div>` : ''}

        <div class="meeting-card__footer">
          <div class="meeting-card__attendees">
            <div class="avatar-group">${attendeeAvatars}${extraAttendees}</div>
            <span class="text-sm text-muted">${(meeting.attendee_ids || []).length} attendee${(meeting.attendee_ids || []).length !== 1 ? 's' : ''}</span>
          </div>
          ${agendaCount > 0 ? `<span class="text-sm text-muted"><i data-lucide="list-checks" aria-hidden="true"></i> ${doneCnt}/${agendaCount} agenda</span>` : ''}
          <div class="meeting-card__actions">
            <a href="#/meetings/${meeting.id}" class="btn btn--ghost btn--sm" aria-label="View meeting">
              <i data-lucide="eye" aria-hidden="true"></i> View
            </a>
            <button class="btn btn--ghost btn--sm btn--edit-meeting" data-id="${meeting.id}" aria-label="Edit meeting">
              <i data-lucide="edit-2" aria-hidden="true"></i>
            </button>
            <button class="btn btn--ghost btn--sm btn--danger btn--delete-meeting" data-id="${meeting.id}" aria-label="Delete meeting">
              <i data-lucide="trash-2" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Calendar Event Binding ───────────────────────────────────────────────────

function bindCalendarEvents() {
  const content = document.getElementById('main-content');
  if (!content) return;

  // View toggle
  content.querySelector('#viewMonthBtn')?.addEventListener('click', () => {
    _viewMode = 'month';
    refreshCalendarPage();
  });
  content.querySelector('#viewWeekBtn')?.addEventListener('click', () => {
    _viewMode = 'week';
    refreshCalendarPage();
  });

  // New meeting
  content.querySelector('#newMeetingBtn')?.addEventListener('click', () => openMeetingModal(null));

  // Prev/Next navigation
  content.querySelector('#calPrevBtn')?.addEventListener('click', () => {
    if (_viewMode === 'month') {
      _calendarDate = new Date(_calendarDate.getFullYear(), _calendarDate.getMonth() - 1, 1);
    } else {
      const d = _selectedDate ? new Date(_selectedDate) : new Date();
      d.setDate(d.getDate() - 7);
      _selectedDate = toDateStr(d);
    }
    refreshCalendarPage();
  });
  content.querySelector('#calNextBtn')?.addEventListener('click', () => {
    if (_viewMode === 'month') {
      _calendarDate = new Date(_calendarDate.getFullYear(), _calendarDate.getMonth() + 1, 1);
    } else {
      const d = _selectedDate ? new Date(_selectedDate) : new Date();
      d.setDate(d.getDate() + 7);
      _selectedDate = toDateStr(d);
    }
    refreshCalendarPage();
  });

  // Day cell click
  content.querySelectorAll('.mini-cal__cell[data-date], .week-day-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      _selectedDate = cell.dataset.date;
      refreshCalendarPage();
    });
    cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _selectedDate = cell.dataset.date; refreshCalendarPage(); }});
  });

  // Edit meeting buttons
  content.querySelectorAll('.btn--edit-meeting').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openMeetingModal(btn.dataset.id); });
  });

  // Delete meeting buttons
  content.querySelectorAll('.btn--delete-meeting').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); deleteMeeting(btn.dataset.id); });
  });
}

async function refreshCalendarPage() {
  [_meetings, _users, _projects] = await Promise.all([
    getAll('meetings'),
    getAll('users'),
    getAll('projects'),
  ]);
  const content = document.getElementById('main-content');
  if (!content) return;
  content.querySelector('.meetings-layout').outerHTML; // Trigger re-render
  const page = content.querySelector('.meetings-page');
  if (page) {
    // Re-render just the calendar panel and day panel
    const calPanel = content.querySelector('.meetings-calendar-panel .card__body');
    if (calPanel) calPanel.innerHTML = buildMiniCalendarHTML();
    const viewMonthBtn = content.querySelector('#viewMonthBtn');
    const viewWeekBtn = content.querySelector('#viewWeekBtn');
    if (viewMonthBtn) { viewMonthBtn.className = `btn btn--sm ${_viewMode === 'month' ? 'btn--primary' : 'btn--ghost'}`; viewMonthBtn.setAttribute('aria-pressed', _viewMode === 'month'); }
    if (viewWeekBtn) { viewWeekBtn.className = `btn btn--sm ${_viewMode === 'week' ? 'btn--primary' : 'btn--ghost'}`; viewWeekBtn.setAttribute('aria-pressed', _viewMode === 'week'); }
    const dayPanel = content.querySelector('.meetings-day-panel');
    if (dayPanel) dayPanel.innerHTML = buildDayPanelHTML();
  }
  bindCalendarEvents();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Meeting CRUD Modal ───────────────────────────────────────────────────────

async function openMeetingModal(meetingId = null) {
  if (!_users.length) _users = await getAll('users');
  if (!_projects.length) _projects = await getAll('projects');

  let meeting = null;
  if (meetingId) meeting = await getById('meetings', meetingId);

  const isEdit = !!meeting;
  const defaultDate = _selectedDate || toDateStr(new Date());

  const attendeeOptions = _users.map(u => `
    <label class="checkbox-label">
      <input type="checkbox" name="attendee_ids" value="${u.id}"
        ${(meeting?.attendee_ids || []).includes(u.id) ? 'checked' : ''}>
      ${renderAvatar({ name: u.full_name, src: u.avatar, size: 'sm' })}
      <span>${sanitize(u.full_name)}</span>
      ${renderBadge(u.role, 'ghost')}
    </label>`).join('');

  const projectOptions = _projects.map(p => `
    <label class="checkbox-label">
      <input type="checkbox" name="project_ids" value="${p.id}"
        ${(meeting?.project_ids || []).includes(p.id) ? 'checked' : ''}>
      <span>${sanitize(p.name)}</span>
    </label>`).join('');

  const agendaItemsHTML = (meeting?.agenda_items || []).map((a, i) => buildAgendaItemRow(a, i)).join('');

  const html = `
    <form id="meetingForm" novalidate>
      <div class="modal-tabs" role="tablist">
        <button type="button" class="modal-tab is-active" data-tab="basic" role="tab" aria-selected="true">Details</button>
        <button type="button" class="modal-tab" data-tab="agenda" role="tab" aria-selected="false">Agenda</button>
        <button type="button" class="modal-tab" data-tab="people" role="tab" aria-selected="false">Attendees & Projects</button>
      </div>

      <!-- Tab: Basic Details -->
      <div class="modal-tab-panel is-active" id="tab-basic">
        <div class="form-group">
          <label class="form-label" for="mtgTitle">Title <span class="form-required">*</span></label>
          <input type="text" id="mtgTitle" class="form-input" value="${sanitize(meeting?.title || '')}" placeholder="Meeting title" required maxlength="200">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="mtgType">Type</label>
            <select id="mtgType" class="form-select">
              ${Object.entries(MEETING_TYPES).map(([val, lbl]) =>
                `<option value="${val}" ${meeting?.type === val ? 'selected' : ''}>${lbl}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="mtgStatus">Status</label>
            <select id="mtgStatus" class="form-select">
              ${Object.entries(MEETING_STATUSES).map(([val, { label }]) =>
                `<option value="${val}" ${(meeting?.status || 'scheduled') === val ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="mtgDate">Date <span class="form-required">*</span></label>
            <input type="date" id="mtgDate" class="form-input" value="${meeting?.date || defaultDate}" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="mtgStartTime">Start Time</label>
            <input type="time" id="mtgStartTime" class="form-input" value="${meeting?.start_time || '09:00'}">
          </div>
          <div class="form-group">
            <label class="form-label" for="mtgEndTime">End Time</label>
            <input type="time" id="mtgEndTime" class="form-input" value="${meeting?.end_time || '10:00'}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="mtgLocation">Location / Link</label>
          <input type="text" id="mtgLocation" class="form-input" value="${sanitize(meeting?.location || '')}" placeholder="Room name or video call URL">
        </div>
        <div class="form-group">
          <label class="form-label" for="mtgDescription">Description</label>
          <textarea id="mtgDescription" class="form-textarea" rows="3" placeholder="Meeting objective or context">${sanitize(meeting?.description || '')}</textarea>
        </div>
      </div>

      <!-- Tab: Agenda -->
      <div class="modal-tab-panel" id="tab-agenda">
        <div class="agenda-editor">
          <div id="agendaItemsList">${agendaItemsHTML}</div>
          <button type="button" class="btn btn--ghost btn--sm" id="addAgendaItemBtn">
            <i data-lucide="plus" aria-hidden="true"></i> Add Agenda Item
          </button>
        </div>
      </div>

      <!-- Tab: Attendees & Projects -->
      <div class="modal-tab-panel" id="tab-people">
        <div class="form-group">
          <label class="form-label">Attendees</label>
          <div class="checkbox-list" style="max-height:200px;overflow-y:auto">${attendeeOptions || '<p class="text-muted text-sm">No team members found.</p>'}</div>
        </div>
        <div class="form-group" style="margin-top:var(--space-4)">
          <label class="form-label">Linked Projects</label>
          <div class="checkbox-list" style="max-height:200px;overflow-y:auto">${projectOptions || '<p class="text-muted text-sm">No projects found.</p>'}</div>
        </div>
      </div>
    </form>
  `;

  openModal({
    title: isEdit ? 'Edit Meeting' : 'New Meeting',
    body: html,
    size: 'lg',
    footer: `
      <button type="button" class="btn btn--ghost" id="modalCancelBtn">Cancel</button>
      <button type="button" class="btn btn--primary" id="modalSaveBtn">
        <i data-lucide="save" aria-hidden="true"></i>
        ${isEdit ? 'Save Changes' : 'Create Meeting'}
      </button>
    `,
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Tab switching
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.modal-tab-panel').forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('is-active');
    });
  });

  // Add agenda item
  document.getElementById('addAgendaItemBtn')?.addEventListener('click', () => {
    const list = document.getElementById('agendaItemsList');
    const idx = list.querySelectorAll('.agenda-item-row').length;
    const newItem = { id: `agi-${Date.now()}`, text: '', order: idx, done: false };
    const div = document.createElement('div');
    div.innerHTML = buildAgendaItemRow(newItem, idx);
    list.appendChild(div.firstElementChild);
    div.firstElementChild?.querySelector('.agenda-item-text')?.focus();
    bindAgendaRowEvents(list.lastElementChild);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  // Bind existing agenda rows
  document.querySelectorAll('.agenda-item-row').forEach(row => bindAgendaRowEvents(row));

  // Cancel
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);

  // Save
  document.getElementById('modalSaveBtn')?.addEventListener('click', async () => {
    await saveMeeting(meeting, isEdit);
  });
}

function buildAgendaItemRow(item, index) {
  return `
    <div class="agenda-item-row" data-agenda-id="${item.id}">
      <span class="agenda-item-row__drag" aria-hidden="true">
        <i data-lucide="grip-vertical"></i>
      </span>
      <input type="text" class="form-input agenda-item-text" value="${sanitize(item.text || '')}" placeholder="Agenda item ${index + 1}...">
      <button type="button" class="btn btn--ghost btn--sm btn--icon btn--remove-agenda" aria-label="Remove agenda item">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </div>`;
}

function bindAgendaRowEvents(row) {
  row?.querySelector('.btn--remove-agenda')?.addEventListener('click', () => row.remove());
}

async function saveMeeting(existing, isEdit) {
  const title = document.getElementById('mtgTitle')?.value.trim();
  if (!title) { showToast('Meeting title is required.', 'error'); return; }

  const date = document.getElementById('mtgDate')?.value;
  if (!date) { showToast('Meeting date is required.', 'error'); return; }

  const attendeeIds = [...document.querySelectorAll('input[name="attendee_ids"]:checked')].map(i => i.value);
  const projectIds = [...document.querySelectorAll('input[name="project_ids"]:checked')].map(i => i.value);

  const agendaItems = [...document.querySelectorAll('.agenda-item-row')].map((row, idx) => ({
    id: row.dataset.agendaId || `agi-${Date.now()}-${idx}`,
    text: row.querySelector('.agenda-item-text')?.value.trim() || '',
    order: idx,
    done: existing?.agenda_items?.find(a => a.id === row.dataset.agendaId)?.done || false,
  })).filter(a => a.text);

  const session = getSession();
  const now = nowISO();
  const allMeetings = await getAll('meetings');

  const record = {
    id: existing?.id || generateSequentialId(ID_PREFIX.MEETING, allMeetings),
    title,
    description: document.getElementById('mtgDescription')?.value.trim() || '',
    type: document.getElementById('mtgType')?.value || 'internal',
    date,
    start_time: document.getElementById('mtgStartTime')?.value || '',
    end_time: document.getElementById('mtgEndTime')?.value || '',
    location: document.getElementById('mtgLocation')?.value.trim() || '',
    project_ids: projectIds,
    attendee_ids: attendeeIds,
    agenda_items: agendaItems,
    status: document.getElementById('mtgStatus')?.value || 'scheduled',
    notulensi: existing?.notulensi || { content: '', attachments: [], created_by: session?.userId, updated_at: now },
    action_items: existing?.action_items || [],
    created_by: existing?.created_by || session?.userId,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  try {
    if (isEdit) {
      await update('meetings', record);
    } else {
      await add('meetings', record);
    }

    await logActivity({
      entity_type: 'meeting',
      entity_id: record.id,
      entity_name: record.title,
      action: isEdit ? 'updated' : 'created',
      project_id: projectIds[0] || null,
    });

    closeModal();
    showToast(isEdit ? 'Meeting updated.' : 'Meeting created.', 'success');
    _selectedDate = date;
    await refreshCalendarPage();
  } catch (err) {
    showToast('Failed to save meeting: ' + err.message, 'error');
  }
}

async function deleteMeeting(meetingId) {
  const meeting = await getById('meetings', meetingId);
  if (!meeting) return;
  const confirmed = await showConfirm({
    title: 'Delete Meeting',
    message: `Are you sure you want to delete "${meeting.title}"? This cannot be undone.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await remove('meetings', meetingId);
    await logActivity({
      entity_type: 'meeting',
      entity_id: meetingId,
      entity_name: meeting.title,
      action: 'deleted',
      project_id: meeting.project_ids?.[0] || null,
    });
    showToast('Meeting deleted.', 'success');
    await refreshCalendarPage();
  } catch (err) {
    showToast('Failed to delete meeting.', 'error');
  }
}

// ─── Meeting Detail Page ──────────────────────────────────────────────────────

export async function renderDetail(params = {}) {
  const content = document.getElementById('main-content');
  if (!content) return;

  if (!requireAdminPm()) {
    content.innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="lock" class="empty-state__icon"></i><p class="empty-state__title">Access Restricted</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  try {
    const [meeting, users, projects, tasks] = await Promise.all([
      getById('meetings', params.id),
      getAll('users'),
      getAll('projects'),
      getAll('tasks'),
    ]);
    _users = users;
    _projects = projects;

    if (!meeting) {
      content.innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="calendar-off" class="empty-state__icon"></i><p class="empty-state__title">Meeting not found</p><a href="#/meetings" class="btn btn--primary" style="margin-top:1rem">Back to Meetings</a></div></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    content.innerHTML = buildDetailPageHTML(meeting, users, projects);
    bindDetailEvents(meeting, users, projects, tasks);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    content.innerHTML = `<div class="page-container page-enter"><div class="empty-state"><p class="empty-state__title">Error loading meeting</p><p>${sanitize(String(err))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function buildDetailPageHTML(meeting, users, projects) {
  const statusInfo = MEETING_STATUSES[meeting.status] || MEETING_STATUSES.scheduled;
  const typeLabel = MEETING_TYPES[meeting.type] || meeting.type;
  const typeColor = MEETING_TYPE_COLORS[meeting.type] || '#64748B';

  const attendeesList = (meeting.attendee_ids || []).map(uid => {
    const u = users.find(x => x.id === uid);
    if (!u) return '';
    return `<div class="attendee-chip">${renderAvatar({ name: u.full_name, src: u.avatar, size: 'sm' })}<span>${sanitize(u.full_name)}</span>${renderBadge(u.role, 'ghost')}</div>`;
  }).join('');

  const linkedProjects = (meeting.project_ids || []).map(pid => {
    const p = projects.find(x => x.id === pid);
    return p ? `<a href="#/projects/${p.id}" class="badge badge--info">${sanitize(p.name)}</a>` : '';
  }).join('');

  // Status advance next
  const statusNext = { scheduled: 'ongoing', ongoing: 'done', done: null, cancelled: null };
  const nextStatus = statusNext[meeting.status];
  const nextStatusLabel = nextStatus ? MEETING_STATUSES[nextStatus]?.label : null;

  // Agenda
  const agendaHTML = (meeting.agenda_items || []).length === 0
    ? `<p class="text-muted text-sm">No agenda items added.</p>`
    : (meeting.agenda_items || []).sort((a, b) => a.order - b.order).map(item => `
        <div class="agenda-check-item" data-agenda-id="${item.id}">
          <input type="checkbox" class="agenda-checkbox" id="agenda-${item.id}" ${item.done ? 'checked' : ''} aria-label="${sanitize(item.text)}">
          <label for="agenda-${item.id}" class="${item.done ? 'agenda-check-item__text--done' : ''}">${sanitize(item.text)}</label>
        </div>`).join('');

  // Notulensi
  const notulensi = meeting.notulensi || { content: '', attachments: [] };
  const attachmentsHTML = (notulensi.attachments || []).map((att, i) => `
    <div class="attachment-row">
      <i data-lucide="paperclip" aria-hidden="true"></i>
      <span class="attachment-row__name">${sanitize(att.name)}</span>
      <span class="attachment-row__size text-muted text-sm">${formatFileSize(att.size)}</span>
      <button class="btn btn--ghost btn--sm" data-att-index="${i}" id="downloadAtt-${i}">
        <i data-lucide="download" aria-hidden="true"></i> Download
      </button>
      <button class="btn btn--ghost btn--sm btn--danger" data-att-index="${i}" id="deleteAtt-${i}" aria-label="Delete attachment">
        <i data-lucide="trash-2" aria-hidden="true"></i>
      </button>
    </div>`).join('');

  // Action Items
  const actionItemsHTML = (meeting.action_items || []).length === 0
    ? `<p class="text-muted text-sm">No action items yet.</p>`
    : (meeting.action_items || []).map((ai, idx) => {
        const assignee = users.find(u => u.id === ai.assignee_id);
        const converted = !!ai.task_id;
        return `
          <div class="action-item-row ${converted ? 'action-item-row--converted' : ''}" data-ai-index="${idx}">
            <div class="action-item-row__info">
              <span class="action-item-row__text">${sanitize(ai.text)}</span>
              <div class="action-item-row__meta text-sm text-muted">
                ${assignee ? `${renderAvatar({ name: assignee.full_name, src: assignee.avatar, size: 'xs' })} ${sanitize(assignee.full_name)}` : '<span>Unassigned</span>'}
                ${ai.due_date ? ` &bull; Due: ${formatDate(ai.due_date)}` : ''}
              </div>
            </div>
            <div class="action-item-row__actions">
              ${converted
                ? `<span class="badge badge--success"><i data-lucide="check-circle-2"></i> Task Created</span>`
                : `<button class="btn btn--sm btn--primary btn--create-task" data-ai-index="${idx}">
                    <i data-lucide="plus-circle" aria-hidden="true"></i> Create Task
                   </button>`
              }
              <button class="btn btn--ghost btn--sm btn--danger btn--delete-ai" data-ai-index="${idx}" aria-label="Delete action item">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
          </div>`;
      }).join('');

  const doneCnt = (meeting.agenda_items || []).filter(a => a.done).length;
  const totalAgenda = (meeting.agenda_items || []).length;

  return `
    <div class="page-container page-enter meeting-detail-page">
      <div class="page-header">
        <div class="page-header__left">
          <a href="#/meetings" class="btn btn--ghost btn--sm" style="margin-right:var(--space-2)">
            <i data-lucide="arrow-left" aria-hidden="true"></i> Back
          </a>
          <div>
            <div class="meeting-detail-type-tag" style="background:${typeColor}">
              ${sanitize(typeLabel)}
            </div>
            <h1 class="page-header__title">${sanitize(meeting.title)}</h1>
            <div class="meeting-detail-meta text-muted text-sm">
              <i data-lucide="calendar" aria-hidden="true"></i>
              ${formatDate(meeting.date)}
              ${meeting.start_time ? ` &bull; ${meeting.start_time} – ${meeting.end_time || '...'}` : ''}
              ${meeting.location ? ` &bull; <i data-lucide="map-pin" aria-hidden="true" style="display:inline-block;width:14px;height:14px"></i> ${sanitize(meeting.location)}` : ''}
            </div>
          </div>
        </div>
        <div class="page-header__actions">
          ${nextStatusLabel ? `<button class="btn btn--primary" id="advanceStatusBtn" data-next="${nextStatus}">
            <i data-lucide="arrow-right-circle" aria-hidden="true"></i> Mark as ${nextStatusLabel}
          </button>` : ''}
          ${meeting.status !== 'cancelled' ? `<button class="btn btn--ghost btn--danger" id="cancelMeetingBtn">
            <i data-lucide="x-circle" aria-hidden="true"></i> Cancel
          </button>` : ''}
          <button class="btn btn--ghost" id="editMeetingBtn">
            <i data-lucide="edit-2" aria-hidden="true"></i> Edit
          </button>
        </div>
      </div>

      <!-- Status Bar -->
      <div class="meeting-status-bar card" style="margin-bottom:var(--space-4)">
        <div class="card__body" style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;padding:var(--space-3) var(--space-4)">
          ${renderBadge(statusInfo.label, statusInfo.color)}
          ${renderBadge(typeLabel, 'ghost')}
          ${linkedProjects ? `<div style="display:flex;gap:var(--space-2);flex-wrap:wrap">${linkedProjects}</div>` : ''}
          ${totalAgenda > 0 ? `
            <div class="agenda-progress" style="margin-left:auto">
              <span class="text-sm text-muted">${doneCnt}/${totalAgenda} agenda items done</span>
              <div class="progress-bar progress-bar--sm">
                <div class="progress-bar__fill" style="width:${totalAgenda > 0 ? Math.round(doneCnt/totalAgenda*100) : 0}%"></div>
              </div>
            </div>` : ''}
        </div>
      </div>

      <div class="meeting-detail-grid">
        <!-- Left Column -->
        <div class="meeting-detail-main">

          <!-- Agenda -->
          <div class="card" style="margin-bottom:var(--space-4)">
            <div class="card__body">
              <h2 class="section-title"><i data-lucide="list-checks" aria-hidden="true"></i> Agenda</h2>
              <div id="agendaChecklist" class="agenda-checklist">
                ${agendaHTML}
              </div>
            </div>
          </div>

          <!-- Notulensi -->
          <div class="card" style="margin-bottom:var(--space-4)">
            <div class="card__body">
              <h2 class="section-title"><i data-lucide="file-text" aria-hidden="true"></i> Notulensi</h2>

              <div class="notulensi-mode-tabs" role="tablist">
                <button class="btn btn--sm btn--ghost notulensi-tab is-active" data-mode="text" role="tab" aria-selected="true">
                  <i data-lucide="edit-3" aria-hidden="true"></i> Text Editor
                </button>
                <button class="btn btn--sm btn--ghost notulensi-tab" data-mode="file" role="tab" aria-selected="false">
                  <i data-lucide="paperclip" aria-hidden="true"></i> File Attachment
                </button>
              </div>

              <!-- Mode 1: Markdown Editor -->
              <div id="notulensi-text-panel" class="notulensi-panel">
                <div class="notulensi-editor-bar">
                  <button class="btn btn--ghost btn--sm notulensi-toggle-preview" id="togglePreviewBtn">
                    <i data-lucide="eye" aria-hidden="true"></i> Preview
                  </button>
                </div>
                <div id="notulensi-editor-wrap">
                  <textarea id="notulensiEditor" class="form-textarea notulensi-textarea" rows="10"
                    placeholder="Write meeting notes in Markdown...">${sanitize(notulensi.content || '')}</textarea>
                </div>
                <div id="notulensi-preview-wrap" class="notulensi-preview markdown-body" style="display:none"></div>
                <div class="notulensi-editor-actions" style="margin-top:var(--space-3)">
                  <button class="btn btn--primary btn--sm" id="saveNotulensiBtn">
                    <i data-lucide="save" aria-hidden="true"></i> Save Notes
                  </button>
                </div>
              </div>

              <!-- Mode 2: File Attachment -->
              <div id="notulensi-file-panel" class="notulensi-panel" style="display:none">
                <div id="attachmentsList" class="attachments-list">
                  ${attachmentsHTML || '<p class="text-muted text-sm">No attachments yet.</p>'}
                </div>
                <div class="file-upload-area" style="margin-top:var(--space-3)">
                  <label for="notulensiFileInput" class="btn btn--ghost btn--sm">
                    <i data-lucide="upload" aria-hidden="true"></i> Upload File (max 5MB)
                  </label>
                  <input type="file" id="notulensiFileInput" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                    style="display:none" aria-label="Upload notulensi file">
                  <span class="text-muted text-sm">PDF, DOCX, images supported</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Items -->
          <div class="card">
            <div class="card__body">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
                <h2 class="section-title" style="margin:0"><i data-lucide="check-circle-2" aria-hidden="true"></i> Action Items</h2>
                <button class="btn btn--primary btn--sm" id="addActionItemBtn">
                  <i data-lucide="plus" aria-hidden="true"></i> Add Item
                </button>
              </div>
              <div id="actionItemsList">${actionItemsHTML}</div>
            </div>
          </div>

        </div>

        <!-- Right Column: Info Panel -->
        <div class="meeting-detail-sidebar">
          <div class="card" style="margin-bottom:var(--space-4)">
            <div class="card__body">
              <h3 class="section-title"><i data-lucide="users" aria-hidden="true"></i> Attendees</h3>
              <div class="attendees-list">
                ${attendeesList || '<p class="text-muted text-sm">No attendees listed.</p>'}
              </div>
            </div>
          </div>
          ${meeting.description ? `
          <div class="card">
            <div class="card__body">
              <h3 class="section-title"><i data-lucide="info" aria-hidden="true"></i> Description</h3>
              <p class="text-sm">${sanitize(meeting.description)}</p>
            </div>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function bindDetailEvents(meeting, users, projects, tasks) {
  const content = document.getElementById('main-content');
  if (!content) return;

  // Edit meeting
  content.querySelector('#editMeetingBtn')?.addEventListener('click', async () => {
    await openMeetingModal(meeting.id);
  });

  // Advance status
  content.querySelector('#advanceStatusBtn')?.addEventListener('click', async () => {
    const nextStatus = content.querySelector('#advanceStatusBtn').dataset.next;
    await updateMeetingStatus(meeting, nextStatus);
  });

  // Cancel meeting
  content.querySelector('#cancelMeetingBtn')?.addEventListener('click', async () => {
    if (meeting.status === 'cancelled') return;
    await updateMeetingStatus(meeting, 'cancelled');
  });

  // Agenda checkboxes
  content.querySelectorAll('.agenda-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const agendaId = cb.closest('.agenda-check-item').dataset.agendaId;
      await toggleAgendaItem(meeting, agendaId, cb.checked);
      const label = cb.nextElementSibling;
      if (label) label.classList.toggle('agenda-check-item__text--done', cb.checked);
    });
  });

  // Notulensi tabs
  content.querySelectorAll('.notulensi-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      content.querySelectorAll('.notulensi-tab').forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      const mode = tab.dataset.mode;
      content.querySelector('#notulensi-text-panel').style.display = mode === 'text' ? '' : 'none';
      content.querySelector('#notulensi-file-panel').style.display = mode === 'file' ? '' : 'none';
    });
  });

  // Toggle preview
  let previewMode = false;
  content.querySelector('#togglePreviewBtn')?.addEventListener('click', () => {
    previewMode = !previewMode;
    const editorWrap = content.querySelector('#notulensi-editor-wrap');
    const previewWrap = content.querySelector('#notulensi-preview-wrap');
    const toggleBtn = content.querySelector('#togglePreviewBtn');
    if (previewMode) {
      const text = content.querySelector('#notulensiEditor')?.value || '';
      previewWrap.innerHTML = renderMarkdown(text);
      editorWrap.style.display = 'none';
      previewWrap.style.display = '';
      toggleBtn.innerHTML = '<i data-lucide="edit-3" aria-hidden="true"></i> Edit';
    } else {
      editorWrap.style.display = '';
      previewWrap.style.display = 'none';
      toggleBtn.innerHTML = '<i data-lucide="eye" aria-hidden="true"></i> Preview';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  // Save notulensi text
  content.querySelector('#saveNotulensiBtn')?.addEventListener('click', async () => {
    const text = content.querySelector('#notulensiEditor')?.value || '';
    await saveNotulensiText(meeting, text);
  });

  // File upload
  content.querySelector('#notulensiFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadNotulensiFile(meeting, file);
    e.target.value = '';
  });

  // Attachment download/delete
  content.querySelectorAll('[id^="downloadAtt-"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.attIndex, 10);
      const att = meeting.notulensi?.attachments?.[idx];
      if (!att) return;
      const link = document.createElement('a');
      link.href = att.data;
      link.download = att.name;
      link.click();
    });
  });
  content.querySelectorAll('[id^="deleteAtt-"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.attIndex, 10);
      const confirmed = await showConfirm({ title: 'Delete Attachment', message: 'Remove this attachment?', confirmLabel: 'Delete', danger: true });
      if (!confirmed) return;
      meeting.notulensi.attachments.splice(idx, 1);
      meeting.updated_at = nowISO();
      await update('meetings', meeting);
      showToast('Attachment removed.', 'success');
      await renderDetail({ id: meeting.id });
    });
  });

  // Add action item
  content.querySelector('#addActionItemBtn')?.addEventListener('click', () => openAddActionItemModal(meeting, users, projects));

  // Create Task from action item
  content.querySelectorAll('.btn--create-task').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.aiIndex, 10);
      openCreateTaskFromActionItem(meeting, idx, users, projects, tasks);
    });
  });

  // Delete action item
  content.querySelectorAll('.btn--delete-ai').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.aiIndex, 10);
      const confirmed = await showConfirm({ title: 'Delete Action Item', message: 'Remove this action item?', confirmLabel: 'Delete', danger: true });
      if (!confirmed) return;
      meeting.action_items.splice(idx, 1);
      meeting.updated_at = nowISO();
      await update('meetings', meeting);
      showToast('Action item removed.', 'success');
      await renderDetail({ id: meeting.id });
    });
  });
}

// ─── Status Update ────────────────────────────────────────────────────────────

async function updateMeetingStatus(meeting, newStatus) {
  const oldStatus = meeting.status;
  meeting.status = newStatus;
  meeting.updated_at = nowISO();
  try {
    await update('meetings', meeting);
    await logActivity({
      entity_type: 'meeting',
      entity_id: meeting.id,
      entity_name: meeting.title,
      action: newStatus === 'done' ? 'meeting_completed' : 'status_changed',
      project_id: meeting.project_ids?.[0] || null,
      changes: [{ field: 'status', old_value: oldStatus, new_value: newStatus }],
    });
    showToast(`Meeting marked as ${MEETING_STATUSES[newStatus]?.label || newStatus}.`, 'success');
    await renderDetail({ id: meeting.id });
  } catch (err) {
    showToast('Failed to update status.', 'error');
  }
}

// ─── Agenda Checklist ─────────────────────────────────────────────────────────

async function toggleAgendaItem(meeting, agendaId, done) {
  const item = (meeting.agenda_items || []).find(a => a.id === agendaId);
  if (!item) return;
  item.done = done;
  meeting.updated_at = nowISO();
  try {
    await update('meetings', meeting);
  } catch (err) {
    showToast('Failed to update agenda item.', 'error');
  }
}

// ─── Notulensi ────────────────────────────────────────────────────────────────

async function saveNotulensiText(meeting, text) {
  const session = getSession();
  if (!meeting.notulensi) meeting.notulensi = { content: '', attachments: [], created_by: session?.userId };
  meeting.notulensi.content = text;
  meeting.notulensi.updated_at = nowISO();
  meeting.updated_at = nowISO();
  try {
    await update('meetings', meeting);
    await logActivity({
      entity_type: 'meeting',
      entity_id: meeting.id,
      entity_name: meeting.title,
      action: 'updated',
      project_id: meeting.project_ids?.[0] || null,
      metadata: { field: 'notulensi' },
    });
    showToast('Notes saved.', 'success');
  } catch (err) {
    showToast('Failed to save notes.', 'error');
  }
}

async function uploadNotulensiFile(meeting, file) {
  if (file.size > 5 * 1024 * 1024) {
    showToast('File exceeds 5MB limit.', 'error');
    return;
  }

  const session = getSession();
  if (!meeting.notulensi) meeting.notulensi = { content: '', attachments: [], created_by: session?.userId };

  const reader = new FileReader();
  reader.onload = async (e) => {
    const attachment = {
      name: file.name,
      size: file.size,
      mime_type: file.type,
      data: e.target.result, // base64 data URL
      uploaded_at: nowISO(),
    };
    meeting.notulensi.attachments = meeting.notulensi.attachments || [];
    meeting.notulensi.attachments.push(attachment);
    meeting.notulensi.updated_at = nowISO();
    meeting.updated_at = nowISO();
    try {
      await update('meetings', meeting);
      await logActivity({
        entity_type: 'meeting',
        entity_id: meeting.id,
        entity_name: meeting.title,
        action: 'uploaded',
        project_id: meeting.project_ids?.[0] || null,
        metadata: { filename: file.name },
      });
      showToast(`File "${file.name}" uploaded.`, 'success');
      await renderDetail({ id: meeting.id });
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    }
  };
  reader.onerror = () => showToast('Failed to read file.', 'error');
  reader.readAsDataURL(file);
}

// ─── Action Items ─────────────────────────────────────────────────────────────

function openAddActionItemModal(meeting, users, projects) {
  const userOptions = users.map(u => `<option value="${u.id}">${sanitize(u.full_name)}</option>`).join('');

  const html = `
    <form id="actionItemForm" novalidate>
      <div class="form-group">
        <label class="form-label" for="aiText">Action Item <span class="form-required">*</span></label>
        <input type="text" id="aiText" class="form-input" placeholder="Describe the action item..." required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="aiAssignee">Assignee</label>
          <select id="aiAssignee" class="form-select">
            <option value="">-- Unassigned --</option>
            ${userOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="aiDueDate">Due Date</label>
          <input type="date" id="aiDueDate" class="form-input">
        </div>
      </div>
    </form>
  `;

  openModal({
    title: 'Add Action Item',
    body: html,
    footer: `
      <button class="btn btn--ghost" id="aiCancelBtn">Cancel</button>
      <button class="btn btn--primary" id="aiSaveBtn">Add Action Item</button>
    `,
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('aiCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('aiSaveBtn')?.addEventListener('click', async () => {
    const text = document.getElementById('aiText')?.value.trim();
    if (!text) { showToast('Action item text is required.', 'error'); return; }
    const assigneeId = document.getElementById('aiAssignee')?.value || null;
    const dueDate = document.getElementById('aiDueDate')?.value || null;

    meeting.action_items = meeting.action_items || [];
    meeting.action_items.push({ text, assignee_id: assigneeId, due_date: dueDate, task_id: null });
    meeting.updated_at = nowISO();

    try {
      await update('meetings', meeting);
      closeModal();
      showToast('Action item added.', 'success');
      await renderDetail({ id: meeting.id });
    } catch (err) {
      showToast('Failed to add action item.', 'error');
    }
  });
}

function openCreateTaskFromActionItem(meeting, aiIndex, users, projects, allTasks) {
  const ai = meeting.action_items?.[aiIndex];
  if (!ai) return;

  const assignee = users.find(u => u.id === ai.assignee_id);

  const projectOptions = (meeting.project_ids || []).length > 0
    ? meeting.project_ids.map(pid => {
        const p = projects.find(x => x.id === pid);
        return p ? `<option value="${p.id}">${sanitize(p.name)}</option>` : '';
      }).join('')
    : projects.map(p => `<option value="${p.id}">${sanitize(p.name)}</option>`).join('');

  const assigneeOptions = users.map(u =>
    `<option value="${u.id}" ${u.id === ai.assignee_id ? 'selected' : ''}>${sanitize(u.full_name)}</option>`
  ).join('');

  const html = `
    <form id="createTaskForm" novalidate>
      <div class="form-group">
        <label class="form-label" for="ctTitle">Task Title <span class="form-required">*</span></label>
        <input type="text" id="ctTitle" class="form-input" value="${sanitize(ai.text)}" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="ctProject">Project <span class="form-required">*</span></label>
        <select id="ctProject" class="form-select" required>
          <option value="">-- Select Project --</option>
          ${projectOptions}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="ctAssignee">Assignee</label>
          <select id="ctAssignee" class="form-select">
            <option value="">-- Unassigned --</option>
            ${assigneeOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ctDueDate">Due Date</label>
          <input type="date" id="ctDueDate" class="form-input" value="${ai.due_date || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="ctPriority">Priority</label>
          <select id="ctPriority" class="form-select">
            <option value="medium" selected>Medium</option>
            <option value="low">Low</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="ctType">Type</label>
          <select id="ctType" class="form-select">
            <option value="task" selected>Task</option>
            <option value="story">Story</option>
            <option value="bug">Bug</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="ctDescription">Description</label>
        <textarea id="ctDescription" class="form-textarea" rows="3" placeholder="Optional task description...">From meeting: ${sanitize(meeting.title)}</textarea>
      </div>
    </form>
  `;

  openModal({
    title: 'Create Task from Action Item',
    body: html,
    footer: `
      <button class="btn btn--ghost" id="ctCancelBtn">Cancel</button>
      <button class="btn btn--primary" id="ctSaveBtn">
        <i data-lucide="plus-circle" aria-hidden="true"></i> Create Task
      </button>
    `,
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('ctCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('ctSaveBtn')?.addEventListener('click', async () => {
    const title = document.getElementById('ctTitle')?.value.trim();
    const projectId = document.getElementById('ctProject')?.value;
    if (!title) { showToast('Task title is required.', 'error'); return; }
    if (!projectId) { showToast('Please select a project.', 'error'); return; }

    const session = getSession();
    const now = nowISO();
    const allCurrentTasks = await getAll('tasks');

    const { ID_PREFIX: IDP } = await import('../core/utils.js');
    const newTask = {
      id: generateSequentialId(IDP.TASK, allCurrentTasks),
      project_id: projectId,
      title,
      description: document.getElementById('ctDescription')?.value || '',
      type: document.getElementById('ctType')?.value || 'task',
      status: 'backlog',
      priority: document.getElementById('ctPriority')?.value || 'medium',
      assignees: document.getElementById('ctAssignee')?.value ? [document.getElementById('ctAssignee').value] : [],
      reporter: session?.userId || null,
      sprint_id: null,
      epic_id: null,
      story_points: 0,
      start_date: null,
      due_date: document.getElementById('ctDueDate')?.value || null,
      completed_at: null,
      tags: [],
      attachments: [],
      checklist: [],
      comments: [],
      time_logged: 0,
      dependencies: [],
      meeting_ref: meeting.id, // reference back to meeting
      created_at: now,
      updated_at: now,
    };

    try {
      await add('tasks', newTask);

      // Update action item with task_id
      meeting.action_items[aiIndex].task_id = newTask.id;
      meeting.updated_at = now;
      await update('meetings', meeting);

      await logActivity({
        entity_type: 'task',
        entity_id: newTask.id,
        entity_name: newTask.title,
        action: 'created',
        project_id: projectId,
        metadata: { source: 'meeting_action_item', meeting_id: meeting.id },
      });

      closeModal();
      showToast(`Task "${title}" created in backlog.`, 'success');
      await renderDetail({ id: meeting.id });
    } catch (err) {
      showToast('Failed to create task: ' + err.message, 'error');
    }
  });
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Very simple Markdown renderer (subset: headings, bold, italic, code, lists, links, paragraphs).
 */
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

export default { render, renderDetail };
