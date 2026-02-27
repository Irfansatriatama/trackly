/**
 * TRACKLY — confirm.js
 * Confirmation dialog component. Replaces native browser confirm().
 * Phase 5: Full implementation.
 */

import { openModal, closeModal } from './modal.js';

/**
 * Show a confirmation dialog.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message  HTML allowed
 * @param {string} [options.confirmLabel]
 * @param {'danger'|'primary'|'warning'} [options.confirmVariant]
 * @param {Function} options.onConfirm  Called when confirmed
 * @param {Function} [options.onCancel]
 */
export function showConfirm({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
} = {}) {
  openModal({
    title,
    size: 'sm',
    body: `<p class="text-muted" style="line-height:1.6;">${message}</p>`,
    footer: `
      <button class="btn btn--secondary" id="confirmCancelBtn">Cancel</button>
      <button class="btn btn--${confirmVariant}" id="confirmOkBtn">${confirmLabel}</button>
    `,
    onClose: onCancel,
  });

  document.getElementById('confirmCancelBtn')?.addEventListener('click', () => {
    closeModal();
    if (typeof onCancel === 'function') onCancel();
  });

  document.getElementById('confirmOkBtn')?.addEventListener('click', async () => {
    closeModal();
    if (typeof onConfirm === 'function') await onConfirm();
  });
}

export default { showConfirm };
