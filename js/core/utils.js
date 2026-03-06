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
  USER: 'USR',
  PROJECT: 'PRJ',
  TASK: 'TSK',
  SPRINT: 'SPR',
  CLIENT: 'CLT',
  ASSET: 'AST',
  MAINTENANCE: 'MNT',
  INVOICE: 'INV',
  ACTIVITY: 'ACT',
  MEETING: 'MTG',
  DISCUSSION: 'DSC',
  NOTIFICATION: 'NTF',
  NOTE: 'NOTE',
  NOTE_FOLDER: 'NFLD',
  NAUD: 'NAUD',
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
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const customPatterns = {
    'DD MMM YYYY': () => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mmm = MONTHS_SHORT[d.getMonth()];
      const yyyy = d.getFullYear();
      return `${dd} ${mmm} ${yyyy}`;
    },
    'MM/DD/YYYY': () => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    },
    'YYYY-MM-DD': () => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    },
    'DD/MM/YYYY': () => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    },
  };

  if (customPatterns[format]) {
    return customPatterns[format]();
  }

  const presets = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
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
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

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
 * Returns the current timestamp in a format ready for backend migration.
 * Currently uses ISO strings for IndexedDB.
 * During Firebase migration, this can be swapped with serverTimestamp().
 * @returns {string|Object}
 */
export function getTimestamp() {
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

    const actorId = session?.userId || null;
    const actorName = session?.fullName || session?.username || 'Unknown';

    const entry = {
      id,
      project_id,
      entity_type,
      entity_id,
      entity_name,
      action,
      actor_id: actorId,
      actor_name: actorName,
      changes,
      metadata,
      created_at: nowISO(),
    };

    await add('activity_log', entry);

    // ── Generate Notifications ──────────────────────────────────
    try {
      await _generateNotifications({
        add, getAll,
        actorId, actorName,
        project_id, entity_type, entity_id, entity_name, action, metadata,
      });
    } catch (_err) {
      if (localStorage.getItem('trackly_debug') === 'true') {
        console.warn('[TRACKLY] generateNotifications failed:', _err);
      }
    }
  } catch (err) {
    // Never let logging failures break the UI
    if (localStorage.getItem('trackly_debug') === 'true') {
      console.warn('[TRACKLY] logActivity failed:', err);
    }
  }
}

/**
 * Internal helper — build and persist notifications for an activity event.
 * 2-tier system:
 *   Tier 1 (Personal) — sent directly to assignees / reporter / attendees
 *   Tier 2 (Broadcast) — sent to role-appropriate project members or global admins
 */
