/**
 * TRACKLY — utils.js
 * Formatting helpers, date utilities, ID generators, and debug utility.
 * All date formatting must use these helpers — never format dates inline in modules.
 */

// ============================================================
// DEBUG UTILITY
// ============================================================

const DEBUG_KEY = 'trackly_debug';

/**
 * Toggleable debug logger. Replaces console.log in all modules.
 * Set localStorage.trackly_debug = 'true' to enable.
 * @param {...*} args
 */
export function debug(...args) {
  if (localStorage.getItem(DEBUG_KEY) === 'true') {
    console.log('[TRACKLY]', ...args);
  }
}

// ============================================================
// ID GENERATORS
// ============================================================

/**
 * Prefix constants for entity IDs.
 */
export const ID_PREFIX = {
  USER:        'USR',
  PROJECT:     'PRJ',
  TASK:        'TSK',
  SPRINT:      'SPR',
  CLIENT:      'CLT',
  ASSET:       'AST',
  MAINTENANCE: 'MNT',
  INVOICE:     'INV',
  ACTIVITY:    'ACT',
  MEETING:     'MTG',
  DISCUSSION:  'DSC',
};

/**
 * Generate a unique entity ID in the format PREFIX-XXXX.
 * Uses a timestamp + random component for uniqueness.
 * @param {string} prefix  One of ID_PREFIX values
 * @returns {string}  e.g. 'PRJ-0042'
 */
