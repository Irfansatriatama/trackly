/**
 * TRACKLY — maintenance-report.js
 * Phase 13 → Phase 21 → Phase 26 → Phase 26 Fix 5
 * Fix 5: Aligned layout with standard project tab pattern.
 *   Uses buildProjectBanner() + project-detail-page + project-tab-body
 *   so subnav no longer covers page-header or export buttons.
 * Access: PM/Admin only.
 */

import { getAll, getById } from '../core/db.js';
import { nowISO, sanitize, debug, buildProjectBanner } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { getSession } from '../core/auth.js';
import { renderBadge } from '../components/badge.js';

// ─── Module State ─────────────────────────────────────────────────────────────

let _projectId = null;
let _project = null;
let _allProjects = [];
let _client = null;
let _allTickets = [];
let _tickets = [];
let _members = [];
let _settings = {};
let _dateFrom = '';
let _dateTo = '';
let _filteredTickets = [];
let _filterStatuses = [];
let _includeSubProjects = false;
let _searchQuery = '';
let _searchDebounce = null;

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'user_request', label: 'User Request' },
  { value: 'incident', label: 'Incident' },
];

const TICKET_STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'on_check', label: 'On Check' },
  { value: 'need_revision', label: 'Need Revision' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const FILTER_STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'on_check', label: 'On Check' },
  { value: 'need_revision', label: 'Need Revision' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'on_hold', label: 'On Hold' },
];

const TICKET_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ─── Indonesian Date Format ───────────────────────────────────────────────────

