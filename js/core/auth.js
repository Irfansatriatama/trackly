/**
 * TRACKLY — auth.js
 * Session management via localStorage and Firebase Auth.
 */

import { app, auth } from './firebase-init.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const SESSION_KEY = 'trackly_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours default
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// The previous local hashing functions are no longer strictly needed for auth,
// but we keep the exported signatures dummy to prevent module loading errors if imported.
export async function hashPassword(password) {
  return "firebase-managed";
}

export async function verifyPassword(password, hash) {
  return true; // We use Firebase signInWithEmailAndPassword directly now
}

/**
 * Perform Firebase login
 */
export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Create user in Firebase Auth via REST API (Admin client-side bypass)
 */
export async function createFirebaseUser(email, password) {
  const apiKey = app.options.apiKey;
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: false })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Firebase Auth Error');
  return data;
}

/**
 * Perform Firebase logout
 */
export async function logoutFirebase() {
  return signOut(auth);
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

export default { hashPassword, verifyPassword, loginWithEmail, createFirebaseUser, logoutFirebase, createSession, getSession, isAuthenticated, clearSession, refreshSession };
