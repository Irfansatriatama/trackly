/**
 * TRACKLY — settings.js
 * Phase 16: Full Settings Page — General, Data Management, PWA, About / Changelog.
 */

import { getAll, getById, add, update } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { sanitize, nowISO, debug } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/confirm.js';

function confirmAsync({ title, message, confirmLabel, confirmClass }) {
  return new Promise((resolve) => {
    showConfirm({
      title,
      message,
      confirmLabel,
      confirmVariant: (confirmClass || 'btn--primary').replace('btn--',''),
      onConfirm: () => resolve(true),
      onCancel:  () => resolve(false),
    });
  });
}

let _settings = {};

const DEFAULT_SETTINGS = {
  system_name:     'TRACKLY',
  timezone:        'Asia/Jakarta',
  date_format:     'DD MMM YYYY',
  currency:        'IDR',
  currency_symbol: 'Rp',
  hourly_rate:     0,
  tax_rate:        11,
};

const TIMEZONES = [
  'Asia/Jakarta','Asia/Singapore','Asia/Kuala_Lumpur','Asia/Bangkok',
  'Asia/Manila','Asia/Tokyo','Asia/Seoul','Asia/Shanghai',
  'Europe/London','Europe/Paris','Europe/Berlin',
  'America/New_York','America/Los_Angeles','America/Chicago','UTC',
];
const DATE_FORMATS = ['DD MMM YYYY','MM/DD/YYYY','YYYY-MM-DD','DD/MM/YYYY'];
const CURRENCIES = [
  { code:'IDR', symbol:'Rp', label:'Indonesian Rupiah' },
  { code:'USD', symbol:'$',  label:'US Dollar' },
  { code:'EUR', symbol:'€',  label:'Euro' },
  { code:'SGD', symbol:'S$', label:'Singapore Dollar' },
  { code:'MYR', symbol:'RM', label:'Malaysian Ringgit' },
  { code:'GBP', symbol:'£',  label:'British Pound' },
];

