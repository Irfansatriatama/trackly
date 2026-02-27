/**
 * TRACKLY — clients.js
 * Phase 6: Client Management — Full CRUD for clients.
 */

import { getAll, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, sanitize, truncate } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospect', label: 'Prospect' },
];

const INDUSTRY_OPTIONS = [
  'Technology', 'Finance & Banking', 'Healthcare', 'Education',
  'Retail & E-Commerce', 'Manufacturing', 'Government', 'Logistics',
  'Media & Entertainment', 'Telecommunications', 'Real Estate', 'Other',
];

let _clients = [];
let _filterStatus = '';
let _filterIndustry = '';
let _searchQuery = '';
let _viewMode = 'card'; // 'card' | 'table'

export async function render(params = {}) {
  try {
    _clients = await getAll('clients');
    renderClientsPage();
  } catch (err) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to load clients</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderClientsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;
  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Clients</h1>
          <p class="page-header__subtitle">Manage client accounts and linked projects</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnAddClient">
            <i data-lucide="building-2" aria-hidden="true"></i>
            Add Client
          </button>
        </div>
      </div>
      <div class="clients-toolbar">
        <div class="clients-search">
          <i data-lucide="search" class="clients-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input clients-search__input" id="clientsSearch"
            placeholder="Search by company, contact, or email..."
            value="${sanitize(_searchQuery)}" autocomplete="off" />
        </div>
        <div class="clients-filters">
          <select class="form-select clients-filter" id="filterStatus">
            <option value="">All Status</option>
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${_filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <select class="form-select clients-filter" id="filterIndustry">
            <option value="">All Industries</option>
            ${INDUSTRY_OPTIONS.map(i => `<option value="${i}" ${_filterIndustry === i ? 'selected' : ''}>${sanitize(i)}</option>`).join('')}
          </select>
          <div class="view-toggle">
            <button class="view-toggle__btn ${_viewMode === 'card' ? 'is-active' : ''}" id="btnViewCard" title="Card view">
              <i data-lucide="layout-grid" aria-hidden="true"></i>
            </button>
            <button class="view-toggle__btn ${_viewMode === 'table' ? 'is-active' : ''}" id="btnViewTable" title="Table view">
              <i data-lucide="list" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
      <div id="clientsContent">${renderClientsContent()}</div>
    </div>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  bindPageEvents();
}

function renderClientsContent() {
  const filtered = getFilteredClients();
  if (filtered.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-16) var(--space-6);">
        <i data-lucide="building-2" class="empty-state__icon"></i>
        <p class="empty-state__title">${_clients.length === 0 ? 'No clients yet' : 'No clients match your filters'}</p>
        <p class="empty-state__text">${_clients.length === 0 ? 'Add your first client to get started.' : 'Try adjusting your search or filter criteria.'}</p>
        ${_clients.length === 0 ? '<button class="btn btn--primary" id="btnAddClientEmpty"><i data-lucide="building-2"></i> Add Client</button>' : ''}
      </div>`;
  }
  return _viewMode === 'card' ? renderCardGrid(filtered) : renderTable(filtered);
}

function renderCardGrid(clients) {
  return `<div class="clients-grid">${clients.map(c => renderClientCard(c)).join('')}</div>`;
}

function renderClientCard(c) {
  const statusBadge = renderBadge(STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status, getStatusVariant(c.status));
  const logoHtml = c.logo
    ? `<img src="${c.logo}" alt="${sanitize(c.company_name)} logo" class="client-card__logo-img" />`
    : `<span class="client-card__logo-initials">${getCompanyInitials(c.company_name)}</span>`;

  return `
    <div class="client-card" data-id="${sanitize(c.id)}">
      <div class="client-card__header">
        <div class="client-card__logo">${logoHtml}</div>
        <div class="client-card__meta">
          ${statusBadge}
          ${c.industry ? `<span class="client-card__industry text-muted">${sanitize(c.industry)}</span>` : ''}
        </div>
      </div>
      <div class="client-card__body">
        <h3 class="client-card__name">${sanitize(c.company_name)}</h3>
        ${c.contact_person ? `<div class="client-card__contact"><i data-lucide="user" aria-hidden="true"></i><span>${sanitize(c.contact_person)}</span></div>` : ''}
        ${c.contact_email ? `<div class="client-card__contact"><i data-lucide="mail" aria-hidden="true"></i><span>${sanitize(c.contact_email)}</span></div>` : ''}
        ${c.contact_phone ? `<div class="client-card__contact"><i data-lucide="phone" aria-hidden="true"></i><span>${sanitize(c.contact_phone)}</span></div>` : ''}
        ${c.website ? `<div class="client-card__contact"><i data-lucide="globe" aria-hidden="true"></i><a href="${sanitize(c.website)}" target="_blank" rel="noopener noreferrer" class="client-card__link">${sanitize(truncate(c.website.replace(/^https?:\/\//, ''), 35))}</a></div>` : ''}
      </div>
      <div class="client-card__footer">
        <span class="client-card__id text-muted">${sanitize(c.id)}</span>
        <div class="client-card__actions">
          <button class="btn btn--ghost btn--sm btn-view-client" data-id="${sanitize(c.id)}" title="View details">
            <i data-lucide="eye" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-edit-client" data-id="${sanitize(c.id)}" title="Edit client">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-delete-client" data-id="${sanitize(c.id)}" title="Delete client" style="color:var(--color-danger);">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>`;
}

function renderTable(clients) {
  return `
    <div class="card">
      <div class="card__body" style="padding:0;">
        <div class="table-container">
          <table class="table clients-table">
            <thead>
              <tr>
                <th>Company</th><th>Contact</th><th>Industry</th><th>Status</th><th>Since</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(c => renderTableRow(c)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function renderTableRow(c) {
  const statusBadge = renderBadge(STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status, getStatusVariant(c.status));
  const logoHtml = c.logo
    ? `<img src="${c.logo}" alt="" class="client-table__logo-img" />`
    : `<span class="client-table__logo-initials">${getCompanyInitials(c.company_name)}</span>`;

  return `
    <tr class="client-row" data-id="${sanitize(c.id)}">
      <td>
        <div class="client-cell">
          <div class="client-table__logo">${logoHtml}</div>
          <div class="client-cell__info">
            <span class="client-cell__name">${sanitize(c.company_name)}</span>
            <span class="client-cell__meta text-muted">${sanitize(c.id)}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="client-contact-cell">
          ${c.contact_person ? `<span class="client-contact-cell__name">${sanitize(c.contact_person)}</span>` : ''}
          ${c.contact_email ? `<span class="client-contact-cell__email text-muted">${sanitize(c.contact_email)}</span>` : ''}
          ${!c.contact_person && !c.contact_email ? '<span class="text-muted">--</span>' : ''}
        </div>
      </td>
      <td class="text-muted">${c.industry ? sanitize(c.industry) : '--'}</td>
      <td>${statusBadge}</td>
      <td class="text-muted" style="font-size:var(--text-xs);">${formatDate(c.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn--ghost btn--sm btn-view-client" data-id="${sanitize(c.id)}" title="View details">
            <i data-lucide="eye" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-edit-client" data-id="${sanitize(c.id)}" title="Edit client">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-delete-client" data-id="${sanitize(c.id)}" title="Delete" style="color:var(--color-danger);">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

function getFilteredClients() {
  return _clients.filter(c => {
    const q = _searchQuery.toLowerCase();
    const matchSearch = !q
      || c.company_name?.toLowerCase().includes(q)
      || c.contact_person?.toLowerCase().includes(q)
      || c.contact_email?.toLowerCase().includes(q);
    const matchStatus = !_filterStatus || c.status === _filterStatus;
    const matchIndustry = !_filterIndustry || c.industry === _filterIndustry;
    return matchSearch && matchStatus && matchIndustry;
  });
}

function bindPageEvents() {
  document.getElementById('btnAddClient')?.addEventListener('click', () => openClientModal(null));
  document.getElementById('btnAddClientEmpty')?.addEventListener('click', () => openClientModal(null));
  document.getElementById('clientsSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; refreshContent(); });
  document.getElementById('filterStatus')?.addEventListener('change', e => { _filterStatus = e.target.value; refreshContent(); });
  document.getElementById('filterIndustry')?.addEventListener('change', e => { _filterIndustry = e.target.value; refreshContent(); });
  document.getElementById('btnViewCard')?.addEventListener('click', () => { _viewMode = 'card'; refreshContent(); updateViewToggle(); });
  document.getElementById('btnViewTable')?.addEventListener('click', () => { _viewMode = 'table'; refreshContent(); updateViewToggle(); });
  document.getElementById('clientsContent')?.addEventListener('click', handleContentAction);
}

function updateViewToggle() {
  document.getElementById('btnViewCard')?.classList.toggle('is-active', _viewMode === 'card');
  document.getElementById('btnViewTable')?.classList.toggle('is-active', _viewMode === 'table');
}

function handleContentAction(e) {
  const viewBtn = e.target.closest('.btn-view-client');
  const editBtn = e.target.closest('.btn-edit-client');
  const deleteBtn = e.target.closest('.btn-delete-client');
  if (viewBtn) { const c = _clients.find(x => x.id === viewBtn.dataset.id); if (c) openClientDetail(c); }
  else if (editBtn) { const c = _clients.find(x => x.id === editBtn.dataset.id); if (c) openClientModal(c); }
  else if (deleteBtn) { const c = _clients.find(x => x.id === deleteBtn.dataset.id); if (c) handleDeleteClient(c); }
}

function refreshContent() {
  const container = document.getElementById('clientsContent');
  if (!container) return;
  container.innerHTML = renderClientsContent();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  container.addEventListener('click', handleContentAction);
}

// ============================================================
// CLIENT MODAL (Add / Edit)
// ============================================================
function openClientModal(client) {
  const isEdit = !!client;
  const formHtml = `
    <form id="clientForm" novalidate>
      <p class="form-section-title">Company Information</p>
      <div class="form-row">
        <div class="form-group" style="flex:2;">
          <label class="form-label" for="cCompanyName">Company Name <span class="required">*</span></label>
          <input class="form-input" type="text" id="cCompanyName" placeholder="e.g. PT Maju Teknologi" value="${sanitize(client?.company_name || '')}" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label" for="cStatus">Status</label>
          <select class="form-select" id="cStatus">
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${(client?.status || 'prospect') === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="cIndustry">Industry</label>
          <select class="form-select" id="cIndustry">
            <option value="">Select industry...</option>
            ${INDUSTRY_OPTIONS.map(i => `<option value="${i}" ${client?.industry === i ? 'selected' : ''}>${sanitize(i)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="cWebsite">Website</label>
          <input class="form-input" type="url" id="cWebsite" placeholder="https://example.com" value="${sanitize(client?.website || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="cAddress">Address</label>
        <textarea class="form-textarea" id="cAddress" rows="2" placeholder="Full company address...">${sanitize(client?.address || '')}</textarea>
      </div>

      <p class="form-section-title">Primary Contact</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="cContactPerson">Contact Person</label>
          <input class="form-input" type="text" id="cContactPerson" placeholder="e.g. Budi Santoso" value="${sanitize(client?.contact_person || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="cContactPhone">Contact Phone</label>
          <input class="form-input" type="tel" id="cContactPhone" placeholder="e.g. +62 812 3456 7890" value="${sanitize(client?.contact_phone || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="cContactEmail">Contact Email</label>
        <input class="form-input" type="email" id="cContactEmail" placeholder="e.g. budi@company.com" value="${sanitize(client?.contact_email || '')}" />
      </div>

      <p class="form-section-title">Notes</p>
      <div class="form-group">
        <label class="form-label" for="cNotes">Internal Notes</label>
        <textarea class="form-textarea" id="cNotes" rows="3" placeholder="Any internal notes about this client...">${sanitize(client?.notes || '')}</textarea>
      </div>

      <p class="form-section-title">Logo</p>
      <div class="avatar-upload-area">
        <div class="client-logo-preview" id="logoPreview">
          ${client?.logo
            ? `<img src="${client.logo}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:var(--radius-md);" />`
            : `<span class="client-logo-preview__initials">${getCompanyInitials(client?.company_name || '?')}</span>`}
        </div>
        <div class="avatar-upload__controls">
          <label class="btn btn--secondary btn--sm" for="cLogo" style="cursor:pointer;">
            <i data-lucide="upload" aria-hidden="true"></i> Upload Logo
          </label>
          <input type="file" id="cLogo" accept="image/*" style="display:none;" />
          <p class="form-help">JPG, PNG, SVG, or WebP. Resized to 200x200px.</p>
          ${client?.logo ? '<button type="button" class="btn btn--ghost btn--sm" id="btnRemoveLogo" style="color:var(--color-danger);">Remove</button>' : ''}
        </div>
      </div>
    </form>`;

  openModal({
    title: isEdit ? 'Edit Client' : 'Add New Client',
    size: 'lg',
    body: formHtml,
    footer: `
      <button class="btn btn--secondary" id="btnCancelClient">Cancel</button>
      <button class="btn btn--primary" id="btnSaveClient">
        <i data-lucide="${isEdit ? 'save' : 'building-2'}" aria-hidden="true"></i>
        ${isEdit ? 'Save Changes' : 'Add Client'}
      </button>`,
  });

  let _logoBase64 = client?.logo || null;

  document.getElementById('cLogo')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      _logoBase64 = await resizeImageToBase64(file, 200, 200);
      const preview = document.getElementById('logoPreview');
      if (preview) preview.innerHTML = `<img src="${_logoBase64}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:var(--radius-md);" />`;
    } catch { showToast('Failed to process image.', 'error'); }
  });

  document.getElementById('btnRemoveLogo')?.addEventListener('click', () => {
    _logoBase64 = null;
    const preview = document.getElementById('logoPreview');
    if (preview) preview.innerHTML = `<span class="client-logo-preview__initials">${getCompanyInitials(document.getElementById('cCompanyName')?.value || '?')}</span>`;
  });

  document.getElementById('cCompanyName')?.addEventListener('input', e => {
    if (!_logoBase64) {
      const preview = document.getElementById('logoPreview');
      if (preview && !preview.querySelector('img'))
        preview.innerHTML = `<span class="client-logo-preview__initials">${getCompanyInitials(e.target.value || '?')}</span>`;
    }
  });

  document.getElementById('btnCancelClient')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveClient')?.addEventListener('click', () => handleSaveClient(client, isEdit, () => _logoBase64));
}

// ============================================================
// SAVE CLIENT
// ============================================================
async function handleSaveClient(existing, isEdit, getLogo) {
  const btn = document.getElementById('btnSaveClient');
  const getValue = id => document.getElementById(id)?.value.trim() || '';

  const companyName = getValue('cCompanyName');
  const status = document.getElementById('cStatus')?.value;
  const industry = document.getElementById('cIndustry')?.value;
  const website = getValue('cWebsite');
  const address = document.getElementById('cAddress')?.value.trim() || '';
  const contactPerson = getValue('cContactPerson');
  const contactPhone = getValue('cContactPhone');
  const contactEmail = getValue('cContactEmail');
  const notes = document.getElementById('cNotes')?.value.trim() || '';

  clearAllFieldErrors();
  let valid = true;

  if (!companyName) { setModalFieldError('cCompanyName', 'Company name is required.'); valid = false; }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    setModalFieldError('cContactEmail', 'Enter a valid email address.');
    valid = false;
  }
  if (website && !/^https?:\/\/.+/.test(website)) {
    setModalFieldError('cWebsite', 'Website must start with http:// or https://');
    valid = false;
  }

  if (!valid) return;
  if (btn) btn.disabled = true;

  try {
    const now = nowISO();
    const allClients = await getAll('clients');
    const clientId = isEdit ? existing.id : generateSequentialId('CLT', allClients);
    const logoBase64 = getLogo();

    const clientData = {
      id: clientId,
      company_name: companyName,
      industry: industry || '',
      contact_person: contactPerson,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      address,
      website,
      logo: logoBase64 || '',
      notes,
      status,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (isEdit) {
      await update('clients', clientData);
      const idx = _clients.findIndex(c => c.id === clientId);
      if (idx !== -1) _clients[idx] = clientData;
      showToast(`${companyName} has been updated.`, 'success');
    } else {
      await add('clients', clientData);
      _clients.push(clientData);
      showToast(`${companyName} has been added as a client.`, 'success');
    }

    closeModal();
    refreshContent();
  } catch (err) {
    showToast('Failed to save client. Please try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// DELETE CLIENT
// ============================================================
async function handleDeleteClient(client) {
  showConfirm({
    title: 'Delete Client',
    message: `Are you sure you want to delete <strong>${sanitize(client.company_name)}</strong>? This action cannot be undone.`,
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      try {
        await remove('clients', client.id);
        _clients = _clients.filter(c => c.id !== client.id);
        showToast(`${client.company_name} has been deleted.`, 'success');
        refreshContent();
      } catch { showToast('Failed to delete client.', 'error'); }
    },
  });
}

// ============================================================
// CLIENT DETAIL MODAL
// ============================================================
async function openClientDetail(client) {
  let projects = [];
  try {
    const allProjects = await getAll('projects');
    projects = allProjects.filter(p => p.client_id === client.id);
  } catch { /* projects not yet implemented */ }

  const logoHtml = client.logo
    ? `<img src="${client.logo}" alt="${sanitize(client.company_name)} logo" class="client-detail__logo-img" />`
    : `<span class="client-detail__logo-initials">${getCompanyInitials(client.company_name)}</span>`;

  const statusBadge = renderBadge(STATUS_OPTIONS.find(s => s.value === client.status)?.label || client.status, getStatusVariant(client.status));

  const projectsHtml = projects.length > 0
    ? `<div class="client-detail__projects-grid">
        ${projects.map(p => `
          <div class="client-project-item">
            <div class="client-project-item__dot" style="background:${sanitize(p.cover_color || 'var(--color-primary)')};"></div>
            <div class="client-project-item__info">
              <span class="client-project-item__name">${sanitize(p.name)}</span>
              <span class="client-project-item__meta text-muted">${sanitize(p.id)} &middot; ${sanitize(p.status || 'planning')}</span>
            </div>
          </div>`).join('')}
      </div>`
    : `<p class="text-muted" style="font-size:var(--text-sm);margin:0;">No projects linked to this client yet.</p>`;

  const bodyHtml = `
    <div class="client-detail">
      <div class="client-detail__header">
        <div class="client-detail__logo">${logoHtml}</div>
        <div class="client-detail__header-info">
          <h2 class="client-detail__company-name">${sanitize(client.company_name)}</h2>
          <div class="client-detail__badges">
            ${statusBadge}
            ${client.industry ? `<span class="badge badge--neutral">${sanitize(client.industry)}</span>` : ''}
          </div>
          <span class="client-detail__id text-muted">${sanitize(client.id)}</span>
        </div>
      </div>

      <div class="client-detail__grid">
        <div class="client-detail__section">
          <h4 class="client-detail__section-title">Contact Information</h4>
          ${client.contact_person ? `<div class="client-detail__info-row"><i data-lucide="user" aria-hidden="true"></i><span>${sanitize(client.contact_person)}</span></div>` : ''}
          ${client.contact_email ? `<div class="client-detail__info-row"><i data-lucide="mail" aria-hidden="true"></i><a href="mailto:${sanitize(client.contact_email)}" class="client-card__link">${sanitize(client.contact_email)}</a></div>` : ''}
          ${client.contact_phone ? `<div class="client-detail__info-row"><i data-lucide="phone" aria-hidden="true"></i><span>${sanitize(client.contact_phone)}</span></div>` : ''}
          ${client.website ? `<div class="client-detail__info-row"><i data-lucide="globe" aria-hidden="true"></i><a href="${sanitize(client.website)}" target="_blank" rel="noopener noreferrer" class="client-card__link">${sanitize(client.website)}</a></div>` : ''}
          ${client.address ? `<div class="client-detail__info-row"><i data-lucide="map-pin" aria-hidden="true"></i><span>${sanitize(client.address)}</span></div>` : ''}
          ${!client.contact_person && !client.contact_email && !client.contact_phone && !client.website && !client.address
            ? '<p class="text-muted" style="font-size:var(--text-sm);margin:0;">No contact information provided.</p>' : ''}
        </div>

        <div class="client-detail__section">
          <h4 class="client-detail__section-title">Dates</h4>
          <div class="client-detail__info-row">
            <i data-lucide="calendar-plus" aria-hidden="true"></i>
            <span>Added ${formatDate(client.created_at)}</span>
          </div>
          <div class="client-detail__info-row">
            <i data-lucide="calendar-check" aria-hidden="true"></i>
            <span>Updated ${formatDate(client.updated_at)}</span>
          </div>
        </div>
      </div>

      ${client.notes ? `
        <div class="client-detail__section">
          <h4 class="client-detail__section-title">Notes</h4>
          <p class="client-detail__notes">${sanitize(client.notes)}</p>
        </div>` : ''}

      <div class="client-detail__section">
        <h4 class="client-detail__section-title">
          Linked Projects
          <span class="badge badge--neutral" style="margin-left:var(--space-2);">${projects.length}</span>
        </h4>
        ${projectsHtml}
      </div>
    </div>`;

  openModal({
    title: 'Client Details',
    size: 'lg',
    body: bodyHtml,
    footer: `
      <button class="btn btn--secondary" id="btnCloseDetail">Close</button>
      <button class="btn btn--primary" id="btnEditFromDetail" data-id="${sanitize(client.id)}">
        <i data-lucide="pencil" aria-hidden="true"></i> Edit Client
      </button>`,
  });

  document.getElementById('btnCloseDetail')?.addEventListener('click', closeModal);
  document.getElementById('btnEditFromDetail')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => openClientModal(client), 150);
  });
}

// ============================================================
// HELPERS
// ============================================================
function getStatusVariant(status) {
  return { active: 'success', inactive: 'neutral', prospect: 'warning' }[status] || 'neutral';
}

function getCompanyInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function setModalFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest('.form-group');
  if (!group) return;
  group.querySelector('.form-error')?.remove();
  field.classList.add('is-invalid');
  const err = document.createElement('p');
  err.className = 'form-error'; err.textContent = message;
  group.appendChild(err);
}

function clearAllFieldErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.remove());
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function resizeImageToBase64(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxW; canvas.height = maxH;
        const ctx = canvas.getContext('2d');
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const sw = img.width * scale, sh = img.height * scale;
        ctx.clearRect(0, 0, maxW, maxH);
        ctx.drawImage(img, (maxW - sw) / 2, (maxH - sh) / 2, sw, sh);
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default { render };
