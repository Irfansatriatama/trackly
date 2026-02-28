/**
 * TRACKLY — projects.js
 * Phase 7: Project Management Core
 */

import { getAll, getById, add, update, remove } from '../core/db.js';
import { generateSequentialId, nowISO, formatDate, formatCurrency, sanitize, truncate, isPast, logActivity } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';
import { renderBadge } from '../components/badge.js';
import { renderAvatar } from '../components/avatar.js';
import { getSession } from '../core/auth.js';

const STATUS_OPTIONS = [
  { value: 'planning',    label: 'Planning' },
  { value: 'active',      label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

const PHASE_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'uat',         label: 'UAT' },
  { value: 'deployment',  label: 'Deployment' },
  { value: 'running',     label: 'Running' },
  { value: 'maintenance', label: 'Maintenance' },
];

const PRIORITY_OPTIONS = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const COVER_COLORS = [
  '#2563EB','#7C3AED','#0891B2','#16A34A','#D97706',
  '#DC2626','#DB2777','#9333EA','#059669','#B45309',
  '#0369A1','#6D28D9','#065F46','#92400E','#1D4ED8',
];

let _projects = [];
let _clients = [];
let _members = [];
let _filterStatus = '';
let _filterPhase = '';
let _filterClient = '';
let _searchQuery = '';

