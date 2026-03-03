/**
 * TRACKLY — notes.js
 * Phase 24: Personal Notes module.
 * Two-column layout: folder/list panel + markdown editor panel.
 */

import { getAll, getByIndex, add, update, remove } from '../core/db.js';
import { getSession } from '../core/auth.js';
import { ID_PREFIX, generateSequentialId, nowISO, formatRelativeDate, sanitize } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/confirm.js';
import { openModal, closeModal } from '../components/modal.js';

// ============================================================
// CONSTANTS
// ============================================================

const NOTE_COLORS = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#fef9c3', label: 'Yellow' },
  { hex: '#dcfce7', label: 'Green' },
  { hex: '#dbeafe', label: 'Blue' },
  { hex: '#fce7f3', label: 'Pink' },
  { hex: '#ede9fe', label: 'Purple' },
  { hex: '#ffedd5', label: 'Orange' },
];

// ============================================================
// STATE
// ============================================================

let _state = {
  notes: [],
  folders: [],
  activeNoteId: null,
  activeFolderId: null, // null = All Notes
  searchQuery: '',
  editMode: true,
  saveTimer: null,
};

// ============================================================
// FOLDER HELPERS (localStorage)
// ============================================================

function getFolderKey(userId) {
  return `notes_folders_${userId}`;
}

function loadFolders(userId) {
  try {
    const raw = localStorage.getItem(getFolderKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFolders(userId, folders) {
  localStorage.setItem(getFolderKey(userId), JSON.stringify(folders));
}

// ============================================================
// MARKDOWN RENDERER
// ============================================================

function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<div class="markdown-body"><p>${html}</p></div>`;
}

// ============================================================
// DATA HELPERS
// ============================================================

async function loadNotes(userId) {
  const all = await getByIndex('notes', 'user_id', userId);
  return all;
}

async function saveNote(note) {
  const exists = _state.notes.find((n) => n.id === note.id);
  if (exists) {
    await update('notes', note);
    const idx = _state.notes.findIndex((n) => n.id === note.id);
    if (idx !== -1) _state.notes[idx] = note;
  } else {
    await add('notes', note);
    _state.notes.push(note);
  }
}

function getNoteTitle(note) {
  if (note.title && note.title.trim()) return note.title.trim();
  if (note.content && note.content.trim()) return note.content.trim().slice(0, 30) + (note.content.trim().length > 30 ? '…' : '');
  return 'Untitled Note';
}

// ============================================================
// RENDER HELPERS — LEFT PANEL
// ============================================================

function renderNoteListItem(note, isActive) {
  const title = sanitize(getNoteTitle(note));
  const meta = formatRelativeDate(note.updated_at);
  const colorAttr = note.color && note.color !== '#ffffff' ? ` data-color="${note.color}"` : '';
  const pinIcon = note.pinned ? `<i data-lucide="pin" class="notes-list-item__pin-icon" aria-hidden="true"></i>` : '';
  const colorDot = note.color && note.color !== '#ffffff'
    ? `<span class="notes-list-item__color-dot" style="background:${note.color}"></span>`
    : '';

  return `
    <div class="notes-list-item ${isActive ? 'is-active' : ''}" data-note-id="${note.id}"${colorAttr}>
      ${pinIcon}
      <div class="notes-list-item__title">${colorDot}${title}</div>
      <div class="notes-list-item__meta">${meta}</div>
    </div>
  `;
}

function getFilteredNotes() {
  let notes = _state.notes;
  const q = _state.searchQuery.trim().toLowerCase();

  if (q) {
    notes = notes.filter((n) =>
      getNoteTitle(n).toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
    return { pinned: [], inFolders: {}, all: notes, isSearch: true };
  }

  const pinned = notes.filter((n) => n.pinned);

  if (_state.activeFolderId) {
    const folderNotes = notes.filter((n) => n.folder_id === _state.activeFolderId && !n.pinned);
    return { pinned, inFolders: {}, folderFiltered: folderNotes, all: [], isSearch: false };
  }

  // Group by folder for sidebar display, ungrouped = no folder
  const ungrouped = notes.filter((n) => !n.pinned && !n.folder_id);
  const inFolders = {};
  for (const folder of _state.folders) {
    inFolders[folder.id] = notes.filter((n) => !n.pinned && n.folder_id === folder.id);
  }

  return { pinned, inFolders, all: ungrouped, isSearch: false };
}

function renderLeftPanel() {
  const { pinned, inFolders, all, folderFiltered, isSearch } = getFilteredNotes();

  let html = '';

  if (isSearch) {
    html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title">Search Results</span></div>`;
    if (all.length === 0) {
      html += `<div class="notes-list-empty">No notes found</div>`;
    } else {
      html += all.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId)).join('');
    }
    html += '</div>';
  } else if (_state.activeFolderId) {
    const folder = _state.folders.find((f) => f.id === _state.activeFolderId);
    html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="folder" style="width:11px;height:11px"></i> ${sanitize(folder?.name || 'Folder')}</span></div>`;
    if (folderFiltered && folderFiltered.length === 0) {
      html += `<div class="notes-list-empty">No notes in this folder</div>`;
    } else {
      html += (folderFiltered || []).map((n) => renderNoteListItem(n, n.id === _state.activeNoteId)).join('');
    }
    html += '</div>';
  } else {
    // Pinned section
    if (pinned.length > 0) {
      html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="pin" style="width:11px;height:11px"></i> Pinned</span></div>`;
      html += pinned.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId)).join('');
      html += '</div>';
    }

    // Folders section
    html += `<div class="notes-section">
      <div class="notes-section__header"><span class="notes-section__title"><i data-lucide="folder" style="width:11px;height:11px"></i> Folders</span></div>
      <button class="notes-new-folder-btn" id="btnNewFolder">
        <i data-lucide="folder-plus" style="width:13px;height:13px"></i> New Folder
      </button>
      <div id="notesFolderList">
        ${_state.folders.map((folder) => {
          const count = (inFolders[folder.id] || []).length;
          return `
            <div class="notes-folder-item ${_state.activeFolderId === folder.id ? 'is-active' : ''}" data-folder-id="${folder.id}">
              <i data-lucide="folder" style="width:13px;height:13px;flex-shrink:0"></i>
              <span class="notes-folder-item__name">${sanitize(folder.name)}</span>
              <span style="font-size:0.7rem;color:var(--color-text-tertiary)">${count}</span>
              <div class="notes-folder-item__actions">
                <button class="notes-folder-item__btn notes-folder-item__btn--rename" data-folder-id="${folder.id}" title="Rename folder">
                  <i data-lucide="pencil" style="width:12px;height:12px"></i>
                </button>
                <button class="notes-folder-item__btn notes-folder-item__btn--delete" data-folder-id="${folder.id}" title="Delete folder">
                  <i data-lucide="x" style="width:12px;height:12px"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>`;

    // All Notes section
    html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="file-text" style="width:11px;height:11px"></i> All Notes</span></div>`;
    if (all.length === 0 && _state.notes.filter((n) => !n.pinned && !n.folder_id).length === 0) {
      html += `<div class="notes-list-empty">No notes yet</div>`;
    } else {
      html += all.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId)).join('');
    }
    html += '</div>';
  }

  return html;
}

