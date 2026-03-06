/**
 * TRACKLY — auth.js
 * Session management via localStorage and Custom DB Auth.
 */

import { app } from './firebase-init.js';

const SESSION_KEY = 'trackly_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours default
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Hash a password using SHA-256 for local database storage.
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

/**
 * Validate a user login using Username and Password against Firestore.
 * This replaces the old Firebase authentication flow.
 */
export async function loginWithUsername(username, password) {
  // Query is handled inside app.js. We just export this as a marker or helper if needed.
  // Actually, we'll implement the DB lookup in app.js. This function can remain as a deprecated wrapper 
  // or be completely removed. We'll leave it as a placeholder to avoid breaking any other modules trying to import it.
  throw new Error("Use app.js custom logic to login via DB directly.");
}

/**
 * Create user in Firebase Auth via REST API. Deprecated.
 */
export async function createFirebaseUser(email, password) {
  throw new Error("Firebase Auth is disabled in this version.");
}

/**
 * Perform Firebase logout. Deprecated.
 */
export async function logoutFirebase() {
  return Promise.resolve();
}

/**
 * Store a session in localStorage.
 * Keeps synchronous 'getSession()' working across all modules without refactoring them.
 * @param {Object} user  The authenticated user object (from Firestore users collection)
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
  logoutFirebase().catch(() => { });
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

export default { hashPassword, verifyPassword, loginWithUsername, createFirebaseUser, logoutFirebase, createSession, getSession, isAuthenticated, clearSession, refreshSession };
