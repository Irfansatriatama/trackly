/**
 * TRACKLY — modal.js
 * Reusable modal component. Opens a centered dialog with backdrop.
 * Phase 5: Full implementation.
 */

let _currentModal = null;

/**
 * Open a modal dialog.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.body   HTML string
 * @param {string} [options.footer]  HTML string for footer buttons
 * @param {'sm'|'md'|'lg'} [options.size]
 * @param {Function} [options.onClose]
 */
export function openModal({ title, body, footer = '', size = 'md', onClose } = {}) {
  closeModal(); // Close any existing modal

  const sizeClass = size === 'lg' ? 'modal--lg' : size === 'sm' ? 'modal--sm' : '';

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'modalBackdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', title);

  backdrop.innerHTML = `
    <div class="modal ${sizeClass}" id="modalDialog" role="document">
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close" id="modalCloseBtn" aria-label="Close dialog">
          <i data-lucide="x" aria-hidden="true"></i>
        </button>
      </div>
      <div class="modal__body" id="modalBody">
        ${body}
      </div>
      ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');

  _currentModal = { backdrop, onClose };

  // Initialize lucide icons inside modal
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Close on backdrop click (outside modal)
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Close on ESC
  const handleKeydown = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleKeydown);
  backdrop._handleKeydown = handleKeydown;

  // Close button
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);

  // Focus trap — focus first focusable element
  requestAnimationFrame(() => {
    const focusable = backdrop.querySelector('input, select, textarea, button, [tabindex]');
    if (focusable) focusable.focus();
  });
}

/**
 * Close the currently open modal.
 */
export function closeModal() {
  if (!_currentModal) return;
  const { backdrop, onClose } = _currentModal;

  if (backdrop._handleKeydown) {
    document.removeEventListener('keydown', backdrop._handleKeydown);
  }

  backdrop.classList.add('is-closing');
  setTimeout(() => {
    backdrop.remove();
    document.body.classList.remove('modal-open');
    if (typeof onClose === 'function') onClose();
  }, 150);

  _currentModal = null;
}

export default { openModal, closeModal };