// ============================================================
// RENDER HELPERS — RIGHT PANEL EDITOR
// ============================================================

function renderEditorToolbar(note) {
  const isEdit = _state.editMode;
  return `
    <div class="notes-editor-toolbar">
      <div class="notes-editor-toolbar__group">
        <button class="notes-toolbar-btn ${isEdit ? 'is-active' : ''}" id="btnModeEdit" title="Edit mode">
          <i data-lucide="pencil" style="width:13px;height:13px"></i> Edit
        </button>
        <button class="notes-toolbar-btn ${!isEdit ? 'is-active' : ''}" id="btnModePreview" title="Preview mode">
          <i data-lucide="eye" style="width:13px;height:13px"></i> Preview
        </button>
      </div>
      <div class="notes-editor-toolbar__group">
        <button class="notes-toolbar-btn" id="btnExportNote" title="Export note as .md">
          <i data-lucide="download" style="width:13px;height:13px"></i> Export .md
        </button>
      </div>
      <span class="notes-save-indicator" id="noteSaveIndicator">
        <i data-lucide="check" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i> Saved
      </span>
    </div>
  `;
}

function renderBottomToolbar(note) {
  const tags = note.tags || [];
  const currentColor = note.color || '#ffffff';

  const colorSwatches = NOTE_COLORS.map((c) => `
    <button class="notes-color-swatch ${c.hex === currentColor ? 'is-selected' : ''}"
      style="background:${c.hex};border-color:${c.hex === '#ffffff' ? '#e5e7eb' : c.hex}"
      data-color="${c.hex}" title="${c.label}" aria-label="${c.label}"></button>
  `).join('');

  const tagChips = tags.map((tag) => `
    <span class="notes-tag-chip">
      <i data-lucide="tag" style="width:10px;height:10px;flex-shrink:0"></i>
      ${sanitize(tag)}
      <button class="notes-tag-chip__remove" data-tag="${sanitize(tag)}" aria-label="Remove tag ${sanitize(tag)}">×</button>
    </span>
  `).join('');

  return `
    <div class="notes-bottom-toolbar">
      <div class="notes-tags-area">
        <i data-lucide="tag" style="width:13px;height:13px;color:var(--color-text-tertiary);flex-shrink:0"></i>
        ${tagChips}
        <input type="text" class="notes-tag-input" id="noteTagInput" placeholder="Add tag…" aria-label="Add tag">
      </div>
      <div class="notes-color-picker" title="Note color">
        ${colorSwatches}
      </div>
      <button class="notes-toolbar-btn notes-toolbar-btn--pin ${note.pinned ? 'is-pinned' : ''}" id="btnPinNote" title="${note.pinned ? 'Unpin note' : 'Pin note'}">
        <i data-lucide="pin" style="width:13px;height:13px"></i>
        ${note.pinned ? 'Pinned' : 'Pin'}
      </button>
      <button class="notes-toolbar-btn notes-toolbar-btn--danger" id="btnDeleteNote" title="Delete note">
        <i data-lucide="trash-2" style="width:13px;height:13px"></i> Delete
      </button>
    </div>
  `;
}

