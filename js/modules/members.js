/**
 * TRACKLY — members.js
 * Phase 5: Member Management — Full CRUD for users/members.
 */

import { getAll, add, update, remove } from '../core/db.js';
import { hashPassword } from '../core/auth.js';
import { generateSequentialId, nowISO, formatRelativeDate, getInitials, sanitize, logActivity } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { renderAvatar } from '../components/avatar.js';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'pm', label: 'Project Manager' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'client', label: 'Client' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'invited', label: 'Invited' },
];
const TIMEZONE_OPTIONS = [
  'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Bangkok',
  'Asia/Manila', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'UTC',
];

let _members = [];
let _filterRole = '';
let _filterStatus = '';
let _searchQuery = '';

export async function render(params = {}) {
  try {
    _members = await getAll('users');
    renderMembersPage();
  } catch (err) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to load members</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderMembersPage() {
  const content = document.getElementById('main-content');
  if (!content) return;
  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Members</h1>
          <p class="page-header__subtitle">Manage team member accounts, roles, and access</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnAddMember">
            <i data-lucide="user-plus" aria-hidden="true"></i>
            Add Member
          </button>
        </div>
      </div>
      <div class="members-toolbar">
        <div class="members-search">
          <i data-lucide="search" class="members-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input members-search__input" id="membersSearch"
            placeholder="Search by name, email, or username…"
            value="${sanitize(_searchQuery)}" autocomplete="off" />
        </div>
        <div class="filter-trigger-wrap">
          <div class="filter-trigger-row">
            <div class="filter-btn-wrap">
              <button class="btn btn--secondary" id="btnOpenFilterModal">
                <i data-lucide="filter" aria-hidden="true"></i> Filter
              </button>
              ${[_filterRole, _filterStatus].filter(Boolean).length > 0
      ? `<span class="filter-badge">${[_filterRole, _filterStatus].filter(Boolean).length}</span>` : ''}
            </div>
          </div>
          <div class="filter-chips" id="membersFilterChips">${renderMembersFilterChips()}</div>
        </div>
      </div>
      <div class="card">
        <div class="card__body" style="padding:0;">
          <div id="membersTableContainer">${renderMembersTable()}</div>
        </div>
      </div>
    </div>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  bindPageEvents();
}

function renderMembersTable() {
  const filtered = getFilteredMembers();
  if (filtered.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-12) var(--space-6);">
        <i data-lucide="users" class="empty-state__icon"></i>
        <p class="empty-state__title">${_members.length === 0 ? 'No members yet' : 'No members match your filters'}</p>
        <p class="empty-state__text">${_members.length === 0 ? 'Add your first team member to get started.' : 'Try adjusting your search or filter criteria.'}</p>
        ${_members.length === 0 ? `<button class="btn btn--primary" id="btnAddMemberEmpty"><i data-lucide="user-plus"></i> Add Member</button>` : ''}
      </div>`;
  }
  return `
    <div class="table-container">
      <table class="table members-table">
        <thead>
          <tr>
            <th>Member</th><th>Role</th><th>Department / Position</th><th>Status</th><th>Last Login</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(m => renderMemberRow(m)).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderMemberRow(m) {
  const roleBadge = renderBadge(ROLE_OPTIONS.find(r => r.value === m.role)?.label || m.role, getRoleVariant(m.role));
  const statusBadge = renderBadge(STATUS_OPTIONS.find(s => s.value === m.status)?.label || m.status, getStatusVariant(m.status));
  const lastLogin = m.last_login ? formatRelativeDate(m.last_login) : 'Never';
  const avatarHtml = renderAvatar(m, 'md');
  return `
    <tr class="member-row" data-id="${sanitize(m.id)}">
      <td>
        <div class="member-cell">
          ${avatarHtml}
          <div class="member-cell__info">
            <span class="member-cell__name">${sanitize(m.full_name)}</span>
            <span class="member-cell__meta">${sanitize(m.username)} · ${sanitize(m.email)}</span>
          </div>
        </div>
      </td>
      <td>${roleBadge}</td>
      <td>
        <div class="member-dept">
          ${m.position ? `<span class="member-dept__position">${sanitize(m.position)}</span>` : ''}
          ${m.department ? `<span class="member-dept__dept text-muted">${sanitize(m.department)}</span>` : ''}
          ${!m.position && !m.department ? '<span class="text-muted">—</span>' : ''}
        </div>
      </td>
      <td>${statusBadge}</td>
      <td class="text-muted" style="font-size:var(--text-xs);">${lastLogin}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn--ghost btn--sm btn-edit-member" data-id="${sanitize(m.id)}" title="Edit member">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          ${m.status === 'active'
      ? `<button class="btn btn--ghost btn--sm btn-deactivate-member" data-id="${sanitize(m.id)}" title="Deactivate" style="color:var(--color-warning);"><i data-lucide="user-x"></i></button>`
      : `<button class="btn btn--ghost btn--sm btn-activate-member" data-id="${sanitize(m.id)}" title="Activate" style="color:var(--color-success);"><i data-lucide="user-check"></i></button>`
    }
          <button class="btn btn--ghost btn--sm btn-delete-member" data-id="${sanitize(m.id)}" title="Delete member" style="color:var(--color-danger);">
            <i data-lucide="trash-2" aria-hidden="true"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

function getFilteredMembers() {
  return _members.filter(m => {
    const q = _searchQuery.toLowerCase();
    const matchSearch = !q || m.full_name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    const matchRole = !_filterRole || m.role === _filterRole;
    const matchStatus = !_filterStatus || m.status === _filterStatus;
    return matchSearch && matchRole && matchStatus;
  });
}

function bindPageEvents() {
  document.getElementById('btnAddMember')?.addEventListener('click', () => openMemberModal(null));
  document.getElementById('btnAddMemberEmpty')?.addEventListener('click', () => openMemberModal(null));
  document.getElementById('membersSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; refreshTable(); });
  document.getElementById('btnOpenFilterModal')?.addEventListener('click', openMembersFilterModal);
  document.getElementById('membersFilterChips')?.addEventListener('click', handleMembersChipRemove);
  document.getElementById('membersTableContainer')?.addEventListener('click', handleTableAction);
}

function renderMembersFilterChips() {
  const chips = [];
  if (_filterRole) {
    const lbl = ROLE_OPTIONS.find(r => r.value === _filterRole)?.label || _filterRole;
    chips.push(`<span class="filter-chip" data-key="role"><span class="filter-chip__label">Role: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  if (_filterStatus) {
    const lbl = STATUS_OPTIONS.find(s => s.value === _filterStatus)?.label || _filterStatus;
    chips.push(`<span class="filter-chip" data-key="status"><span class="filter-chip__label">Status: ${sanitize(lbl)}</span><button class="filter-chip__remove" aria-label="Remove filter">×</button></span>`);
  }
  return chips.join('');
}

function handleMembersChipRemove(e) {
  const btn = e.target.closest('.filter-chip__remove');
  if (!btn) return;
  const key = btn.closest('.filter-chip')?.dataset.key;
  if (key === 'role') _filterRole = '';
  if (key === 'status') _filterStatus = '';
  refreshTable(); updateMembersFilterUI();
}

function openMembersFilterModal() {
  openModal({
    title: 'Filter Members',
    size: 'md',
    body: `<div class="filter-modal-grid">
      <div class="form-group">
        <label class="form-label" for="fmFilterRole">Role</label>
        <select class="form-select" id="fmFilterRole">
          <option value="">All Roles</option>
          ${ROLE_OPTIONS.map(r => `<option value="${r.value}" ${_filterRole === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="fmFilterStatus">Status</label>
        <select class="form-select" id="fmFilterStatus">
          <option value="">All Status</option>
          ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${_filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
    </div>`,
    footer: `
      <button class="btn btn--outline" id="btnResetMembersFilter">Reset Filter</button>
      <button class="btn btn--primary" id="btnApplyMembersFilter"><i data-lucide="check" aria-hidden="true"></i> Terapkan Filter</button>`,
  });
  document.getElementById('btnResetMembersFilter')?.addEventListener('click', () => {
    _filterRole = ''; _filterStatus = '';
    closeModal(); refreshTable(); updateMembersFilterUI();
  });
  document.getElementById('btnApplyMembersFilter')?.addEventListener('click', () => {
    _filterRole = document.getElementById('fmFilterRole')?.value || '';
    _filterStatus = document.getElementById('fmFilterStatus')?.value || '';
    closeModal(); refreshTable(); updateMembersFilterUI();
  });
}

function updateMembersFilterUI() {
  const wrap = document.getElementById('btnOpenFilterModal')?.closest('.filter-btn-wrap');
  if (wrap) {
    wrap.querySelector('.filter-badge')?.remove();
    const count = [_filterRole, _filterStatus].filter(Boolean).length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'filter-badge';
      badge.textContent = count;
      wrap.appendChild(badge);
    }
  }
  const chips = document.getElementById('membersFilterChips');
  if (chips) chips.innerHTML = renderMembersFilterChips();
}

function handleTableAction(e) {
  const editBtn = e.target.closest('.btn-edit-member');
  const deactivateBtn = e.target.closest('.btn-deactivate-member');
  const activateBtn = e.target.closest('.btn-activate-member');
  const deleteBtn = e.target.closest('.btn-delete-member');
  if (editBtn) { const m = _members.find(x => x.id === editBtn.dataset.id); if (m) openMemberModal(m); }
  else if (deactivateBtn) { const m = _members.find(x => x.id === deactivateBtn.dataset.id); if (m) handleDeactivate(m); }
  else if (activateBtn) { const m = _members.find(x => x.id === activateBtn.dataset.id); if (m) handleActivate(m); }
  else if (deleteBtn) { const m = _members.find(x => x.id === deleteBtn.dataset.id); if (m) handleDelete(m); }
}

function refreshTable() {
  const container = document.getElementById('membersTableContainer');
  if (!container) return;
  container.innerHTML = renderMembersTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  container.addEventListener('click', handleTableAction);
}

// ============================================================
// MEMBER MODAL (Add / Edit)
// ============================================================
function openMemberModal(member) {
  const isEdit = !!member;
  const formHtml = `
    <form id="memberForm" novalidate>
      <p class="form-section-title">Identity</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mFullName">Full Name <span class="required">*</span></label>
          <input class="form-input" type="text" id="mFullName" placeholder="e.g. Budi Santoso" value="${sanitize(member?.full_name || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mUsername">Username <span class="required">*</span></label>
          <input class="form-input" type="text" id="mUsername" placeholder="e.g. budi.s" value="${sanitize(member?.username || '')}" spellcheck="false" ${isEdit ? 'readonly' : ''} />
          ${isEdit ? '<p class="form-help">Username cannot be changed after creation.</p>' : ''}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mEmail">Email <span class="required">*</span></label>
          <input class="form-input" type="email" id="mEmail" placeholder="e.g. budi@company.com" value="${sanitize(member?.email || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mPhone">Phone Number</label>
          <input class="form-input" type="tel" id="mPhone" placeholder="e.g. +62 812 3456 7890" value="${sanitize(member?.phone_number || '')}" />
        </div>
      </div>
      <p class="form-section-title">Password <span class="text-muted" style="font-size:0.8em;font-weight:normal;">${isEdit ? '(Leave blank to keep current)' : ''}</span></p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mPassword">Password ${isEdit ? '' : '<span class="required">*</span>'}</label>
          <div class="form-input-wrapper">
            <input class="form-input" type="password" id="mPassword" placeholder="Minimum 8 characters" autocomplete="new-password" />
            <button type="button" class="form-input-reveal" id="toggleMPassword" aria-label="Toggle password visibility"><i data-lucide="eye"></i></button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="mConfirmPassword">Confirm Password ${isEdit ? '' : '<span class="required">*</span>'}</label>
          <input class="form-input" type="password" id="mConfirmPassword" placeholder="Re-enter password" autocomplete="new-password" />
        </div>
      </div>
      <p class="form-section-title">Role &amp; Status</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mRole">Role <span class="required">*</span></label>
          <select class="form-select" id="mRole">
            ${ROLE_OPTIONS.map(r => `<option value="${r.value}" ${(member?.role || 'developer') === r.value ? 'selected' : ''}>${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="mStatus">Status</label>
          <select class="form-select" id="mStatus">
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${(member?.status || 'active') === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <p class="form-section-title">Profile</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mCompany">Company</label>
          <input class="form-input" type="text" id="mCompany" placeholder="e.g. PT Teknologi Maju" value="${sanitize(member?.company || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mDepartment">Department</label>
          <input class="form-input" type="text" id="mDepartment" placeholder="e.g. Engineering" value="${sanitize(member?.department || '')}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mPosition">Position / Job Title</label>
          <input class="form-input" type="text" id="mPosition" placeholder="e.g. Backend Developer" value="${sanitize(member?.position || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mTimezone">Timezone</label>
          <select class="form-select" id="mTimezone">
            ${TIMEZONE_OPTIONS.map(tz => `<option value="${tz}" ${(member?.timezone || 'Asia/Jakarta') === tz ? 'selected' : ''}>${tz}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="mBio">Bio</label>
        <textarea class="form-textarea" id="mBio" rows="2" placeholder="A short profile description…">${sanitize(member?.bio || '')}</textarea>
      </div>
      <p class="form-section-title">Social Links</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="mLinkedin">LinkedIn</label>
          <input class="form-input" type="url" id="mLinkedin" placeholder="https://linkedin.com/in/username" value="${sanitize(member?.linkedin || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="mGithub">GitHub</label>
          <input class="form-input" type="url" id="mGithub" placeholder="https://github.com/username" value="${sanitize(member?.github || '')}" />
        </div>
      </div>
      <p class="form-section-title">Avatar</p>
      <div class="avatar-upload-area">
        <div class="avatar-upload__preview" id="avatarPreview">
          ${member?.avatar
      ? `<img src="${member.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<span class="avatar-upload__initials">${getInitials(member?.full_name || '?')}</span>`}
        </div>
        <div class="avatar-upload__controls">
          <label class="btn btn--secondary btn--sm" for="mAvatar" style="cursor:pointer;">
            <i data-lucide="upload" aria-hidden="true"></i> Upload Photo
          </label>
          <input type="file" id="mAvatar" accept="image/*" style="display:none;" />
          <p class="form-help">JPG, PNG, or WebP. Resized to 150×150px.</p>
          ${member?.avatar ? `<button type="button" class="btn btn--ghost btn--sm" id="btnRemoveAvatar" style="color:var(--color-danger);">Remove</button>` : ''}
        </div>
      </div>
    </form>`;

  openModal({
    title: isEdit ? 'Edit Member' : 'Add New Member',
    size: 'lg',
    body: formHtml,
    footer: `
      <button class="btn btn--secondary" id="btnCancelMember">Cancel</button>
      <button class="btn btn--primary" id="btnSaveMember">
        <i data-lucide="${isEdit ? 'save' : 'user-plus'}" aria-hidden="true"></i>
        ${isEdit ? 'Save Changes' : 'Add Member'}
      </button>`,
  });

  // Password toggle
  document.getElementById('toggleMPassword')?.addEventListener('click', () => {
    const inp = document.getElementById('mPassword');
    const icon = document.querySelector('#toggleMPassword [data-lucide]');
    if (!inp || !icon) return;
    const hidden = inp.type === 'password';
    inp.type = hidden ? 'text' : 'password';
    icon.setAttribute('data-lucide', hidden ? 'eye-off' : 'eye');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  // Avatar state
  let _avatarBase64 = member?.avatar || null;

  document.getElementById('mAvatar')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      _avatarBase64 = await resizeImageToBase64(file, 150, 150);
      const preview = document.getElementById('avatarPreview');
      if (preview) preview.innerHTML = `<img src="${_avatarBase64}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } catch { showToast('Failed to process image.', 'error'); }
  });

  document.getElementById('btnRemoveAvatar')?.addEventListener('click', () => {
    _avatarBase64 = null;
    const preview = document.getElementById('avatarPreview');
    if (preview) preview.innerHTML = `<span class="avatar-upload__initials">${getInitials(document.getElementById('mFullName')?.value || '?')}</span>`;
  });

  document.getElementById('mFullName')?.addEventListener('input', e => {
    if (!_avatarBase64) {
      const preview = document.getElementById('avatarPreview');
      if (preview && !preview.querySelector('img'))
        preview.innerHTML = `<span class="avatar-upload__initials">${getInitials(e.target.value || '?')}</span>`;
    }
  });

  document.getElementById('btnCancelMember')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveMember')?.addEventListener('click', () => handleSaveMember(member, isEdit, () => _avatarBase64));
}

// ============================================================
// SAVE MEMBER
// ============================================================
async function handleSaveMember(existing, isEdit, getAvatar) {
  const btn = document.getElementById('btnSaveMember');
  const getValue = id => document.getElementById(id)?.value.trim() || '';

  const fullName = getValue('mFullName');
  const username = getValue('mUsername');
  const email = getValue('mEmail');
  const phone = getValue('mPhone');
  const role = document.getElementById('mRole')?.value;
  const status = document.getElementById('mStatus')?.value;
  const company = getValue('mCompany');
  const department = getValue('mDepartment');
  const position = getValue('mPosition');
  const timezone = document.getElementById('mTimezone')?.value;
  const bio = document.getElementById('mBio')?.value.trim() || '';
  const linkedin = getValue('mLinkedin');
  const github = getValue('mGithub');

  clearAllFieldErrors();
  let valid = true;

  if (!fullName) { setModalFieldError('mFullName', 'Full name is required.'); valid = false; }
  if (!username) { setModalFieldError('mUsername', 'Username is required.'); valid = false; }
  else if (!/^[a-z0-9_.\-]{3,30}$/i.test(username)) { setModalFieldError('mUsername', 'Username: 3–30 chars, letters/numbers/_ . - only.'); valid = false; }
  if (!email) { setModalFieldError('mEmail', 'Email is required.'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setModalFieldError('mEmail', 'Enter a valid email address.'); valid = false; }

  let passwordHash = existing?.password_hash || null;
  const pass = document.getElementById('mPassword')?.value || '';
  const conf = document.getElementById('mConfirmPassword')?.value || '';

  if (!isEdit && !pass) {
    setModalFieldError('mPassword', 'Password is required.'); valid = false;
  } else if (pass && pass.length < 8) {
    setModalFieldError('mPassword', 'Password must be at least 8 characters.'); valid = false;
  }
  if (pass && conf !== pass) {
    setModalFieldError('mConfirmPassword', 'Passwords do not match.'); valid = false;
  }
  if (valid && pass) {
    const { hashPassword } = await import('../core/auth.js');
    passwordHash = await hashPassword(pass);
  }

  // Check uniqueness
  if (valid) {
    const allUsers = await getAll('users');
    if (allUsers.find(u => u.username?.toLowerCase() === username.toLowerCase() && u.id !== existing?.id)) { setModalFieldError('mUsername', 'This username is already in use.'); valid = false; }
    if (allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase() && u.id !== existing?.id)) { setModalFieldError('mEmail', 'This email is already in use.'); valid = false; }
  }

  if (!valid) return;
  if (btn) btn.disabled = true;

  try {
    const now = nowISO();
    const allUsers = await getAll('users');
    const memberId = isEdit ? existing.id : generateSequentialId('USR', allUsers);
    const avatarBase64 = getAvatar();

    let avatarUrl = existing?.avatar || '';
    if (avatarBase64 && avatarBase64.startsWith('data:')) {
      showToast('Uploading avatar...', 'info');
      const { uploadFile } = await import('../core/cloudinary.js');
      avatarUrl = await uploadFile(avatarBase64, `avatar_${memberId}`);
    } else if (!avatarBase64) {
      avatarUrl = '';
    }

    const memberData = {
      id: memberId, username, full_name: fullName, email,
      password_hash: passwordHash, phone_number: phone,
      avatar: avatarUrl, company, department, position, role,
      project_roles: existing?.project_roles || {},
      bio, linkedin, github, status,
      last_login: existing?.last_login || null,
      timezone, created_at: existing?.created_at || now, updated_at: now,
    };

    if (isEdit) {
      await update('users', memberData);
      const idx = _members.findIndex(m => m.id === memberId);
      if (idx !== -1) _members[idx] = memberData;
      logActivity({ project_id: null, entity_type: 'member', entity_id: memberId, entity_name: fullName, action: 'updated' });
      showToast(`${fullName}'s profile has been updated.`, 'success');
    } else {
      await add('users', memberData);
      _members.push(memberData);
      logActivity({ project_id: null, entity_type: 'member', entity_id: memberData.id, entity_name: fullName, action: 'created' });
      showToast(`${fullName} has been added as a member.`, 'success');
    }

    closeModal();
    refreshTable();
  } catch (err) {
    showToast('Failed to save member. Please try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}


// ============================================================
// DEACTIVATE / ACTIVATE
// ============================================================
async function handleDeactivate(member) {
  showConfirm({
    title: 'Deactivate Member',
    message: `Are you sure you want to deactivate <strong>${sanitize(member.full_name)}</strong>? They will no longer be able to log in.`,
    confirmLabel: 'Deactivate',
    confirmVariant: 'danger',
    onConfirm: async () => {
      try {
        const updated = { ...member, status: 'inactive', updated_at: nowISO() };
        await update('users', updated);
        const idx = _members.findIndex(m => m.id === member.id);
        if (idx !== -1) _members[idx] = updated;
        logActivity({ project_id: null, entity_type: 'member', entity_id: member.id, entity_name: member.full_name, action: 'status_changed', changes: [{ field: 'status', old_value: 'active', new_value: 'inactive' }] });
        showToast(`${member.full_name} has been deactivated.`, 'success');
        refreshTable();
      } catch { showToast('Failed to deactivate member.', 'error'); }
    },
  });
}

async function handleActivate(member) {
  try {
    const updated = { ...member, status: 'active', updated_at: nowISO() };
    await update('users', updated);
    const idx = _members.findIndex(m => m.id === member.id);
    if (idx !== -1) _members[idx] = updated;
    logActivity({ project_id: null, entity_type: 'member', entity_id: member.id, entity_name: member.full_name, action: 'status_changed', changes: [{ field: 'status', old_value: 'inactive', new_value: 'active' }] });
    showToast(`${member.full_name} has been reactivated.`, 'success');
    refreshTable();
  } catch { showToast('Failed to activate member.', 'error'); }
}

async function handleDelete(member) {
  showConfirm({
    title: 'Delete Member',
    message: `Are you sure you want to permanently delete <strong>${sanitize(member.full_name)}</strong>? This action cannot be undone.`,
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      try {
        await remove('users', member.id);
        _members = _members.filter(m => m.id !== member.id);
        logActivity({ project_id: null, entity_type: 'member', entity_id: member.id, entity_name: member.full_name, action: 'deleted' });
        showToast(`${member.full_name} has been deleted.`, 'success');
        refreshTable();
      } catch { showToast('Failed to delete member.', 'error'); }
    },
  });
}

// ============================================================
// HELPERS
// ============================================================
function getRoleVariant(role) {
  return { admin: 'danger', pm: 'primary', developer: 'info', viewer: 'neutral', client: 'warning' }[role] || 'neutral';
}
function getStatusVariant(status) {
  return { active: 'success', inactive: 'neutral', invited: 'warning' }[status] || 'neutral';
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
        const scale = Math.max(maxW / img.width, maxH / img.height);
        const sw = img.width * scale, sh = img.height * scale;
        ctx.drawImage(img, (maxW - sw) / 2, (maxH - sh) / 2, sw, sh);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default { render };
