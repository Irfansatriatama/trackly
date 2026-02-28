/**
 * TRACKLY — discussion.js
 * Phase 20: Project Discussion — per-project feed of updates, questions,
 * decisions, and blockers with inline reply threads and file attachments.
 */

import { getAll, getByIndex, add, update, remove, getById } from '../core/db.js';
import {
  generateSequentialId, nowISO, formatDate, formatRelativeDate,
  getInitials, sanitize, logActivity, ID_PREFIX
} from '../core/utils.js';
import { getSession } from '../core/auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';
import { showConfirm } from '../components/confirm.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _projectId = null;
let _project = null;
let _posts = [];
let _users = [];
let _session = null;
let _currentPage = 1;
const PAGE_SIZE = 20;

// ─── Constants ────────────────────────────────────────────────────────────────

const POST_TYPES = {
  update:   { label: 'Update',   color: 'success',   icon: 'refresh-cw' },
  question: { label: 'Question', color: 'info',       icon: 'help-circle' },
  decision: { label: 'Decision', color: 'secondary',  icon: 'check-square' },
  blocker:  { label: 'Blocker',  color: 'danger',     icon: 'alert-octagon' },
  general:  { label: 'General',  color: 'neutral',    icon: 'message-circle' },
};

const TYPE_CSS = {
  update:   'var(--color-success)',
  question: 'var(--color-info)',
  decision: 'var(--color-secondary)',
  blocker:  'var(--color-danger)',
  general:  'var(--color-text-muted)',
};