const ID_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatDateID(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return String(dateStr);
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
          <p class="empty-state__text">Only PM and Admin can access maintenance reports.</p>
          <a href="#/projects/${sanitize(_projectId || '')}/maintenance" class="btn btn--primary">Back to Maintenance</a>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  if (!_projectId) { window.location.hash = '#/projects'; return; }

  try {
    const [project, allProjects, allTickets, members, allSettings] = await Promise.all([
      getById('projects', _projectId),
      getAll('projects'),
      getAll('maintenance'),
      getAll('users'),
      getAll('settings'),
    ]);

    _project = project;
    _allProjects = allProjects;
    _allTickets = allTickets;
    _tickets = _allTickets.filter(t => t.project_id === _projectId);
    _members = members;
    _settings = {};
    for (const s of allSettings) _settings[s.key] = s.value;

    _client = null;
    if (_project?.client_id) {
      try { _client = await getById('clients', _project.client_id); } catch (_) { }
    }

    if (!_project) {
      document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="folder-x" class="empty-state__icon"></i><p class="empty-state__title">Project not found</p><a href="#/projects" class="btn btn--primary">Back to Projects</a></div></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    _dateFrom = from.toISOString().substring(0, 10);
    _dateTo = now.toISOString().substring(0, 10);
    _filterStatuses = [];
    _searchQuery = '';
    _includeSubProjects = false;

    _applyFilters();
    await renderReportPage();

  } catch (err) {
    debug('Maintenance report render error:', err);
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load report</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function _applyFilters() {
  const from = _dateFrom ? new Date(_dateFrom + 'T00:00:00') : null;
  const to = _dateTo ? new Date(_dateTo + 'T23:59:59') : null;
  const q = _searchQuery.trim().toLowerCase();

  let targetProjectIds = [_projectId];
  if (_includeSubProjects) {
    const children = _allProjects.filter(p => p.parent_id === _projectId).map(p => p.id);
    targetProjectIds = targetProjectIds.concat(children);
  }
  _tickets = _allTickets.filter(t => targetProjectIds.includes(t.project_id));

  _filteredTickets = _tickets.filter(t => {
    // Search: Ticket ID or Task Title (case-insensitive)
    if (q) {
      const idMatch = (t.id || '').toLowerCase().includes(q);
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      if (!idMatch && !titleMatch) return false;
    }

    // Date filter: only apply if ticket has assigned_date; null/empty tickets always pass
    if (t.assigned_date) {
      const d = new Date(t.assigned_date);
      if (from && d < from) return false;
      if (to && d > to) return false;
    }

    // Status filter: empty = all pass
    if (_filterStatuses.length > 0 && !_filterStatuses.includes(t.status)) return false;

    return true;
  });
}

// ─── Page Render ─────────────────────────────────────────────────────────────

async function renderReportPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const session = getSession();
  const isAdminOrPM = session && ['admin', 'pm'].includes(session.role);
  const banner = await buildProjectBanner(_project, 'maintenance', { renderBadge, isAdminOrPM });

  // Badge count: count active non-default filters
  const filterCount = _filterStatuses.length + (_dateFrom || _dateTo ? 1 : 0);

  content.innerHTML = `
    <div class="page-container page-enter project-detail-page">
      ${banner}
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Maintenance Report</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)}</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--outline" id="btnExportCSV">
            <i data-lucide="file-spreadsheet" aria-hidden="true"></i> Export CSV
          </button>
          <button class="btn btn--outline" id="btnExportExcel">
            <i data-lucide="table" aria-hidden="true"></i> Export Excel
          </button>
          <button class="btn btn--primary" id="btnGeneratePDF">
            <i data-lucide="printer" aria-hidden="true"></i> Generate PDF
          </button>
        </div>
      </div>
      <div class="project-tab-body">
        <!-- Searchbar + Filter modal button -->
        <div class="rpt-filter-bar" id="rptFilterBar">
          <div class="projects-search" style="flex:1;">
            <i data-lucide="search" class="projects-search__icon" aria-hidden="true"></i>
            <input type="text" class="form-input projects-search__input" id="rptSearchInput"
              placeholder="Search tiket..." value="${sanitize(_searchQuery)}" autocomplete="off" />
          </div>
          <div class="filter-btn-wrap">
            <button class="btn btn--secondary" id="btnOpenRptFilter">
              <i data-lucide="settings-2" aria-hidden="true"></i> Filter${filterCount > 0 ? ` · ${filterCount}` : ''}
            </button>
          </div>
        </div>

        <!-- Report Content -->
        <div id="rptMainContent">${_renderReportTable()}</div>
      </div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnBannerEditProject')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('trackly:editProject', { detail: { projectId: _project.id } }));
  });
  _bindEvents();
}

function _bindEvents() {
  // BUG 4A: real-time search with 300ms debounce
  document.getElementById('rptSearchInput')?.addEventListener('input', e => {
    clearTimeout(_searchDebounce);
    _searchDebounce = setTimeout(() => {
      _searchQuery = e.target.value;
      _applyFilters();
      const el = document.getElementById('rptMainContent');
      if (el) {
        el.innerHTML = _renderReportTable();
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }, 300);
  });

  // BUG 4B: filter modal button
  document.getElementById('btnOpenRptFilter')?.addEventListener('click', _openFilterModal);

  document.getElementById('btnGeneratePDF')?.addEventListener('click', _handleExportPdf);
  document.getElementById('btnExportExcel')?.addEventListener('click', _handleExportExcel);
  document.getElementById('btnExportCSV')?.addEventListener('click', _handleExportCsv);
}

// ─── Filter Modal ─────────────────────────────────────────────────────────────

function _openFilterModal() {
  const statusCheckboxes = FILTER_STATUS_OPTIONS.map(s => `
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 0;">
      <input type="checkbox" name="modalRptStatus" value="${s.value}"
        ${_filterStatuses.includes(s.value) ? 'checked' : ''}
        style="accent-color:var(--color-primary);width:15px;height:15px;flex-shrink:0;" />
      <span>${s.label}</span>
    </label>`).join('');

  const body = `
    <div style="display:flex;flex-direction:column;gap:var(--space-5);">
      <div>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:var(--space-4);padding:8px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
          <input type="checkbox" id="modalRptIncludeSub" ${_includeSubProjects ? 'checked' : ''} style="accent-color:var(--color-primary);width:16px;height:16px;" />
          <span style="font-weight:600;">Include Sub-Projects Data</span>
        </label>
      </div>

      <div>
        <div style="font-weight:600;font-size:13px;margin-bottom:var(--space-3);color:var(--color-text);">Assign Date</div>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">
          <div style="flex:1;min-width:130px;">
            <label class="form-label">Dari</label>
            <input type="date" class="form-input" id="modalRptDateFrom" value="${_dateFrom}" />
          </div>
          <div style="flex:1;min-width:130px;">
            <label class="form-label">Sampai</label>
            <input type="date" class="form-input" id="modalRptDateTo" value="${_dateTo}" />
          </div>
        </div>
      </div>

      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">
          <div style="font-weight:600;font-size:13px;color:var(--color-text);">Status</div>
          <div style="display:flex;gap:var(--space-3);">
            <button type="button" class="btn btn--ghost btn--sm" id="btnSelectAllStatus" style="font-size:12px;padding:2px 8px;">Pilih Semua</button>
            <button type="button" class="btn btn--ghost btn--sm" id="btnClearAllStatus" style="font-size:12px;padding:2px 8px;">Hapus Semua</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
          ${statusCheckboxes}
        </div>
      </div>
    </div>`;

  const footer = `
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
      <button type="button" class="btn btn--outline" id="btnResetRptFilter">Reset Filter</button>
      <button type="button" class="btn btn--primary" id="btnApplyRptFilter">Terapkan</button>
    </div>`;

  openModal({ title: 'Filter Report', body, footer, size: 'md' });

  // Bind modal inner buttons after render
  setTimeout(() => {
    document.getElementById('btnSelectAllStatus')?.addEventListener('click', () => {
      document.querySelectorAll('input[name="modalRptStatus"]').forEach(cb => { cb.checked = true; });
    });
    document.getElementById('btnClearAllStatus')?.addEventListener('click', () => {
      document.querySelectorAll('input[name="modalRptStatus"]').forEach(cb => { cb.checked = false; });
    });

    document.getElementById('btnApplyRptFilter')?.addEventListener('click', async () => {
      _includeSubProjects = document.getElementById('modalRptIncludeSub')?.checked || false;
      _dateFrom = document.getElementById('modalRptDateFrom')?.value || '';
      _dateTo = document.getElementById('modalRptDateTo')?.value || '';
      _filterStatuses = Array.from(document.querySelectorAll('input[name="modalRptStatus"]:checked'))
        .map(cb => cb.value);
      closeModal();
      _applyFilters();
      await renderReportPage();
    });

    document.getElementById('btnResetRptFilter')?.addEventListener('click', async () => {
      _includeSubProjects = false;
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      _dateFrom = from.toISOString().substring(0, 10);
      _dateTo = now.toISOString().substring(0, 10);
      _filterStatuses = [];
      closeModal();
      _applyFilters();
      await renderReportPage();
    });
  }, 50);
}

// ─── REPORT TABLE ─────────────────────────────────────────────────────────────

function _renderReportTable() {
  const tickets = _filteredTickets;
  const activeFilterDesc = _filterStatuses.length > 0
    ? `Status: ${_filterStatuses.map(s => _getLabelFor(TICKET_STATUS_OPTIONS, s)).join(', ')}`
    : 'All Statuses';

  if (tickets.length === 0) {
    return `<div class="empty-state" style="margin-top:var(--space-10);">
      <i data-lucide="file-search" class="empty-state__icon"></i>
      <p class="empty-state__title">No tickets in selected filter range</p>
      <p class="empty-state__text">Try adjusting the date range or status filter above.</p>
    </div>`;
  }

  const companyName = sanitize(_settings['company_name'] || 'TRACKLY');
  const companyLogo = _settings['company_logo'] || '';

  return `
    <div class="rpt-print-header">
      <div>
        ${companyLogo ? `<img src="${companyLogo}" class="rpt-company-logo" alt="Company Logo" />` : ''}
        <div class="rpt-company-name">${companyName}</div>
      </div>
      <div class="rpt-print-meta">
        <strong>Maintenance Report</strong><br>
        Project: ${sanitize(_project.name)}<br>
        Assign Date: ${formatDateID(_dateFrom)} – ${formatDateID(_dateTo)}<br>
        Filter: ${sanitize(activeFilterDesc)}<br>
        Generated: ${formatDateID(new Date().toISOString())}
      </div>
    </div>

    <div class="rpt-info-bar no-print">
      <div class="rpt-info-bar__left">
        <strong>${sanitize(_project.name)}</strong> — Maintenance Report
        <span class="text-muted" style="margin-left:8px;">${sanitize(activeFilterDesc)} · Assign Date: ${formatDateID(_dateFrom)} – ${formatDateID(_dateTo)}</span>
      </div>
      <div class="rpt-info-bar__right text-muted text-sm">${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}</div>
    </div>

    <div class="rpt-table-wrap">
      <table class="rpt-table rpt-report-table">
        <thead>
          <tr>
            <th style="width:40px;text-align:center;">No</th>
            <th style="width:110px;">Ticket No</th>
            <th>Task Title</th>
            <th>Project</th>
            <th style="width:120px;">PIC Pemohon</th>
            <th style="width:130px;">Status</th>
            <th style="width:120px;">Assign Date</th>
            <th style="width:120px;">Due Date</th>
            <th style="width:90px;">Priority</th>
            <th style="width:80px;">Severity</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map((t, idx) => {
    const picClientUser = _members.find(m => m.id === t.pic_client);
    const picClientName = picClientUser ? picClientUser.full_name : (t.pic_client || '—');
    const proj = _allProjects.find(p => p.id === t.project_id);
    return `<tr class="${idx % 2 === 1 ? 'rpt-row-alt' : ''}">
              <td style="text-align:center;">${idx + 1}</td>
              <td class="text-mono" style="font-size:12px;">${sanitize(t.ticket_number || t.id || '')}</td>
              <td>${sanitize(t.title || '')}</td>
              <td>${sanitize(proj?.name || '')}</td>
              <td>${sanitize(picClientName)}</td>
              <td>${sanitize(_getLabelFor(TICKET_STATUS_OPTIONS, t.status))}</td>
              <td class="text-nowrap">${t.assigned_date ? formatDateID(t.assigned_date) : '—'}</td>
              <td class="text-nowrap">${t.due_date ? formatDateID(t.due_date) : '—'}</td>
              <td>${sanitize(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority) || '—')}</td>
              <td>${t.severity ? sanitize(_getLabelFor([{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }], t.severity)) : '—'}</td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ─── Export Functions ─────────────────────────────────────────────────────────

function _buildExportRows() {
  return _filteredTickets.map((t, idx) => {
    const picClientUser = _members.find(m => m.id === t.pic_client);
    const picClientName = picClientUser ? picClientUser.full_name : (t.pic_client || '');
    const proj = _allProjects.find(p => p.id === t.project_id);
    return {
      'No': idx + 1,
      'Ticket No': t.ticket_number || t.id || '',
      'Project': proj?.name || '',
      'Task Title': t.title || '',
      'PIC Pemohon': picClientName,
      'Status': _getLabelFor(TICKET_STATUS_OPTIONS, t.status),
      'Assign Date': t.assigned_date ? formatDateID(t.assigned_date) : '',
      'Due Date': t.due_date ? formatDateID(t.due_date) : '',
      'Priority': _getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority),
      'Severity': t.severity ? _getLabelFor([{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }], t.severity) : '',
    };
  });
}

function _handleExportExcel() {
  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    script.onload = () => _doExportExcel();
    script.onerror = () => showToast('Failed to load SheetJS library.', 'error');
    document.head.appendChild(script);
  } else {
    _doExportExcel();
  }
}

function _doExportExcel() {
  try {
    const rows = _buildExportRows();
    if (rows.length === 0) { showToast('No tickets to export.', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Report');
    const projectName = (_project?.name || 'project').replace(/[^a-z0-9]/gi, '_');
    XLSX.writeFile(wb, `maintenance_report_${projectName}_${_dateFrom}_${_dateTo}.xlsx`);
    showToast('Excel file exported successfully.', 'success');
  } catch (err) {
    debug('Excel export error:', err);
    showToast('Failed to export Excel: ' + err.message, 'error');
  }
}

function _handleExportCsv() {
  try {
    const rows = _buildExportRows();
    if (rows.length === 0) { showToast('No tickets to export.', 'warning'); return; }
    const headers = Object.keys(rows[0]);
    const escape = val => {
      const str = String(val == null ? '' : val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"';
      return str;
    };
    const csvContent = [headers.map(escape).join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const projectName = (_project?.name || 'project').replace(/[^a-z0-9]/gi, '_');
    a.download = `maintenance_report_${projectName}_${_dateFrom}_${_dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV file exported successfully.', 'success');
  } catch (err) {
    debug('CSV export error:', err);
    showToast('Failed to export CSV: ' + err.message, 'error');
  }
}

function _handleExportPdf() {
  document.body.classList.add('is-printing');
  window.print();
  setTimeout(() => { document.body.classList.remove('is-printing'); }, 1000);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _getLabelFor(options, value) {
  return options.find(o => o.value === value)?.label || value || '—';
}

export default { render };
