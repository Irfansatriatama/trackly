/**
 * TRACKLY — router.js
 * Hash-based SPA router. No server required.
 * Full route-to-module wiring implemented in Phase 2.
 */

/** @type {Map<string, Function>} */
const routes = new Map();

/** @type {Function|null} */
let notFoundHandler = null;

/**
 * Register a route handler.
 * Supports static segments and `:param` dynamic segments.
 * @param {string} pattern  e.g. '/dashboard', '/projects/:id/board'
 * @param {Function} handler  Called with (params: Object) when route matches
 */
export function registerRoute(pattern, handler) {
  routes.set(pattern, handler);
}

/**
 * Register a handler for unmatched routes.
 * @param {Function} handler
 */
export function setNotFound(handler) {
  notFoundHandler = handler;
}

/**
 * Parse a URL hash into a path string.
 * e.g. '#/projects/PRJ-0001/board' → '/projects/PRJ-0001/board'
 * @param {string} hash
 * @returns {string}
 */
function parsePath(hash) {
  const path = hash.replace(/^#/, '');
  return path || '/';
}

/**
 * Match a path against a pattern and extract params.
 * @param {string} pattern
 * @param {string} path
 * @returns {Object|null} Params if matched, null otherwise
 */
function matchRoute(pattern, path) {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = path.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) return null;

  const params = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const pSeg = patternSegments[i];
    const uSeg = pathSegments[i];

    if (pSeg.startsWith(':')) {
      params[pSeg.slice(1)] = decodeURIComponent(uSeg);
    } else if (pSeg !== uSeg) {
      return null;
    }
  }

  return params;
}

/**
 * Dispatch the current hash to the matching route handler.
 */
function dispatch() {
  const path = parsePath(window.location.hash);

  for (const [pattern, handler] of routes) {
    const params = matchRoute(pattern, path);
    if (params !== null) {
      handler(params);
      return;
    }
  }

  if (notFoundHandler) {
    notFoundHandler({ path });
  }
}

/**
 * Navigate to a route by updating the hash.
 * @param {string} path  e.g. '/dashboard', '/projects/PRJ-0001/board'
 */
export function navigate(path) {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

/**
 * Replace current history entry without pushing a new one.
 * @param {string} path
 */
export function replace(path) {
  const hash = path.startsWith('#') ? path : `#${path}`;
  window.history.replaceState(null, '', hash);
  dispatch();
}

/**
 * Get the current route path.
 * @returns {string}
 */
export function currentPath() {
  return parsePath(window.location.hash);
}

/**
 * Initialize the router — listen for hash changes and dispatch on load.
 */
export function initRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

export default { registerRoute, setNotFound, navigate, replace, currentPath, initRouter };