function renderEditor(note) {
  if (!note) {
    return `
      <div class="notes-empty-state">
        ${emptyStateSVG()}
        <p class="notes-empty-state__title">Belum ada catatan dipilih</p>
        <p class="notes-empty-state__text">Pilih catatan dari panel kiri atau buat catatan baru.</p>
        <button class="btn btn--primary" id="btnNewNoteEmpty">
          <i data-lucide="plus" aria-hidden="true"></i> New Note
        </button>
      </div>
    `;
  }

  const toolbarHTML = renderEditorToolbar(note);
  const contentHTML = _state.editMode
    ? `<textarea class="notes-textarea" id="noteContentTextarea" placeholder="Tulis catatan di sini... (Markdown didukung)">${sanitize(note.content || '')}</textarea>`
    : `<div class="notes-preview" id="notePreview">${renderMarkdown(note.content)}</div>`;

  const bottomHTML = renderBottomToolbar(note);

  return `
    ${toolbarHTML}
    <div class="notes-editor-body">
      <input type="text" class="notes-title-input" id="noteTitleInput"
        value="${sanitize(note.title || '')}"
        placeholder="Judul catatan…"
        aria-label="Note title">
      <hr class="notes-divider">
      <div class="notes-content-area">
        ${contentHTML}
      </div>
    </div>
    ${bottomHTML}
  `;
}

function emptyStateSVG() {
  return `
    <svg class="notes-empty-state__svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="20" y="15" width="80" height="95" rx="6" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/>
      <rect x="30" y="30" width="60" height="6" rx="3" fill="#d1d5db"/>
      <rect x="30" y="44" width="50" height="5" rx="2.5" fill="#e5e7eb"/>
      <rect x="30" y="55" width="55" height="5" rx="2.5" fill="#e5e7eb"/>
      <rect x="30" y="66" width="40" height="5" rx="2.5" fill="#e5e7eb"/>
      <circle cx="90" cy="90" r="18" fill="#2563eb"/>
      <path d="M90 83v14M83 90h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `;
}

// ============================================================
// MAIN RENDER
// ============================================================

