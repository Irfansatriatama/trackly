/**
 * TRACKLY — maintenance-report.js
 * Phase 13: Maintenance Report & Invoice (PDF)
 * Phase 21: Added Export Excel (.xlsx via SheetJS), Export CSV,
 *   new fields: severity, due_date, assigned_date, ordered_by, pic_client.
 * Phase 26: Revamp — PDF via window.print() showing 9-column tabel, filter by
 *   status (multi-select) + date range (Assign Date), Preview button.
 *   Updated status pipeline to match Phase 26 statuses.
 *   Excel/CSV columns aligned with new 9-column spec.
 * Access: PM/Admin only.
 */

import { getAll, getById } from '../core/db.js';
import { nowISO, sanitize, debug } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { getSession } from '../core/auth.js';

// ─── Module State ─────────────────────────────────────────────────────────────

let _projectId       = null;
let _project         = null;
let _client          = null;
let _tickets         = [];
let _members         = [];
let _settings        = {};
let _dateFrom        = '';
let _dateTo          = '';
let _filteredTickets = [];
let _filterStatuses  = []; // array of selected statuses (empty = all)

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_TYPE_OPTIONS = [
  { value: 'bug',          label: 'Bug' },
  { value: 'adjustment',   label: 'Adjustment' },
  { value: 'enhancement',  label: 'Enhancement' },
  { value: 'user_request', label: 'User Request' },
  { value: 'incident',     label: 'Incident' },
];

const TICKET_STATUS_OPTIONS = [
  { value: 'backlog',           label: 'Backlog' },
  { value: 'in_progress',       label: 'In Progress' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'on_check',          label: 'On Check' },
  { value: 'need_revision',     label: 'Need Revision' },
  { value: 'completed',         label: 'Completed' },
  { value: 'canceled',          label: 'Canceled' },
  { value: 'on_hold',           label: 'On Hold' },
  // Legacy statuses — display as-is
  { value: 'open',              label: 'Open' },
  { value: 'resolved',          label: 'Resolved' },
  { value: 'closed',            label: 'Closed' },
  { value: 'rejected',          label: 'Rejected' },
];

const TICKET_PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

// ─── Indonesian Date Format ───────────────────────────────────────────────────