async function _generateNotifications({ add, getAll, actorId, actorName, project_id, entity_type, entity_id, entity_name, action, metadata }) {
  const users = await getAll('users');

  // Roles allowed to receive operational/broadcast notifications
  const OPERATIONAL_ROLES = ['admin', 'pm', 'member'];

  // personalNotifs: Map<userId, customMessage|null>  (null = use default message)
  const personalNotifs = new Map();
  // broadcastIds: Set<userId>  (receives default message, deduped vs personalNotifs)
  const broadcastIds = new Set();

  // ── 1. Meeting: attendees only ─────────────────────────────────────────────
  if (entity_type === 'meeting') {
    (metadata?.attendee_ids || [])
      .filter((uid) => uid !== actorId)
      .forEach((uid) => personalNotifs.set(uid, null));
  }

  // ── 2. Task: 2-tier (personal for assignees/reporter + broadcast for project) ─
  else if (entity_type === 'task') {
    const taskAssignees = metadata?.assignees || [];
    const taskReporter = metadata?.reporter || null;
    const newlyAssigned = metadata?.newly_assigned || [];

    // Tier 1a: if action is 'assigned', only ping newly-added assignees with a
    //          personal message — don't broadcast to whole project
    if (action === 'assigned' && newlyAssigned.length) {
      newlyAssigned
        .filter((uid) => uid !== actorId)
        .forEach((uid) =>
          personalNotifs.set(uid, `${actorName} menugaskan kamu pada task "${entity_name}"`)
        );
    } else {
      // Tier 1b: created / updated / deleted / status_changed → ping all assignees + reporter
      [...taskAssignees, taskReporter]
        .filter((uid) => uid && uid !== actorId)
        .forEach((uid) => personalNotifs.set(uid, null));
    }

    // Tier 2: broadcast to project members (admin, pm, member only) — skip if no project
    if (project_id) {
      const projects = await getAll('projects');
      const project = projects.find((p) => p.id === project_id);
      (project?.member_ids || [])
        .map((uid) => users.find((u) => u.id === uid))
        .filter((u) => u && OPERATIONAL_ROLES.includes(u.role) && u.id !== actorId)
        .forEach((u) => {
          if (!personalNotifs.has(u.id)) broadcastIds.add(u.id);
        });
    }
  }

  // ── 3. Sprint / Discussion: project members (admin, pm, member) only ───────
  else if (['sprint', 'discussion'].includes(entity_type) && project_id) {
    const projects = await getAll('projects');
    const project = projects.find((p) => p.id === project_id);
    (project?.member_ids || [])
      .map((uid) => users.find((u) => u.id === uid))
      .filter((u) => u && OPERATIONAL_ROLES.includes(u.role) && u.id !== actorId)
      .forEach((u) => broadcastIds.add(u.id));
  }

  // ── 4. Maintenance: admin + PM only ────────────────────────────────────────
  else if (entity_type === 'maintenance') {
    users
      .filter((u) => ['admin', 'pm'].includes(u.role) && u.id !== actorId)
      .forEach((u) => broadcastIds.add(u.id));
  }

  // ── 5. Member management: admin only ─────────────────────────────────────
  else if (entity_type === 'member') {
    users
      .filter((u) => u.role === 'admin' && u.id !== actorId)
      .forEach((u) => broadcastIds.add(u.id));
  }

  // ── 6. Global / everything else (project, client, asset, invoice): admin + PM
  else {
    users
      .filter((u) => ['admin', 'pm'].includes(u.role) && u.id !== actorId)
      .forEach((u) => broadcastIds.add(u.id));
  }

  // Build combined recipient list (personalNotifs + broadcastIds)
  const allRecipients = new Map(personalNotifs);
  for (const uid of broadcastIds) {
    if (!allRecipients.has(uid)) allRecipients.set(uid, null);
  }

  if (!allRecipients.size) return;

  // ── Build default message ──────────────────────────────────────────────────
  const actionVerbs = {
    created: 'membuat',
    updated: 'mengubah',
    deleted: 'menghapus',
    status_changed: 'mengubah status',
    assigned: 'menugaskan',
    commented: 'mengomentari',
    resolved: 'menyelesaikan',
    reopened: 'membuka kembali',
    closed: 'menutup',
    archived: 'mengarsipkan',
    restored: 'memulihkan',
    started: 'memulai',
    completed: 'menyelesaikan',
    sprint_started: 'memulai sprint',
    sprint_completed: 'menyelesaikan sprint',
    meeting_completed: 'menyelesaikan meeting',
  };
  const verb = actionVerbs[action] || action;

  let projectName = null;
  if (project_id) {
    const projects = await getAll('projects');
    const proj = projects.find((p) => p.id === project_id);
    projectName = proj?.name || null;
  }

  const defaultMessage = projectName
    ? `${actorName} ${verb} ${entity_name} di ${projectName}`
    : `${actorName} ${verb} ${entity_name}`;

  // Get actor avatar snapshot
  const actorUser = users.find((u) => u.id === actorId);
  const actorAvatar = actorUser?.avatar || '';

  // Get all existing notifications to generate sequential IDs
  const allNotifs = await getAll('notifications');
  let notifCounter = allNotifs.length;

  const createdAt = nowISO();

  for (const [uid, customMessage] of allRecipients) {
    notifCounter++;
    const notifId = `NTF-${String(notifCounter).padStart(4, '0')}`;
    await add('notifications', {
      id: notifId,
      user_id: uid,
      actor_id: actorId,
      actor_name: actorName,
      actor_avatar: actorAvatar,
      entity_type,
      entity_id,
      entity_name,
      action,
      message: customMessage || defaultMessage,
      project_id: project_id || null,
      project_name: projectName || null,
      read: false,
      created_at: createdAt,
    });
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
export async function buildProjectBanner(project, activeTab, options = {}) {
  const { renderBadge: badge, isAdminOrPM } = options;
  if (!project || !badge) return '';

  let parentProject = null;
  if (project.parent_id) {
    try {
      const { getById } = await import('./db.js');
      parentProject = await getById('projects', project.parent_id);
    } catch (err) {
      if (localStorage.getItem('trackly_debug') === 'true') {
        console.warn('[TRACKLY] Failed to fetch parent project for banner:', err);
      }
    }
  }

  const STATUS_LABEL = { planning: 'Planning', active: 'Active', maintenance: 'Maintenance', on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled' };
  const PHASE_LABEL = { development: 'Development', uat: 'UAT', deployment: 'Deployment', running: 'Running', maintenance: 'Maintenance' };
  const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
  const STATUS_VARIANT = { planning: 'info', active: 'success', maintenance: 'warning', on_hold: 'neutral', completed: 'success', cancelled: 'danger' };
  const PRIORITY_VARIANT = { low: 'neutral', medium: 'info', high: 'warning', critical: 'danger' };

  const coverColor = sanitize(project.cover_color || '#2563EB');
  const isOverdue = project.end_date && isPast(project.end_date) && !['completed', 'cancelled'].includes(project.status);
  const showMaint = ['running', 'maintenance'].includes(project.phase) || ['maintenance'].includes(project.status);
  const id = sanitize(project.id);
  const adminOrPm = isAdminOrPM;

  // Local helper: badge with on-banner styling (white text, semi-solid bg)
  const bannerBadge = (label, variant) =>
    `<span class="badge badge--${variant} badge--on-banner">${label}</span>`;

  const statusBadge = bannerBadge(STATUS_LABEL[project.status] || project.status, STATUS_VARIANT[project.status] || 'neutral');
  const phaseBadge = project.phase ? bannerBadge(PHASE_LABEL[project.phase] || project.phase, 'info') : '';
  const priorityBadge = project.priority ? bannerBadge(PRIORITY_LABEL[project.priority] || project.priority, PRIORITY_VARIANT[project.priority] || 'neutral') : '';
  const overdueBadge = isOverdue ? bannerBadge('Overdue', 'danger') : '';

  const tabLink = (tab, icon, label, tabId) =>
    '<a class="project-subnav__link' + (activeTab === tabId ? ' is-active' : '') + '" href="#/projects/' + id + (tabId === 'overview' ? '' : '/' + tabId) + '">' +
    '<i data-lucide="' + icon + '" aria-hidden="true"></i> ' + label + '</a>';

  const projectNameDisplay = parentProject ? `${sanitize(parentProject.name)} / ${sanitize(project.name)}` : sanitize(project.name);

  return `
    <div class="project-detail-banner" style="background:${coverColor};">
      <div class="project-detail-banner__content">
        <div class="project-detail-banner__breadcrumb">
          <a href="#/projects" class="project-breadcrumb-link">
            <i data-lucide="folder" aria-hidden="true"></i> Projects
          </a>
          <i data-lucide="chevron-right" aria-hidden="true"></i>
          <span>${projectNameDisplay}</span>
        </div>
        <div class="project-detail-banner__info">
          <div class="project-detail-banner__text">
            <div class="project-detail-banner__badges">
              ${statusBadge}${phaseBadge}${priorityBadge}${overdueBadge}
            </div>
            <h1 class="project-detail-banner__title">${projectNameDisplay}</h1>
            <p class="project-detail-banner__code text-mono">${sanitize(project.code || project.id)}</p>
            ${project.description ? '<p class="project-detail-banner__desc">' + sanitize(project.description) + '</p>' : ''}
          </div>
          <div class="project-detail-banner__actions">
            <button class="btn btn--outline-white" id="btnBannerEditProject" data-project-id="${id}">
              <i data-lucide="pencil" aria-hidden="true"></i> Edit Project
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="project-subnav">
      ${tabLink('overview', 'layout-dashboard', 'Overview', 'overview')}
      ${tabLink('board', 'kanban', 'Board', 'board')}
      ${tabLink('backlog', 'list', 'Backlog', 'backlog')}
      ${tabLink('sprint', 'zap', 'Sprint', 'sprint')}
      ${tabLink('gantt', 'gantt-chart', 'Gantt', 'gantt')}
      ${tabLink('discussion', 'message-circle', 'Discussion', 'discussion')}
      ${showMaint ? tabLink('maintenance', 'wrench', 'Maintenance', 'maintenance') : ''}
      ${tabLink('reports', 'bar-chart-2', 'Reports', 'reports')}
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
  getTimestamp,
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
