/**
 * TRACKLY — notes.js
 * Phase 25: Notes Sharing & Collaboration Audit
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

const AUDIT_ACTION_LABELS = {
  note_created: 'membuat catatan ini',
  note_edited: 'mengedit catatan',
  note_deleted: 'menghapus catatan',
  note_pinned: 'menyematkan catatan',
  note_unpinned: 'melepas sematan catatan',
  note_color_changed: 'mengubah warna catatan',
  note_tag_added: 'menambahkan tag',
  note_tag_removed: 'menghapus tag',
  note_moved: 'memindahkan catatan ke',
  note_exported: 'mengekspor catatan',
  note_shared: 'membagikan catatan ke',
  note_unshared: 'mencabut akses dari',
  note_permission_changed: 'mengubah izin berbagi',
  note_viewed_shared: 'melihat catatan (shared)',
  note_edited_shared: 'mengedit catatan (shared)',
};

// ============================================================
// STATE
// ============================================================

let _state = {
  notes: [],
  folders: [],
  activeNoteId: null,
  activeFolderId: null,
  searchQuery: '',
  editMode: 'edit', // 'edit' | 'preview' | 'audit'
  saveTimer: null,
  isReadOnly: false,
};

// ============================================================
// FOLDER HELPERS (localStorage)
// ============================================================

function getFolderKey(userId) { return `notes_folders_${userId}`; }

function loadFolders(userId) {
  try {
    const raw = localStorage.getItem(getFolderKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>').replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>').replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  return `<div class="markdown-body"><p>${html}</p></div>`;
}

// ============================================================
// ACCESS CONTROL
// ============================================================

function getNoteAccess(note, userId) {
  if (!note) return null;
  if (_state.isReadOnly) return 'view';
  if (note.owner_id === userId || note.user_id === userId) return 'owner';
  if ((note.shared_with || []).includes(userId)) return note.share_permission || 'view';
  return null;
}

// ============================================================
// DATA HELPERS
// ============================================================

function normalizeNote(note) {
  if (!Array.isArray(note.shared_with)) note.shared_with = [];
  if (!note.share_permission) note.share_permission = 'view';
  if (!note.owner_id) note.owner_id = note.user_id;
  return note;
}

async function loadNotes(userId) {
  const ownNotes = await getByIndex('notes', 'user_id', userId);
  let sharedNotes = [];
  try {
    sharedNotes = await getByIndex('notes', 'shared_with', userId);
  } catch {
    const allNotes = await getAll('notes');
    sharedNotes = allNotes.filter(
      (n) => n.user_id !== userId && Array.isArray(n.shared_with) && n.shared_with.includes(userId)
    );
  }
  const map = new Map();
  for (const n of [...ownNotes, ...sharedNotes]) map.set(n.id, normalizeNote(n));
  return Array.from(map.values());
}

async function saveNote(note) {
  normalizeNote(note);
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
// AUDIT LOG
// ============================================================

async function logNoteAudit(noteId, action, detail = null, diff = null) {
  try {
    const session = getSession();
    if (!session) return;
    let userName = session.fullName || session.userId;
    if (!session.fullName) {
      try {
        const users = await getAll('users');
        const u = users.find((x) => x.id === session.userId);
        if (u) userName = u.full_name || u.username || session.userId;
      } catch { /* ignore */ }
    }
    const allAudit = await getAll('note_audit');
    const id = generateSequentialId(ID_PREFIX.NAUD, allAudit);
    await add('note_audit', { id, note_id: noteId, user_id: session.userId, user_name: userName, action, detail: detail || null, diff: diff || null, created_at: nowISO() });
  } catch (err) {
    if (localStorage.getItem('trackly_debug') === 'true') console.warn('[TRACKLY] logNoteAudit failed:', err);
  }
}

// ============================================================
// RENDER HELPERS — LEFT PANEL
// ============================================================

function renderNoteListItem(note, isActive, userId) {
  const title = sanitize(getNoteTitle(note));
  const meta = formatRelativeDate(note.updated_at);
  const colorAttr = note.color && note.color !== '#ffffff' ? ` data-color="${note.color}"` : '';
  const pinIcon = note.pinned ? `<i data-lucide="pin" class="notes-list-item__pin-icon" aria-hidden="true"></i>` : '';
  const colorDot = note.color && note.color !== '#ffffff' ? `<span class="notes-list-item__color-dot" style="background:${note.color}"></span>` : '';
  const access = getNoteAccess(note, userId);
  const isSharedToMe = access !== 'owner';
  const isSharedByMe = access === 'owner' && (note.shared_with || []).length > 0;
  const sharedBadge = isSharedToMe ? `<span class="notes-share__badge">Shared</span>` : '';
  const shareIcon = isSharedByMe ? `<i data-lucide="share-2" class="notes-share__icon" aria-hidden="true"></i>` : '';
  const ownerLabel = isSharedToMe ? `<div class="notes-share__owner-label">Dari: ${sanitize(note._ownerName || note.owner_id || '')}</div>` : '';
  return `
    <div class="notes-list-item ${isActive ? 'is-active' : ''}" data-note-id="${note.id}"${colorAttr}>
      ${pinIcon}
      <div class="notes-list-item__title">${colorDot}${title}${sharedBadge}${shareIcon}</div>
      <div class="notes-list-item__meta">${meta}</div>
      ${ownerLabel}
    </div>
  `;
}