const CHANGELOG = [
  { version:'v1.3.1', date:'2026-02-28', items:[
    'Phase 21 — Maintenance Enhancement: severity (major/minor), assigned_date, due_date, ordered_by, pic_dev_ids (multi-select, developer visibility filter), pic_client (viewer visibility filter), file attachments (base64, max 5MB)',
    'Ticket list updated with Severity & Due Date columns; detail panel shows all new fields with Indonesian dates',
    'PIC Dev displayed as avatar chips in ticket detail panel',
    'maintenance-report.js: Export Excel (SheetJS CDN), Export CSV (pure JS, BOM-prefixed), formatDateID() for all date fields',
    'PDF export updated with Severity, Due Date, Assigned Date, Ordered By, PIC Client columns',
    'guide.js section 9 updated with full Phase 21 field explanations',
    'DB version bumped to 4; sw.js cache bumped to v1.3.1',
  ]},
  { version:'v1.3.0', date:'2026-02-28', items:[
    'Phase 20 — Project Discussion: discussions store added to db.js (DB v3)',
    'Discussion tab in project subnav (Admin/PM/Developer) between Gantt and Log',
    'Feed layout: newest posts first, paginated 20 per page, pinned posts section',
    'Post type badges: blocker=red, decision=purple, question=blue, update=green, general=neutral',
    'Inline collapsible reply threads (show last 3, expand all), Markdown render for posts and replies',
    'File attachments (base64, max 5MB, download link), edit/delete own post, Admin/PM pin/unpin',
    'logActivity() called for all discussion actions; sw.js bumped to v1.3.0',
  ]},
  { version:'v1.2.0', date:'2026-02-28', items:[
    'Phase 19 — Meeting Agenda & Notulensi: meetings store added to db.js (DB v2)',
    'Calendar view with month/week toggle; meeting list card with type badge, attendees, status',
    'Meeting CRUD modal (tabs: Details, Agenda, Attendees & Projects)',
    'Meeting detail page with agenda checklist and quick status advance (Scheduled → Ongoing → Done)',
    'Notulensi panel: Mode 1 (Markdown editor + live preview), Mode 2 (file upload base64 max 5MB)',
    'Action Items with Create Task button to convert to project backlog task',
    'Meetings in sidebar (Admin/PM only); sw.js bumped to v1.2.0',
  ]},
  { version:'v1.1.0', date:'2026-02-28', items:[
    'Phase 18 — Audit Trail: logActivity() helper in utils.js; ACT- prefix in ID_PREFIX',
    'Log tab in project subnav (Admin/PM only): timeline view, filter bar, pagination (50/page), diff display',
    'All modules retrofitted: projects, tasks, board, sprint, maintenance, members, clients, assets',
    'Dashboard Activity Feed shows last 20 real entries across all projects',
    'sw.js cache bumped to v1.1.0',
  ]},
  { version:'v1.0.0', date:'2026-02-28', items:[
    'Phase 17 — Testing, Documentation & Handoff: stable v1.0.0 release',
    'In-app User Guide page with all 15 sections rendered natively',
    'Tooltip system added to all key interactive elements throughout the UI',
    'Bug fix: formatDate now correctly handles custom format strings (DD MMM YYYY, MM/DD/YYYY, etc.)',
    'User Guide link added to sidebar navigation and topbar dropdown',
    'Settings and User Guide added to mobile bottom navigation',
    'README updated to v1.0.0 with complete changelog and final handoff notes',
    'Full QA pass across all roles: Admin, Developer, and Viewer',
    'Edge case hardening: empty states, missing fields, and null-safe guards verified',
    'Service Worker cache version bumped to v1.0.0',
  ]},
  { version:'v0.16.0', date:'2026-02-28', items:[
    'Phase 16 — Polish, Accessibility & PWA Completion',
    'Full Settings page: General, Data Management, PWA, About/Changelog',
    'Full Dashboard with live stats, My Tasks widget, and activity feed',
    'Mobile responsive: collapsible bottom nav on screens ≤768px',
    'Keyboard accessibility on all modals (Tab, Enter, Escape)',
    'ARIA labels added to all interactive elements across app',
    'Empty state standardized with action buttons on all list pages',
    'Page transition animations refined (fade + slide-up 150ms)',
    'Service Worker cache updated to v0.16.0',
    'Data export/import (JSON backup & restore)',
    'Changelog page in Settings > About',
    'Toast notifications verified across all modules',
    'Visual consistency audit: spacing, badges, typography aligned',
  ]},
  { version:'v0.15.0', date:'2026-02-28', items:[
    'Reports Module: 5 report types — Progress, Workload, Burndown, Maintenance Summary, Assets',
    'All charts via Chart.js CDN. PDF export via window.print()',
  ]},
  { version:'v0.14.0', date:'2026-02-28', items:[
    'Asset Management: CRUD, warranty expiry warnings, filters, image upload',
  ]},
  { version:'v0.13.0', date:'2026-02-28', items:[
    'Maintenance Report & Invoice: date-range filter, cost calculator, PDF export',
  ]},
  { version:'v0.12.0', date:'2026-02-28', items:[
    'Maintenance Module: ticket CRUD, status pipeline Open→Closed, activity log',
  ]},
  { version:'v0.11.0', date:'2026-02-28', items:[
    'Gantt Chart: drag-to-move/resize, zoom Day/Week/Month, PNG export',
  ]},
  { version:'v0.10.0', date:'2026-02-28', items:[
    'Sprint Management: planning drag-and-drop, velocity chart, retrospective notes',
  ]},
  { version:'v0.9.0', date:'2026-02-28', items:[
    'Kanban Board: native drag-and-drop, custom columns, swimlane toggle',
  ]},
  { version:'v0.8.0', date:'2026-02-28', items:[
    'Task Management & Backlog: full CRUD, bulk actions, comments, checklist widget',
  ]},
  { version:'v0.7.0', date:'2026-02-28', items:[
    'Project Management Core: card grid, detail page, member assignment',
  ]},
  { version:'v0.6.0', date:'2026-02-28', items:[
    'Client Management: card/table toggle, logo upload, linked projects',
  ]},
  { version:'v0.5.0', date:'2026-02-28', items:[
    'Member Management: avatar upload, role badges, password change, deactivate/reactivate',
  ]},
  { version:'v0.4.0', date:'2026-02-28', items:[
    'First-run wizard (3-step), Admin account seed, Service Worker, PWA install banner',
  ]},
  { version:'v0.3.0', date:'2026-02-28', items:[
    'Authentication: login UI, SHA-256 hashing, route guards, role-based redirect',
  ]},
  { version:'v0.2.0', date:'2026-02-28', items:[
    'Layout shell: sidebar navigation, topbar, hash-based router',
  ]},
  { version:'v0.1.0', date:'2026-02-27', items:[
    'Project scaffolding: design tokens, CSS reset, fonts, icons, folder structure',
  ]},
];