export function generateId(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}-${random}`;
}

/**
 * Generate a sequential ID from an existing list of records.
 * @param {string} prefix
 * @param {Array} existingRecords  Array of objects with an `id` property
 * @returns {string}
 */
export function generateSequentialId(prefix, existingRecords = []) {
  const numbers = existingRecords
    .map((r) => {
      const parts = (r.id || '').split('-');
      return parseInt(parts[1], 10) || 0;
    })
    .filter((n) => !isNaN(n));

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

// ============================================================
// DATE HELPERS
// ============================================================

/**
 * Format a date as a human-readable string.
 * @param {string|Date} date  ISO string or Date object
 * @param {string} format  'short' | 'long' | 'time' | 'datetime' | custom pattern (e.g. 'DD MMM YYYY')
 * @returns {string}
 */
export function formatDate(date, format = 'short') {
  if (!date) return '—';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  // Support custom format patterns
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const customPatterns = {
    'DD MMM YYYY': () => {
      const dd   = String(d.getDate()).padStart(2, '0');
      const mmm  = MONTHS_SHORT[d.getMonth()];
      const yyyy = d.getFullYear();
      return `${dd} ${mmm} ${yyyy}`;
    },
    'MM/DD/YYYY': () => {
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    },
    'YYYY-MM-DD': () => {
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    },
    'DD/MM/YYYY': () => {
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    },
  };

  if (customPatterns[format]) {
    return customPatterns[format]();
  }

  const presets = {
    short:    { year: 'numeric', month: 'short', day: 'numeric' },
    long:     { year: 'numeric', month: 'long', day: 'numeric' },
    time:     { hour: '2-digit', minute: '2-digit' },
    datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return d.toLocaleDateString('en-US', presets[format] || presets.short);
}

/**
 * Format a date as a relative string ("3 days ago", "in 2 weeks").
 * @param {string|Date} date
 * @returns {string}
 */
export function formatRelativeDate(date) {
  if (!date) return '—';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  const now = Date.now();
  const diffMs = d.getTime() - now;
  const absDiff = Math.abs(diffMs);

  const MINUTE = 60 * 1000;
  const HOUR   = 60 * MINUTE;
  const DAY    = 24 * HOUR;
  const WEEK   = 7 * DAY;
  const MONTH  = 30 * DAY;

  let value, unit;

  if (absDiff < MINUTE) {
    return 'just now';
  } else if (absDiff < HOUR) {
    value = Math.round(absDiff / MINUTE);
    unit = 'minute';
  } else if (absDiff < DAY) {
    value = Math.round(absDiff / HOUR);
    unit = 'hour';
  } else if (absDiff < WEEK) {
    value = Math.round(absDiff / DAY);
    unit = 'day';
  } else if (absDiff < MONTH) {
    value = Math.round(absDiff / WEEK);
    unit = 'week';
  } else {
    value = Math.round(absDiff / MONTH);
    unit = 'month';
  }

  const plural = value !== 1 ? `${unit}s` : unit;

  return diffMs < 0
    ? `${value} ${plural} ago`
    : `in ${value} ${plural}`;
}

/**
 * Return an ISO 8601 timestamp string for the current moment.
 * @returns {string}
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Check if a date is in the past.
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isPast(date) {
  return new Date(date).getTime() < Date.now();
}

/**
 * Check if a date is within N days from now.
 * @param {string|Date} date
 * @param {number} days
 * @returns {boolean}
 */
export function isWithinDays(date, days) {
  const d = new Date(date).getTime();
  const now = Date.now();
  return d >= now && d <= now + days * 24 * 60 * 60 * 1000;
}

// ============================================================
// NUMBER / CURRENCY HELPERS
// ============================================================

/**
 * Format a number as a currency string.
 * @param {number} amount
 * @param {string} currency  e.g. 'IDR', 'USD'
 * @param {string} locale    e.g. 'id-ID', 'en-US'
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'IDR', locale = 'id-ID') {
  if (isNaN(amount)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format minutes as a human-readable duration.
 * @param {number} minutes
 * @returns {string}  e.g. '2h 30m', '45m'
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ============================================================
// STRING HELPERS
// ============================================================

/**
 * Truncate a string to a max length with ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

/**
 * Generate initials from a full name (max 2 characters).
 * @param {string} fullName
 * @returns {string}  e.g. 'JD' for 'John Doe'
 */
export function getInitials(fullName) {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

/**
 * Sanitize a string for safe DOM insertion via textContent.
 * Use this before setting any user-generated content.
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, (char) => {
    const map = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

/**
 * Convert snake_case or kebab-case to Title Case.
 * @param {string} str  e.g. 'in_progress'
 * @returns {string}  e.g. 'In Progress'
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================
// ACTIVITY LOG HELPER
// ============================================================

/**
 * Log a significant action to the activity_log store.
 * This is the centralised write point for all audit trail entries.
 *
 * @param {Object} params
 * @param {string|null} params.project_id     - Project context (null for global)
 * @param {string}      params.entity_type    - e.g. 'task', 'project', 'sprint', ...
 * @param {string}      params.entity_id      - ID of the affected record
 * @param {string}      params.entity_name    - Snapshot of entity name at time of action
 * @param {string}      params.action         - 'created'|'updated'|'deleted'|'status_changed'|...
 * @param {Array}       [params.changes]      - [{field, old_value, new_value}] for updates
 * @param {Object}      [params.metadata]     - Extra context
 * @returns {Promise<void>}
 */
export async function logActivity({
  project_id = null,
  entity_type,
  entity_id,
  entity_name,
  action,
  changes = [],
  metadata = {},
}) {
  try {
    // Dynamic import to avoid circular dep issues
    const { add, getAll } = await import('./db.js');
    const { getSession } = await import('./auth.js');

    const session = getSession();
    const allLogs = await getAll('activity_log');
    const id = generateSequentialId(ID_PREFIX.ACTIVITY, allLogs);

    const entry = {
      id,
      project_id,
      entity_type,
      entity_id,
      entity_name,
      action,
      actor_id: session?.userId || null,
      actor_name: session?.fullName || session?.username || 'Unknown',
      changes,
      metadata,
      created_at: nowISO(),
    };

    await add('activity_log', entry);
  } catch (err) {
    // Never let logging failures break the UI
    if (localStorage.getItem('trackly_debug') === 'true') {
      console.warn('[TRACKLY] logActivity failed:', err);
    }
  }
}

// ============================================================
// DOM HELPERS
// ============================================================

/**
 * Create a DOM element with optional attributes and text content.
 * @param {string} tag
 * @param {Object} [attrs]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, text = '') {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') {
      el.className = val;
    } else {
      el.setAttribute(key, val);
    }
  }
  if (text) el.textContent = text;
  return el;
}

// ─── Project Banner Builder ───────────────────────────────────────────────────
// Shared helper so all project sub-pages render the same banner as Overview.
// activeTab: 'board'|'backlog'|'sprint'|'gantt'|'discussion'|'maintenance'|'log'|'reports'
export function buildProjectBanner(project, activeTab, options = {}) {
  const { renderBadge: badge, isAdminOrPM } = options;
  if (!project || !badge) return '';

  const STATUS_LABEL  = { planning:'Planning', active:'Active', maintenance:'Maintenance', on_hold:'On Hold', completed:'Completed', cancelled:'Cancelled' };
  const PHASE_LABEL   = { development:'Development', uat:'UAT', deployment:'Deployment', running:'Running', maintenance:'Maintenance' };
  const PRIORITY_LABEL = { low:'Low', medium:'Medium', high:'High', critical:'Critical' };
  const STATUS_VARIANT = { planning:'info', active:'success', maintenance:'warning', on_hold:'neutral', completed:'success', cancelled:'danger' };
  const PRIORITY_VARIANT = { low:'neutral', medium:'info', high:'warning', critical:'danger' };

  const coverColor   = sanitize(project.cover_color || '#2563EB');
  const isOverdue    = project.end_date && isPast(project.end_date) && !['completed','cancelled'].includes(project.status);
  const showMaint    = ['running','maintenance'].includes(project.phase) || ['maintenance'].includes(project.status);
  const id           = sanitize(project.id);
  const adminOrPm    = isAdminOrPM;

  const statusBadge   = badge(STATUS_LABEL[project.status]   || project.status,   STATUS_VARIANT[project.status]   || 'neutral');
  const phaseBadge    = project.phase  ? badge(PHASE_LABEL[project.phase]     || project.phase,    'info')                                    : '';
  const priorityBadge = project.priority ? badge(PRIORITY_LABEL[project.priority] || project.priority, PRIORITY_VARIANT[project.priority] || 'neutral') : '';
  const overdueBadge  = isOverdue ? badge('Overdue', 'danger') : '';

  const tabLink = (tab, icon, label, tabId) =>
    '<a class="project-subnav__link' + (activeTab === tabId ? ' is-active' : '') + '" href="#/projects/' + id + (tabId === 'overview' ? '' : '/' + tabId) + '">' +
    '<i data-lucide="' + icon + '" aria-hidden="true"></i> ' + label + '</a>';

  return `
    <div class="project-detail-banner" style="background:${coverColor};">
      <div class="project-detail-banner__content">
        <div class="project-detail-banner__breadcrumb">
          <a href="#/projects" class="project-breadcrumb-link">
            <i data-lucide="folder" aria-hidden="true"></i> Projects
          </a>
          <i data-lucide="chevron-right" aria-hidden="true"></i>
          <span>${sanitize(project.name)}</span>
        </div>
        <div class="project-detail-banner__info">
          <div class="project-detail-banner__text">
            <div class="project-detail-banner__badges">
              ${statusBadge}${phaseBadge}${priorityBadge}${overdueBadge}
            </div>
            <h1 class="project-detail-banner__title">${sanitize(project.name)}</h1>
            <p class="project-detail-banner__code text-mono">${sanitize(project.code || project.id)}</p>
            ${project.description ? '<p class="project-detail-banner__desc">' + sanitize(project.description) + '</p>' : ''}
          </div>
          <div class="project-detail-banner__actions">
            <a href="#/projects/${id}" class="btn btn--outline-white">
              <i data-lucide="pencil" aria-hidden="true"></i> Edit Project
            </a>
          </div>
        </div>
      </div>
    </div>
    <div class="project-subnav">
      ${tabLink('overview',     'layout-dashboard', 'Overview',    'overview')}
      ${tabLink('board',        'kanban',            'Board',       'board')}
      ${tabLink('backlog',      'list',              'Backlog',     'backlog')}
      ${tabLink('sprint',       'zap',               'Sprint',      'sprint')}
      ${tabLink('gantt',        'gantt-chart',       'Gantt',       'gantt')}
      ${tabLink('discussion',   'message-circle',    'Discussion',  'discussion')}
      ${showMaint ? tabLink('maintenance', 'wrench', 'Maintenance', 'maintenance') : ''}
      ${tabLink('reports',      'bar-chart-2',       'Reports',     'reports')}
      ${adminOrPm ? tabLink('log', 'clock', 'Log', 'log') : ''}
    </div>`;
}

export default {
  debug,
  ID_PREFIX,
  generateId,
  generateSequentialId,
  logActivity,
  formatDate,
  formatRelativeDate,
  nowISO,
  isPast,
  isWithinDays,
  formatCurrency,
  formatDuration,
  truncate,
  getInitials,
  sanitize,
  toTitleCase,
  createElement,
  buildProjectBanner,
};