export async function render() {
  const session = getSession();
  if (!session) return;

  const userId = session.userId;

  // Load data
  _state.notes = await loadNotes(userId);
  _state.folders = loadFolders(userId);

  const main = document.getElementById('main-content');
  if (!main) return;

  main.innerHTML = `
    <div class="notes-page">
      <div class="notes-page__header">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <button class="notes-panel-left-toggle" id="notesDrawerToggle" aria-label="Toggle notes panel">
            <i data-lucide="panel-left" style="width:18px;height:18px"></i>
          </button>
          <h1 class="notes-page__title">Personal Notes</h1>
        </div>
        <div class="notes-page__header-actions">
          <button class="btn btn--ghost btn--sm" id="btnImportNotes">
            <i data-lucide="upload" aria-hidden="true"></i> Import
          </button>
          <button class="btn btn--ghost btn--sm" id="btnExportNotes">
            <i data-lucide="download" aria-hidden="true"></i> Export Notes
          </button>
          <button class="btn btn--primary btn--sm" id="btnNewNote">
            <i data-lucide="plus" aria-hidden="true"></i> New Note
          </button>
        </div>
      </div>

      <div class="notes-page__body">
        <aside class="notes-panel-left" id="notesPanelLeft">
          <div class="notes-search-bar">
            <input type="text" class="notes-search-bar__input" id="notesSearch"
              placeholder="Search notes…" aria-label="Search notes" value="${sanitize(_state.searchQuery)}">
          </div>
          <div class="notes-list-area" id="notesListArea">
            ${renderLeftPanel()}
          </div>
        </aside>

        <div id="notesPanelLeftOverlay" class="notes-panel-left-overlay"></div>

        <main class="notes-panel-right" id="notesPanelRight">
          ${_state.activeNoteId
            ? renderEditor(_state.notes.find((n) => n.id === _state.activeNoteId) || null)
            : renderEmptyFullState()}
        </main>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  wireEvents(userId);
}

function renderEmptyFullState() {
  if (_state.notes.length === 0) {
    return `
      <div class="notes-empty-state">
        ${emptyStateSVG()}
        <p class="notes-empty-state__title">Belum ada catatan</p>
        <p class="notes-empty-state__text">Buat catatan pertamamu untuk menyimpan ide, referensi, atau apapun yang penting.</p>
        <button class="btn btn--primary" id="btnNewNoteEmpty">
          <i data-lucide="plus" aria-hidden="true"></i> New Note
        </button>
      </div>
    `;
  }
  return renderEditor(null);
}

// ============================================================
// WIRE EVENTS
// ============================================================

function wireEvents(userId) {
  // New note
  document.getElementById('btnNewNote')?.addEventListener('click', () => createNewNote(userId));
  document.getElementById('btnNewNoteEmpty')?.addEventListener('click', () => createNewNote(userId));

  // Search
  document.getElementById('notesSearch')?.addEventListener('input', (e) => {
    _state.searchQuery = e.target.value;
    refreshLeftPanel();
  });

  // New folder
  document.getElementById('btnNewFolder')?.addEventListener('click', () => promptNewFolder(userId));

  // Left panel note clicks and folder clicks (delegated)
  document.getElementById('notesListArea')?.addEventListener('click', (e) => {
    const noteItem = e.target.closest('[data-note-id]');
    const folderItem = e.target.closest('[data-folder-id]');
    const folderRenameBtn = e.target.closest('.notes-folder-item__btn--rename');
    const folderDeleteBtn = e.target.closest('.notes-folder-item__btn--delete');

    if (folderRenameBtn) {
      e.stopPropagation();
      const fid = folderRenameBtn.getAttribute('data-folder-id');
      renameFolder(userId, fid);
      return;
    }

    if (folderDeleteBtn) {
      e.stopPropagation();
      const fid = folderDeleteBtn.getAttribute('data-folder-id');
      deleteFolder(userId, fid);
      return;
    }

    if (folderItem) {
      const fid = folderItem.getAttribute('data-folder-id');
      _state.activeFolderId = _state.activeFolderId === fid ? null : fid;
      refreshLeftPanel();
      return;
    }

    if (noteItem) {
      const nid = noteItem.getAttribute('data-note-id');
      selectNote(nid);
    }
  });

  // Right panel events (delegated from body for robustness)
  document.getElementById('notesPanelRight')?.addEventListener('click', (e) => {
    if (e.target.closest('#btnModeEdit')) { _state.editMode = true; refreshEditor(); }
    else if (e.target.closest('#btnModePreview')) { _state.editMode = false; refreshEditor(); }
    else if (e.target.closest('#btnPinNote')) { togglePin(userId); }
    else if (e.target.closest('#btnDeleteNote')) { deleteActiveNote(userId); }
    else if (e.target.closest('#btnExportNote')) { exportNoteAsMd(); }
    else if (e.target.closest('[data-color]')) {
      const color = e.target.closest('[data-color]').getAttribute('data-color');
      setNoteColor(userId, color);
    }
    else if (e.target.closest('.notes-tag-chip__remove')) {
      const tag = e.target.closest('.notes-tag-chip__remove').getAttribute('data-tag');
      removeTag(userId, tag);
    }
  });

  // Tag input
  document.getElementById('notesPanelRight')?.addEventListener('keydown', (e) => {
    if (e.target.id === 'noteTagInput' && (e.key === 'Enter' || e.key === ',')) {
      e.preventDefault();
      const val = e.target.value.trim().replace(/,/g, '');
      if (val) addTag(userId, val);
    }
  });

  // Title + content debounced save
  document.getElementById('notesPanelRight')?.addEventListener('input', (e) => {
    if (e.target.id === 'noteTitleInput' || e.target.id === 'noteContentTextarea') {
      triggerAutosave(userId);
    }
  });

  // Export / Import header buttons
  document.getElementById('btnExportNotes')?.addEventListener('click', () => openExportModal(userId));
  document.getElementById('btnImportNotes')?.addEventListener('click', () => openImportModal(userId));

  // Mobile drawer
  const drawerToggle = document.getElementById('notesDrawerToggle');
  const panelLeft = document.getElementById('notesPanelLeft');
  const overlay = document.getElementById('notesPanelLeftOverlay');

  drawerToggle?.addEventListener('click', () => {
    panelLeft?.classList.toggle('is-open');
    overlay?.classList.toggle('is-open');
  });

  overlay?.addEventListener('click', () => {
    panelLeft?.classList.remove('is-open');
    overlay?.classList.remove('is-open');
  });
}

// ============================================================
// NOTE ACTIONS
// ============================================================

async function createNewNote(userId) {
  const allNotes = await getAll('notes');
  const id = generateSequentialId(ID_PREFIX.NOTE, allNotes);
  const now = nowISO();
  const note = {
    id,
    user_id: userId,
    title: '',
    content: '',
    folder_id: _state.activeFolderId || null,
    pinned: false,
    color: null,
    tags: [],
    created_at: now,
    updated_at: now,
  };
  await saveNote(note);
  _state.activeNoteId = id;
  _state.editMode = true;
  refreshAll();
  // Focus title after render
  setTimeout(() => document.getElementById('noteTitleInput')?.focus(), 50);
}

function selectNote(noteId) {
  _state.activeNoteId = noteId;
  refreshEditor();
  refreshLeftPanel();
  // On mobile, close drawer
  document.getElementById('notesPanelLeft')?.classList.remove('is-open');
  document.getElementById('notesPanelLeftOverlay')?.classList.remove('is-open');
}

function triggerAutosave(userId) {
  if (_state.saveTimer) clearTimeout(_state.saveTimer);
  _state.saveTimer = setTimeout(() => persistCurrentNote(userId), 800);
}

async function persistCurrentNote(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;

  const titleInput = document.getElementById('noteTitleInput');
  const contentTextarea = document.getElementById('noteContentTextarea');

  if (titleInput) note.title = titleInput.value;
  if (contentTextarea) note.content = contentTextarea.value;
  note.updated_at = nowISO();

  await saveNote(note);

  // Show save indicator
  const indicator = document.getElementById('noteSaveIndicator');
  if (indicator) {
    indicator.classList.add('is-visible');
    setTimeout(() => indicator.classList.remove('is-visible'), 2000);
  }

  // Update list item title
  const listItem = document.querySelector(`[data-note-id="${note.id}"] .notes-list-item__title`);
  if (listItem) {
    const colorDot = note.color && note.color !== '#ffffff'
      ? `<span class="notes-list-item__color-dot" style="background:${note.color}"></span>`
      : '';
    listItem.innerHTML = colorDot + sanitize(getNoteTitle(note));
  }
}

async function togglePin(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updated_at = nowISO();
  await saveNote(note);
  refreshAll();
}

async function setNoteColor(userId, color) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;
  note.color = color === '#ffffff' ? null : color;
  note.updated_at = nowISO();
  await saveNote(note);
  refreshAll();
}

async function addTag(userId, tag) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;
  if (!note.tags) note.tags = [];
  if (!note.tags.includes(tag)) {
    note.tags.push(tag);
    note.updated_at = nowISO();
    await saveNote(note);
    refreshBottomToolbar(note);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  const tagInput = document.getElementById('noteTagInput');
  if (tagInput) tagInput.value = '';
}

async function removeTag(userId, tag) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || !note.tags) return;
  note.tags = note.tags.filter((t) => t !== tag);
  note.updated_at = nowISO();
  await saveNote(note);
  refreshBottomToolbar(note);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteActiveNote(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;

  showConfirm({
    title: 'Hapus Catatan',
    message: `Yakin ingin menghapus catatan "${getNoteTitle(note)}"? Tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: 'Hapus',
    confirmVariant: 'danger',
    onConfirm: async () => {
      await remove('notes', note.id);
      _state.notes = _state.notes.filter((n) => n.id !== note.id);
      _state.activeNoteId = null;
      refreshAll();
      showToast('Catatan dihapus.', 'success');
    },
  });
}

