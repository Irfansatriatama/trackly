/**
 * TRACKLY — toast.js
 * Toast notification system. Top-right, stacked, auto-dismiss.
 * Phase 5: Full implementation.
 */

const TOAST_DURATION = 4000;
const ICON_MAP = {
  success: 'check-circle',
  error:   'alert-circle',
  warning: 'alert-triangle',
  info:    'info',
};

function getContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} [duration]
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const container = getContainer();
  const icon = ICON_MAP[type] || 'info';

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast__icon"><i data-lucide="${icon}" aria-hidden="true"></i></div>
    <div class="toast__content">
      <p class="toast__message">${message}</p>
    </div>
    <button class="toast__dismiss" aria-label="Dismiss notification">
      <i data-lucide="x" aria-hidden="true"></i>
    </button>
  `;

  container.appendChild(toast);

  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Dismiss on button click
  toast.querySelector('.toast__dismiss')?.addEventListener('click', () => dismissToast(toast));

  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
}

function dismissToast(toast) {
  if (toast._timer) clearTimeout(toast._timer);
  toast.classList.add('is-dismissing');
  setTimeout(() => toast.remove(), 300);
}

export default { showToast };
