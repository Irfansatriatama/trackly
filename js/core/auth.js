/**
 * TRACKLY — auth.js
 * Session management via localStorage.
 * Password hashing with Web Crypto API (SHA-256).
 * Full implementation in Phase 3.
 */

const SESSION_KEY = 'trackly_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours default
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hash a plaintext password using SHA-256 (Web Crypto API).
 * @param {string} password
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a plaintext password against a stored hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  const computed = await hashPassword(password);
  return computed === hash;
}

/**
 * Store a session in localStorage.
 * @param {Object} user  The authenticated user object
 * @param {boolean} remember  Extend expiry if true
 */
export function createSession(user, remember = false) {
  const duration = remember ? SESSION_REMEMBER_MS : SESSION_DURATION_MS;
  const session = {
    userId: user.id,
    role: user.role,
    fullName: user.full_name,
    createdAt: Date.now(),
    expiresAt: Date.now() + duration,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Retrieve and validate the current session.
 * Returns null if no session or session is expired.
 * @returns {Object|null}
 */
export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Check if the user has an active session.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Clear the current session (logout).
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Refresh the session expiry (call on user activity).
 */
export function refreshSession() {
  const session = getSession();
  if (!session) return;
  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export default { hashPassword, verifyPassword, createSession, getSession, isAuthenticated, clearSession, refreshSession };
