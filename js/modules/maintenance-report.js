/**
 * TRACKLY — maintenance-report.js
 * Phase 13: Maintenance Report & Invoice (PDF)
 * Phase 21: Added Export Excel (.xlsx via SheetJS), Export CSV, formatDateID(),
 *   new fields in PDF (severity, due_date, assigned_date, ordered_by, pic_client).
 * Access: PM/Admin only.
 */

import { getAll, getById, add, update } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, sanitize, debug } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { getSession } from '../core/auth.js';

// ─── Module State ─────────────────────────────────────────────────────────────

let _projectId     = null;
let _project       = null;
let _client        = null;
let _tickets       = [];
let _members       = [];
let _settings      = {};
let _dateFrom      = '';
let _dateTo        = '';
let _filteredTickets = [];
let _rateMode      = 'hourly';
let _hourlyRate    = 0;
let _flatCost      = 0;
let _taxRate       = 0;
let _invoiceNote   = '';
let _currentView   = 'report';

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_TYPE_OPTIONS = [
  { value: 'bug',          label: 'Bug' },
  { value: 'adjustment',   label: 'Adjustment' },
  { value: 'enhancement',  label: 'Enhancement' },
  { value: 'user_request', label: 'User Request' },
  { value: 'incident',     label: 'Incident' },
];

const TICKET_STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved',    label: 'Resolved' },
  { value: 'closed',      label: 'Closed' },
  { value: 'rejected',    label: 'Rejected' },
];