function getFilteredNotes(userId) {
  let notes = _state.notes;
  const q = _state.searchQuery.trim().toLowerCase();
  if (q) {
    notes = notes.filter((n) => getNoteTitle(n).toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
    return { pinned: [], inFolders: {}, all: notes, sharedNotes: [], isSearch: true };
  }
  const ownNotes = notes.filter((n) => getNoteAccess(n, userId) === 'owner');
  const sharedNotes = notes.filter((n) => getNoteAccess(n, userId) !== 'owner');
  const pinned = ownNotes.filter((n) => n.pinned);
  if (_state.activeFolderId) {
    const folderNotes = ownNotes.filter((n) => n.folder_id === _state.activeFolderId && !n.pinned);
    return { pinned, inFolders: {}, folderFiltered: folderNotes, all: [], sharedNotes: [], isSearch: false };
  }
  const ungrouped = ownNotes.filter((n) => !n.pinned && !n.folder_id);
  const inFolders = {};
  for (const folder of _state.folders) inFolders[folder.id] = ownNotes.filter((n) => !n.pinned && n.folder_id === folder.id);
  return { pinned, inFolders, all: ungrouped, sharedNotes, isSearch: false };
}

function renderLeftPanel(userId) {
  const { pinned, inFolders, all, folderFiltered, sharedNotes, isSearch } = getFilteredNotes(userId);
  let html = '';
  if (isSearch) {
    html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title">Search Results</span></div>`;
    html += all.length === 0 ? `<div class="notes-list-empty">No notes found</div>` : all.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId, userId)).join('');
    html += '</div>';
  } else if (_state.activeFolderId) {
    const folder = _state.folders.find((f) => f.id === _state.activeFolderId);
    html += `<div class="notes-folder-back-bar"><button class="notes-folder-back-btn" id="btnFolderBack"><i data-lucide="arrow-left" style="width:13px;height:13px"></i> Back</button><span class="notes-folder-back-bar__name"><i data-lucide="folder" style="width:12px;height:12px"></i>${sanitize(folder?.name || 'Folder')}</span></div>`;
    html += `<div class="notes-section">`;
    html += (!folderFiltered || folderFiltered.length === 0) ? `<div class="notes-list-empty">No notes in this folder</div>` : folderFiltered.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId, userId)).join('');
    html += '</div>';
  } else {
    if (pinned.length > 0) {
      html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="pin" style="width:11px;height:11px"></i> Pinned</span></div>`;
      html += pinned.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId, userId)).join('');
      html += '</div>';
    }
    html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="folder" style="width:11px;height:11px"></i> Folders</span></div>
      ${_state.isReadOnly ? '' : `<button class="notes-new-folder-btn" id="btnNewFolder"><i data-lucide="folder-plus" style="width:13px;height:13px"></i> New Folder</button>`}
      <div id="notesFolderList">
        ${_state.folders.map((folder) => {
      const count = (inFolders[folder.id] || []).length;
      return `<div class="notes-folder-item ${_state.activeFolderId === folder.id ? 'is-active' : ''}" data-folder-id="${folder.id}">
            <i data-lucide="folder" style="width:13px;height:13px;flex-shrink:0"></i>
            <span class="notes-folder-item__name">${sanitize(folder.name)}</span>
            <span style="font-size:0.7rem;color:var(--color-text-tertiary)">${count}</span>
            <div class="notes-folder-item__actions">
              <button class="notes-folder-item__btn notes-folder-item__btn--rename" data-folder-id="${folder.id}" title="Rename folder"><i data-lucide="pencil" style="width:12px;height:12px"></i></button>
              <button class="notes-folder-item__btn notes-folder-item__btn--delete" data-folder-id="${folder.id}" title="Delete folder"><i data-lucide="x" style="width:12px;height:12px"></i></button>
            </div>
          </div>`;
    }).join('')}
      </div>
    </div>`;
    html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="file-text" style="width:11px;height:11px"></i> All Notes</span></div>`;
    html += all.length === 0 && _state.notes.filter((n) => getNoteAccess(n, userId) === 'owner' && !n.pinned && !n.folder_id).length === 0
      ? `<div class="notes-list-empty">No notes yet</div>`
      : all.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId, userId)).join('');
    html += '</div>';
    if (sharedNotes && sharedNotes.length > 0) {
      html += `<div class="notes-section"><div class="notes-section__header"><span class="notes-section__title"><i data-lucide="users" style="width:11px;height:11px"></i> Dibagikan ke Saya</span></div>`;
      html += sharedNotes.map((n) => renderNoteListItem(n, n.id === _state.activeNoteId, userId)).join('');
      html += '</div>';
    }
  }
  return html;
}

// ============================================================
// RENDER HELPERS — RIGHT PANEL EDITOR
// ============================================================

function renderEditorToolbar(note, userId) {
  const noteMode = _state.editMode;
  const access = getNoteAccess(note, userId);
  const isOwner = access === 'owner';
  const ownerLabel = isOwner ? '' : `<span class="notes-share__owner-label">Dari: ${sanitize(note._ownerName || note.owner_id || '')}</span>`;
  return `
    <div class="notes-editor-toolbar">
      <div class="notes-segment-control">
        <button class="notes-segment-btn ${noteMode === 'edit' ? 'is-active' : ''}" id="btnModeEdit" title="Edit mode"><i data-lucide="edit-3" style="width:13px;height:13px"></i> Edit</button>
        <button class="notes-segment-btn ${noteMode === 'preview' ? 'is-active' : ''}" id="btnModePreview" title="Reading mode"><i data-lucide="book-open" style="width:13px;height:13px"></i> Reading</button>
        <button class="notes-segment-btn ${noteMode === 'audit' ? 'is-active' : ''}" id="btnModeAudit" title="Audit log"><i data-lucide="history" style="width:13px;height:13px"></i> History</button>
      </div>
      
      <div class="notes-toolbar-spacer"></div>
      
      <div class="notes-toolbar-actions">
        ${ownerLabel}
        <span class="notes-save-indicator" id="noteSaveIndicator"><i data-lucide="check" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i> Tersimpan</span>
        <button class="btn btn--outline btn--sm" id="btnFullscreenNote" style="height:28px" title="Toggle Fullscreen"><i data-lucide="maximize" style="width:13px;height:13px"></i></button>
        <button class="btn btn--outline btn--sm" id="btnCopyNote" style="height:28px" title="Copy Markdown"><i data-lucide="copy" style="width:13px;height:13px"></i> Copy</button>
        ${_state.isReadOnly ? '' : `<button class="btn btn--outline btn--sm" id="btnShareNote" style="height:28px" title="Share with team"><i data-lucide="share-2" style="width:13px;height:13px"></i> Share</button>`}
        <button class="btn btn--outline btn--sm" id="btnExportNote" style="height:28px" title="Download markdown"><i data-lucide="download" style="width:13px;height:13px"></i> Export</button>
        <button class="notes-toolbar-btn notes-editor-close-btn" id="btnCloseNote" title="Close note" style="margin-left:8px"><i data-lucide="x" style="width:13px;height:13px"></i></button>
      </div>
    </div>
  `;
}

function renderBottomToolbar(note, userId) {
  const access = getNoteAccess(note, userId);
  const isOwner = access === 'owner';
  const tags = note.tags || [];
  const currentColor = note.color || '#ffffff';

  const wordCount = note.content ? note.content.trim().split(/\\s+/).filter(w => w.length > 0).length : 0;
  const charCount = note.content ? note.content.length : 0;

  const colorSwatches = NOTE_COLORS.map((c) => `<button class="notes-color-swatch ${c.hex === currentColor ? 'is-selected' : ''}" style="background:${c.hex};border-color:${c.hex === '#ffffff' ? '#e5e7eb' : c.hex}" data-color="${c.hex}" title="${c.label}" aria-label="${c.label}"></button>`).join('');
  const tagChips = tags.map((tag) => `<span class="notes-tag-chip"><i data-lucide="tag" style="width:10px;height:10px;flex-shrink:0"></i>${sanitize(tag)}${isOwner && !_state.isReadOnly ? `<button class="notes-tag-chip__remove" data-tag="${sanitize(tag)}" aria-label="Remove tag ${sanitize(tag)}">×</button>` : ''}</span>`).join('');
  const folderOptions = [`<option value="">— Tanpa Folder (All Notes)</option>`, ..._state.folders.map((f) => `<option value="${f.id}" ${note.folder_id === f.id ? 'selected' : ''}>${sanitize(f.name)}</option>`)].join('');
  const moveToFolderControl = isOwner && !_state.isReadOnly ? (_state.folders.length === 0 ? `<span style="font-size:0.75rem;color:var(--color-text-tertiary)">Belum ada folder.</span>` : `<select class="notes-move-folder-select" id="noteMoveFolder" title="Pindah ke folder">${folderOptions}</select>`) : '';
  const pinBtn = isOwner && !_state.isReadOnly ? `<button class="notes-toolbar-btn notes-toolbar-btn--pin ${note.pinned ? 'is-pinned' : ''}" id="btnPinNote" title="${note.pinned ? 'Unpin note' : 'Pin note'}"><i data-lucide="pin" style="width:13px;height:13px"></i>${note.pinned ? 'Pinned' : 'Pin'}</button>` : '';
  const deleteBtn = isOwner && !_state.isReadOnly ? `<button class="notes-toolbar-btn notes-toolbar-btn--danger" id="btnDeleteNote" title="Delete note"><i data-lucide="trash-2" style="width:13px;height:13px"></i> Delete</button>` : '';
  return `
    <div class="notes-bottom-toolbar">
      <div class="notes-tags-area">
        <i data-lucide="tag" style="width:13px;height:13px;color:var(--color-text-tertiary);flex-shrink:0"></i>
        ${tagChips}
        ${isOwner && !_state.isReadOnly ? `<input type="text" class="notes-tag-input" id="noteTagInput" placeholder="Add tag…" aria-label="Add tag">` : ''}
      </div>
      <div class="notes-word-count" id="notesWordCount" title="Word & Character count" style="font-size:11px;color:var(--color-text-tertiary);margin-right:8px;font-family:var(--font-mono, monospace);">
        ${wordCount} words, ${charCount} chars
      </div>
      ${isOwner && !_state.isReadOnly ? `<div class="notes-color-picker" title="Note color">${colorSwatches}</div>` : ''}
      ${isOwner && !_state.isReadOnly ? `<div class="notes-move-folder-wrap" title="Pindah ke folder"><i data-lucide="folder-input" style="width:13px;height:13px;color:var(--color-text-tertiary);flex-shrink:0"></i>${moveToFolderControl}</div>` : ''}
      ${pinBtn}${deleteBtn}
    </div>
  `;
}

function renderFormattingToolbar() {
  return `
    <div class="notes-format-toolbar" id="notesFormatToolbar">
      <button class="notes-format-toolbar__btn" data-fmt="bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
      <button class="notes-format-toolbar__btn notes-format-toolbar__btn--italic" data-fmt="italic" title="Italic (Ctrl+I)"><em>I</em></button>
      <button class="notes-format-toolbar__btn" data-fmt="strikethrough" title="Strikethrough (Ctrl+Shift+X)"><del>S</del></button>
      <div class="notes-format-toolbar__sep"></div>
      <button class="notes-format-toolbar__btn" data-fmt="h1" title="Heading 1">H1</button>
      <button class="notes-format-toolbar__btn" data-fmt="h2" title="Heading 2">H2</button>
      <button class="notes-format-toolbar__btn" data-fmt="h3" title="Heading 3">H3</button>
      <div class="notes-format-toolbar__sep"></div>
      <button class="notes-format-toolbar__btn" data-fmt="ul" title="Unordered List"><i data-lucide="list" style="width:14px;height:14px"></i></button>
      <button class="notes-format-toolbar__btn" data-fmt="ol" title="Ordered List"><i data-lucide="list-ordered" style="width:14px;height:14px"></i></button>
      <div class="notes-format-toolbar__sep"></div>
      <button class="notes-format-toolbar__btn" data-fmt="timestamp" title="Insert Date/Time"><i data-lucide="clock" style="width:14px;height:14px"></i></button>
    </div>
  `;
}

async function renderAuditLog(note) {
  let entries = [];
  try {
    const all = await getByIndex('note_audit', 'note_id', note.id);
    entries = all.sort((a, b) => (b.created_at > a.created_at ? 1 : -1)).slice(0, 50);
  } catch { entries = []; }
  if (entries.length === 0) return `<div class="notes-audit__empty">Belum ada riwayat aktivitas.</div>`;
  const COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#DB2777'];
  return `<div class="notes-audit__timeline">${entries.map((entry) => {
    const label = AUDIT_ACTION_LABELS[entry.action] || entry.action;
    const detail = entry.detail ? `<div class="notes-audit__detail">↳ ${sanitize(entry.detail)}</div>` : '';
    let diffHtml = '';
    if (entry.diff && Array.isArray(entry.diff)) {
      diffHtml = `<div class="notes-audit__diff">${entry.diff.map(d => {
        const symbol = d.type === 'added' ? '+' : '-';
        return `<div class="notes-audit__diff-line notes-audit__diff-line--${d.type}"><span class="notes-audit__diff-symbol">${symbol}</span><span>${sanitize(d.text) || ' '}</span></div>`;
      }).join('')}</div>`;
    }
    const initials = (entry.user_name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
    let hash = 0;
    for (let i = 0; i < (entry.user_id || '').length; i++) { hash = ((hash << 5) - hash) + (entry.user_id || '').charCodeAt(i); hash |= 0; }
    const color = COLORS[Math.abs(hash) % COLORS.length];
    return `<div class="notes-audit__entry"><div class="notes-audit__avatar" style="background:${color}">${sanitize(initials)}</div><div class="notes-audit__content"><span class="notes-audit__name">${sanitize(entry.user_name)}</span> <span class="notes-audit__action">${sanitize(label)}</span><span class="notes-audit__time">${formatRelativeDate(entry.created_at)}</span>${detail}${diffHtml}</div></div>`;
  }).join('')}</div>`;
}

function renderEditor(note, userId) {
  if (!note) {
    return `<div class="notes-empty-state">${emptyStateSVG()}<p class="notes-empty-state__title">Belum ada catatan dipilih</p><p class="notes-empty-state__text">Pilih catatan dari panel kiri atau buat catatan baru.</p><button class="btn btn--primary" id="btnNewNoteEmpty"><i data-lucide="plus" aria-hidden="true"></i> New Note</button></div>`;
  }
  const access = getNoteAccess(note, userId);
  const isOwner = access === 'owner';
  const isViewOnly = access === 'view';
  const toolbarHTML = renderEditorToolbar(note, userId);
  const bottomHTML = renderBottomToolbar(note, userId);
  const noteMode = _state.editMode;
  const canEdit = access === 'owner' || access === 'edit';

  if (noteMode === 'audit' && isOwner) {
    return `${toolbarHTML}<div class="notes-editor-body notes-audit-body" id="notesAuditContainer"><div class="notes-audit__loading">Memuat riwayat…</div></div>${bottomHTML}`;
  }

  const readonlyBanner = isViewOnly ? `<div class="notes-readonly-banner"><i data-lucide="eye" style="width:14px;height:14px"></i> Catatan ini dibagikan ke kamu — hanya bisa dilihat.</div>` : '';
  const showFormatToolbar = noteMode === 'edit' && !isViewOnly;
  const formatToolbarHTML = showFormatToolbar ? renderFormattingToolbar() : '';

  let contentHTML;
  if (noteMode === 'preview' || isViewOnly) {
    contentHTML = `<div class="notes-preview" id="notePreview">${renderMarkdown(note.content)}</div>`;
  } else {
    contentHTML = `<textarea class="notes-textarea" id="noteContentTextarea" placeholder="Tulis catatan di sini... (Markdown didukung)">${sanitize(note.content || '')}</textarea>`;
  }

  return `
    ${toolbarHTML}${readonlyBanner}${formatToolbarHTML}
    <div class="notes-editor-body">
      <input type="text" class="notes-title-input" id="noteTitleInput" value="${sanitize(note.title || '')}" placeholder="Judul catatan…" aria-label="Note title"${isViewOnly || _state.isReadOnly ? ' readonly' : ''}>
      <hr class="notes-divider">
      <div class="notes-content-area">${contentHTML}</div>
    </div>
    ${bottomHTML}
  `;
}

function emptyStateSVG() {
  return `<svg class="notes-empty-state__svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="20" y="15" width="80" height="95" rx="6" fill="#f3f4f6" stroke="#d1d5db" stroke-width="2"/><rect x="30" y="30" width="60" height="6" rx="3" fill="#d1d5db"/><rect x="30" y="44" width="50" height="5" rx="2.5" fill="#e5e7eb"/><rect x="30" y="55" width="55" height="5" rx="2.5" fill="#e5e7eb"/><rect x="30" y="66" width="40" height="5" rx="2.5" fill="#e5e7eb"/><circle cx="90" cy="90" r="18" fill="#2563eb"/><path d="M90 83v14M83 90h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}

// ============================================================
// SHARE MODAL
// ============================================================

async function openShareModal(note, userId) {
  let users = [];
  try { users = await getAll('users'); } catch { users = []; }

  const otherUsers = users.filter((u) => u.id !== userId);

  function renderSharedList() {
    const sw = note.shared_with || [];
    const perm = note.share_permission || 'view';
    if (sw.length === 0) return `<div class="notes-share-modal__empty">Belum ada yang punya akses.</div>`;
    return sw.map((uid) => {
      const u = users.find((x) => x.id === uid);
      const name = u ? (u.full_name || u.username || uid) : uid;
      return `<div class="notes-share-modal__user-row"><span class="notes-share-modal__user-name"><i data-lucide="user" style="width:13px;height:13px"></i> ${sanitize(name)}</span><span class="notes-share-modal__perm-badge notes-share-modal__perm-badge--${perm}">${perm === 'edit' ? 'Bisa edit' : 'Hanya lihat'}</span><button class="notes-share-modal__remove-btn" data-uid="${sanitize(uid)}" title="Cabut akses">×</button></div>`;
    }).join('');
  }

  const buildMemberCheckboxes = () => {
    const available = otherUsers.filter((u) => !(note.shared_with || []).includes(u.id));
    if (available.length === 0) return `<p style="font-size:0.8rem;color:var(--color-text-tertiary)">Semua member sudah punya akses.</p>`;
    return `<div class="notes-share-modal__checkbox-list" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:4px 0;">${available.map((u) => {
      const name = sanitize(u.full_name || u.username || u.id);
      const role = sanitize(u.role || '');
      return `<label class="notes-share-modal__checkbox-item" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:0.85rem;transition:background 0.15s;" onmouseover="this.style.background='var(--color-surface)'" onmouseout="this.style.background='transparent'"><input type="checkbox" class="share-user-checkbox" value="${sanitize(u.id)}" style="accent-color:var(--color-primary);width:16px;height:16px;flex-shrink:0;"><span style="flex:1">${name}</span><span style="font-size:0.75rem;color:var(--color-text-tertiary);">${role}</span></label>`;
    }).join('')}</div>`;
  };

  const perm = note.share_permission || 'view';
  const body = `
    <div class="notes-share-modal">
      <div class="notes-share-modal__note-title">${sanitize(getNoteTitle(note))}</div>
      <div class="notes-share-modal__section">
        <label class="notes-share-modal__label">Bagikan ke:</label>
        <div id="shareUserCheckboxWrap">${otherUsers.length > 0 ? buildMemberCheckboxes() : `<p style="font-size:0.8rem;color:var(--color-text-tertiary)">Tidak ada member lain.</p>`}</div>
      </div>
      <div class="notes-share-modal__section">
        <label class="notes-share-modal__label">Izin akses:</label>
        <div class="notes-share-modal__radio-group">
          <label class="notes-share-modal__radio"><input type="radio" name="sharePermission" value="view" ${perm === 'view' ? 'checked' : ''}> Hanya lihat</label>
          <label class="notes-share-modal__radio"><input type="radio" name="sharePermission" value="edit" ${perm === 'edit' ? 'checked' : ''}> Bisa edit</label>
        </div>
      </div>
      <div class="notes-share-modal__section">
        <label class="notes-share-modal__label">Yang sudah punya akses:</label>
        <div id="shareCurrentList" class="notes-share-modal__current-list">${renderSharedList()}</div>
      </div>
    </div>
  `;
  const footer = `<button class="btn btn--primary btn--sm" id="btnShareAdd">Tambahkan</button><button class="btn btn--ghost btn--sm" id="btnShareClose">Tutup</button>`;
  openModal({ title: 'Bagikan Catatan', body, footer, size: 'sm' });
  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('btnShareAdd')?.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.share-user-checkbox:checked');
    const selectedIds = Array.from(checkboxes).map((cb) => cb.value);
    if (selectedIds.length === 0) { showToast('Pilih minimal satu member.', 'warning'); return; }
    const newPerm = document.querySelector('input[name="sharePermission"]:checked')?.value || 'view';
    await shareNote(note, userId, selectedIds, newPerm);
    const cl = document.getElementById('shareCurrentList');
    if (cl) { cl.innerHTML = renderSharedList(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    const wrap = document.getElementById('shareUserCheckboxWrap');
    if (wrap) wrap.innerHTML = buildMemberCheckboxes();
  });

  document.querySelector('#modalBody')?.addEventListener('change', async (e) => {
    if (e.target.name === 'sharePermission') {
      const newPerm = e.target.value;
      if (note.share_permission !== newPerm && (note.shared_with || []).length > 0) {
        note.share_permission = newPerm;
        note.updated_at = nowISO();
        await saveNote(note);
        await logNoteAudit(note.id, 'note_permission_changed', newPerm);
        showToast(`Izin diubah ke "${newPerm === 'edit' ? 'Bisa edit' : 'Hanya lihat'}".`, 'success');
        const cl = document.getElementById('shareCurrentList');
        if (cl) { cl.innerHTML = renderSharedList(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
      }
    }
  });

  document.getElementById('shareCurrentList')?.addEventListener('click', async (e) => {
    const rb = e.target.closest('.notes-share-modal__remove-btn');
    if (rb) {
      const uid = rb.getAttribute('data-uid');
      await unshareNote(note, userId, uid, users);
      const cl = document.getElementById('shareCurrentList');
      if (cl) { cl.innerHTML = renderSharedList(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
      const wrap = document.getElementById('shareUserCheckboxWrap');
      if (wrap) wrap.innerHTML = buildMemberCheckboxes();
    }
  });

  document.getElementById('btnShareClose')?.addEventListener('click', () => closeModal());
}

async function shareNote(note, userId, selectedUserIds, permission) {
  if (!note.shared_with) note.shared_with = [];
  for (const uid of selectedUserIds) { if (!note.shared_with.includes(uid)) note.shared_with.push(uid); }
  note.share_permission = permission;
  note.updated_at = nowISO();
  await saveNote(note);
  let users = [];
  try { users = await getAll('users'); } catch { /* ignore */ }
  const names = selectedUserIds.map((uid) => { const u = users.find((x) => x.id === uid); return u ? (u.full_name || u.username || uid) : uid; }).join(', ');
  await logNoteAudit(note.id, 'note_shared', names);
  showToast(`Note berhasil dibagikan ke ${selectedUserIds.length} orang.`, 'success');
  refreshLeftPanel(userId);
}

async function unshareNote(note, userId, targetUserId, usersCache) {
  let users = usersCache;
  if (!users) { try { users = await getAll('users'); } catch { users = []; } }
  const targetUser = users.find((u) => u.id === targetUserId);
  const targetName = targetUser ? (targetUser.full_name || targetUser.username || targetUserId) : targetUserId;
  note.shared_with = (note.shared_with || []).filter((uid) => uid !== targetUserId);
  note.updated_at = nowISO();
  await saveNote(note);
  await logNoteAudit(note.id, 'note_unshared', targetName);
  showToast(`Akses dicabut dari ${targetName}.`, 'success');
  refreshLeftPanel(userId);
}

// ============================================================
// AUDIT PANEL LOADER
// ============================================================

async function loadAuditPanel(note) {
  const container = document.getElementById('notesAuditContainer');
  if (!container) return;
  const html = await renderAuditLog(note);
  container.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================
// MAIN RENDER
// ============================================================

export async function render() {
  const session = getSession();
  if (!session) return;
  const userId = session.userId;

  const rawNotes = await loadNotes(userId);
  let users = [];
  try { users = await getAll('users'); } catch { /* ignore */ }
  for (const note of rawNotes) {
    if (getNoteAccess(note, userId) !== 'owner') {
      const owner = users.find((u) => u.id === (note.owner_id || note.user_id));
      note._ownerName = owner ? (owner.full_name || owner.username || note.owner_id) : note.owner_id;
    }
  }

  _state.notes = rawNotes;
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
          <h1 class="page-header__title">Catatan & Dokumen</h1>
        </div>
        <div class="page-header__actions">
          <input type="file" id="notesUploadMdInput" accept=".md,.txt" style="display:none">
          ${_state.isReadOnly ? '' : `<button class="btn btn--ghost btn--sm" id="btnImportNotes"><i data-lucide="upload" aria-hidden="true"></i> Import</button>
          <button class="btn btn--ghost btn--sm" id="btnExportNotes"><i data-lucide="download" aria-hidden="true"></i> Export Notes</button>
          <button class="btn btn--primary btn--sm" id="btnNewNote"><i data-lucide="plus" aria-hidden="true"></i> New Note</button>`}
        </div>
      </div>
      <div class="notes-page__body">
        <aside class="notes-panel-left" id="notesPanelLeft">
          <div class="notes-search-bar">
            <input type="text" class="notes-search-bar__input" id="notesSearch" placeholder="Search notes…" aria-label="Search notes" value="${sanitize(_state.searchQuery)}">
          </div>
          <div class="notes-list-area" id="notesListArea">${renderLeftPanel(userId)}</div>
        </aside>
        <div id="notesPanelLeftOverlay" class="notes-panel-left-overlay"></div>
        <main class="notes-panel-right" id="notesPanelRight">
          ${_state.activeNoteId ? renderEditor(_state.notes.find((n) => n.id === _state.activeNoteId) || null, userId) : renderEmptyFullState(userId)}
        </main>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') lucide.createIcons();
  wireEvents(userId);

  if (_state.editMode === 'audit') {
    const note = _state.notes.find((n) => n.id === _state.activeNoteId);
    if (note) loadAuditPanel(note);
  }
}

function renderEmptyFullState(userId) {
  if (_state.notes.length === 0) {
    return `<div class="notes-empty-state">${emptyStateSVG()}<p class="notes-empty-state__title">Belum ada catatan</p><p class="notes-empty-state__text">Buat catatan pertamamu untuk menyimpan ide, referensi, atau apapun yang penting.</p>${_state.isReadOnly ? '' : `<button class="btn btn--primary" id="btnNewNoteEmpty"><i data-lucide="plus" aria-hidden="true"></i> New Note</button>`}</div>`;
  }
  return renderEditor(null, userId);
}

// ============================================================
// WIRE EVENTS
// ============================================================

function wireEvents(userId) {
  document.getElementById('btnNewNote')?.addEventListener('click', () => createNewNote(userId));
  document.getElementById('btnNewNoteEmpty')?.addEventListener('click', () => createNewNote(userId));
  document.getElementById('notesSearch')?.addEventListener('input', (e) => { _state.searchQuery = e.target.value; refreshLeftPanel(userId); });
  document.getElementById('btnNewFolder')?.addEventListener('click', () => promptNewFolder(userId));

  document.getElementById('notesListArea')?.addEventListener('click', (e) => {
    const folderRenameBtn = e.target.closest('.notes-folder-item__btn--rename');
    const folderDeleteBtn = e.target.closest('.notes-folder-item__btn--delete');
    const folderItem = e.target.closest('[data-folder-id]');
    const noteItem = e.target.closest('[data-note-id]');
    if (folderRenameBtn) { e.stopPropagation(); renameFolder(userId, folderRenameBtn.getAttribute('data-folder-id')); return; }
    if (folderDeleteBtn) { e.stopPropagation(); deleteFolder(userId, folderDeleteBtn.getAttribute('data-folder-id')); return; }
    if (folderItem) { const fid = folderItem.getAttribute('data-folder-id'); _state.activeFolderId = _state.activeFolderId === fid ? null : fid; refreshLeftPanel(userId); return; }
    if (noteItem) selectNote(noteItem.getAttribute('data-note-id'), userId);
  });

  document.getElementById('notesPanelRight')?.addEventListener('click', (e) => {
    if (e.target.closest('#btnModeEdit')) { _state.editMode = 'edit'; refreshEditor(userId); }
    else if (e.target.closest('#btnModePreview')) { _state.editMode = 'preview'; refreshEditor(userId); }
    else if (e.target.closest('#btnModeAudit')) { _state.editMode = 'audit'; refreshEditor(userId); const note = _state.notes.find((n) => n.id === _state.activeNoteId); if (note) loadAuditPanel(note); }
    else if (e.target.closest('#btnPinNote')) togglePin(userId);
    else if (e.target.closest('#btnDeleteNote')) deleteActiveNote(userId);
    else if (e.target.closest('#btnExportNote')) exportNoteAsMd(userId);
    else if (e.target.closest('#btnShareNote')) { const note = _state.notes.find((n) => n.id === _state.activeNoteId); if (note) openShareModal(note, userId); }
    else if (e.target.closest('#btnCloseNote')) { _state.activeNoteId = null; refreshAll(userId); }
    else if (e.target.closest('#btnFullscreenNote') || (e.target.closest('button') && e.target.closest('button').id === 'btnFullscreenNote')) {
      const panel = document.getElementById('notesPanelRight');
      if (panel) {
        panel.classList.toggle('notes-mode-fullscreen');
        const icon = panel.classList.contains('notes-mode-fullscreen') ? 'minimize' : 'maximize';
        const btn = e.target.closest('#btnFullscreenNote') || e.target.closest('button');
        if (btn) btn.innerHTML = `<i data-lucide="${icon}" style="width:14px;height:14px"></i>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
    }
    else if (e.target.closest('#btnCopyNote') || (e.target.closest('button') && e.target.closest('button').id === 'btnCopyNote')) {
      const note = _state.notes.find((n) => n.id === _state.activeNoteId);
      if (note) navigator.clipboard.writeText(note.content).then(() => showToast('Markdown Copied!', 'success'));
    }
    else if (e.target.closest('[data-fmt]')) applyFormatting(e.target.closest('[data-fmt]').getAttribute('data-fmt'), userId);
    else if (e.target.closest('[data-color]')) setNoteColor(userId, e.target.closest('[data-color]').getAttribute('data-color'));
    else if (e.target.closest('.notes-tag-chip__remove')) removeTag(userId, e.target.closest('.notes-tag-chip__remove').getAttribute('data-tag'));
  });

  document.getElementById('notesPanelRight')?.addEventListener('change', (e) => { if (e.target.id === 'noteMoveFolder') moveNoteToFolder(userId, e.target.value || null); });
  document.getElementById('notesPanelRight')?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.target.id === 'noteContentTextarea') {
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); applyFormatting('bold', userId); }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); applyFormatting('italic', userId); }
      if (e.shiftKey && (e.key === 'x' || e.key === 'X')) { e.preventDefault(); applyFormatting('strikethrough', userId); }
    }
    if (e.target.id === 'noteTagInput' && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); const val = e.target.value.trim().replace(/,/g, ''); if (val) addTag(userId, val); }
  });
  document.getElementById('notesPanelRight')?.addEventListener('input', (e) => {
    if (e.target.id === 'noteTitleInput' || e.target.id === 'noteContentTextarea') {
      triggerAutosave(userId);
      if (e.target.id === 'noteContentTextarea') {
        const wcEl = document.getElementById('notesWordCount');
        if (wcEl) {
          const content = e.target.value;
          const words = content.trim().split(/\\s+/).filter(w => w.length > 0).length;
          const chars = content.length;
          wcEl.textContent = words + ' words, ' + chars + ' chars';
        }
      }
    }
  });

  document.getElementById('btnExportNotes')?.addEventListener('click', () => openExportModal(userId));
  document.getElementById('btnImportNotes')?.addEventListener('click', () => openImportModal(userId));

  document.getElementById('btnUploadMd')?.addEventListener('click', () => document.getElementById('notesUploadMdInput')?.click());
  document.getElementById('notesUploadMdInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'md' && ext !== 'txt') { showToast('Hanya file .md dan .txt yang didukung.', 'error'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onerror = () => showToast('Gagal membaca file.', 'error');
    reader.onload = async (ev) => {
      try {
        const content = ev.target.result;
        const titleFromFile = file.name.replace(/\\.(md|txt)$/i, '');
        const allNotes = await getAll('notes');
        const id = generateSequentialId(ID_PREFIX.NOTE, allNotes);
        const now = nowISO();
        const note = { id, user_id: userId, owner_id: userId, title: titleFromFile, content, folder_id: _state.activeFolderId || null, pinned: false, color: null, tags: [], shared_with: [], share_permission: 'view', created_at: now, updated_at: now };
        await saveNote(note);
        _state.activeNoteId = id; _state.editMode = 'edit';
        await logNoteAudit(id, 'note_created', 'upload .md');
        refreshAll(userId);
        showToast('File berhasil diupload sebagai note baru.', 'success');
      } catch { showToast('Gagal membaca file.', 'error'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  const drawerToggle = document.getElementById('notesDrawerToggle');
  const panelLeft = document.getElementById('notesPanelLeft');
  const overlay = document.getElementById('notesPanelLeftOverlay');
  drawerToggle?.addEventListener('click', () => { panelLeft?.classList.toggle('is-open'); overlay?.classList.toggle('is-open'); });
  overlay?.addEventListener('click', () => { panelLeft?.classList.remove('is-open'); overlay?.classList.remove('is-open'); });
}

// ============================================================
// NOTE ACTIONS
// ============================================================

async function createNewNote(userId) {
  const allNotes = await getAll('notes');
  const id = generateSequentialId(ID_PREFIX.NOTE, allNotes);
  const now = nowISO();
  const note = { id, user_id: userId, owner_id: userId, title: '', content: '', folder_id: _state.activeFolderId || null, pinned: false, color: null, tags: [], shared_with: [], share_permission: 'view', created_at: now, updated_at: now };
  await saveNote(note);
  _state.activeNoteId = id; _state.editMode = 'edit';
  await logNoteAudit(id, 'note_created');
  refreshAll(userId);
  setTimeout(() => document.getElementById('noteTitleInput')?.focus(), 50);
}

async function selectNote(noteId, userId) {
  _state.activeNoteId = noteId;
  _state.editMode = 'edit';
  refreshEditor(userId);
  refreshLeftPanel(userId);
  document.getElementById('notesPanelLeft')?.classList.remove('is-open');
  document.getElementById('notesPanelLeftOverlay')?.classList.remove('is-open');
  const note = _state.notes.find((n) => n.id === noteId);
  if (note) {
    const access = getNoteAccess(note, userId);
    if (access !== 'owner' && access !== null) await logNoteAudit(noteId, 'note_viewed_shared');
  }
}

function triggerAutosave(userId) {
  if (_state.saveTimer) clearTimeout(_state.saveTimer);
  const indicator = document.getElementById('noteSaveIndicator');
  if (indicator) { indicator.textContent = 'Menyimpan…'; indicator.classList.add('is-visible'); indicator.classList.remove('is-saved'); }
  _state.saveTimer = setTimeout(() => persistCurrentNote(userId), 800);
}

function computeNoteDiff(oldStr, newStr) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const dp = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0));
  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  let i = oldLines.length, j = newLines.length;
  const diff = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) { i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { diff.unshift({ type: 'added', text: newLines[j - 1] }); j--; }
    else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) { diff.unshift({ type: 'removed', text: oldLines[i - 1] }); i--; }
  }
  return diff.length > 0 ? diff : null;
}