function exportNoteAsMd() {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;

  const title = getNoteTitle(note);
  const content = `# ${title}\n\n${note.content || ''}`;
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Catatan berhasil diekspor.', 'success');
}

// ============================================================
// FOLDER ACTIONS
// ============================================================

function promptNewFolder(userId) {
  // Inline input at top of folder list
  const folderList = document.getElementById('notesFolderList');
  if (!folderList) return;

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'notes-folder-input';
  inp.placeholder = 'Nama folder…';
  folderList.prepend(inp);
  inp.focus();

  const finish = async () => {
    const name = inp.value.trim();
    inp.remove();
    if (!name) return;

    const id = generateSequentialId(ID_PREFIX.NOTE_FOLDER, _state.folders);
    const folder = { id, user_id: userId, name, created_at: nowISO() };
    _state.folders.push(folder);
    saveFolders(userId, _state.folders);
    refreshLeftPanel();
  };

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish();
    if (e.key === 'Escape') inp.remove();
  });
  inp.addEventListener('blur', finish);
}

function renameFolder(userId, folderId) {
  const folder = _state.folders.find((f) => f.id === folderId);
  if (!folder) return;

  const folderEl = document.querySelector(`.notes-folder-item[data-folder-id="${folderId}"] .notes-folder-item__name`);
  if (!folderEl) return;

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'notes-folder-input';
  inp.value = folder.name;
  folderEl.replaceWith(inp);
  inp.focus();
  inp.select();

  const finish = () => {
    const name = inp.value.trim();
    if (name) {
      folder.name = name;
      saveFolders(userId, _state.folders);
    }
    refreshLeftPanel();
  };

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish();
    if (e.key === 'Escape') refreshLeftPanel();
  });
  inp.addEventListener('blur', finish);
}

