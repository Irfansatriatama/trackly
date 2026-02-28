/**
 * TRACKLY — assets.js
 * Phase 14: Asset Management — Full CRUD for company/project assets.
 */

import { getAll, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, sanitize, truncate } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { renderAvatar } from '../components/avatar.js';

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_OPTIONS = [
  { value: 'hardware',  label: 'Hardware',  icon: 'monitor' },
  { value: 'software',  label: 'Software',  icon: 'package' },
  { value: 'license',   label: 'License',   icon: 'key' },
  { value: 'document',  label: 'Document',  icon: 'file-text' },
  { value: 'other',     label: 'Other',     icon: 'box' },
];

const STATUS_OPTIONS = [
  { value: 'available',    label: 'Available' },
  { value: 'in_use',       label: 'In Use' },
  { value: 'maintenance',  label: 'Maintenance' },
  { value: 'retired',      label: 'Retired' },
];

// ============================================================
// MODULE STATE
// ============================================================

let _assets   = [];
let _members  = [];
let _projects = [];

let _filterCategory = '';
let _filterStatus   = '';
let _filterAssignee = '';
let _filterProject  = '';
let _searchQuery    = '';

// ============================================================
// ENTRY POINT
// ============================================================

export async function render(params = {}) {
  try {
    [_assets, _members, _projects] = await Promise.all([
      getAll('assets'),
      getAll('users'),
      getAll('projects'),
    ]);
    renderAssetsPage();
  } catch (err) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to load assets</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ============================================================
// PAGE RENDER
// ============================================================

function renderAssetsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;

  const warningCount = getExpiringWarrantyCount();

  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Asset Management</h1>
          <p class="page-header__subtitle">Track and manage company hardware, software, and licenses</p>
        </div>
        <div class="page-header__actions">
          ${warningCount > 0 ? `
            <div class="asset-warranty-banner">
              <i data-lucide="alert-triangle" aria-hidden="true"></i>
              <span>${warningCount} asset${warningCount > 1 ? 's' : ''} with warranty expiring within 30 days</span>
            </div>` : ''}
          <button class="btn btn--primary" id="btnAddAsset">
            <i data-lucide="plus" aria-hidden="true"></i>
            Add Asset
          </button>
        </div>
      </div>

      ${renderStatsSummary()}

      <div class="assets-toolbar">
        <div class="assets-search">
          <i data-lucide="search" class="assets-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input assets-search__input" id="assetsSearch"
            placeholder="Search by name, serial number, or vendor..."
            value="${sanitize(_searchQuery)}" autocomplete="off" />
        </div>
        <div class="assets-filters">
          <select class="form-select assets-filter" id="filterCategory">
            <option value="">All Categories</option>
            ${CATEGORY_OPTIONS.map(c => `<option value="${c.value}" ${_filterCategory === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
          <select class="form-select assets-filter" id="filterStatus">
            <option value="">All Status</option>
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${_filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <select class="form-select assets-filter" id="filterAssignee">
            <option value="">All Assignees</option>
            <option value="__unassigned__" ${_filterAssignee === '__unassigned__' ? 'selected' : ''}>Unassigned</option>
            ${_members.map(m => `<option value="${sanitize(m.id)}" ${_filterAssignee === m.id ? 'selected' : ''}>${sanitize(m.full_name)}</option>`).join('')}
          </select>
          <select class="form-select assets-filter" id="filterProject">
            <option value="">All Projects</option>
            <option value="__none__" ${_filterProject === '__none__' ? 'selected' : ''}>No Project</option>
            ${_projects.map(p => `<option value="${sanitize(p.id)}" ${_filterProject === p.id ? 'selected' : ''}>${sanitize(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="assetsContent">${renderAssetsTable()}</div>
    </div>`;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  bindPageEvents();
}

// ============================================================
// STATS SUMMARY ROW
// ============================================================

function renderStatsSummary() {
  const total     = _assets.length;
  const inUse     = _assets.filter(a => a.status === 'in_use').length;
  const available = _assets.filter(a => a.status === 'available').length;
  const expiring  = getExpiringWarrantyCount();

  return `
    <div class="assets-stats-row">
      <div class="asset-stat-card">
        <i data-lucide="layers" class="asset-stat-card__icon" aria-hidden="true"></i>
        <div>
          <span class="asset-stat-card__num">${total}</span>
          <span class="asset-stat-card__label">Total Assets</span>
        </div>
      </div>
      <div class="asset-stat-card">
        <i data-lucide="activity" class="asset-stat-card__icon asset-stat-card__icon--info" aria-hidden="true"></i>
        <div>
          <span class="asset-stat-card__num">${inUse}</span>
          <span class="asset-stat-card__label">In Use</span>
        </div>
      </div>
      <div class="asset-stat-card">
        <i data-lucide="check-circle" class="asset-stat-card__icon asset-stat-card__icon--success" aria-hidden="true"></i>
        <div>
          <span class="asset-stat-card__num">${available}</span>
          <span class="asset-stat-card__label">Available</span>
        </div>
      </div>
      <div class="asset-stat-card ${expiring > 0 ? 'asset-stat-card--warning' : ''}">
        <i data-lucide="shield-alert" class="asset-stat-card__icon ${expiring > 0 ? 'asset-stat-card__icon--warning' : ''}" aria-hidden="true"></i>
        <div>
          <span class="asset-stat-card__num">${expiring}</span>
          <span class="asset-stat-card__label">Warranty Expiring</span>
        </div>
      </div>
    </div>`;
}

// ============================================================
// ASSETS TABLE
// ============================================================

function renderAssetsTable() {
  const filtered = getFilteredAssets();

  if (filtered.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-16) var(--space-6);">
        <i data-lucide="box" class="empty-state__icon"></i>
        <p class="empty-state__title">${_assets.length === 0 ? 'No assets yet' : 'No assets match your filters'}</p>
        <p class="empty-state__text">${_assets.length === 0 ? 'Start tracking your hardware, software, and licenses.' : 'Try adjusting your search or filter criteria.'}</p>
        ${_assets.length === 0 ? '<button class="btn btn--primary" id="btnAddAssetEmpty"><i data-lucide="plus"></i> Add Asset</button>' : ''}
      </div>`;
  }

  return `
    <div class="card">
      <div class="card__body" style="padding:0;">
        <div class="table-container">
          <table class="table assets-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Category</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Project</th>
                <th>Warranty Expiry</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => renderAssetRow(a)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function renderAssetRow(asset) {
  const category  = CATEGORY_OPTIONS.find(c => c.value === asset.category) || CATEGORY_OPTIONS[4];
  const member    = asset.assigned_to ? _members.find(m => m.id === asset.assigned_to) : null;
  const project   = asset.project_id  ? _projects.find(p => p.id === asset.project_id) : null;
  const warranty  = warrantyStatus(asset.warranty_expiry);

  const statusBadge    = renderBadge(
    STATUS_OPTIONS.find(s => s.value === asset.status)?.label || asset.status,
    getStatusVariant(asset.status)
  );

  const categoryBadge  = `
    <span class="asset-category-badge asset-category-badge--${sanitize(asset.category || 'other')}">
      <i data-lucide="${sanitize(category.icon)}" aria-hidden="true"></i>
      ${sanitize(category.label)}
    </span>`;

  const assigneeHtml = member
    ? `<div class="asset-assignee">
        ${renderAvatar(member, 'xs')}
        <span class="asset-assignee__name">${sanitize(member.full_name)}</span>
      </div>`
    : `<span class="text-muted">—</span>`;

  const projectHtml = project
    ? `<div class="asset-project-cell">
        <span class="asset-project-dot" style="background:${sanitize(project.cover_color || 'var(--color-primary)')};"></span>
        <span>${sanitize(truncate(project.name, 25))}</span>
      </div>`
    : `<span class="text-muted">—</span>`;

  const warrantyHtml = asset.warranty_expiry
    ? `<span class="asset-warranty ${warranty.cls}">
        ${warranty.icon ? `<i data-lucide="${warranty.icon}" aria-hidden="true"></i>` : ''}
        ${sanitize(formatDate(asset.warranty_expiry))}
      </span>`
    : `<span class="text-muted">—</span>`;

  const imageHtml = asset.image
    ? `<img src="${asset.image}" alt="${sanitize(asset.name)}" class="asset-row-img" />`
    : `<span class="asset-row-icon"><i data-lucide="${sanitize(category.icon)}" aria-hidden="true"></i></span>`;

  return `
    <tr class="asset-row ${warranty.rowCls}" data-id="${sanitize(asset.id)}">
      <td>
        <div class="asset-cell">
          <div class="asset-cell__thumb">${imageHtml}</div>
          <div class="asset-cell__info">
            <span class="asset-cell__name">${sanitize(asset.name)}</span>
            <span class="asset-cell__meta text-muted">${sanitize(asset.id)}${asset.serial_number ? ' · ' + sanitize(asset.serial_number) : ''}</span>
          </div>
        </div>
      </td>
      <td>${categoryBadge}</td>
      <td>${statusBadge}</td>
      <td>${assigneeHtml}</td>
      <td>${projectHtml}</td>
      <td>${warrantyHtml}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn--ghost btn--sm btn-view-asset" data-id="${sanitize(asset.id)}" title="View details">
            <i data-lucide="eye" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-edit-asset" data-id="${sanitize(asset.id)}" title="Edit asset">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <button class="btn btn--ghost btn--sm btn-delete-asset" data-id="${sanitize(asset.id)}" title="Delete asset" style="color:var(--color-danger);">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

// ============================================================
// FILTER LOGIC
// ============================================================

function getFilteredAssets() {
  return _assets.filter(a => {
    const q = _searchQuery.toLowerCase();
    const matchSearch = !q
      || a.name?.toLowerCase().includes(q)
      || a.serial_number?.toLowerCase().includes(q)
      || a.vendor?.toLowerCase().includes(q)
      || a.description?.toLowerCase().includes(q);
    const matchCat    = !_filterCategory || a.category === _filterCategory;
    const matchStatus = !_filterStatus   || a.status === _filterStatus;
    const matchAssign = !_filterAssignee
      || (_filterAssignee === '__unassigned__' ? !a.assigned_to : a.assigned_to === _filterAssignee);
    const matchProj   = !_filterProject
      || (_filterProject === '__none__' ? !a.project_id : a.project_id === _filterProject);
    return matchSearch && matchCat && matchStatus && matchAssign && matchProj;
  });
}

// ============================================================
// WARRANTY HELPERS
// ============================================================

function getExpiringWarrantyCount() {
  const now = new Date();
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  return _assets.filter(a => {
    if (!a.warranty_expiry) return false;
    const exp = new Date(a.warranty_expiry);
    return exp >= now && exp <= in30;
  }).length;
}

function warrantyStatus(expiry) {
  if (!expiry) return { cls: '', icon: '', rowCls: '' };
  const exp = new Date(expiry);
  const now = new Date();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { cls: 'asset-warranty--expired', icon: 'x-circle', rowCls: '' };
  } else if (diffDays <= 30) {
    return { cls: 'asset-warranty--expiring', icon: 'alert-triangle', rowCls: 'asset-row--warranty-warning' };
  }
  return { cls: 'asset-warranty--ok', icon: 'shield-check', rowCls: '' };
}

// ============================================================
// EVENT BINDING
// ============================================================

function bindPageEvents() {
  document.getElementById('btnAddAsset')?.addEventListener('click', () => openAssetModal(null));
  document.getElementById('btnAddAssetEmpty')?.addEventListener('click', () => openAssetModal(null));
  document.getElementById('assetsSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; refreshContent(); });
  document.getElementById('filterCategory')?.addEventListener('change', e => { _filterCategory = e.target.value; refreshContent(); });
  document.getElementById('filterStatus')?.addEventListener('change', e => { _filterStatus = e.target.value; refreshContent(); });
  document.getElementById('filterAssignee')?.addEventListener('change', e => { _filterAssignee = e.target.value; refreshContent(); });
  document.getElementById('filterProject')?.addEventListener('change', e => { _filterProject = e.target.value; refreshContent(); });
  document.getElementById('assetsContent')?.addEventListener('click', handleContentAction);
}

function handleContentAction(e) {
  const viewBtn   = e.target.closest('.btn-view-asset');
  const editBtn   = e.target.closest('.btn-edit-asset');
  const deleteBtn = e.target.closest('.btn-delete-asset');
  if (viewBtn)        { const a = _assets.find(x => x.id === viewBtn.dataset.id);   if (a) openAssetDetail(a); }
  else if (editBtn)   { const a = _assets.find(x => x.id === editBtn.dataset.id);   if (a) openAssetModal(a); }
  else if (deleteBtn) { const a = _assets.find(x => x.id === deleteBtn.dataset.id); if (a) handleDeleteAsset(a); }
}

function refreshContent() {
  const container = document.getElementById('assetsContent');
  if (!container) return;
  container.innerHTML = renderAssetsTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  container.addEventListener('click', handleContentAction);
}

// ============================================================
// ASSET MODAL (Add / Edit)
// ============================================================

function openAssetModal(asset) {
  const isEdit = !!asset;

  const formHtml = `
    <form id="assetForm" novalidate>
      <p class="form-section-title">Basic Information</p>
      <div class="form-row">
        <div class="form-group" style="flex:2;">
          <label class="form-label" for="aName">Asset Name <span class="required">*</span></label>
          <input class="form-input" type="text" id="aName" placeholder="e.g. MacBook Pro 16-inch" value="${sanitize(asset?.name || '')}" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label" for="aCategory">Category <span class="required">*</span></label>
          <select class="form-select" id="aCategory">
            ${CATEGORY_OPTIONS.map(c => `<option value="${c.value}" ${(asset?.category || 'hardware') === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;">
          <label class="form-label" for="aStatus">Status</label>
          <select class="form-select" id="aStatus">
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${(asset?.status || 'available') === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label" for="aSerialNumber">Serial Number</label>
          <input class="form-input" type="text" id="aSerialNumber" placeholder="e.g. C02XY1234567" value="${sanitize(asset?.serial_number || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="aDescription">Description</label>
        <textarea class="form-textarea" id="aDescription" rows="2" placeholder="Brief description of the asset...">${sanitize(asset?.description || '')}</textarea>
      </div>

      <p class="form-section-title">Purchase Details</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="aVendor">Vendor / Supplier</label>
          <input class="form-input" type="text" id="aVendor" placeholder="e.g. Apple Store" value="${sanitize(asset?.vendor || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="aPurchaseDate">Purchase Date</label>
          <input class="form-input" type="date" id="aPurchaseDate" value="${sanitize(asset?.purchase_date || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="aPurchasePrice">Purchase Price</label>
          <input class="form-input" type="number" id="aPurchasePrice" min="0" step="1000" placeholder="0" value="${asset?.purchase_price != null ? asset.purchase_price : ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="aWarrantyExpiry">Warranty Expiry Date</label>
        <input class="form-input" type="date" id="aWarrantyExpiry" value="${sanitize(asset?.warranty_expiry || '')}" />
        <p class="form-help">A visual warning will appear 30 days before expiry.</p>
      </div>

      <p class="form-section-title">Assignment</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="aAssignedTo">Assigned To (User)</label>
          <select class="form-select" id="aAssignedTo">
            <option value="">Not assigned to a user</option>
            ${_members.filter(m => m.status === 'active').map(m =>
              `<option value="${sanitize(m.id)}" ${asset?.assigned_to === m.id ? 'selected' : ''}>${sanitize(m.full_name)} (${sanitize(m.position || m.role)})</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="aProjectId">Linked Project</label>
          <select class="form-select" id="aProjectId">
            <option value="">No project link</option>
            ${_projects.map(p => `<option value="${sanitize(p.id)}" ${asset?.project_id === p.id ? 'selected' : ''}>${sanitize(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="aNotes">Internal Notes</label>
        <textarea class="form-textarea" id="aNotes" rows="2" placeholder="Any internal notes about this asset...">${sanitize(asset?.notes || '')}</textarea>
      </div>

      <p class="form-section-title">Asset Image</p>
      <div class="avatar-upload-area">
        <div class="asset-image-preview" id="assetImagePreview">
          ${asset?.image
            ? `<img src="${asset.image}" alt="Asset" class="asset-image-preview__img" />`
            : `<i data-lucide="${CATEGORY_OPTIONS.find(c => c.value === asset?.category)?.icon || 'box'}" class="asset-image-preview__icon" aria-hidden="true"></i>`}
        </div>
        <div class="avatar-upload__controls">
          <label class="btn btn--secondary btn--sm" for="aImage" style="cursor:pointer;">
            <i data-lucide="upload" aria-hidden="true"></i> Upload Image
          </label>
          <input type="file" id="aImage" accept="image/*" style="display:none;" />
          <p class="form-help">JPG, PNG, or WebP. Resized to 400×400px.</p>
          ${asset?.image ? '<button type="button" class="btn btn--ghost btn--sm" id="btnRemoveAssetImage" style="color:var(--color-danger);">Remove Image</button>' : ''}
        </div>
      </div>
    </form>`;

  openModal({
    title: isEdit ? 'Edit Asset' : 'Add New Asset',
    size: 'lg',
    body: formHtml,
    footer: `
      <button class="btn btn--secondary" id="btnCancelAsset">Cancel</button>
      <button class="btn btn--primary" id="btnSaveAsset">
        <i data-lucide="${isEdit ? 'save' : 'plus'}" aria-hidden="true"></i>
        ${isEdit ? 'Save Changes' : 'Add Asset'}
      </button>`,
  });

  let _imageBase64 = asset?.image || null;

  document.getElementById('aImage')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      _imageBase64 = await resizeImageToBase64(file, 400, 400);
      const preview = document.getElementById('assetImagePreview');
      if (preview) preview.innerHTML = `<img src="${_imageBase64}" alt="Asset" class="asset-image-preview__img" />`;
    } catch { showToast('Failed to process image.', 'error'); }
  });

  document.getElementById('btnRemoveAssetImage')?.addEventListener('click', () => {
    _imageBase64 = null;
    const preview = document.getElementById('assetImagePreview');
    const cat  = document.getElementById('aCategory')?.value || 'other';
    const icon = CATEGORY_OPTIONS.find(c => c.value === cat)?.icon || 'box';
    if (preview) preview.innerHTML = `<i data-lucide="${icon}" class="asset-image-preview__icon" aria-hidden="true"></i>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  document.getElementById('aCategory')?.addEventListener('change', e => {
    if (!_imageBase64) {
      const preview = document.getElementById('assetImagePreview');
      const icon = CATEGORY_OPTIONS.find(c => c.value === e.target.value)?.icon || 'box';
      if (preview && !preview.querySelector('img')) {
        preview.innerHTML = `<i data-lucide="${icon}" class="asset-image-preview__icon" aria-hidden="true"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
  });

  document.getElementById('btnCancelAsset')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveAsset')?.addEventListener('click', () => handleSaveAsset(asset, isEdit, () => _imageBase64));
}

// ============================================================
// SAVE ASSET
// ============================================================

async function handleSaveAsset(existing, isEdit, getImage) {
  const btn      = document.getElementById('btnSaveAsset');
  const getValue = id => document.getElementById(id)?.value.trim() || '';

  const name          = getValue('aName');
  const category      = document.getElementById('aCategory')?.value || 'other';
  const status        = document.getElementById('aStatus')?.value || 'available';
  const serialNumber  = getValue('aSerialNumber');
  const description   = document.getElementById('aDescription')?.value.trim() || '';
  const vendor        = getValue('aVendor');
  const purchaseDate  = getValue('aPurchaseDate');
  const priceRaw      = document.getElementById('aPurchasePrice')?.value;
  const purchasePrice = priceRaw !== '' && priceRaw != null ? parseFloat(priceRaw) : null;
  const warrantyExpiry = getValue('aWarrantyExpiry');
  const assignedTo    = document.getElementById('aAssignedTo')?.value || '';
  const projectId     = document.getElementById('aProjectId')?.value || '';
  const notes         = document.getElementById('aNotes')?.value.trim() || '';

  clearAllFieldErrors();
  let valid = true;
  if (!name) { setModalFieldError('aName', 'Asset name is required.'); valid = false; }
  if (!valid) return;

  if (btn) btn.disabled = true;

  try {
    const now     = nowISO();
    const all     = await getAll('assets');
    const assetId = isEdit ? existing.id : generateSequentialId('AST', all);
    const image   = getImage();

    const assetData = {
      id:              assetId,
      name,
      category,
      description,
      serial_number:   serialNumber,
      purchase_date:   purchaseDate || null,
      purchase_price:  purchasePrice,
      vendor,
      assigned_to:     assignedTo || null,
      project_id:      projectId  || null,
      status,
      warranty_expiry: warrantyExpiry || null,
      notes,
      image:           image || null,
      created_at:      existing?.created_at || now,
      updated_at:      now,
    };

    if (isEdit) {
      await update('assets', assetData);
      const idx = _assets.findIndex(a => a.id === assetId);
      if (idx !== -1) _assets[idx] = assetData;
      showToast(`${name} has been updated.`, 'success');
    } else {
      await add('assets', assetData);
      _assets.push(assetData);
      showToast(`${name} has been added to assets.`, 'success');
    }

    closeModal();
    renderAssetsPage();
  } catch (err) {
    showToast('Failed to save asset. Please try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ============================================================
// DELETE ASSET
// ============================================================

async function handleDeleteAsset(asset) {
  showConfirm({
    title: 'Delete Asset',
    message: `Are you sure you want to delete <strong>${sanitize(asset.name)}</strong>? This action cannot be undone.`,
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      try {
        await remove('assets', asset.id);
        _assets = _assets.filter(a => a.id !== asset.id);
        showToast(`${asset.name} has been deleted.`, 'success');
        renderAssetsPage();
      } catch { showToast('Failed to delete asset.', 'error'); }
    },
  });
}

// ============================================================
// ASSET DETAIL PANEL
// ============================================================

function openAssetDetail(asset) {
  const category = CATEGORY_OPTIONS.find(c => c.value === asset.category) || CATEGORY_OPTIONS[4];
  const member   = asset.assigned_to ? _members.find(m => m.id === asset.assigned_to) : null;
  const project  = asset.project_id  ? _projects.find(p => p.id === asset.project_id) : null;
  const warranty = warrantyStatus(asset.warranty_expiry);

  const statusBadge   = renderBadge(
    STATUS_OPTIONS.find(s => s.value === asset.status)?.label || asset.status,
    getStatusVariant(asset.status)
  );

  const categoryBadge = `
    <span class="asset-category-badge asset-category-badge--${sanitize(asset.category || 'other')}">
      <i data-lucide="${sanitize(category.icon)}" aria-hidden="true"></i>
      ${sanitize(category.label)}
    </span>`;

  const imageHtml = asset.image
    ? `<img src="${asset.image}" alt="${sanitize(asset.name)}" class="asset-detail__image" />`
    : `<div class="asset-detail__image-placeholder"><i data-lucide="${sanitize(category.icon)}" aria-hidden="true"></i></div>`;

  const warrantyHtml = asset.warranty_expiry
    ? `<span class="asset-warranty ${warranty.cls}" style="display:inline-flex;align-items:center;gap:var(--space-1);">
        ${warranty.icon ? `<i data-lucide="${warranty.icon}" style="width:14px;height:14px;" aria-hidden="true"></i>` : ''}
        ${sanitize(formatDate(asset.warranty_expiry))}
        ${warranty.cls === 'asset-warranty--expiring' ? '&nbsp;<strong>— Expiring soon!</strong>' : ''}
        ${warranty.cls === 'asset-warranty--expired'  ? '&nbsp;<strong>— Expired</strong>' : ''}
      </span>`
    : '<span class="text-muted">Not specified</span>';

  const bodyHtml = `
    <div class="asset-detail">
      <div class="asset-detail__header">
        ${imageHtml}
        <div class="asset-detail__header-info">
          <h2 class="asset-detail__name">${sanitize(asset.name)}</h2>
          <div class="asset-detail__badges">
            ${statusBadge}
            ${categoryBadge}
          </div>
          <span class="asset-detail__id text-muted">${sanitize(asset.id)}</span>
          ${asset.serial_number ? `<span class="asset-detail__serial text-muted" style="display:block;margin-top:var(--space-1);">S/N: ${sanitize(asset.serial_number)}</span>` : ''}
        </div>
      </div>

      ${asset.description ? `
        <div class="asset-detail__section">
          <h4 class="asset-detail__section-title">Description</h4>
          <p class="asset-detail__description">${sanitize(asset.description)}</p>
        </div>` : ''}

      <div class="asset-detail__grid">
        <div class="asset-detail__section">
          <h4 class="asset-detail__section-title">Purchase Details</h4>
          ${asset.vendor      ? `<div class="client-detail__info-row"><i data-lucide="store" aria-hidden="true"></i><span>${sanitize(asset.vendor)}</span></div>` : ''}
          ${asset.purchase_date ? `<div class="client-detail__info-row"><i data-lucide="calendar" aria-hidden="true"></i><span>Purchased ${sanitize(formatDate(asset.purchase_date))}</span></div>` : ''}
          ${asset.purchase_price != null ? `<div class="client-detail__info-row"><i data-lucide="dollar-sign" aria-hidden="true"></i><span>${formatCurrency(asset.purchase_price)}</span></div>` : ''}
          ${!asset.vendor && !asset.purchase_date && asset.purchase_price == null
            ? '<p class="text-muted" style="font-size:var(--text-sm);margin:0;">No purchase details recorded.</p>' : ''}
        </div>

        <div class="asset-detail__section">
          <h4 class="asset-detail__section-title">Warranty</h4>
          <div class="client-detail__info-row" style="align-items:flex-start;">
            <i data-lucide="shield" aria-hidden="true" style="margin-top:2px;"></i>
            <span>${warrantyHtml}</span>
          </div>
        </div>
      </div>

      <div class="asset-detail__grid">
        <div class="asset-detail__section">
          <h4 class="asset-detail__section-title">Assigned To</h4>
          ${member
            ? `<div class="asset-assignee" style="gap:var(--space-3);">
                ${renderAvatar(member, 'sm')}
                <div>
                  <span class="asset-assignee__name" style="display:block;">${sanitize(member.full_name)}</span>
                  <span class="text-muted" style="font-size:var(--text-xs);">${sanitize(member.position || member.role)}</span>
                </div>
              </div>`
            : '<p class="text-muted" style="font-size:var(--text-sm);margin:0;">Not assigned to a user.</p>'}
        </div>

        <div class="asset-detail__section">
          <h4 class="asset-detail__section-title">Linked Project</h4>
          ${project
            ? `<div style="display:flex;align-items:center;gap:var(--space-2);">
                <span style="background:${sanitize(project.cover_color || 'var(--color-primary)')};width:10px;height:10px;border-radius:50%;display:inline-block;flex-shrink:0;"></span>
                <div>
                  <span style="font-weight:500;">${sanitize(project.name)}</span>
                  <span class="text-muted" style="font-size:var(--text-xs);display:block;">${sanitize(project.id)}</span>
                </div>
              </div>`
            : '<p class="text-muted" style="font-size:var(--text-sm);margin:0;">No project linked.</p>'}
        </div>
      </div>

      ${asset.notes ? `
        <div class="asset-detail__section">
          <h4 class="asset-detail__section-title">Notes</h4>
          <p class="asset-detail__description">${sanitize(asset.notes)}</p>
        </div>` : ''}

      <div class="asset-detail__section">
        <h4 class="asset-detail__section-title">Record</h4>
        <div class="client-detail__info-row">
          <i data-lucide="calendar-plus" aria-hidden="true"></i>
          <span>Added ${sanitize(formatDate(asset.created_at))}</span>
        </div>
        <div class="client-detail__info-row">
          <i data-lucide="calendar-check" aria-hidden="true"></i>
          <span>Updated ${sanitize(formatDate(asset.updated_at))}</span>
        </div>
      </div>
    </div>`;

  openModal({
    title: 'Asset Details',
    size: 'lg',
    body: bodyHtml,
    footer: `
      <button class="btn btn--secondary" id="btnCloseAssetDetail">Close</button>
      <button class="btn btn--primary" id="btnEditFromDetail" data-id="${sanitize(asset.id)}">
        <i data-lucide="pencil" aria-hidden="true"></i> Edit Asset
      </button>`,
  });

  document.getElementById('btnCloseAssetDetail')?.addEventListener('click', closeModal);
  document.getElementById('btnEditFromDetail')?.addEventListener('click', () => {
    closeModal();
    setTimeout(() => openAssetModal(asset), 150);
  });
}

// ============================================================
// HELPERS
// ============================================================

function getStatusVariant(status) {
  return {
    available:   'success',
    in_use:      'info',
    maintenance: 'warning',
    retired:     'neutral',
  }[status] || 'neutral';
}

function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
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
        resolve(canvas.toDataURL('image/png', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default { render };