export async function render(params = {}) {
  if (params.id) {
    await renderProjectDetail(params.id);
    return;
  }
  try {
    [_projects, _clients, _members] = await Promise.all([
      getAll('projects'),
      getAll('clients'),
      getAll('users'),
    ]);
    renderProjectsPage();
  } catch (err) {
    document.getElementById('main-content').innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to load projects</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderProjectsPage() {
  const content = document.getElementById('main-content');
  if (!content) return;
  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="page-header">
        <div class="page-header__info">
          <h1 class="page-header__title">Projects</h1>
          <p class="page-header__subtitle">Manage all projects and track their progress</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnNewProject"
            data-tooltip="Create a new project" data-tooltip-pos="bottom">
            <i data-lucide="folder-plus" aria-hidden="true"></i>
            New Project
          </button>
        </div>
      </div>
      <div class="projects-toolbar">
        <div class="projects-search">
          <i data-lucide="search" class="projects-search__icon" aria-hidden="true"></i>
          <input type="text" class="form-input projects-search__input" id="projectsSearch"
            placeholder="Search by name, code, or client..."
            value="${sanitize(_searchQuery)}" autocomplete="off" />
        </div>
        <div class="projects-filters">
          <select class="form-select projects-filter" id="filterStatus">
            <option value="">All Status</option>
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${_filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <select class="form-select projects-filter" id="filterPhase">
            <option value="">All Phases</option>
            ${PHASE_OPTIONS.map(p => `<option value="${p.value}" ${_filterPhase === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
          <select class="form-select projects-filter" id="filterClient">
            <option value="">All Clients</option>
            ${_clients.map(c => `<option value="${c.id}" ${_filterClient === c.id ? 'selected' : ''}>${sanitize(c.company_name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="projectsContent">${renderProjectsContent()}</div>
    </div>`;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  bindPageEvents();
}

function renderProjectsContent() {
  const filtered = getFilteredProjects();
  if (filtered.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-16) var(--space-6);">
        <i data-lucide="folder-open" class="empty-state__icon"></i>
        <p class="empty-state__title">${_projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}</p>
        <p class="empty-state__text">${_projects.length === 0 ? 'Create your first project to get started.' : 'Try adjusting your search or filter criteria.'}</p>
        ${_projects.length === 0 ? '<button class="btn btn--primary" id="btnNewProjectEmpty"><i data-lucide="folder-plus" aria-hidden="true"></i> New Project</button>' : ''}
      </div>`;
  }
  return `<div class="projects-grid">${filtered.map(p => renderProjectCard(p)).join('')}</div>`;
}

function renderProjectCard(p) {
  const client = _clients.find(c => c.id === p.client_id);
  const statusOpt = STATUS_OPTIONS.find(s => s.value === p.status);
  const statusBadge = renderBadge(statusOpt?.label || p.status, getStatusVariant(p.status));
  const priorityBadge = p.priority ? renderBadge(PRIORITY_OPTIONS.find(x => x.value === p.priority)?.label || p.priority, getPriorityVariant(p.priority)) : '';
  const progress = p.progress || 0;
  const memberObjs = (p.members || []).slice(0, 4).map(m => _members.find(u => u.id === (m.user_id || m)));
  const memberAvatarsHtml = memberObjs.filter(Boolean).map(m => {
    const initials = (m.full_name || '?').split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join('');
    return `<div class="avatar avatar--sm" style="${m.avatar ? '' : 'background:var(--color-primary);'}" title="${sanitize(m.full_name)}">
      ${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(initials)}</span>`}
    </div>`;
  }).join('');
  const extraCount = Math.max(0, (p.members || []).length - 4);
  const coverColor = p.cover_color || '#2563EB';
  const isOverdue = p.end_date && isPast(p.end_date) && !['completed','cancelled'].includes(p.status);

  return `
    <div class="project-card" data-id="${sanitize(p.id)}">
      <div class="project-card__cover" style="background:${sanitize(coverColor)};">
        <div class="project-card__cover-top">
          <span class="project-card__code text-mono">${sanitize(p.code || p.id)}</span>
          <div class="project-card__cover-actions">
            <button class="btn btn--ghost btn--sm btn-edit-project project-card__action-btn" data-id="${sanitize(p.id)}" title="Edit project">
              <i data-lucide="pencil" aria-hidden="true"></i>
            </button>
            <button class="btn btn--ghost btn--sm btn-delete-project project-card__action-btn" data-id="${sanitize(p.id)}" title="Delete project">
              <i data-lucide="trash-2" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        ${client?.logo ? `<img src="${client.logo}" alt="" class="project-card__client-logo" />` : ''}
      </div>
      <div class="project-card__body">
        <div class="project-card__badges">
          ${statusBadge}
          ${priorityBadge}
          ${isOverdue ? renderBadge('Overdue', 'danger') : ''}
        </div>
        <h3 class="project-card__name">${sanitize(p.name)}</h3>
        ${client ? `<p class="project-card__client text-muted"><i data-lucide="building-2" aria-hidden="true"></i> ${sanitize(client.company_name)}</p>` : ''}
        ${p.description ? `<p class="project-card__desc text-muted">${sanitize(truncate(p.description, 80))}</p>` : ''}
        <div class="project-card__progress">
          <div class="project-card__progress-bar">
            <div class="project-card__progress-fill" style="width:${progress}%;background:${sanitize(coverColor)};"></div>
          </div>
          <span class="project-card__progress-label text-muted">${progress}%</span>
        </div>
        <div class="project-card__footer">
          <div class="project-card__members">
            ${memberAvatarsHtml}
            ${extraCount > 0 ? `<span class="avatar avatar--sm avatar--extra text-muted">+${extraCount}</span>` : ''}
            ${(p.members || []).length === 0 ? `<span class="text-muted" style="font-size:var(--text-xs);">No members</span>` : ''}
          </div>
          <div class="project-card__dates text-muted">
            ${p.end_date ? `<i data-lucide="calendar" aria-hidden="true"></i> ${formatDate(p.end_date)}` : ''}
          </div>
        </div>
      </div>
      <a class="project-card__link-overlay" href="#/projects/${sanitize(p.id)}" aria-label="Open ${sanitize(p.name)}"></a>
    </div>`;
}

function getFilteredProjects() {
  return _projects.filter(p => {
    const q = _searchQuery.toLowerCase();
    const client = _clients.find(c => c.id === p.client_id);
    const matchSearch = !q
      || p.name?.toLowerCase().includes(q)
      || p.code?.toLowerCase().includes(q)
      || client?.company_name?.toLowerCase().includes(q);
    const matchStatus = !_filterStatus || p.status === _filterStatus;
    const matchPhase = !_filterPhase || p.phase === _filterPhase;
    const matchClient = !_filterClient || p.client_id === _filterClient;
    return matchSearch && matchStatus && matchPhase && matchClient;
  });
}

function bindPageEvents() {
  document.getElementById('btnNewProject')?.addEventListener('click', () => openProjectModal(null));
  document.getElementById('btnNewProjectEmpty')?.addEventListener('click', () => openProjectModal(null));
  document.getElementById('projectsSearch')?.addEventListener('input', e => { _searchQuery = e.target.value; refreshContent(); });
  document.getElementById('filterStatus')?.addEventListener('change', e => { _filterStatus = e.target.value; refreshContent(); });
  document.getElementById('filterPhase')?.addEventListener('change', e => { _filterPhase = e.target.value; refreshContent(); });
  document.getElementById('filterClient')?.addEventListener('change', e => { _filterClient = e.target.value; refreshContent(); });
  document.getElementById('projectsContent')?.addEventListener('click', handleContentAction);
}

function handleContentAction(e) {
  const editBtn = e.target.closest('.btn-edit-project');
  const deleteBtn = e.target.closest('.btn-delete-project');
  if (editBtn) {
    e.preventDefault();
    const p = _projects.find(x => x.id === editBtn.dataset.id);
    if (p) openProjectModal(p);
  } else if (deleteBtn) {
    e.preventDefault();
    const p = _projects.find(x => x.id === deleteBtn.dataset.id);
    if (p) handleDeleteProject(p);
  }
}

function refreshContent() {
  const container = document.getElementById('projectsContent');
  if (!container) return;
  container.innerHTML = renderProjectsContent();
  if (typeof lucide !== 'undefined') lucide.createIcons();
  container.addEventListener('click', handleContentAction);
}

// ============================================================
// PROJECT MODAL
// ============================================================

function openProjectModal(project) {
  const isEdit = !!project;
  let _selectedColor = project?.cover_color || COVER_COLORS[0];
  let _selectedMembers = project ? (project.members || []).map(m => typeof m === 'string' ? { user_id: m, project_role: 'developer' } : { ...m }) : [];

  const membersPickerHtml = _members.length === 0
    ? '<p class="text-muted" style="font-size:var(--text-sm);">No members found. Add members in the Members section first.</p>'
    : `<div class="member-picker" id="memberPicker">
        ${_members.map(m => {
          const isSel = _selectedMembers.some(sm => (sm.user_id || sm) === m.id);
          const memberRole = _selectedMembers.find(sm => (sm.user_id || sm) === m.id)?.project_role || 'developer';
          const initials = (m.full_name || '?').split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join('');
          return `
            <label class="member-picker__item ${isSel ? 'is-selected' : ''}" data-id="${sanitize(m.id)}">
              <input type="checkbox" class="member-picker__check" value="${sanitize(m.id)}" ${isSel ? 'checked' : ''} />
              <div class="avatar avatar--sm" style="${m.avatar ? '' : 'background:var(--color-primary);'}">
                ${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(initials)}</span>`}
              </div>
              <div class="member-picker__info">
                <span class="member-picker__name">${sanitize(m.full_name)}</span>
                <span class="member-picker__role text-muted">${sanitize(m.position || m.role)}</span>
              </div>
              <select class="form-select member-picker__role-select" data-uid="${sanitize(m.id)}" ${isSel ? '' : 'style="display:none;"'}>
                <option value="pm" ${memberRole === 'pm' ? 'selected' : ''}>PM</option>
                <option value="developer" ${memberRole === 'developer' ? 'selected' : ''}>Developer</option>
                <option value="viewer" ${memberRole === 'viewer' ? 'selected' : ''}>Viewer</option>
              </select>
            </label>`;
        }).join('')}
      </div>`;

  const formHtml = `
    <form id="projectForm" novalidate>
      <p class="form-section-title">Project Information</p>
      <div class="form-row">
        <div class="form-group" style="flex:3;">
          <label class="form-label" for="pName">Project Name <span class="required">*</span></label>
          <input class="form-input" type="text" id="pName" placeholder="e.g. E-Commerce Platform v2" value="${sanitize(project?.name || '')}" />
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label" for="pCode">Code <span class="required">*</span></label>
          <input class="form-input text-mono" type="text" id="pCode" placeholder="ECP" maxlength="10" value="${sanitize(project?.code || '')}" style="text-transform:uppercase;" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="pDescription">Description</label>
        <textarea class="form-textarea" id="pDescription" rows="3" placeholder="Briefly describe the project scope and objectives...">${sanitize(project?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pStatus">Status</label>
          <select class="form-select" id="pStatus">
            ${STATUS_OPTIONS.map(s => `<option value="${s.value}" ${(project?.status || 'planning') === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="pPhase">Phase</label>
          <select class="form-select" id="pPhase">
            <option value="">— Select Phase —</option>
            ${PHASE_OPTIONS.map(p => `<option value="${p.value}" ${project?.phase === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="pPriority">Priority</label>
          <select class="form-select" id="pPriority">
            ${PRIORITY_OPTIONS.map(p => `<option value="${p.value}" ${(project?.priority || 'medium') === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <p class="form-section-title">Client &amp; Timeline</p>
      <div class="form-group">
        <label class="form-label" for="pClient">Client</label>
        <select class="form-select" id="pClient">
          <option value="">— No client —</option>
          ${_clients.map(c => `<option value="${c.id}" ${project?.client_id === c.id ? 'selected' : ''}>${sanitize(c.company_name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pStartDate">Start Date</label>
          <input class="form-input" type="date" id="pStartDate" value="${project?.start_date || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="pEndDate">Target End Date</label>
          <input class="form-input" type="date" id="pEndDate" value="${project?.end_date || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="pActualEndDate">Actual End Date</label>
          <input class="form-input" type="date" id="pActualEndDate" value="${project?.actual_end_date || ''}" />
        </div>
      </div>

      <p class="form-section-title">Budget</p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="pBudget">Estimated Budget (IDR)</label>
          <input class="form-input" type="number" id="pBudget" min="0" placeholder="0" value="${project?.budget || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="pActualCost">Actual Cost (IDR)</label>
          <input class="form-input" type="number" id="pActualCost" min="0" placeholder="0" value="${project?.actual_cost || ''}" />
        </div>
      </div>

      <p class="form-section-title">Tags</p>
      <div class="form-group">
        <label class="form-label" for="pTags">Tags <span class="form-help-inline">(comma-separated)</span></label>
        <input class="form-input" type="text" id="pTags" placeholder="e.g. web, mobile, api" value="${sanitize((project?.tags || []).join(', '))}" />
      </div>

      <p class="form-section-title">Cover Color</p>
      <div class="color-picker" id="colorPicker">
        ${COVER_COLORS.map(c => `
          <button type="button" class="color-picker__swatch ${_selectedColor === c ? 'is-selected' : ''}"
            style="background:${c};" data-color="${c}" aria-label="Color ${c}"></button>
        `).join('')}
      </div>

      <p class="form-section-title">Team Members</p>
      ${membersPickerHtml}
    </form>`;

  openModal({
    title: isEdit ? 'Edit Project' : 'New Project',
    size: 'lg',
    body: formHtml,
    footer: `
      <button class="btn btn--secondary" id="btnCancelProject">Cancel</button>
      <button class="btn btn--primary" id="btnSaveProject">
        <i data-lucide="${isEdit ? 'save' : 'folder-plus'}" aria-hidden="true"></i>
        ${isEdit ? 'Save Changes' : 'Create Project'}
      </button>`,
  });

  document.getElementById('colorPicker')?.addEventListener('click', e => {
    const swatch = e.target.closest('.color-picker__swatch');
    if (!swatch) return;
    _selectedColor = swatch.dataset.color;
    document.querySelectorAll('.color-picker__swatch').forEach(s => s.classList.remove('is-selected'));
    swatch.classList.add('is-selected');
  });

  document.getElementById('memberPicker')?.addEventListener('change', e => {
    const cb = e.target.closest('.member-picker__check');
    const rs = e.target.closest('.member-picker__role-select');
    if (cb) {
      const uid = cb.value;
      const label = cb.closest('.member-picker__item');
      const roleSelect = label?.querySelector('.member-picker__role-select');
      if (cb.checked) {
        _selectedMembers.push({ user_id: uid, project_role: 'developer' });
        label?.classList.add('is-selected');
        if (roleSelect) roleSelect.style.display = '';
      } else {
        _selectedMembers = _selectedMembers.filter(m => (m.user_id || m) !== uid);
        label?.classList.remove('is-selected');
        if (roleSelect) roleSelect.style.display = 'none';
      }
    } else if (rs) {
      const uid = rs.dataset.uid;
      const member = _selectedMembers.find(m => (m.user_id || m) === uid);
      if (member) member.project_role = rs.value;
    }
  });

  document.getElementById('pName')?.addEventListener('input', e => {
    const codeField = document.getElementById('pCode');
    if (!isEdit && codeField && !codeField.dataset.modified) {
      const code = e.target.value.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 5);
      codeField.value = code;
    }
  });
  document.getElementById('pCode')?.addEventListener('input', e => {
    e.target.dataset.modified = '1';
    e.target.value = e.target.value.toUpperCase();
  });

  document.getElementById('btnCancelProject')?.addEventListener('click', closeModal);
  document.getElementById('btnSaveProject')?.addEventListener('click', () =>
    handleSaveProject(project, isEdit, () => _selectedColor, () => _selectedMembers)
  );
}

async function handleSaveProject(existing, isEdit, getColor, getMembers) {
  const btn = document.getElementById('btnSaveProject');
  const getValue = id => document.getElementById(id)?.value.trim() || '';

  const name = getValue('pName');
  const code = getValue('pCode').toUpperCase();
  const description = document.getElementById('pDescription')?.value.trim() || '';
  const status = document.getElementById('pStatus')?.value || 'planning';
  const phase = document.getElementById('pPhase')?.value || null;
  const priority = document.getElementById('pPriority')?.value || 'medium';
  const client_id = document.getElementById('pClient')?.value || null;
  const start_date = document.getElementById('pStartDate')?.value || null;
  const end_date = document.getElementById('pEndDate')?.value || null;
  const actual_end_date = document.getElementById('pActualEndDate')?.value || null;
  const budget = parseFloat(document.getElementById('pBudget')?.value) || 0;
  const actual_cost = parseFloat(document.getElementById('pActualCost')?.value) || 0;
  const tagsRaw = getValue('pTags');
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const cover_color = getColor();
  const members = getMembers();

  clearAllFieldErrors();
  let valid = true;
  if (!name) { setModalFieldError('pName', 'Project name is required.'); valid = false; }
  if (!code) { setModalFieldError('pCode', 'Project code is required.'); valid = false; }
  if (!valid) return;

  if (btn) btn.disabled = true;

  try {
    const now = nowISO();
    const session = getSession();
    const allProjects = await getAll('projects');
    const projectId = isEdit ? existing.id : generateSequentialId('PRJ', allProjects);

    const projectData = {
      id: projectId,
      name, code, description, status, phase, priority,
      client_id, start_date, end_date, actual_end_date,
      budget, actual_cost, tags, cover_color, members,
      progress: existing?.progress || 0,
      created_by: existing?.created_by || session?.userId || null,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (isEdit) {
      await update('projects', projectData);
      const idx = _projects.findIndex(p => p.id === projectId);
      if (idx !== -1) _projects[idx] = projectData;
      // Build changes diff
      const changes = [];
      if (existing) {
        for (const field of ['name','status','phase','priority','start_date','end_date','budget','description']) {
          if (String(existing[field] || '') !== String(projectData[field] || '')) {
            changes.push({ field, old_value: existing[field], new_value: projectData[field] });
          }
        }
      }
      logActivity({ project_id: projectId, entity_type: 'project', entity_id: projectId, entity_name: name, action: 'updated', changes });
      showToast(`"${name}" has been updated.`, 'success');
    } else {
      await add('projects', projectData);
      _projects.push(projectData);
      logActivity({ project_id: projectId, entity_type: 'project', entity_id: projectId, entity_name: name, action: 'created' });
      showToast(`Project "${name}" created successfully.`, 'success');
    }

    closeModal();
    refreshContent();
  } catch (err) {
    showToast('Failed to save project. Please try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleDeleteProject(project) {
  showConfirm({
    title: 'Delete Project',
    message: `Are you sure you want to delete <strong>${sanitize(project.name)}</strong>? This action cannot be undone.`,
    confirmLabel: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      try {
        await remove('projects', project.id);
        _projects = _projects.filter(p => p.id !== project.id);
        logActivity({ project_id: project.id, entity_type: 'project', entity_id: project.id, entity_name: project.name, action: 'deleted' });
        showToast(`"${project.name}" has been deleted.`, 'success');
        refreshContent();
      } catch {
        showToast('Failed to delete project.', 'error');
      }
    },
  });
}

// ============================================================
// PROJECT DETAIL
// ============================================================

async function renderProjectDetail(projectId) {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <div class="page-container page-enter">
      <div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading project...</p></div>
    </div>`;

  try {
    const [project, allClients, allMembers, allTasks] = await Promise.all([
      getById('projects', projectId),
      getAll('clients'),
      getAll('users'),
      getAll('tasks').catch(() => []),
    ]);

    if (!project) {
      content.innerHTML = `
        <div class="page-container page-enter">
          <div class="empty-state">
            <i data-lucide="folder-x" class="empty-state__icon"></i>
            <p class="empty-state__title">Project not found</p>
            <p class="empty-state__text">The project "${sanitize(projectId)}" does not exist.</p>
            <a href="#/projects" class="btn btn--primary">Back to Projects</a>
          </div>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // Populate module state for edit modal
    _projects = await getAll('projects');
    _clients = allClients;
    _members = allMembers;

    const client = allClients.find(c => c.id === project.client_id);
    const projectTasks = allTasks.filter(t => t.project_id === projectId);
    const projectMembers = (project.members || []).map(m => {
      const uid = m.user_id || m;
      const user = allMembers.find(u => u.id === uid);
      return user ? { ...user, project_role: m.project_role || null } : null;
    }).filter(Boolean);

    const coverColor = project.cover_color || '#2563EB';
    const statusOpt = STATUS_OPTIONS.find(s => s.value === project.status);
    const phaseOpt = PHASE_OPTIONS.find(p => p.value === project.phase);
    const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === project.priority);
    const taskDone = projectTasks.filter(t => t.status === 'done').length;
    const taskTotal = projectTasks.length;
    const taskProgress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : (project.progress || 0);
    const budgetUsed = project.budget > 0 ? Math.min(100, Math.round(((project.actual_cost || 0) / project.budget) * 100)) : 0;
    const isOverBudget = project.budget > 0 && (project.actual_cost || 0) > project.budget;
    const isOverdue = project.end_date && isPast(project.end_date) && !['completed','cancelled'].includes(project.status);
    const showMaintenance = ['running','maintenance'].includes(project.phase) || ['maintenance'].includes(project.status);
    const sessionUser = getSession();
    const isAdminOrPM = sessionUser && ['admin', 'pm'].includes(sessionUser.role);

    content.innerHTML = `
      <div class="page-container page-enter project-detail-page">
        <!-- Banner -->
        <div class="project-detail-banner" style="background:${sanitize(coverColor)};">
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
                  ${renderBadge(statusOpt?.label || project.status, getStatusVariant(project.status))}
                  ${phaseOpt ? renderBadge(phaseOpt.label, 'info') : ''}
                  ${priorityOpt ? renderBadge(priorityOpt.label, getPriorityVariant(project.priority)) : ''}
                  ${isOverdue ? renderBadge('Overdue', 'danger') : ''}
                </div>
                <h1 class="project-detail-banner__title">${sanitize(project.name)}</h1>
                <p class="project-detail-banner__code text-mono">${sanitize(project.code || project.id)}</p>
                ${project.description ? `<p class="project-detail-banner__desc">${sanitize(project.description)}</p>` : ''}
              </div>
              <div class="project-detail-banner__actions">
                <button class="btn btn--outline-white" id="btnEditProjectDetail">
                  <i data-lucide="pencil" aria-hidden="true"></i> Edit Project
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub-nav -->
        <div class="project-subnav">
          <a class="project-subnav__link is-active" href="#/projects/${sanitize(project.id)}">
            <i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview
          </a>
          <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/board">
            <i data-lucide="kanban" aria-hidden="true"></i> Board
          </a>
          <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/backlog">
            <i data-lucide="list" aria-hidden="true"></i> Backlog
          </a>
          <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/sprint">
            <i data-lucide="zap" aria-hidden="true"></i> Sprint
          </a>
          <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/gantt">
            <i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt
          </a>
          <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/discussion">
            <i data-lucide="message-circle" aria-hidden="true"></i> Discussion
          </a>
          ${showMaintenance ? `<a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/maintenance">
            <i data-lucide="wrench" aria-hidden="true"></i> Maintenance
          </a>` : ''}
          <a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/reports">
            <i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports
          </a>
          ${isAdminOrPM ? `<a class="project-subnav__link" href="#/projects/${sanitize(project.id)}/log">
            <i data-lucide="clock" aria-hidden="true"></i> Log
          </a>` : ''}
        </div>

        <!-- Stats row -->
        <div class="project-stats-row">
          <div class="project-stat-card">
            <div class="project-stat-card__icon" style="color:${sanitize(coverColor)};background:${sanitize(coverColor)}22;">
              <i data-lucide="check-circle-2" aria-hidden="true"></i>
            </div>
            <div class="project-stat-card__info">
              <span class="project-stat-card__value">${taskDone} / ${taskTotal}</span>
              <span class="project-stat-card__label text-muted">Tasks Done</span>
            </div>
          </div>
          <div class="project-stat-card">
            <div class="project-stat-card__icon" style="color:var(--color-success);background:#dcfce7;">
              <i data-lucide="trending-up" aria-hidden="true"></i>
            </div>
            <div class="project-stat-card__info">
              <span class="project-stat-card__value">${taskProgress}%</span>
              <span class="project-stat-card__label text-muted">Progress</span>
            </div>
          </div>
          <div class="project-stat-card">
            <div class="project-stat-card__icon" style="color:var(--color-warning);background:#fef3c7;">
              <i data-lucide="users" aria-hidden="true"></i>
            </div>
            <div class="project-stat-card__info">
              <span class="project-stat-card__value">${projectMembers.length}</span>
              <span class="project-stat-card__label text-muted">Team Members</span>
            </div>
          </div>
          <div class="project-stat-card">
            <div class="project-stat-card__icon" style="color:${isOverBudget ? 'var(--color-danger)' : 'var(--color-info)'};background:${isOverBudget ? '#fee2e2' : '#e0f2fe'};">
              <i data-lucide="banknote" aria-hidden="true"></i>
            </div>
            <div class="project-stat-card__info">
              <span class="project-stat-card__value">${budgetUsed}%</span>
              <span class="project-stat-card__label text-muted">Budget Used</span>
            </div>
          </div>
        </div>

        <!-- Detail grid -->
        <div class="project-detail-grid">
          <div class="project-detail-main">
            <!-- Progress -->
            <div class="card">
              <div class="card__body">
                <h3 class="project-detail-section__title">Overall Progress</h3>
                <div class="progress-bar-lg" style="margin:var(--space-3) 0 var(--space-1);">
                  <div class="progress-bar-lg__fill" style="width:${taskProgress}%;background:${sanitize(coverColor)};"></div>
                </div>
                <div class="progress-bar-lg__labels">
                  <span class="text-muted">${taskDone} tasks completed</span>
                  <span class="text-muted">${taskProgress}%</span>
                </div>
              </div>
            </div>

            ${project.budget > 0 ? `
            <div class="card">
              <div class="card__body">
                <h3 class="project-detail-section__title">Budget Overview</h3>
                <div class="budget-row">
                  <div class="budget-item">
                    <span class="budget-item__label text-muted">Estimated</span>
                    <span class="budget-item__value">${formatCurrency(project.budget)}</span>
                  </div>
                  <div class="budget-item">
                    <span class="budget-item__label text-muted">Actual Cost</span>
                    <span class="budget-item__value ${isOverBudget ? 'text-danger' : ''}">${formatCurrency(project.actual_cost || 0)}</span>
                  </div>
                  <div class="budget-item">
                    <span class="budget-item__label text-muted">Remaining</span>
                    <span class="budget-item__value ${isOverBudget ? 'text-danger' : 'text-success'}">${formatCurrency(project.budget - (project.actual_cost || 0))}</span>
                  </div>
                </div>
                <div class="progress-bar-lg" style="margin-top:var(--space-3);">
                  <div class="progress-bar-lg__fill" style="width:${budgetUsed}%;background:${isOverBudget ? 'var(--color-danger)' : sanitize(coverColor)};"></div>
                </div>
                <p class="text-muted" style="font-size:var(--text-xs);margin-top:var(--space-1);">${budgetUsed}% of budget used${isOverBudget ? ' — Over budget!' : ''}</p>
              </div>
            </div>` : ''}

            ${project.tags?.length > 0 ? `
            <div class="card">
              <div class="card__body">
                <h3 class="project-detail-section__title">Tags</h3>
                <div class="tag-list">${project.tags.map(t => `<span class="badge badge--neutral">${sanitize(t)}</span>`).join('')}</div>
              </div>
            </div>` : ''}
          </div>

          <div class="project-detail-sidebar">
            <div class="card">
              <div class="card__body">
                <h3 class="project-detail-section__title">Project Details</h3>
                <div class="project-meta-list">
                  <div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">ID</span>
                    <span class="project-meta-item__value text-mono">${sanitize(project.id)}</span>
                  </div>
                  ${client ? `
                  <div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">Client</span>
                    <div class="project-meta-item__value project-meta-client">
                      ${client.logo ? `<img src="${client.logo}" alt="" class="project-meta-client__logo" />` : ''}
                      <span>${sanitize(client.company_name)}</span>
                    </div>
                  </div>` : ''}
                  <div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">Start Date</span>
                    <span class="project-meta-item__value">${project.start_date ? formatDate(project.start_date) : '—'}</span>
                  </div>
                  <div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">Target End</span>
                    <span class="project-meta-item__value ${isOverdue ? 'text-danger' : ''}">${project.end_date ? formatDate(project.end_date) : '—'}</span>
                  </div>
                  ${project.actual_end_date ? `<div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">Actual End</span>
                    <span class="project-meta-item__value">${formatDate(project.actual_end_date)}</span>
                  </div>` : ''}
                  <div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">Created</span>
                    <span class="project-meta-item__value">${formatDate(project.created_at)}</span>
                  </div>
                  <div class="project-meta-item">
                    <span class="project-meta-item__label text-muted">Updated</span>
                    <span class="project-meta-item__value">${formatDate(project.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card__body">
                <div class="project-detail-section__header">
                  <h3 class="project-detail-section__title">Team Members</h3>
                  <button class="btn btn--ghost btn--sm" id="btnManageMembers">
                    <i data-lucide="user-plus" aria-hidden="true"></i> Manage
                  </button>
                </div>
                ${projectMembers.length === 0 ? `<p class="text-muted" style="font-size:var(--text-sm);margin:0;">No members assigned yet.</p>` : `
                  <div class="project-members-list">
                    ${projectMembers.map(m => {
                      const initials = (m.full_name || '?').split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join('');
                      return `
                        <div class="project-member-item">
                          <div class="avatar avatar--sm" style="${m.avatar ? '' : 'background:var(--color-primary);'}">
                            ${m.avatar ? `<img src="${m.avatar}" alt="" class="avatar__img" />` : `<span class="avatar__initials">${sanitize(initials)}</span>`}
                          </div>
                          <div class="project-member-item__info">
                            <span class="project-member-item__name">${sanitize(m.full_name)}</span>
                            <span class="project-member-item__role text-muted">${sanitize(m.project_role || m.role || '')}</span>
                          </div>
                        </div>`;
                    }).join('')}
                  </div>`}
              </div>
            </div>
          </div>
        </div>
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.getElementById('btnEditProjectDetail')?.addEventListener('click', () => {
      openProjectModal(project);
    });
    document.getElementById('btnManageMembers')?.addEventListener('click', () => {
      openProjectModal(project);
    });

  } catch (err) {
    content.innerHTML = `
      <div class="page-container page-enter">
        <div class="empty-state">
          <i data-lucide="alert-circle" class="empty-state__icon"></i>
          <p class="empty-state__title">Failed to load project</p>
          <p class="empty-state__text">${sanitize(String(err.message))}</p>
          <a href="#/projects" class="btn btn--primary">Back to Projects</a>
        </div>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ============================================================
// HELPERS
// ============================================================

function getStatusVariant(status) {
  return { planning:'info', active:'success', maintenance:'warning', on_hold:'neutral', completed:'success', cancelled:'danger' }[status] || 'neutral';
}
function getPriorityVariant(priority) {
  return { low:'neutral', medium:'info', high:'warning', critical:'danger' }[priority] || 'neutral';
}
function setModalFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const group = field.closest('.form-group');
  if (!group) return;
  group.querySelector('.form-error')?.remove();
  field.classList.add('is-invalid');
  const err = document.createElement('p');
  err.className = 'form-error';
  err.textContent = message;
  group.appendChild(err);
}
function clearAllFieldErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.remove());
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

export default { render };
