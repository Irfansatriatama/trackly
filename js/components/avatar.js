/**
 * TRACKLY — avatar.js
 * Avatar component. Returns an HTML string for a user avatar.
 * Phase 5: Full implementation.
 */

import { getInitials } from '../core/utils.js';

/**
 * Render an avatar HTML string.
 * @param {Object} user  User object with avatar, full_name
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @returns {string}
 */
export function renderAvatar(user, size = 'md') {
  const sizeClass = `avatar--${size}`;
  if (user?.avatar) {
    return `<div class="avatar ${sizeClass}"><img src="${user.avatar}" alt="${user.full_name || ''}" /></div>`;
  }
  const initials = getInitials(user?.full_name || '?');
  const colorIndex = hashColor(user?.id || user?.full_name || '');
  return `<div class="avatar ${sizeClass}" style="background:${colorIndex};" aria-label="${user?.full_name || ''}">
    ${initials}
  </div>`;
}

const AVATAR_COLORS = [
  '#2563EB','#7C3AED','#16A34A','#D97706','#DC2626',
  '#0891B2','#DB2777','#65A30D','#9333EA','#EA580C',
];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default { renderAvatar };