const TICKET_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
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

  if (!_projectId) {
    window.location.hash = '#/projects';
    return;
  }

  try {
    const [project, allTickets, members, allSettings] = await Promise.all([
      getById('projects', _projectId),
      getAll('maintenance'),
      getAll('users'),
      getAll('settings'),
    ]);

    _project  = project;
    _tickets  = allTickets.filter(t => t.project_id === _projectId);
    _members  = members;

    _settings = {};
    for (const s of allSettings) _settings[s.key] = s.value;

    _client = null;
    if (_project?.client_id) {
      try { _client = await getById('clients', _project.client_id); } catch (_) {}
    }

    if (!_project) {
      document.getElementById('main-content').innerHTML = `
        <div class="page-container page-enter"><div class="empty-state">
          <i data-lucide="folder-x" class="empty-state__icon"></i>
          <p class="empty-state__title">Project not found</p>
          <a href="#/projects" class="btn btn--primary">Back to Projects</a>
        </div></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    _dateFrom = from.toISOString().substring(0, 10);
    _dateTo   = now.toISOString().substring(0, 10);
    _currentView = 'report';
    _rateMode  = 'hourly';
    _hourlyRate = Number(_settings['invoice_hourly_rate'] || 0);
    _taxRate    = Number(_settings['invoice_tax_rate'] || 0);
    _flatCost   = 0;
    _invoiceNote = '';

    _applyDateFilter();
    renderReportPage();

  } catch (err) {
    debug('Maintenance report render error:', err);
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter"><div class="empty-state">
        <i data-lucide="alert-circle" class="empty-state__icon"></i>
        <p class="empty-state__title">Failed to load report</p>
        <p class="empty-state__text">${sanitize(String(err.message))}</p>
      </div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

function _applyDateFilter() {
  const from = _dateFrom ? new Date(_dateFrom + 'T00:00:00') : null;
  const to   = _dateTo   ? new Date(_dateTo   + 'T23:59:59') : null;

  _filteredTickets = _tickets.filter(t => {
    const d = new Date(t.reported_date || t.created_at);
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });
}

// ─── Page Render ─────────────────────────────────────────────────────────────

function renderReportPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

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
          <button class="btn btn--outline" id="btnSwitchView">
            <i data-lucide="file-text" aria-hidden="true"></i>
            <span id="btnSwitchViewLabel">Generate Invoice</span>
          </button>
          <button class="btn btn--primary" id="btnExportPdf">
            <i data-lucide="printer" aria-hidden="true"></i> Export PDF
          </button>
        </div>
      </div>

      <!-- Date Range Filter -->
      <div class="rpt-filter-bar" id="rptFilterBar">
        <div class="rpt-filter-group">
          <label class="form-label">From</label>
          <input type="date" class="form-input" id="rptDateFrom" value="${_dateFrom}" />
        </div>
        <div class="rpt-filter-group">
          <label class="form-label">To</label>
          <input type="date" class="form-input" id="rptDateTo" value="${_dateTo}" />
        </div>
        <button class="btn btn--outline" id="btnApplyFilter">
          <i data-lucide="filter" aria-hidden="true"></i> Apply
        </button>
      </div>

      <!-- Report/Invoice Content -->
      <div id="rptMainContent">${_renderReportContent()}</div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  _bindEvents();
}

function _bindEvents() {
  document.getElementById('btnApplyFilter')?.addEventListener('click', () => {
    _dateFrom = document.getElementById('rptDateFrom')?.value || _dateFrom;
    _dateTo   = document.getElementById('rptDateTo')?.value   || _dateTo;
    _applyDateFilter();
    _refreshMain();
  });

  document.getElementById('btnSwitchView')?.addEventListener('click', () => {
    _currentView = _currentView === 'report' ? 'invoice' : 'report';
    document.getElementById('btnSwitchViewLabel').textContent =
      _currentView === 'report' ? 'Generate Invoice' : 'Back to Report';
    _refreshMain();
  });

  document.getElementById('btnExportPdf')?.addEventListener('click', _handleExportPdf);
  document.getElementById('btnExportExcel')?.addEventListener('click', _handleExportExcel);
  document.getElementById('btnExportCsv')?.addEventListener('click', _handleExportCsv);

  document.getElementById('rptMainContent')?.addEventListener('input', _handleInvoiceInput);
  document.getElementById('rptMainContent')?.addEventListener('change', _handleInvoiceInput);
}

function _handleInvoiceInput(e) {
  const id = e.target.id;
  if (id === 'invRateMode') { _rateMode = e.target.value; _refreshMain(); return; }
  if (id === 'invHourlyRate') { _hourlyRate = parseFloat(e.target.value) || 0; _refreshInvoiceTotals(); }
  if (id === 'invFlatCost')   { _flatCost   = parseFloat(e.target.value) || 0; _refreshInvoiceTotals(); }
  if (id === 'invTaxRate')    { _taxRate    = parseFloat(e.target.value) || 0; _refreshInvoiceTotals(); }
  if (id === 'invNote')       { _invoiceNote = e.target.value; }
}

function _refreshMain() {
  const el = document.getElementById('rptMainContent');
  if (!el) return;
  el.innerHTML = _renderReportContent();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _renderReportContent() {
  return _currentView === 'invoice' ? _renderInvoiceBuilder() : _renderReport();
}

// ─── REPORT VIEW ─────────────────────────────────────────────────────────────

function _renderReport() {
  const tickets = _filteredTickets;
  const total   = tickets.length;
  const resolved = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
  const resolvePct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const totalHours = tickets.reduce((sum, t) => sum + (t.actual_hours || t.estimated_hours || 0), 0);

  const resolvedWithDates = tickets.filter(t => t.reported_date && t.resolved_date);
  let avgResolution = null;
  if (resolvedWithDates.length > 0) {
    const totalDays = resolvedWithDates.reduce((sum, t) => {
      const diff = new Date(t.resolved_date) - new Date(t.reported_date);
      return sum + Math.max(0, diff / (1000 * 60 * 60 * 24));
    }, 0);
    avgResolution = (totalDays / resolvedWithDates.length).toFixed(1);
  }

  const byType = {};
  for (const opt of TICKET_TYPE_OPTIONS) {
    const group = tickets.filter(t => t.type === opt.value);
    if (group.length > 0) byType[opt.value] = { label: opt.label, tickets: group };
  }

  const byStatus = {};
  for (const opt of TICKET_STATUS_OPTIONS) {
    const count = tickets.filter(t => t.status === opt.value).length;
    if (count > 0) byStatus[opt.label] = count;
  }

  if (total === 0) {
    return `<div class="empty-state" style="margin-top:var(--space-10);">
      <i data-lucide="file-search" class="empty-state__icon"></i>
      <p class="empty-state__title">No tickets in selected date range</p>
      <p class="empty-state__text">Try adjusting the date range above.</p>
    </div>`;
  }

  return `
    <!-- Print-only header (hidden on screen) -->
    <div class="rpt-print-header">
      <div>
        ${_settings['company_logo'] ? `<img src="${_settings['company_logo']}" class="rpt-company-logo" alt="Company Logo" />` : ''}
        <div class="rpt-company-name">${sanitize(_settings['company_name'] || 'TRACKLY')}</div>
      </div>
      <div class="rpt-print-meta">
        <strong>Maintenance Report</strong><br>
        Project: ${sanitize(_project.name)}<br>
        Period: ${formatDateID(_dateFrom)} – ${formatDateID(_dateTo)}<br>
        Generated: ${formatDateID(new Date().toISOString())}
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="rpt-stat-grid">
      <div class="rpt-stat-card">
        <span class="rpt-stat-card__num">${total}</span>
        <span class="rpt-stat-card__label">Total Tickets</span>
      </div>
      <div class="rpt-stat-card">
        <span class="rpt-stat-card__num" style="color:var(--color-success)">${resolvePct}%</span>
        <span class="rpt-stat-card__label">Resolution Rate</span>
      </div>
      <div class="rpt-stat-card">
        <span class="rpt-stat-card__num">${avgResolution !== null ? avgResolution + 'd' : '—'}</span>
        <span class="rpt-stat-card__label">Avg. Resolution Time</span>
      </div>
      <div class="rpt-stat-card">
        <span class="rpt-stat-card__num">${totalHours}h</span>
        <span class="rpt-stat-card__label">Total Hours Logged</span>
      </div>
    </div>

    <!-- Summary by Status -->
    <div class="rpt-section">
      <h2 class="rpt-section__title">Summary by Status</h2>
      <div class="rpt-breakdown-grid">
        ${Object.entries(byStatus).map(([label, count]) => `
          <div class="rpt-breakdown-item">
            <span class="rpt-breakdown-item__label">${sanitize(label)}</span>
            <span class="rpt-breakdown-item__count">${count}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Grouped by Type -->
    ${Object.entries(byType).map(([type, { label, tickets: grp }]) => `
      <div class="rpt-section">
        <h2 class="rpt-section__title">${sanitize(label)} <span class="rpt-section__badge">${grp.length}</span></h2>
        <div class="rpt-table-wrap">
          <table class="rpt-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reported By</th>
                <th>Reported</th>
                <th>Due Date</th>
                <th>Resolved</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              ${grp.map(t => {
                const hours = t.actual_hours != null ? t.actual_hours : (t.estimated_hours != null ? `~${t.estimated_hours}` : '—');
                return `<tr>
                  <td class="text-mono text-xs">${sanitize(t.id)}</td>
                  <td>${sanitize(t.title)}</td>
                  <td>${t.severity ? sanitize(t.severity) : '—'}</td>
                  <td>${sanitize(t.priority || '—')}</td>
                  <td>${sanitize(_getLabelFor(TICKET_STATUS_OPTIONS, t.status))}</td>
                  <td>${sanitize(t.reported_by || '—')}</td>
                  <td class="text-nowrap">${t.reported_date ? formatDateID(t.reported_date) : '—'}</td>
                  <td class="text-nowrap">${t.due_date ? formatDateID(t.due_date) : '—'}</td>
                  <td class="text-nowrap">${t.resolved_date ? formatDateID(t.resolved_date) : '—'}</td>
                  <td>${hours}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}

    <!-- Full Ticket List -->
    <div class="rpt-section">
      <h2 class="rpt-section__title">All Tickets in Period</h2>
      <div class="rpt-table-wrap">
        <table class="rpt-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Priority</th>
              <th>Status</th>
              <th>PIC Dev</th>
              <th>PIC Client</th>
              <th>Ordered By</th>
              <th>Assigned Date</th>
              <th>Due Date</th>
              <th>Est. Hours</th>
              <th>Actual Hours</th>
              <th>Cost Est.</th>
            </tr>
          </thead>
          <tbody>
            ${tickets.map(t => {
              const devNames = (t.pic_dev_ids || []).map(id => _members.find(m => m.id === id)?.full_name || '').filter(Boolean).join(', ');
              const orderedBy = _members.find(m => m.id === t.ordered_by)?.full_name || '—';
              return `<tr>
                <td class="text-mono text-xs">${sanitize(t.id)}</td>
                <td>${sanitize(t.title)}</td>
                <td>${sanitize(_getLabelFor(TICKET_TYPE_OPTIONS, t.type))}</td>
                <td>${t.severity ? sanitize(t.severity) : '—'}</td>
                <td>${sanitize(t.priority || '—')}</td>
                <td>${sanitize(_getLabelFor(TICKET_STATUS_OPTIONS, t.status))}</td>
                <td>${sanitize(devNames || '—')}</td>
                <td>${sanitize(t.pic_client || '—')}</td>
                <td>${sanitize(orderedBy)}</td>
                <td class="text-nowrap">${t.assigned_date ? formatDateID(t.assigned_date) : '—'}</td>
                <td class="text-nowrap">${t.due_date ? formatDateID(t.due_date) : '—'}</td>
                <td>${t.estimated_hours != null ? t.estimated_hours + 'h' : '—'}</td>
                <td>${t.actual_hours != null ? t.actual_hours + 'h' : '—'}</td>
                <td>${t.cost_estimate != null ? _fmtCurrency(t.cost_estimate) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// ─── INVOICE BUILDER ─────────────────────────────────────────────────────────

function _renderInvoiceBuilder() {
  return `
    <div class="inv-controls no-print">
      <h3 class="inv-controls__title">Invoice Settings</h3>
      <div class="inv-controls__row">
        <div class="form-group">
          <label class="form-label">Billing Mode</label>
          <select class="form-select" id="invRateMode">
            <option value="hourly" ${_rateMode === 'hourly' ? 'selected' : ''}>Hourly Rate</option>
            <option value="flat"   ${_rateMode === 'flat'   ? 'selected' : ''}>Flat Cost per Ticket</option>
            <option value="custom" ${_rateMode === 'custom' ? 'selected' : ''}>Use Ticket Cost Estimates</option>
          </select>
        </div>
        ${_rateMode === 'hourly' ? `
        <div class="form-group">
          <label class="form-label">Hourly Rate (IDR)</label>
          <input type="number" class="form-input" id="invHourlyRate" min="0" step="1000"
            value="${_hourlyRate}" placeholder="e.g. 500000" />
        </div>` : ''}
        ${_rateMode === 'flat' ? `
        <div class="form-group">
          <label class="form-label">Flat Cost per Ticket (IDR)</label>
          <input type="number" class="form-input" id="invFlatCost" min="0" step="1000"
            value="${_flatCost}" placeholder="e.g. 1000000" />
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">Tax Rate (%)</label>
          <input type="number" class="form-input" id="invTaxRate" min="0" max="100" step="0.1"
            value="${_taxRate}" placeholder="e.g. 11" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Invoice Notes</label>
        <textarea class="form-input" id="invNote" rows="2" style="resize:vertical;"
          placeholder="Payment terms, bank details, or any other notes...">${sanitize(_invoiceNote)}</textarea>
      </div>
    </div>
    ${_renderInvoiceDocument()}`;
}

function _renderInvoiceDocument() {
  const tickets    = _filteredTickets;
  const lineItems  = _buildLineItems(tickets);
  const subtotal   = lineItems.reduce((s, li) => s + li.subtotal, 0);
  const taxAmount  = subtotal * (_taxRate / 100);
  const total      = subtotal + taxAmount;

  const companyName  = sanitize(_settings['company_name']  || 'Your Company Name');
  const companyAddr  = sanitize(_settings['company_address'] || '');
  const companyEmail = sanitize(_settings['company_email']  || '');
  const companyPhone = sanitize(_settings['company_phone']  || '');
  const companyLogo  = _settings['company_logo'] || '';

  const clientName  = sanitize(_client?.company_name || _project?.name || '');
  const clientAddr  = sanitize(_client?.address || '');
  const clientEmail = sanitize(_client?.contact_email || '');
  const clientPic   = sanitize(_client?.contact_person || '');

  const invoiceDate = new Date().toISOString().substring(0, 10);
  const invNum      = `INV-${Date.now().toString().slice(-6)}`;

  return `
    <div class="inv-document" id="invDocument">
      <div class="inv-header">
        <div class="inv-header__left">
          ${companyLogo ? `<img src="${companyLogo}" class="inv-logo" alt="Company Logo" />` : ''}
          <div class="inv-company-name">${companyName}</div>
          ${companyAddr  ? `<div class="inv-company-detail">${companyAddr}</div>`  : ''}
          ${companyEmail ? `<div class="inv-company-detail">${companyEmail}</div>` : ''}
          ${companyPhone ? `<div class="inv-company-detail">${companyPhone}</div>` : ''}
        </div>
        <div class="inv-header__right">
          <div class="inv-title">INVOICE</div>
          <table class="inv-meta-table">
            <tr><td>Invoice No.</td><td><strong>${sanitize(invNum)}</strong></td></tr>
            <tr><td>Date</td><td>${formatDateID(invoiceDate)}</td></tr>
            <tr><td>Period</td><td>${formatDateID(_dateFrom)} – ${formatDateID(_dateTo)}</td></tr>
            <tr><td>Project</td><td>${sanitize(_project.name)}</td></tr>
          </table>
        </div>
      </div>

      <div class="inv-bill-section">
        <div class="inv-bill-to">
          <div class="inv-bill-to__label">Bill To</div>
          <div class="inv-bill-to__name">${clientName || '—'}</div>
          ${clientPic   ? `<div class="inv-bill-to__detail">Attn: ${clientPic}</div>`   : ''}
          ${clientAddr  ? `<div class="inv-bill-to__detail">${clientAddr}</div>`  : ''}
          ${clientEmail ? `<div class="inv-bill-to__detail">${clientEmail}</div>` : ''}
        </div>
        <div class="inv-bill-summary">
          <div class="inv-bill-summary__label">Total Due</div>
          <div class="inv-bill-summary__amount">${_fmtCurrency(total)}</div>
        </div>
      </div>

      <table class="inv-items-table">
        <thead>
          <tr>
            <th style="width:100px;">Ticket ID</th>
            <th style="width:80px;">Type</th>
            <th style="width:80px;">Severity</th>
            <th>Description</th>
            <th style="width:70px;text-align:right;">Hours</th>
            <th style="width:120px;text-align:right;">Unit Cost</th>
            <th style="width:120px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.length === 0 ? `
            <tr><td colspan="7" style="text-align:center;padding:24px;color:#888;">
              No tickets in selected date range
            </td></tr>` :
            lineItems.map(li => `
              <tr class="inv-item-row">
                <td class="inv-item-id">${sanitize(li.id)}</td>
                <td>${sanitize(li.type)}</td>
                <td>${sanitize(li.severity || '—')}</td>
                <td>
                  <div class="inv-item-title">${sanitize(li.title)}</div>
                  ${li.picClient ? `<div class="inv-item-note">PIC Client: ${sanitize(li.picClient)}</div>` : ''}
                  ${li.orderedBy ? `<div class="inv-item-note">Ordered By: ${sanitize(li.orderedBy)}</div>` : ''}
                  ${li.dueDate ? `<div class="inv-item-note">Due: ${li.dueDate}</div>` : ''}
                  ${li.resolution ? `<div class="inv-item-note">${sanitize(li.resolution.substring(0, 80))}${li.resolution.length > 80 ? '...' : ''}</div>` : ''}
                </td>
                <td style="text-align:right;">${li.hours != null ? li.hours + 'h' : '—'}</td>
                <td style="text-align:right;">${_fmtCurrency(li.unitCost)}</td>
                <td style="text-align:right;font-weight:600;">${_fmtCurrency(li.subtotal)}</td>
              </tr>`).join('')}
        </tbody>
      </table>

      <div class="inv-totals">
        <div class="inv-totals__row">
          <span>Subtotal</span>
          <span>${_fmtCurrency(subtotal)}</span>
        </div>
        <div class="inv-totals__row">
          <span>Tax (${_taxRate}%)</span>
          <span>${_fmtCurrency(taxAmount)}</span>
        </div>
        <div class="inv-totals__row inv-totals__row--total">
          <span>Total</span>
          <span>${_fmtCurrency(total)}</span>
        </div>
      </div>

      ${_invoiceNote ? `
        <div class="inv-notes">
          <div class="inv-notes__label">Notes</div>
          <div class="inv-notes__body">${sanitize(_invoiceNote)}</div>
        </div>` : ''}

      <div class="inv-footer">
        Thank you for your business. Generated by TRACKLY — ${sanitize(companyName)}
      </div>
    </div>`;
}

function _buildLineItems(tickets) {
  return tickets
    .filter(t => t.status !== 'rejected')
    .map(t => {
      const hours = t.actual_hours ?? t.estimated_hours ?? null;
      let unitCost = 0, subtotal = 0;

      if (_rateMode === 'hourly') {
        unitCost = _hourlyRate;
        subtotal = (hours || 0) * _hourlyRate;
      } else if (_rateMode === 'flat') {
        unitCost = _flatCost;
        subtotal = _flatCost;
      } else {
        unitCost = t.cost_estimate || 0;
        subtotal = t.cost_estimate || 0;
      }

      const orderedByUser = _members.find(m => m.id === t.ordered_by);

      return {
        id:         t.id,
        type:       _getLabelFor(TICKET_TYPE_OPTIONS, t.type),
        severity:   t.severity || '',
        title:      t.title,
        resolution: t.resolution_notes || '',
        picClient:  t.pic_client || '',
        orderedBy:  orderedByUser?.full_name || '',
        dueDate:    t.due_date ? formatDateID(t.due_date) : '',
        assignedDate: t.assigned_date ? formatDateID(t.assigned_date) : '',
        hours,
        unitCost,
        subtotal,
      };
    });
}

function _refreshInvoiceTotals() {
  const el = document.getElementById('rptMainContent');
  if (!el) return;
  const docEl = document.getElementById('invDocument');
  if (docEl) {
    docEl.outerHTML = _renderInvoiceDocument();
  } else {
    el.innerHTML = _renderInvoiceBuilder();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Export Functions ─────────────────────────────────────────────────────────

function _buildExportRows() {
  return _filteredTickets.map((t, idx) => {
    const devNames = (t.pic_dev_ids || []).map(id => _members.find(m => m.id === id)?.full_name || '').filter(Boolean).join(', ');
    const orderedByUser = _members.find(m => m.id === t.ordered_by);
    return {
      'No':                  idx + 1,
      'ID Ticket':           t.id || '',
      'Judul':               t.title || '',
      'Tipe':                _getLabelFor(TICKET_TYPE_OPTIONS, t.type),
      'Severity':            t.severity || '',
      'Priority':            _getLabelFor(TICKET_PRIORITY_OPTIONS, t.priority),
      'Status':              _getLabelFor(TICKET_STATUS_OPTIONS, t.status),
      'Dilaporkan Oleh':     t.reported_by || '',
      'PIC Dev':             devNames,
      'PIC Client':          t.pic_client || '',
      'Dipesan Oleh':        orderedByUser?.full_name || '',
      'Tgl Assign':          t.assigned_date ? formatDateID(t.assigned_date) : '',
      'Tgl Due':             t.due_date ? formatDateID(t.due_date) : '',
      'Est. Jam':            t.estimated_hours != null ? t.estimated_hours : '',
      'Aktual Jam':          t.actual_hours != null ? t.actual_hours : '',
      'Estimasi Biaya (IDR)': t.cost_estimate != null ? t.cost_estimate : '',
      'Catatan Resolusi':    t.resolution_notes || '',
    };
  });
}

function _handleExportExcel() {
  // Load SheetJS dynamically if not already loaded
  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    script.onload = () => _doExportExcel();
    script.onerror = () => showToast('Failed to load SheetJS library. Check your internet connection.', 'error');
    document.head.appendChild(script);
  } else {
    _doExportExcel();
  }
}

function _doExportExcel() {
  try {
    const rows = _buildExportRows();
    if (rows.length === 0) { showToast('No tickets to export in the selected date range.', 'warning'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 10 },
      { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 20 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 },
      { wch: 20 }, { wch: 40 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Report');

    const projectName = (_project?.name || 'project').replace(/[^a-z0-9]/gi, '_');
    const filename = `maintenance_report_${projectName}_${_dateFrom}_${_dateTo}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast('Excel file exported successfully.', 'success');
  } catch (err) {
    debug('Excel export error:', err);
    showToast('Failed to export Excel: ' + err.message, 'error');
  }
}

function _handleExportCsv() {
  try {
    const rows = _buildExportRows();
    if (rows.length === 0) { showToast('No tickets to export in the selected date range.', 'warning'); return; }

    const headers = Object.keys(rows[0]);
    const escape = val => {
      const str = String(val == null ? '' : val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvLines = [
      headers.map(escape).join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ];
    const csvContent = csvLines.join('\n');

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

// ─── PDF Export ───────────────────────────────────────────────────────────────

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
      <a class="project-subnav__link is-active" href="#/projects/${id}/reports"><i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports</a>
    </div>`;
}

function _getLabelFor(options, value) {
  return options.find(o => o.value === value)?.label || value || '—';
}

function _fmtCurrency(amount) {
  if (amount == null || isNaN(amount)) return 'IDR 0';
  return 'IDR ' + Math.round(amount).toLocaleString('id-ID');
}

export default { render };