const TYPE_BG = {
  update:   '#dcfce7',
  question: '#e0f2fe',
  decision: '#ede9fe',
  blocker:  '#fee2e2',
  general:  '#f1f5f9',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAdminOrPM() {
  return _session && ['admin', 'pm'].includes(_session.role);
}

function isAdminOrPMRole(role) {
  return ['admin', 'pm'].includes(role);
}

function canDelete(post) {
  if (!_session) return false;
  if (isAdminOrPM()) return true;
  return post.author_id === _session.userId;
}

function canEdit(post) {
  if (!_session) return false;
  return post.author_id === _session.userId;
}

function getUserById(id) {
  return _users.find(u => u.id === id);
}

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
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<div class="markdown-body"><p>${html}</p></div>`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getMimeIcon(mime) {
  if (!mime) return 'file';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('pdf')) return 'file-text';
  if (mime.includes('word') || mime.includes('document')) return 'file-text';
  if (mime.includes('zip') || mime.includes('compressed')) return 'archive';
  return 'paperclip';
}

function renderAvatar(user, size = 32) {
  if (user?.avatar) {
    return `<img src="${sanitize(user.avatar)}" alt="${sanitize(user?.full_name || '')}" class="dsc-avatar" style="width:${size}px;height:${size}px;" />`;
  }
  const initials = getInitials(user?.full_name || '?');
  const colors = ['#2563EB','#7C3AED','#16A34A','#D97706','#DC2626','#0891B2'];
  const color = colors[(user?.full_name?.charCodeAt(0) || 0) % colors.length];
  return `<div class="dsc-avatar dsc-avatar--initials" style="width:${size}px;height:${size}px;background:${color};">${sanitize(initials)}</div>`;
}

// ─── Main Render ──────────────────────────────────────────────────────────────

export async function render(params = {}) {
  _projectId = params?.id || null;
  _session = getSession();
  const content = document.getElementById('main-content');
  if (!content) return;

  if (!_session) {
    content.innerHTML = '<div class="page-container page-enter"><div class="empty-state"><i data-lucide="lock" class="empty-state__icon"></i><p class="empty-state__title">Not authenticated</p></div></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  // Developer, admin, pm can all access
  if (!['admin', 'pm', 'developer'].includes(_session.role)) {
    content.innerHTML = '<div class="page-container page-enter"><div class="empty-state"><i data-lucide="lock" class="empty-state__icon"></i><p class="empty-state__title">Access Restricted</p><p class="empty-state__text">Discussion is only available to project members.</p></div></div>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  content.innerHTML = '<div class="page-container page-enter"><div class="app-loading"><div class="app-loading__spinner"></div><p class="app-loading__text">Loading discussion...</p></div></div>';

  try {
    const [allPosts, allUsers, allProjects] = await Promise.all([
      _projectId ? getByIndex('discussions', 'project_id', _projectId) : [],
      getAll('users'),
      getAll('projects'),
    ]);

    _posts = allPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    _users = allUsers;
    _project = allProjects.find(p => p.id === _projectId) || null;
    _currentPage = 1;

    content.innerHTML = _buildPageHTML();
    _bindEvents();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    content.innerHTML = `<div class="page-container page-enter"><div class="empty-state"><i data-lucide="alert-circle" class="empty-state__icon"></i><p class="empty-state__title">Failed to load discussion</p><p class="empty-state__text">${sanitize(String(err.message))}</p></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Page HTML ────────────────────────────────────────────────────────────────

function _buildPageHTML() {
  return `
    <div class="page-container page-enter">
      ${_renderProjectHeader()}
      <div class="page-header" style="margin-top:var(--space-4);">
        <div class="page-header__info">
          <h1 class="page-header__title">Discussion</h1>
          <p class="page-header__subtitle">${sanitize(_project.name)} &mdash; Project updates, questions, decisions, and blockers</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnNewPost">
            <i data-lucide="plus" aria-hidden="true"></i> New Post
          </button>
        </div>
      </div>
      <div class="dsc-feed-wrap" style="padding:var(--space-6);">
        ${_renderFeed()}
      </div>
    </div>`;
}

function _renderFeed() {
  const pinned = _posts.filter(p => p.pinned);
  const regular = _posts.filter(p => !p.pinned);
  const totalPages = Math.ceil(regular.length / PAGE_SIZE);
  const pageStart = (_currentPage - 1) * PAGE_SIZE;
  const pagePosts = regular.slice(pageStart, pageStart + PAGE_SIZE);

  let html = '';

  // Pinned section
  if (pinned.length > 0) {
    html += `
      <div class="dsc-pinned-section">
        <div class="dsc-section-label">
          <i data-lucide="pin" aria-hidden="true"></i>
          Pinned Posts
        </div>
        ${pinned.map(p => _renderPostCard(p, true)).join('')}
      </div>`;
  }

  // Regular feed
  if (pagePosts.length === 0 && pinned.length === 0) {
    html += `
      <div class="empty-state">
        <i data-lucide="message-circle" class="empty-state__icon" aria-hidden="true"></i>
        <p class="empty-state__title">No posts yet</p>
        <p class="empty-state__text">Start the conversation — post a project update, question, or decision.</p>
        <button class="btn btn--primary" id="btnNewPostEmpty">
          <i data-lucide="plus" aria-hidden="true"></i> Create First Post
        </button>
      </div>`;
  } else if (pagePosts.length > 0) {
    html += `<div class="dsc-regular-section">`;
    if (pinned.length > 0) {
      html += `<div class="dsc-section-label"><i data-lucide="list" aria-hidden="true"></i> All Posts</div>`;
    }
    html += pagePosts.map(p => _renderPostCard(p, false)).join('');
    html += `</div>`;

    // Pagination
    if (totalPages > 1) {
      html += `
        <div class="dsc-pagination">
          <button class="btn btn--outline btn--sm" id="btnDscPrev" ${_currentPage <= 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left" aria-hidden="true"></i> Previous
          </button>
          <span class="dsc-pagination__info">Page ${_currentPage} of ${totalPages}</span>
          <button class="btn btn--outline btn--sm" id="btnDscNext" ${_currentPage >= totalPages ? 'disabled' : ''}>
            Next <i data-lucide="chevron-right" aria-hidden="true"></i>
          </button>
        </div>`;
    }
  }

  return html;
}

function _renderPostCard(post, isPinned) {
  const author = getUserById(post.author_id);
  const typeInfo = POST_TYPES[post.type] || POST_TYPES.general;
  const typeColor = TYPE_CSS[post.type] || TYPE_CSS.general;
  const typeBg = TYPE_BG[post.type] || TYPE_BG.general;
  const replies = post.replies || [];
  const attachments = post.attachments || [];
  const canDel = canDelete(post);
  const canEd = canEdit(post);

  return `
    <div class="dsc-post-card card" data-post-id="${sanitize(post.id)}">
      <div class="dsc-post-card__header">
        <div class="dsc-post-card__meta">
          ${renderAvatar(author, 36)}
          <div class="dsc-post-card__author-info">
            <span class="dsc-post-card__author-name">${sanitize(author?.full_name || 'Unknown')}</span>
            <span class="dsc-post-card__time text-muted" title="${sanitize(formatDate(post.created_at, 'DD MMM YYYY HH:mm'))}">${sanitize(formatRelativeDate(post.created_at))}</span>
          </div>
        </div>
        <div class="dsc-post-card__actions-row">
          <span class="dsc-type-badge" style="background:${typeBg};color:${typeColor};">
            <i data-lucide="${typeInfo.icon}" aria-hidden="true"></i>
            ${sanitize(typeInfo.label)}
          </span>
          ${isPinned ? '<span class="dsc-pin-indicator"><i data-lucide="pin" aria-hidden="true"></i></span>' : ''}
          <div class="dsc-post-actions">
            ${isAdminOrPM() ? `
              <button class="btn btn--ghost btn--xs dsc-btn-pin" data-post-id="${sanitize(post.id)}" title="${post.pinned ? 'Unpin' : 'Pin'}" aria-label="${post.pinned ? 'Unpin post' : 'Pin post'}">
                <i data-lucide="${post.pinned ? 'pin-off' : 'pin'}" aria-hidden="true"></i>
              </button>` : ''}
            ${canEd ? `
              <button class="btn btn--ghost btn--xs dsc-btn-edit" data-post-id="${sanitize(post.id)}" title="Edit post" aria-label="Edit post">
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>` : ''}
            ${canDel ? `
              <button class="btn btn--ghost btn--xs dsc-btn-delete" data-post-id="${sanitize(post.id)}" title="Delete post" aria-label="Delete post" style="color:var(--color-danger);">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>` : ''}
          </div>
        </div>
      </div>

      ${post.title ? `<h3 class="dsc-post-card__title">${sanitize(post.title)}</h3>` : ''}

      <div class="dsc-post-card__content">
        ${renderMarkdown(post.content)}
      </div>

      ${attachments.length > 0 ? `
        <div class="dsc-attachments">
          ${attachments.map(att => _renderAttachment(att)).join('')}
        </div>` : ''}

      <div class="dsc-post-card__footer">
        <button class="btn btn--ghost btn--xs dsc-btn-reply-toggle" data-post-id="${sanitize(post.id)}" aria-expanded="false">
          <i data-lucide="message-square" aria-hidden="true"></i>
          ${replies.length > 0 ? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : 'Reply'}
        </button>
      </div>

      <div class="dsc-replies" id="replies-${sanitize(post.id)}" style="display:none;">
        ${_renderReplies(post)}
      </div>
    </div>`;
}

function _renderAttachment(att) {
  const icon = getMimeIcon(att.mime_type);
  return `
    <div class="dsc-attachment">
      <i data-lucide="${icon}" aria-hidden="true" class="dsc-attachment__icon"></i>
      <div class="dsc-attachment__info">
        <a href="${sanitize(att.data)}" download="${sanitize(att.name)}" class="dsc-attachment__name">${sanitize(att.name)}</a>
        <span class="dsc-attachment__size text-muted">${formatBytes(att.size || 0)}</span>
      </div>
    </div>`;
}

function _renderReplies(post) {
  const replies = post.replies || [];
  const SHOW_COUNT = 3;
  const showAll = (post._showAllReplies || replies.length <= SHOW_COUNT);
  const visible = showAll ? replies : replies.slice(-SHOW_COUNT);

  let html = '<div class="dsc-replies-inner">';

  if (!showAll && replies.length > SHOW_COUNT) {
    html += `
      <button class="btn btn--ghost btn--xs dsc-btn-show-all-replies" data-post-id="${sanitize(post.id)}" style="margin-bottom:var(--space-2);">
        Show all ${replies.length} replies
      </button>`;
  }

  html += visible.map(reply => {
    const replyAuthor = getUserById(reply.author_id);
    const canDelReply = isAdminOrPM() || (reply.author_id === _session?.userId);
    return `
      <div class="dsc-reply" data-reply-id="${sanitize(reply.id)}">
        ${renderAvatar(replyAuthor, 28)}
        <div class="dsc-reply__body">
          <div class="dsc-reply__header">
            <span class="dsc-reply__author">${sanitize(replyAuthor?.full_name || 'Unknown')}</span>
            <span class="dsc-reply__time text-muted" title="${sanitize(formatDate(reply.created_at, 'DD MMM YYYY HH:mm'))}">${sanitize(formatRelativeDate(reply.created_at))}</span>
            ${canDelReply ? `
              <button class="btn btn--ghost btn--xs dsc-btn-delete-reply" data-post-id="${sanitize(post.id)}" data-reply-id="${sanitize(reply.id)}" title="Delete reply" style="color:var(--color-danger);margin-left:auto;">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>` : ''}
          </div>
          <div class="dsc-reply__content">${renderMarkdown(reply.content)}</div>
        </div>
      </div>`;
  }).join('');

  // Reply input
  html += `
    <div class="dsc-reply-input-row">
      ${renderAvatar(getUserById(_session?.userId), 28)}
      <div class="dsc-reply-input-wrap">
        <textarea class="form-input dsc-reply-textarea" id="replyInput-${sanitize(post.id)}" placeholder="Write a reply..." rows="2" aria-label="Reply"></textarea>
        <button class="btn btn--primary btn--sm dsc-btn-submit-reply" data-post-id="${sanitize(post.id)}" style="margin-top:var(--space-2);">
          <i data-lucide="send" aria-hidden="true"></i> Reply
        </button>
      </div>
    </div>`;

  html += '</div>';
  return html;
}

// ─── Project Header / Subnav ─────────────────────────────────────────────────

function _renderProjectHeader() {
  if (!_project) return '';
  const coverColor = _project.cover_color || '#2563EB';
  const showMaintenance = ['running', 'maintenance'].includes(_project.phase) || ['maintenance'].includes(_project.status);
  const adminOrPm = isAdminOrPM();

  return `
    <div class="project-detail-banner" style="background:${sanitize(coverColor)};">
      <div class="project-detail-banner__content">
        <div class="project-detail-banner__breadcrumb">
          <a href="#/projects" class="project-breadcrumb-link">
            <i data-lucide="folder" aria-hidden="true"></i> Projects
          </a>
          <i data-lucide="chevron-right" aria-hidden="true"></i>
          <span>${sanitize(_project.name)}</span>
        </div>
        <h1 class="project-detail-banner__title">${sanitize(_project.name)}</h1>
      </div>
    </div>
    <div class="project-subnav">
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}">
        <i data-lucide="layout-dashboard" aria-hidden="true"></i> Overview
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/board">
        <i data-lucide="kanban" aria-hidden="true"></i> Board
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/backlog">
        <i data-lucide="list" aria-hidden="true"></i> Backlog
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/sprint">
        <i data-lucide="zap" aria-hidden="true"></i> Sprint
      </a>
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/gantt">
        <i data-lucide="gantt-chart" aria-hidden="true"></i> Gantt
      </a>
      <a class="project-subnav__link is-active" href="#/projects/${sanitize(_project.id)}/discussion">
        <i data-lucide="message-circle" aria-hidden="true"></i> Discussion
      </a>
      ${showMaintenance ? `
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/maintenance">
        <i data-lucide="wrench" aria-hidden="true"></i> Maintenance
      </a>` : ''}
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/reports">
        <i data-lucide="bar-chart-2" aria-hidden="true"></i> Reports
      </a>
      ${adminOrPm ? `
      <a class="project-subnav__link" href="#/projects/${sanitize(_project.id)}/log">
        <i data-lucide="clock" aria-hidden="true"></i> Log
      </a>` : ''}
    </div>`;
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function _bindEvents() {
  const content = document.getElementById('main-content');
  if (!content) return;

  // New post button
  content.querySelector('#btnNewPost')?.addEventListener('click', () => _openPostModal());
  content.querySelector('#btnNewPostEmpty')?.addEventListener('click', () => _openPostModal());

  // Pagination
  content.querySelector('#btnDscPrev')?.addEventListener('click', () => {
    if (_currentPage > 1) { _currentPage--; _refreshFeed(); }
  });
  content.querySelector('#btnDscNext')?.addEventListener('click', () => {
    const regular = _posts.filter(p => !p.pinned);
    if (_currentPage < Math.ceil(regular.length / PAGE_SIZE)) { _currentPage++; _refreshFeed(); }
  });

  // Delegate clicks on feed
  content.addEventListener('click', _handleFeedClick);
}

async function _handleFeedClick(e) {
  const target = e.target.closest('[data-post-id]');
  if (!target) return;
  const postId = target.getAttribute('data-post-id');
  const replyId = target.getAttribute('data-reply-id');

  if (target.classList.contains('dsc-btn-reply-toggle')) {
    _toggleReplies(postId);
    return;
  }
  if (target.classList.contains('dsc-btn-show-all-replies')) {
    _showAllReplies(postId);
    return;
  }
  if (target.classList.contains('dsc-btn-pin')) {
    await _togglePin(postId);
    return;
  }
  if (target.classList.contains('dsc-btn-edit')) {
    const post = _posts.find(p => p.id === postId);
    if (post) _openPostModal(post);
    return;
  }
  if (target.classList.contains('dsc-btn-delete')) {
    await _deletePost(postId);
    return;
  }
  if (target.classList.contains('dsc-btn-submit-reply')) {
    await _submitReply(postId);
    return;
  }
  if (target.classList.contains('dsc-btn-delete-reply')) {
    await _deleteReply(postId, replyId);
    return;
  }
}

function _toggleReplies(postId) {
  const repliesEl = document.getElementById(`replies-${postId}`);
  const btn = document.querySelector(`.dsc-btn-reply-toggle[data-post-id="${postId}"]`);
  if (!repliesEl) return;
  const isVisible = repliesEl.style.display !== 'none';
  repliesEl.style.display = isVisible ? 'none' : 'block';
  if (btn) btn.setAttribute('aria-expanded', String(!isVisible));
  if (!isVisible && typeof lucide !== 'undefined') lucide.createIcons();
}

function _showAllReplies(postId) {
  const post = _posts.find(p => p.id === postId);
  if (!post) return;
  post._showAllReplies = true;
  const repliesEl = document.getElementById(`replies-${postId}`);
  if (repliesEl) {
    repliesEl.innerHTML = _renderReplies(post);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

async function _togglePin(postId) {
  const post = _posts.find(p => p.id === postId);
  if (!post || !isAdminOrPM()) return;
  post.pinned = !post.pinned;
  post.updated_at = nowISO();
  try {
    await update('discussions', post);
    logActivity({
      project_id: _projectId,
      entity_type: 'discussion',
      entity_id: post.id,
      entity_name: post.title || post.content.substring(0, 40),
      action: post.pinned ? 'updated' : 'updated',
      metadata: { action: post.pinned ? 'pinned' : 'unpinned' },
    });
    showToast(post.pinned ? 'Post pinned.' : 'Post unpinned.', 'success');
    _refreshFeed();
  } catch (err) {
    showToast('Failed to update pin status.', 'error');
  }
}

async function _deletePost(postId) {
  const post = _posts.find(p => p.id === postId);
  if (!post || !canDelete(post)) return;
  const confirmed = await showConfirm({
    title: 'Delete Post',
    message: 'Are you sure you want to delete this post? This cannot be undone.',
    confirmLabel: 'Delete',
    confirmClass: 'btn--danger',
  });
  if (!confirmed) return;
  try {
    await remove('discussions', postId);
    logActivity({
      project_id: _projectId,
      entity_type: 'discussion',
      entity_id: post.id,
      entity_name: post.title || post.content.substring(0, 40),
      action: 'deleted',
    });
    _posts = _posts.filter(p => p.id !== postId);
    showToast('Post deleted.', 'success');
    _refreshFeed();
  } catch (err) {
    showToast('Failed to delete post.', 'error');
  }
}

async function _submitReply(postId) {
  const post = _posts.find(p => p.id === postId);
  if (!post) return;
  const textarea = document.getElementById(`replyInput-${postId}`);
  const content = textarea?.value?.trim();
  if (!content) { showToast('Reply cannot be empty.', 'warning'); return; }

  const reply = {
    id: `RPL-${Date.now()}`,
    author_id: _session.userId,
    content,
    created_at: nowISO(),
  };

  post.replies = [...(post.replies || []), reply];
  post.updated_at = nowISO();

  try {
    await update('discussions', post);
    logActivity({
      project_id: _projectId,
      entity_type: 'discussion',
      entity_id: post.id,
      entity_name: post.title || post.content.substring(0, 40),
      action: 'commented',
      metadata: { reply_excerpt: content.substring(0, 60) },
    });
    const repliesEl = document.getElementById(`replies-${postId}`);
    if (repliesEl) {
      repliesEl.innerHTML = _renderReplies(post);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  } catch (err) {
    showToast('Failed to post reply.', 'error');
  }
}

async function _deleteReply(postId, replyId) {
  const post = _posts.find(p => p.id === postId);
  if (!post) return;
  const reply = (post.replies || []).find(r => r.id === replyId);
  if (!reply) return;
  const canDel = isAdminOrPM() || reply.author_id === _session?.userId;
  if (!canDel) return;

  const confirmed = await showConfirm({
    title: 'Delete Reply',
    message: 'Are you sure you want to delete this reply?',
    confirmLabel: 'Delete',
    confirmClass: 'btn--danger',
  });
  if (!confirmed) return;

  post.replies = (post.replies || []).filter(r => r.id !== replyId);
  post.updated_at = nowISO();
  try {
    await update('discussions', post);
    const repliesEl = document.getElementById(`replies-${postId}`);
    if (repliesEl) {
      repliesEl.innerHTML = _renderReplies(post);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    showToast('Reply deleted.', 'success');
  } catch (err) {
    showToast('Failed to delete reply.', 'error');
  }
}

// ─── Feed Refresh ─────────────────────────────────────────────────────────────

function _refreshFeed() {
  const wrap = document.querySelector('.dsc-feed-wrap');
  if (wrap) {
    wrap.innerHTML = _renderFeed();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // Re-bind pagination
    const content = document.getElementById('main-content');
    content.querySelector('#btnDscPrev')?.addEventListener('click', () => {
      if (_currentPage > 1) { _currentPage--; _refreshFeed(); }
    });
    content.querySelector('#btnDscNext')?.addEventListener('click', () => {
      const regular = _posts.filter(p => !p.pinned);
      if (_currentPage < Math.ceil(regular.length / PAGE_SIZE)) { _currentPage++; _refreshFeed(); }
    });
    content.querySelector('#btnNewPostEmpty')?.addEventListener('click', () => _openPostModal());
  }
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

let _pendingAttachments = []; // { name, data, size, mime_type }

function _openPostModal(existingPost = null) {
  _pendingAttachments = existingPost ? [...(existingPost.attachments || [])] : [];
  const isEdit = !!existingPost;

  const typeOptions = Object.entries(POST_TYPES)
    .map(([val, info]) => `<option value="${val}" ${existingPost?.type === val ? 'selected' : ''}>${info.label}</option>`)
    .join('');

  const modalContent = `
    <div class="modal-header">
      <h2 class="modal-title">${isEdit ? 'Edit Post' : 'New Post'}</h2>
      <button class="modal-close" id="closePostModal" aria-label="Close"><i data-lucide="x" aria-hidden="true"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label" for="dscPostTitle">Title <span class="text-muted">(optional)</span></label>
        <input type="text" class="form-input" id="dscPostTitle" placeholder="Post title..." value="${sanitize(existingPost?.title || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="dscPostType">Type *</label>
        <select class="form-select" id="dscPostType">${typeOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label" for="dscPostContent">Content * <span class="text-muted">(Markdown supported)</span></label>
        <textarea class="form-input" id="dscPostContent" rows="8" placeholder="Write your post..." style="font-family:var(--font-mono,monospace);resize:vertical;">${sanitize(existingPost?.content || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Attachments <span class="text-muted">(max 5MB per file)</span></label>
        <div class="dsc-attachment-upload">
          <label for="dscFileInput" class="btn btn--outline btn--sm" style="cursor:pointer;">
            <i data-lucide="paperclip" aria-hidden="true"></i> Attach Files
          </label>
          <input type="file" id="dscFileInput" multiple style="display:none;" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
        </div>
        <div id="dscAttachmentList" class="dsc-attachment-list">
          ${_renderAttachmentList()}
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn--outline" id="cancelPostModal">Cancel</button>
      <button class="btn btn--primary" id="savePostModal">${isEdit ? 'Save Changes' : 'Post'}</button>
    </div>`;

  openModal({ body: modalContent, size: 'lg' });
  if (typeof lucide !== 'undefined') lucide.createIcons();

  document.getElementById('closePostModal')?.addEventListener('click', () => closeModal());
  document.getElementById('cancelPostModal')?.addEventListener('click', () => closeModal());
  document.getElementById('savePostModal')?.addEventListener('click', () => _savePost(existingPost));

  document.getElementById('dscFileInput')?.addEventListener('change', async (e) => {
    await _handleFileAttach(e.target.files);
    e.target.value = '';
  });
}

function _renderAttachmentList() {
  if (_pendingAttachments.length === 0) return '';
  return _pendingAttachments.map((att, idx) => `
    <div class="dsc-attachment dsc-attachment--pending" data-att-idx="${idx}">
      <i data-lucide="${getMimeIcon(att.mime_type)}" aria-hidden="true" class="dsc-attachment__icon"></i>
      <div class="dsc-attachment__info">
        <span class="dsc-attachment__name">${sanitize(att.name)}</span>
        <span class="dsc-attachment__size text-muted">${formatBytes(att.size || 0)}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--xs dsc-att-remove" data-att-idx="${idx}" title="Remove" style="color:var(--color-danger);">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </div>`).join('');
}

function _refreshAttachmentList() {
  const list = document.getElementById('dscAttachmentList');
  if (list) {
    list.innerHTML = _renderAttachmentList();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    list.querySelectorAll('.dsc-att-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-att-idx'));
        _pendingAttachments.splice(idx, 1);
        _refreshAttachmentList();
      });
    });
  }
}

async function _handleFileAttach(files) {
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      showToast(`"${file.name}" exceeds 5MB limit.`, 'warning');
      continue;
    }
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      _pendingAttachments.push({ name: file.name, data, size: file.size, mime_type: file.type });
    } catch {
      showToast(`Failed to read "${file.name}".`, 'error');
    }
  }
  _refreshAttachmentList();
}

