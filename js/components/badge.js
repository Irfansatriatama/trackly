/**
 * TRACKLY — badge.js
 * Badge component. Returns an HTML string for a status/role badge.
 * Phase 5: Full implementation.
 */

/**
 * Render a badge HTML string.
 * @param {string} label
 * @param {string} variant  'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'neutral'
 * @returns {string} HTML string
 */
export function renderBadge(label, variant = 'neutral', onBanner = false) {
  const extra = onBanner ? ' badge--on-banner' : '';
  return `<span class="badge badge--${variant}${extra}">${label}</span>`;
}

export default { renderBadge };