async function persistCurrentNote(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;
  const access = getNoteAccess(note, userId);
  if (access === 'view') return;
  const titleInput = document.getElementById('noteTitleInput');
  const contentTextarea = document.getElementById('noteContentTextarea');

  const oldContent = note.content || '';
  const newContent = contentTextarea ? contentTextarea.value : oldContent;
  const oldTitle = note.title || '';
  const newTitle = titleInput ? titleInput.value : oldTitle;

  const contentChanged = oldContent !== newContent;
  const titleChanged = oldTitle !== newTitle;

  if (!contentChanged && !titleChanged) return;

  let diff = null;
  if (contentChanged) diff = computeNoteDiff(oldContent, newContent);

  note.title = newTitle;
  note.content = newContent;
  note.updated_at = nowISO();
  await saveNote(note);

  if (access === 'owner') await logNoteAudit(note.id, 'note_edited', null, diff);
  else if (access === 'edit') await logNoteAudit(note.id, 'note_edited_shared', null, diff);

  const indicator = document.getElementById('noteSaveIndicator');
  if (indicator) {
    indicator.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;display:inline-block;vertical-align:middle"></i> Tersimpan';
    indicator.classList.add('is-visible', 'is-saved');
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => indicator.classList.remove('is-visible', 'is-saved'), 2000);
  }
  const listItem = document.querySelector(`[data-note-id="${note.id}"] .notes-list-item__title`);
  if (listItem) {
    const colorDot = note.color && note.color !== '#ffffff' ? `<span class="notes-list-item__color-dot" style="background:${note.color}"></span>` : '';
    listItem.innerHTML = colorDot + sanitize(getNoteTitle(note));
  }
}