async function _savePost(existingPost) {
  const title = document.getElementById('dscPostTitle')?.value?.trim() || '';
  const type = document.getElementById('dscPostType')?.value || 'general';
  const content = document.getElementById('dscPostContent')?.value?.trim();

  if (!content) {
    showToast('Content is required.', 'warning');
    return;
  }

  try {
    if (existingPost) {
      existingPost.title = title;
      existingPost.type = type;
      existingPost.content = content;
      existingPost.attachments = _pendingAttachments;
      existingPost.updated_at = nowISO();
      await update('discussions', existingPost);
      const idx = _posts.findIndex(p => p.id === existingPost.id);
      if (idx >= 0) _posts[idx] = existingPost;
      showToast('Post updated.', 'success');
    } else {
      const allPosts = await getAll('discussions');
      const id = generateSequentialId(ID_PREFIX.DISCUSSION, allPosts);
      const newPost = {
        id,
        project_id: _projectId,
        title,
        content,
        type,
        author_id: _session.userId,
        pinned: false,
        attachments: _pendingAttachments,
        replies: [],
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      await add('discussions', newPost);
      _posts.unshift(newPost);
      logActivity({
        project_id: _projectId,
        entity_type: 'discussion',
        entity_id: id,
        entity_name: title || content.substring(0, 40),
        action: 'created',
        metadata: { type },
      });
      showToast('Post created.', 'success');
    }

    closeModal();
    _currentPage = 1;
    _refreshFeed();
  } catch (err) {
    showToast('Failed to save post.', 'error');
  }
}

export default { render };