const ID_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

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
    const [project, allTickets, members, allSettings] = await Promise.all([
      getById('projects', _projectId),
      getAll('maintenance'),
      getAll('users'),
      getAll('settings'),
    ]);

    _project = project;
    _tickets = allTickets.filter(t => t.project_id === _projectId);
    _members = members;
    _settings = {};
    for (const s of allSettings) _settings[s.key] = s.value;

    _client = null;
    if (_project?.client_id) {
      try { _client = await getById('clients', _project.client_id); } catch (_) {}
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
    _dateTo   = now.toISOString().substring(0, 10);
    _filterStatuses = [];

    _applyFilters();
    renderReportPage();

  } catch (err) {
    debug('Maintenance report render error:', err);
    document.getElementById('main-content').innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load report</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function _applyFilters() {
  const from = _dateFrom ? new Date(_dateFrom + 'T00:00:00') : null;
  const to   = _dateTo   ? new Date(_dateTo   + 'T23:59:59') : null;

  _filteredTickets = _tickets.filter(t => {
    // Date filter on assigned_date (Assign Date), fallback to created_at
    const d = new Date(t.assigned_date || t.created_at);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    // Status filter
    if (_filterStatuses.length > 0 && !_filterStatuses.includes(t.status)) return false;
    return true;
  });
}

// ─── Page Render ─────────────────────────────────────────────────────────────

function renderReportPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const activeFilterDesc = _filterStatuses.length > 0
    ? `Status: ${_filterStatuses.map(s=>_getLabelFor(TICKET_STATUS_OPTIONS,s)).join(', ')}`
    : 'All Statuses';

  content.innerHTML = `
    <div class="page-container page-enter">
      ${_buildSubnav()}

      <div class="page-header" style="margin-top:var(--space-6);">
        <div class="page-header__info">
          <h1 class="page-header__title">Maintenance Report</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)}</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--outline" id="btnExportCsv">
            <i data-lucide="file-spreadsheet" aria-hidden="true"></i> Export CSV
          </button>
          <button class="btn btn--outline" id="btnExportExcel">
            <i data-lucide="table" aria-hidden="true"></i> Export Excel
          </button>
          <button class="btn btn--primary" id="btnExportPdf">
            <i data-lucide="printer" aria-hidden="true"></i> Generate PDF
          </button>
        </div>
      </div>

      <!-- Filter Panel -->
      <div class="rpt-filter-bar" id="rptFilterBar">
        <div class="rpt-filter-group">
          <label class="form-label">Assign Date From</label>
          <input type="date" class="form-input" id="rptDateFrom" value="${_dateFrom}" />
        </div>
        <div class="rpt-filter-group">
          <label class="form-label">Assign Date To</label>
          <input type="date" class="form-input" id="rptDateTo" value="${_dateTo}" />
        </div>
        <div class="rpt-filter-group" style="flex:2;min-width:200px;">
          <label class="form-label">Filter by Status</label>
          <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);padding:6px 10px;max-height:100px;overflow-y:auto;background:var(--color-card);">
            <label style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer;font-size:13px;">
              <input type="checkbox" id="rptStatusAll" ${_filterStatuses.length===0?'checked':''} style="accent-color:var(--color-primary);" />
              <span>All Statuses</span>
            </label>
            ${TICKET_STATUS_OPTIONS.filter(s=>!['open','resolved','closed','rejected'].includes(s.value)).map(s=>`
              <label style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer;font-size:13px;">
                <input type="checkbox" name="rptStatus" value="${s.value}" ${_filterStatuses.includes(s.value)?'checked':''} style="accent-color:var(--color-primary);" />
                <span>${s.label}</span>
              </label>`).join('')}
          </div>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="btn btn--outline" id="btnApplyFilter">
            <i data-lucide="eye" aria-hidden="true"></i> Preview
          </button>
        </div>
      </div>

      <!-- Report Content (for screen preview and print) -->
      <div id="rptMainContent">${_renderReportTable()}</div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindEvents();
}

function _bindEvents() {
  document.getElementById('rptStatusAll')?.addEventListener('change', e => {
    if (e.target.checked) {
      document.querySelectorAll('input[name="rptStatus"]').forEach(cb => cb.checked = false);
    }
  });
  document.querySelectorAll('input[name="rptStatus"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const anyChecked = document.querySelectorAll('input[name="rptStatus"]:checked').length > 0;
      const allCb = document.getElementById('rptStatusAll');
      if (allCb) allCb.checked = !anyChecked;
    });
  });

  document.getElementById('btnApplyFilter')?.addEventListener('click', () => {
    _dateFrom = document.getElementById('rptDateFrom')?.value || _dateFrom;
    _dateTo   = document.getElementById('rptDateTo')?.value   || _dateTo;
    const allCb = document.getElementById('rptStatusAll');
    if (allCb?.checked) {
      _filterStatuses = [];
    } else {
      _filterStatuses = Array.from(document.querySelectorAll('input[name="rptStatus"]:checked')).map(cb => cb.value);
    }
    _applyFilters();
    const el = document.getElementById('rptMainContent');
    if (el) {
      el.innerHTML = _renderReportTable();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  });

  document.getElementById('btnExportPdf')?.addEventListener('click', _handleExportPdf);
  document.getElementById('btnExportExcel')?.addEventListener('click', _handleExportExcel);
  document.getElementById('btnExportCsv')?.addEventListener('click', _handleExportCsv);
}

// ─── REPORT TABLE ─────────────────────────────────────────────────────────────

function _renderReportTable() {
  const tickets = _filteredTickets;
  const activeFilterDesc = _filterStatuses.length > 0
    ? `Status: ${_filterStatuses.map(s=>_getLabelFor(TICKET_STATUS_OPTIONS,s)).join(', ')}`
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
    <!-- Print Header (hidden on screen, shown on print) -->
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

    <!-- Screen Info Bar (hidden on print) -->
    <div class="rpt-info-bar no-print">
      <div class="rpt-info-bar__left">
        <strong>${sanitize(_project.name)}</strong> — Maintenance Report
        <span class="text-muted" style="margin-left:8px;">${sanitize(activeFilterDesc)} · Assign Date: ${formatDateID(_dateFrom)} – ${formatDateID(_dateTo)}</span>
      </div>
      <div class="rpt-info-bar__right text-muted text-sm">${tickets.length} ticket${tickets.length!==1?'s':''}</div>
    </div>

    <!-- 9-Column Report Table -->
    <div class="rpt-table-wrap">
      <table class="rpt-table rpt-report-table">
        <thead>
          <tr>
            <th style="width:40px;text-align:center;">No</th>
            <th style="width:100px;">Ticket ID</th>
            <th>Task Title</th>
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
            return `<tr class="${idx%2===1?'rpt-row-alt':''}">
              <td style="text-align:center;">${idx+1}</td>
              <td class="text-mono" style="font-size:12px;">${sanitize(t.id||'')}</td>
              <td>${sanitize(t.title||'')}</td>
              <td>${sanitize(picClientName)}</td>
              <td>${sanitize(_getLabelFor(TICKET_STATUS_OPTIONS, t.status))}</td>
              <td class="text-nowrap">${t.assigned_date ? formatDateID(t.assigned_date) : '—'}</td>
              <td class="text-nowrap">${t.due_date ? formatDateID(t.due_date) : '—'}</td>
              <td>${sanitize(_getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority)||'—')}</td>
              <td>${t.severity ? sanitize(_getLabelFor([{value:'major',label:'Major'},{value:'minor',label:'Minor'}], t.severity)) : '—'}</td>
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
    return {
      'No':           idx + 1,
      'Ticket ID':    t.id || '',
      'Task Title':   t.title || '',
      'PIC Pemohon':  picClientName,
      'Status':       _getLabelFor(TICKET_STATUS_OPTIONS, t.status),
      'Assign Date':  t.assigned_date ? formatDateID(t.assigned_date) : '',
      'Due Date':     t.due_date ? formatDateID(t.due_date) : '',
      'Priority':     _getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority),
      'Severity':     t.severity ? _getLabelFor([{value:'major',label:'Major'},{value:'minor',label:'Minor'}], t.severity) : '',
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
      { wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 18 },
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
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
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g,'""') + '"';
      return str;
    };
    const csvContent = [headers.map(escape).join(','), ...rows.map(row=>headers.map(h=>escape(row[h])).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
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

function _buildSubnav() {
  const id = sanitize(_projectId);
  const showMaint = _project && ['running', 'maintenance'].includes(_project.phase);
  return `
    <div class="project-subnav">
      <a class="project-subnav__link" href="#/projects/${id}"><i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview</a>
      <a class="project-subnav__link" href="#/projects/${id}/board"><i data-lucide="kanban" aria-hidden="true"></i> Board</a>
      <a class="project-subnav__link" href="#/projects/${id}/backlog"><i data-lucide="list" aria-hidden="true"></i> Backlog</a>
      <a class="project-subnav__link" href="#/projects/${id}/sprint"><i data-lucide="zap" aria-hidden="true"></i> Sprint</a>
      <a class="project-subnav__link" href="#/projects/${id}/gantt"><i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt</a>
      ${showMaint ? `<a class="project-subnav__link" href="#/projects/${id}/maintenance"><i data-lucide="wrench" aria-hidden="true"></i> Maintenance</a>` : ''}
      <a class="project-subnav__link is-active" href="#/projects/${id}/maintenance-report"><i data-lucide="file-text" aria-hidden="true"></i> Report</a>
      <a class="project-subnav__link" href="#/projects/${id}/reports"><i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports</a>
    </div>`;
}

function _getLabelFor(options, value) {
  return options.find(o => o.value === value)?.label || value || '—';
}

export default { render };
