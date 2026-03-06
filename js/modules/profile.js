/**
 * TRACKLY — profile.js
 * Change Password modal for non-admin users.
 */

import { getById, update } from '../core/db.js';
import { hashPassword, verifyPassword, getSession } from '../core/auth.js';
import { nowISO } from '../core/utils.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

/**
 * Open the Change Password modal for the currently logged-in user.
 * Admin accounts are excluded; their passwords are managed via the Members page.
 */
export function openChangePasswordModal() {
    const session = getSession();
    if (!session) return;

    // Safety guard — admins use Members page
    if (session.role === 'admin') {
        showToast('Admin passwords are managed via the Members page.', 'info');
        return;
    }

    openModal({
        title: 'Change Password',
        size: 'sm',
        body: `
      <form id="changePassForm" novalidate>
        <div class="form-group">
          <label class="form-label" for="cpCurrentPass">Current Password <span class="required">*</span></label>
          <div class="form-input-wrapper">
            <input class="form-input" type="password" id="cpCurrentPass" placeholder="Enter current password" autocomplete="current-password" />
            <button type="button" class="form-input-reveal" id="toggleCpCurrent" aria-label="Toggle visibility">
              <i data-lucide="eye"></i>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="cpNewPass">New Password <span class="required">*</span></label>
          <div class="form-input-wrapper">
            <input class="form-input" type="password" id="cpNewPass" placeholder="Minimum 8 characters" autocomplete="new-password" />
            <button type="button" class="form-input-reveal" id="toggleCpNew" aria-label="Toggle visibility">
              <i data-lucide="eye"></i>
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="cpConfirmPass">Confirm New Password <span class="required">*</span></label>
          <input class="form-input" type="password" id="cpConfirmPass" placeholder="Re-enter new password" autocomplete="new-password" />
        </div>
      </form>`,
        footer: `
      <button class="btn btn--secondary" id="cpCancelBtn">Cancel</button>
      <button class="btn btn--primary" id="cpSaveBtn">
        <i data-lucide="key" aria-hidden="true"></i> Update Password
      </button>`,
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Password visibility toggles
    _bindToggle('toggleCpCurrent', 'cpCurrentPass');
    _bindToggle('toggleCpNew', 'cpNewPass');

    document.getElementById('cpCancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('cpSaveBtn')?.addEventListener('click', () => _handleSave(session));
    document.getElementById('changePassForm')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('cpSaveBtn')?.click(); }
    });
}

function _bindToggle(btnId, inputId) {
    document.getElementById(btnId)?.addEventListener('click', () => {
        const inp = document.getElementById(inputId);
        const icon = document.querySelector(`#${btnId} [data-lucide]`);
        if (!inp || !icon) return;
        const hidden = inp.type === 'password';
        inp.type = hidden ? 'text' : 'password';
        icon.setAttribute('data-lucide', hidden ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
}

function _setFieldError(fieldId, message) {
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

function _clearErrors() {
    document.querySelectorAll('#changePassForm .form-error').forEach(el => el.remove());
    document.querySelectorAll('#changePassForm .is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

async function _handleSave(session) {
    _clearErrors();

    const currentPass = document.getElementById('cpCurrentPass')?.value || '';
    const newPass = document.getElementById('cpNewPass')?.value || '';
    const confirmPass = document.getElementById('cpConfirmPass')?.value || '';

    let valid = true;

    if (!currentPass) { _setFieldError('cpCurrentPass', 'Current password is required.'); valid = false; }
    if (!newPass) { _setFieldError('cpNewPass', 'New password is required.'); valid = false; }
    else if (newPass.length < 8) { _setFieldError('cpNewPass', 'Password must be at least 8 characters.'); valid = false; }
    if (newPass && confirmPass !== newPass) { _setFieldError('cpConfirmPass', 'Passwords do not match.'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('cpSaveBtn');
    if (btn) btn.disabled = true;

    try {
        // Fetch the latest user record from Firestore
        const user = await getById('users', session.userId);
        if (!user) {
            showToast('User not found. Please log in again.', 'error');
            return;
        }

        // Verify current password
        const isCorrect = await verifyPassword(currentPass, user.password_hash);
        if (!isCorrect) {
            _setFieldError('cpCurrentPass', 'Incorrect current password.');
            return;
        }

        // Hash new password and save
        const newHash = await hashPassword(newPass);
        const updatedUser = { ...user, password_hash: newHash, updated_at: nowISO() };
        await update('users', updatedUser);

        showToast('Password updated successfully.', 'success');
        closeModal();
    } catch (err) {
        console.error('Change password error:', err);
        showToast('Failed to update password. Please try again.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

export default { openChangePasswordModal };