async function deleteFolder(userId, folderId) {
  const folder = _state.folders.find((f) => f.id === folderId);
  if (!folder) return;

  showConfirm({
    title: 'Hapus Folder',
    message: `Yakin ingin menghapus folder "${folder.name}"? Semua catatan di dalamnya akan dipindah ke All Notes.`,
    confirmLabel: 'Hapus',
    confirmVariant: 'danger',
    onConfirm: async () => {
      const notesInFolder = _state.notes.filter((n) => n.folder_id === folderId);
      for (const n of notesInFolder) {
        n.folder_id = null;
        n.updated_at = nowISO();
        await saveNote(n);
      }
      _state.folders = _state.folders.filter((f) => f.id !== folderId);
      saveFolders(userId, _state.folders);
      if (_state.activeFolderId === folderId) _state.activeFolderId = null;
      refreshLeftPanel();
      showToast('Folder dihapus. Catatan dipindah ke All Notes.', 'success');
    },
  });
}

// ============================================================
// IMPORT / EXPORT MODALS
// ============================================================

function openExportModal(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const modalContent = `
    <div style="padding:0.25rem 0">
      <p style="font-size:0.875rem;color:var(--color-text-secondary);margin:0 0 0.75rem">
        Pilih format ekspor untuk semua catatan kamu:
      </p>
      <div class="notes-export-options">
        <button class="notes-export-option-btn" id="btnExportJSON">
          <i data-lucide="file-json" class="notes-export-option-btn__icon" style="width:22px;height:22px"></i>
          <div>
            <div class="notes-export-option-btn__label">Export ke JSON</div>
            <div class="notes-export-option-btn__desc">Backup lengkap dengan semua data — bisa diimport kembali</div>
          </div>
        </button>
        <button class="notes-export-option-btn" id="btnExportMD">
          <i data-lucide="file-text" class="notes-export-option-btn__icon" style="width:22px;height:22px"></i>
          <div>
            <div class="notes-export-option-btn__label">Export ke Markdown</div>
            <div class="notes-export-option-btn__desc">Semua catatan digabung dalam satu file .md</div>
          </div>
        </button>
      </div>
    </div>
  `;

  openModal({ title: 'Export Notes', body: modalContent, size: 'sm' });
  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
    const userNotes = _state.notes.filter((n) => n.user_id === userId);
    const userFolders = _state.folders;
    const data = { exported_at: nowISO(), user_id: userId, notes: userNotes, folders: userFolders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackly-notes-export-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    closeModal();
    showToast('Notes berhasil diekspor ke JSON.', 'success');
  });

  document.getElementById('btnExportMD')?.addEventListener('click', () => {
    const userNotes = _state.notes.filter((n) => n.user_id === userId);
    const lines = userNotes.map((n) => {
      const title = getNoteTitle(n);
      return `# ${title}\n\n${n.content || ''}\n\n---`;
    }).join('\n\n');
    const blob = new Blob([lines], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackly-notes-${today}.md`;
    a.click();
    URL.revokeObjectURL(url);
    closeModal();
    showToast('Notes berhasil diekspor ke Markdown.', 'success');
  });
}

function openImportModal(userId) {
  const modalContent = `
    <div class="notes-import-area">
      <p class="notes-import-label">
        Import file JSON yang sebelumnya diekspor dari Personal Notes.
        Catatan dengan ID yang sama akan di-skip (tidak akan ditimpa).
      </p>
      <input type="file" id="notesImportFileInput" accept=".json"
        class="btn btn--ghost btn--sm" style="cursor:pointer">
      <p class="notes-import-hint">
        Format yang diterima: JSON dengan struktur <code>{ notes: [...], folders: [...] }</code>
      </p>
    </div>
  `;

  openModal({ title: 'Import Notes', body: modalContent, size: 'sm' });

  document.getElementById('notesImportFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let importedCount = 0;

      // Import notes
      const incomingNotes = data.notes || [];
      const existingIds = new Set(_state.notes.map((n) => n.id));
      for (const n of incomingNotes) {
        if (!existingIds.has(n.id)) {
          n.user_id = userId; // ensure ownership
          await add('notes', n);
          _state.notes.push(n);
          existingIds.add(n.id);
          importedCount++;
        }
      }

      // Import folders
      const incomingFolders = data.folders || [];
      const existingFolderIds = new Set(_state.folders.map((f) => f.id));
      for (const f of incomingFolders) {
        if (!existingFolderIds.has(f.id)) {
          f.user_id = userId;
          _state.folders.push(f);
          existingFolderIds.add(f.id);
        }
      }
      saveFolders(userId, _state.folders);

      closeModal();
      showToast(`${importedCount} catatan berhasil diimpor.`, 'success');
      refreshAll();
    } catch (err) {
      showToast('Gagal mengimpor: format file tidak valid.', 'error');
    }
  });
}

// ============================================================
// REFRESH HELPERS
// ============================================================

function refreshLeftPanel() {
  const area = document.getElementById('notesListArea');
  if (!area) return;
  area.innerHTML = renderLeftPanel();
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Re-wire folder-specific events after re-render
  document.getElementById('btnNewFolder')?.addEventListener('click', () => {
    const session = getSession();
    if (session) promptNewFolder(session.userId);
  });
}

function refreshEditor() {
  const panel = document.getElementById('notesPanelRight');
  if (!panel) return;
  const note = _state.notes.find((n) => n.id === _state.activeNoteId) || null;
  panel.innerHTML = renderEditor(note);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Re-wire editor input events
  const session = getSession();
  if (!session) return;
  const userId = session.userId;

  document.getElementById('notesPanelRight')?.addEventListener('input', (e) => {
    if (e.target.id === 'noteTitleInput' || e.target.id === 'noteContentTextarea') {
      triggerAutosave(userId);
    }
  });

  document.getElementById('btnNewNoteEmpty')?.addEventListener('click', () => createNewNote(userId));
}

function refreshBottomToolbar(note) {
  // Find and replace just the bottom toolbar to avoid full re-render
  const existing = document.querySelector('.notes-bottom-toolbar');
  if (!existing) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderBottomToolbar(note);
  existing.replaceWith(tmp.firstElementChild);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function refreshAll() {
  refreshLeftPanel();
  refreshEditor();
}

export default { render };