async function loadSettings() {
  _settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    try {
      const record = await getById('settings', key);
      if (record) _settings[key] = record.value;
    } catch (_) { /* use default */ }
  }
}

async function saveSetting(key, value) {
  try {
    const existing = await getById('settings', key).catch(() => null);
    if (existing) { await update('settings', { key, value }); }
    else { await add('settings', { key, value }); }
    _settings[key] = value;
  } catch (err) { debug('saveSetting error:', err); throw err; }
}

export async function render(params = {}) {
  const session = getSession();
  if (!session || !['admin','pm'].includes(session.role)) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="lock" class="empty-state__icon" aria-hidden="true"></i>
          <p class="empty-state__title">Access Denied</p>
          <p class="empty-state__text">Only Admins and PMs can access Settings.</p>
          <a href="#/dashboard" class="btn btn--primary">Back to Dashboard</a>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }
  await loadSettings();
  renderSettingsPage();
}

function renderSettingsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;
  content.innerHTML = `
    <div class="page-container page-enter" style="max-width:900px;">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Settings</h1>
          <p class="page-header__subtitle">Configure preferences, manage data, and view app information</p>
        </div>
      </div>

      <div class="settings-tabs" role="tablist" aria-label="Settings sections">
        <button class="settings-tab is-active" role="tab" aria-selected="true" data-tab="general">
          <i data-lucide="sliders" aria-hidden="true"></i> General
        </button>
        <button class="settings-tab" role="tab" aria-selected="false" data-tab="data">
          <i data-lucide="database" aria-hidden="true"></i> Data
        </button>
        <button class="settings-tab" role="tab" aria-selected="false" data-tab="pwa">
          <i data-lucide="smartphone" aria-hidden="true"></i> PWA
        </button>
        <button class="settings-tab" role="tab" aria-selected="false" data-tab="about">
          <i data-lucide="info" aria-hidden="true"></i> About
        </button>
      </div>

      <div class="settings-panel card" id="tab-general">
        <div class="card__body">
          <h2 class="settings-section-title">General Settings</h2>
          <form id="settingsGeneralForm" novalidate>
            <div class="settings-grid">
              <div class="form-group">
                <label class="form-label" for="sysName">System Name</label>
                <input class="form-input" type="text" id="sysName" value="${sanitize(_settings.system_name)}" placeholder="TRACKLY" />
              </div>
              <div class="form-group">
                <label class="form-label" for="sysTimezone">Timezone</label>
                <select class="form-select" id="sysTimezone">
                  ${TIMEZONES.map(tz=>`<option value="${tz}"${_settings.timezone===tz?' selected':''}>${tz}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="sysDateFormat">Date Format</label>
                <select class="form-select" id="sysDateFormat">
                  ${DATE_FORMATS.map(f=>`<option value="${f}"${_settings.date_format===f?' selected':''}>${f}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="sysCurrency">Currency</label>
                <select class="form-select" id="sysCurrency">
                  ${CURRENCIES.map(c=>`<option value="${c.code}"${_settings.currency===c.code?' selected':''}>${c.code} — ${c.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="sysHourlyRate">Default Hourly Rate</label>
                <input class="form-input" type="number" id="sysHourlyRate" value="${_settings.hourly_rate}" min="0" step="1000" />
              </div>
              <div class="form-group">
                <label class="form-label" for="sysTaxRate">Default Tax Rate (%)</label>
                <input class="form-input" type="number" id="sysTaxRate" value="${_settings.tax_rate}" min="0" max="100" step="0.5" />
              </div>
            </div>
            <div class="settings-actions">
              <button type="submit" class="btn btn--primary" id="saveGeneralBtn">
                <i data-lucide="save" aria-hidden="true"></i> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="settings-panel card is-hidden" id="tab-data">
        <div class="card__body">
          <h2 class="settings-section-title">Data Management</h2>
          <div class="settings-data-card">
            <div class="settings-data-card__info">
              <i data-lucide="download" aria-hidden="true"></i>
              <div>
                <p class="settings-data-card__title">Export All Data</p>
                <p class="settings-data-card__desc">Download a complete JSON backup of all TRACKLY data — projects, tasks, members, clients, assets, and settings.</p>
              </div>
            </div>
            <button class="btn btn--outline" id="btnExportData">
              <i data-lucide="download" aria-hidden="true"></i> Export JSON
            </button>
          </div>
          <div class="settings-data-card">
            <div class="settings-data-card__info">
              <i data-lucide="upload" aria-hidden="true"></i>
              <div>
                <p class="settings-data-card__title">Import Data</p>
                <p class="settings-data-card__desc">Restore from a previously exported TRACKLY JSON backup. Records with matching IDs will be overwritten.</p>
              </div>
            </div>
            <label class="btn btn--outline" style="cursor:pointer;" tabindex="0" role="button" aria-label="Import JSON backup file">
              <i data-lucide="upload" aria-hidden="true"></i> Import JSON
              <input type="file" id="importFileInput" accept=".json" class="is-hidden" aria-hidden="true" />
            </label>
          </div>
          <div class="settings-data-card settings-data-card--danger">
            <div class="settings-data-card__info">
              <i data-lucide="trash-2" aria-hidden="true"></i>
              <div>
                <p class="settings-data-card__title">Reset All Data</p>
                <p class="settings-data-card__desc">Permanently delete ALL data including projects, tasks, and members. This cannot be undone.</p>
              </div>
            </div>
            <button class="btn btn--danger" id="btnResetData">
              <i data-lucide="alert-triangle" aria-hidden="true"></i> Reset Data
            </button>
          </div>
        </div>
      </div>

      <div class="settings-panel card is-hidden" id="tab-pwa">
        <div class="card__body">
          <h2 class="settings-section-title">Progressive Web App</h2>
          <div class="pwa-status-card">
            <div class="pwa-status-icon" id="pwaStatusIcon">
              <i data-lucide="wifi" aria-hidden="true"></i>
            </div>
            <div>
              <p class="pwa-status-title" id="pwaStatusTitle">Checking PWA status...</p>
              <p class="pwa-status-desc text-muted" id="pwaStatusDesc">Please wait</p>
            </div>
          </div>
          <div class="settings-data-card" style="margin-top:var(--space-4);">
            <div class="settings-data-card__info">
              <i data-lucide="download" aria-hidden="true"></i>
              <div>
                <p class="settings-data-card__title">Install App</p>
                <p class="settings-data-card__desc">Install TRACKLY on your device for offline access and a faster, app-like experience.</p>
              </div>
            </div>
            <button class="btn btn--primary" id="pwaInstallSettingsBtn">
              <i data-lucide="download" aria-hidden="true"></i> Install
            </button>
          </div>
          <div class="settings-infobox">
            <i data-lucide="info" aria-hidden="true"></i>
            <ul>
              <li><strong>Service Worker:</strong> Caches all static assets on first load for full offline support.</li>
              <li><strong>Offline Storage:</strong> All data is stored in IndexedDB — no server required.</li>
              <li><strong>Installation:</strong> Available on Chrome, Edge, and Safari (Add to Home Screen).</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="settings-panel card is-hidden" id="tab-about">
        <div class="card__body">
          <div class="about-header">
            <img src="assets/logo.svg" alt="TRACKLY logo" class="about-logo" />
            <div>
              <h2 class="about-title">TRACKLY</h2>
              <p class="about-tagline text-muted">Track Everything, Deliver Anything</p>
              <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-2);">
                <span class="badge badge--info">v1.3.1</span>
                <span class="badge badge--success">Phase 16 of 17</span>
                <span class="badge badge--primary">PWA Ready</span>
              </div>
            </div>
          </div>
          <div class="about-meta">
            <div class="about-meta-item"><span class="about-meta-label">Tech Stack</span><span class="about-meta-value">HTML5, CSS3, Vanilla JS (ES6+)</span></div>
            <div class="about-meta-item"><span class="about-meta-label">Storage</span><span class="about-meta-value">localStorage + IndexedDB (client-side only)</span></div>
            <div class="about-meta-item"><span class="about-meta-label">Icons</span><span class="about-meta-value">Lucide Icons via CDN</span></div>
            <div class="about-meta-item"><span class="about-meta-label">Charts</span><span class="about-meta-value">Chart.js 4.4 via CDN</span></div>
            <div class="about-meta-item"><span class="about-meta-label">Fonts</span><span class="about-meta-value">Inter + JetBrains Mono (Google Fonts)</span></div>
          </div>
          <h3 class="settings-section-title" style="margin-top:var(--space-8);">Changelog</h3>
          <div class="changelog-list">
            ${CHANGELOG.map(entry=>`
              <div class="changelog-entry">
                <div class="changelog-entry__header">
                  <span class="badge badge--primary changelog-entry__version">${sanitize(entry.version)}</span>
                  <span class="text-muted" style="font-size:var(--text-xs);">${sanitize(entry.date)}</span>
                </div>
                <ul class="changelog-entry__items">
                  ${entry.items.map(item=>`<li>${sanitize(item)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  bindSettingsEvents();
  checkPWAStatus();
}

function switchTab(tabId) {
  document.querySelectorAll('.settings-tab').forEach(t => {
    const active = t.dataset.tab === tabId;
    t.classList.toggle('is-active', active);
    t.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('.settings-panel').forEach(p => {
    p.classList.toggle('is-hidden', p.id !== `tab-${tabId}`);
  });
  if (tabId === 'pwa') checkPWAStatus();
}

function bindSettingsEvents() {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.getElementById('settingsGeneralForm')?.addEventListener('submit', handleSaveGeneral);
  document.getElementById('btnExportData')?.addEventListener('click', handleExportData);
  document.getElementById('importFileInput')?.addEventListener('change', handleImportData);
  document.getElementById('btnResetData')?.addEventListener('click', handleResetData);
  document.getElementById('pwaInstallSettingsBtn')?.addEventListener('click', () => {
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) { installBtn.click(); }
    else { showToast('Install prompt not available. Try from the browser address bar.', 'info'); }
  });
}

async function handleSaveGeneral(e) {
  e.preventDefault();
  const btn = document.getElementById('saveGeneralBtn');
  btn.disabled = true;
  try {
    const currencyCode = document.getElementById('sysCurrency').value;
    const currencyDef  = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
    const toSave = {
      system_name:     document.getElementById('sysName').value.trim() || 'TRACKLY',
      timezone:        document.getElementById('sysTimezone').value,
      date_format:     document.getElementById('sysDateFormat').value,
      currency:        currencyCode,
      currency_symbol: currencyDef.symbol,
      hourly_rate:     parseFloat(document.getElementById('sysHourlyRate').value) || 0,
      tax_rate:        parseFloat(document.getElementById('sysTaxRate').value) || 0,
    };
    for (const [key, value] of Object.entries(toSave)) { await saveSetting(key, value); }
    showToast('Settings saved successfully.', 'success');
  } catch (err) {
    showToast('Failed to save settings.', 'error');
    debug('Settings save error:', err);
  } finally {
    btn.disabled = false;
  }
}

async function handleExportData() {
  const btn = document.getElementById('btnExportData');
  btn.disabled = true;
  try {
    const stores = ['users','projects','tasks','sprints','clients','assets','maintenance','invoices','activity_log','settings'];
    const exportData = { _meta: { version:'v1.3.1', exportedAt: nowISO(), app:'TRACKLY' } };
    for (const store of stores) {
      try { exportData[store] = await getAll(store); }
      catch (_) { exportData[store] = []; }
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackly-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully.', 'success');
  } catch (err) {
    showToast('Export failed.', 'error');
    debug('Export error:', err);
  } finally {
    btn.disabled = false;
  }
}

async function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const confirmed = await confirmAsync({
    title: 'Import Data',
    message: 'This will merge the backup data with existing records. Records with matching IDs will be overwritten. Continue?',
    confirmLabel: 'Import', confirmClass: 'btn--primary',
  });
  if (!confirmed) { e.target.value = ''; return; }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const stores = ['users','projects','tasks','sprints','clients','assets','maintenance','invoices','activity_log','settings'];
    let imported = 0;
    for (const store of stores) {
      const records = data[store];
      if (!Array.isArray(records)) continue;
      for (const record of records) {
        try { await add(store, record); imported++; }
        catch (_) { try { await update(store, record); imported++; } catch (_2) { /* skip */ } }
      }
    }
    showToast(`Import complete. ${imported} records processed.`, 'success');
  } catch (err) {
    showToast('Import failed. Check that the file is a valid TRACKLY JSON backup.', 'error');
    debug('Import error:', err);
  } finally {
    e.target.value = '';
  }
}

async function handleResetData() {
  const c1 = await confirmAsync({
    title: 'Reset All Data',
    message: 'This will permanently delete ALL data — projects, tasks, members, clients, assets, and settings. This cannot be undone.',
    confirmLabel: 'Delete Everything', confirmClass: 'btn--danger',
  });
  if (!c1) return;
  const c2 = await confirmAsync({
    title: 'Are you absolutely sure?',
    message: 'All your data will be lost forever. TRACKLY will reload to the first-run wizard.',
    confirmLabel: 'Yes, Reset Now', confirmClass: 'btn--danger',
  });
  if (!c2) return;
  try {
    indexedDB.deleteDatabase('trackly_db');
    localStorage.clear();
    showToast('All data deleted. Reloading in 2 seconds...', 'info');
    setTimeout(() => window.location.reload(), 2000);
  } catch (err) { showToast('Reset failed.', 'error'); }
}

async function checkPWAStatus() {
  const titleEl = document.getElementById('pwaStatusTitle');
  const descEl  = document.getElementById('pwaStatusDesc');
  const iconEl  = document.getElementById('pwaStatusIcon');
  if (!titleEl) return;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const swReg = await navigator.serviceWorker?.getRegistration().catch(() => null);
  const swActive = !!swReg;
  if (isStandalone) {
    iconEl.style.cssText = 'background:var(--color-success-alpha);color:var(--color-success);';
    iconEl.querySelector('[data-lucide]')?.setAttribute('data-lucide','check-circle');
    titleEl.textContent = 'Running as Installed App';
    descEl.textContent  = 'TRACKLY is installed and running as a standalone PWA.';
  } else if (swActive) {
    iconEl.style.cssText = 'background:var(--color-primary-alpha);color:var(--color-primary);';
    iconEl.querySelector('[data-lucide]')?.setAttribute('data-lucide','wifi');
    titleEl.textContent = 'Service Worker Active — Offline Ready';
    descEl.textContent  = 'TRACKLY is cached for offline use. Click Install to add it to your device.';
  } else {
    iconEl.style.cssText = 'background:var(--color-warning-alpha);color:var(--color-warning);';
    iconEl.querySelector('[data-lucide]')?.setAttribute('data-lucide','wifi-off');
    titleEl.textContent = 'Service Worker Not Active';
    descEl.textContent  = 'Serve TRACKLY over HTTP/HTTPS (not file://) to enable PWA features.';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

export default { render };