async function togglePin(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || getNoteAccess(note, userId) !== 'owner') return;
  note.pinned = !note.pinned; note.updated_at = nowISO();
  await saveNote(note);
  await logNoteAudit(note.id, note.pinned ? 'note_pinned' : 'note_unpinned');
  refreshAll(userId);
}

async function setNoteColor(userId, color) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || getNoteAccess(note, userId) !== 'owner') return;
  note.color = color === '#ffffff' ? null : color; note.updated_at = nowISO();
  await saveNote(note);
  await logNoteAudit(note.id, 'note_color_changed', color);
  refreshAll(userId);
}

async function addTag(userId, tag) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || getNoteAccess(note, userId) !== 'owner') return;
  if (!note.tags) note.tags = [];
  if (!note.tags.includes(tag)) {
    note.tags.push(tag); note.updated_at = nowISO();
    await saveNote(note);
    await logNoteAudit(note.id, 'note_tag_added', tag);
    refreshBottomToolbar(note, userId);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  const tagInput = document.getElementById('noteTagInput');
  if (tagInput) tagInput.value = '';
}

async function removeTag(userId, tag) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || !note.tags || getNoteAccess(note, userId) !== 'owner') return;
  note.tags = note.tags.filter((t) => t !== tag); note.updated_at = nowISO();
  await saveNote(note);
  await logNoteAudit(note.id, 'note_tag_removed', tag);
  refreshBottomToolbar(note, userId);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteActiveNote(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || getNoteAccess(note, userId) !== 'owner') return;
  showConfirm({
    title: 'Hapus Catatan',
    message: `Yakin ingin menghapus catatan "${getNoteTitle(note)}" ? Tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: 'Hapus', confirmVariant: 'danger',
    onConfirm: async () => {
      await logNoteAudit(note.id, 'note_deleted');
      await remove('notes', note.id);
      _state.notes = _state.notes.filter((n) => n.id !== note.id);
      _state.activeNoteId = null;
      refreshAll(userId);
      showToast('Catatan dihapus.', 'success');
    },
  });
}

async function exportNoteAsMd(userId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note) return;
  const title = getNoteTitle(note);
  const content = `# ${title}\n\n${note.content || ''}`;
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
  a.click(); URL.revokeObjectURL(url);
  await logNoteAudit(note.id, 'note_exported');
  showToast('Catatan berhasil diekspor.', 'success');
}

// ============================================================
// FORMATTING TOOLBAR ACTIONS
// ============================================================

function applyFormatting(fmt, userId) {
  const textarea = document.getElementById('noteContentTextarea');
  if (!textarea) return;
  const start = textarea.selectionStart, end = textarea.selectionEnd, value = textarea.value;
  const selectedText = value.slice(start, end);

  if (fmt === 'timestamp') {
    const dt = new Date().toLocaleString('id-ID'); // Format: DD/MM/YYYY, HH.mm.ss
    const insert = `\n> *Inserted at: ${dt}*\n`;
    textarea.value = value.slice(0, start) + insert + value.slice(end);
    textarea.selectionStart = start + insert.length; textarea.selectionEnd = start + insert.length;
  } else if (fmt === 'bold' || fmt === 'italic' || fmt === 'strikethrough') {
    const marker = fmt === 'bold' ? '**' : fmt === 'italic' ? '*' : '~~';
    const placeholder = fmt === 'bold' ? 'teks bold' : fmt === 'italic' ? 'teks italic' : 'dicoret';
    if (selectedText) {
      if (selectedText.startsWith(marker) && selectedText.endsWith(marker)) {
        const inner = selectedText.slice(marker.length, -marker.length);
        textarea.value = value.slice(0, start) + inner + value.slice(end);
        textarea.selectionStart = start; textarea.selectionEnd = start + inner.length;
      } else {
        const wrapped = marker + selectedText + marker;
        textarea.value = value.slice(0, start) + wrapped + value.slice(end);
        textarea.selectionStart = start + marker.length; textarea.selectionEnd = start + marker.length + selectedText.length;
      }
    } else {
      const insert = marker + placeholder + marker;
      textarea.value = value.slice(0, start) + insert + value.slice(end);
      textarea.selectionStart = start + marker.length; textarea.selectionEnd = start + marker.length + placeholder.length;
    }
  } else if (['h1', 'h2', 'h3', 'ul', 'ol'].includes(fmt)) {
    const prefix = fmt === 'h1' ? '# ' : fmt === 'h2' ? '## ' : fmt === 'h3' ? '### ' : fmt === 'ul' ? '- ' : '1. ';

    // Find absolute boundaries of the line the cursor is currently on
    const beforeStart = value.slice(0, start);
    let lineStart = beforeStart.lastIndexOf('\n');
    lineStart = lineStart === -1 ? 0 : lineStart + 1;

    const afterStart = value.slice(start);
    let lineEnd = afterStart.indexOf('\n');
    lineEnd = lineEnd === -1 ? value.length : start + lineEnd;

    const lineContent = value.slice(lineStart, lineEnd);

    // Strip existing prefixes so headers/lists don't stack up
    const stripped = lineContent.replace(/^(#{1,3}\s+|- \s+|\d+\.\s+)/, '');
    const isAlreadyFormatted = lineContent.startsWith(prefix);

    const newLine = isAlreadyFormatted ? stripped : prefix + stripped;
    textarea.value = value.slice(0, lineStart) + newLine + value.slice(lineEnd);

    textarea.selectionStart = lineStart + newLine.length;
    textarea.selectionEnd = lineStart + newLine.length;
  }
  triggerAutosave(userId);
}

// ============================================================
// MOVE TO FOLDER
// ============================================================

async function moveNoteToFolder(userId, folderId) {
  const note = _state.notes.find((n) => n.id === _state.activeNoteId);
  if (!note || getNoteAccess(note, userId) !== 'owner') return;
  const titleInput = document.getElementById('noteTitleInput');
  const contentTextarea = document.getElementById('noteContentTextarea');
  if (titleInput) note.title = titleInput.value;
  if (contentTextarea) note.content = contentTextarea.value;
  note.folder_id = folderId || null; note.updated_at = nowISO();
  await saveNote(note);
  const folderName = folderId ? (_state.folders.find((f) => f.id === folderId)?.name || 'folder') : 'All Notes';
  await logNoteAudit(note.id, 'note_moved', folderName);
  showToast(folderId ? `Note dipindah ke "${folderName}".` : 'Note dipindah ke All Notes.', 'success');
  refreshLeftPanel(userId);
  refreshBottomToolbar(note, userId);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ============================================================
// FOLDER ACTIONS
// ============================================================

function promptNewFolder(userId) {
  const folderList = document.getElementById('notesFolderList');
  if (!folderList) return;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'notes-folder-input'; inp.placeholder = 'Nama folder…';
  folderList.prepend(inp); inp.focus();
  const finish = async () => {
    const name = inp.value.trim(); inp.remove(); if (!name) return;
    const id = generateSequentialId(ID_PREFIX.NOTE_FOLDER, _state.folders);
    const folder = { id, user_id: userId, name, created_at: nowISO() };
    _state.folders.push(folder); saveFolders(userId, _state.folders); refreshLeftPanel(userId);
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') inp.remove(); });
  inp.addEventListener('blur', finish);
}

function renameFolder(userId, folderId) {
  const folder = _state.folders.find((f) => f.id === folderId); if (!folder) return;
  const folderEl = document.querySelector(`.notes-folder-item[data-folder-id="${folderId}"] .notes-folder-item__name`); if (!folderEl) return;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'notes-folder-input'; inp.value = folder.name;
  folderEl.replaceWith(inp); inp.focus(); inp.select();
  const finish = () => { const name = inp.value.trim(); if (name) { folder.name = name; saveFolders(userId, _state.folders); } refreshLeftPanel(userId); };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') refreshLeftPanel(userId); });
  inp.addEventListener('blur', finish);
}

async function deleteFolder(userId, folderId) {
  const folder = _state.folders.find((f) => f.id === folderId); if (!folder) return;
  showConfirm({
    title: 'Hapus Folder',
    message: `Yakin ingin menghapus folder "${folder.name}" ? Semua catatan di dalamnya akan dipindah ke All Notes.`,
    confirmLabel: 'Hapus', confirmVariant: 'danger',
    onConfirm: async () => {
      const notesInFolder = _state.notes.filter((n) => n.folder_id === folderId);
      for (const n of notesInFolder) { n.folder_id = null; n.updated_at = nowISO(); await saveNote(n); }
      _state.folders = _state.folders.filter((f) => f.id !== folderId);
      saveFolders(userId, _state.folders);
      if (_state.activeFolderId === folderId) _state.activeFolderId = null;
      refreshLeftPanel(userId);
      showToast('Folder dihapus. Catatan dipindah ke All Notes.', 'success');
    },
  });
}

// ============================================================
// IMPORT / EXPORT MODALS
// ============================================================

function openExportModal(userId) {
  const today = new Date().toISOString().slice(0, 10);
  openModal({
    title: 'Export Notes',
    body: `<div style="padding:0.25rem 0"><p style="font-size:0.875rem;color:var(--color-text-secondary);margin:0 0 0.75rem">Pilih format ekspor untuk semua catatan kamu:</p><div class="notes-export-options"><button class="notes-export-option-btn" id="btnExportJSON"><i data-lucide="file-json" class="notes-export-option-btn__icon" style="width:22px;height:22px"></i><div><div class="notes-export-option-btn__label">Export ke JSON</div><div class="notes-export-option-btn__desc">Backup lengkap dengan semua data — bisa diimport kembali</div></div></button><button class="notes-export-option-btn" id="btnExportMD"><i data-lucide="file-text" class="notes-export-option-btn__icon" style="width:22px;height:22px"></i><div><div class="notes-export-option-btn__label">Export ke Markdown</div><div class="notes-export-option-btn__desc">Semua catatan digabung dalam satu file .md</div></div></button></div></div>`,
    size: 'sm',
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
    const userNotes = _state.notes.filter((n) => n.user_id === userId);
    const data = { exported_at: nowISO(), user_id: userId, notes: userNotes, folders: _state.folders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `trackly-notes-export-${today}.json`; a.click(); URL.revokeObjectURL(url);
    closeModal(); showToast('Notes berhasil diekspor ke JSON.', 'success');
  });
  document.getElementById('btnExportMD')?.addEventListener('click', () => {
    const userNotes = _state.notes.filter((n) => n.user_id === userId);
    const lines = userNotes.map((n) => `# ${getNoteTitle(n)}\n\n${n.content || ''}\n\n---`).join('\n\n');
    const blob = new Blob([lines], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `trackly-notes-${today}.md`; a.click(); URL.revokeObjectURL(url);
    closeModal(); showToast('Notes berhasil diekspor ke Markdown.', 'success');
  });
}

function openImportModal(userId) {
  openModal({
    title: 'Import Notes',
    body: `<div class="notes-import-area"><p class="notes-import-label">Import file JSON yang sebelumnya diekspor dari Personal Notes. Catatan dengan ID yang sama akan di-skip.</p><input type="file" id="notesImportFileInput" accept=".json" class="btn btn--ghost btn--sm" style="cursor:pointer"><p class="notes-import-hint">Format: JSON dengan struktur <code>{ notes: [...], folders: [...] }</code></p></div>`,
    size: 'sm',
  });
  document.getElementById('notesImportFileInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let importedCount = 0;
      const existingIds = new Set(_state.notes.map((n) => n.id));
      for (const n of (data.notes || [])) {
        if (!existingIds.has(n.id)) {
          n.user_id = userId; n.owner_id = n.owner_id || userId;
          if (!Array.isArray(n.shared_with)) n.shared_with = [];
          if (!n.share_permission) n.share_permission = 'view';
          await add('notes', n); _state.notes.push(n); existingIds.add(n.id); importedCount++;
        }
      }
      const existingFolderIds = new Set(_state.folders.map((f) => f.id));
      for (const f of (data.folders || [])) { if (!existingFolderIds.has(f.id)) { f.user_id = userId; _state.folders.push(f); existingFolderIds.add(f.id); } }
      saveFolders(userId, _state.folders);
      closeModal(); showToast(`${importedCount} catatan berhasil diimpor.`, 'success'); refreshAll(userId);
    } catch { showToast('Gagal mengimpor: format file tidak valid.', 'error'); }
  });
}

// ============================================================
// REFRESH HELPERS
// ============================================================

function refreshLeftPanel(userId) {
  const resolvedUserId = userId || getSession()?.userId; if (!resolvedUserId) return;
  const area = document.getElementById('notesListArea'); if (!area) return;
  area.innerHTML = renderLeftPanel(resolvedUserId);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('btnNewFolder')?.addEventListener('click', () => promptNewFolder(resolvedUserId));
  document.getElementById('btnFolderBack')?.addEventListener('click', () => { _state.activeFolderId = null; refreshLeftPanel(resolvedUserId); });
}

function refreshEditor(userId) {
  const resolvedUserId = userId || getSession()?.userId; if (!resolvedUserId) return;
  const panel = document.getElementById('notesPanelRight'); if (!panel) return;
  const note = _state.notes.find((n) => n.id === _state.activeNoteId) || null;
  panel.innerHTML = renderEditor(note, resolvedUserId);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  document.getElementById('notesPanelRight')?.addEventListener('input', (e) => { if (e.target.id === 'noteTitleInput' || e.target.id === 'noteContentTextarea') triggerAutosave(resolvedUserId); });
  document.getElementById('btnNewNoteEmpty')?.addEventListener('click', () => createNewNote(resolvedUserId));
  if (_state.editMode === 'audit' && note) loadAuditPanel(note);
}

function refreshBottomToolbar(note, userId) {
  const resolvedUserId = userId || getSession()?.userId; if (!resolvedUserId) return;
  const existing = document.querySelector('.notes-bottom-toolbar'); if (!existing) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderBottomToolbar(note, resolvedUserId);
  existing.replaceWith(tmp.firstElementChild);
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function refreshAll(userId) { refreshLeftPanel(userId); refreshEditor(userId); }

export default { render };
