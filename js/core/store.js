/**
 * TRACKLY — store.js
 * Reactive state management using a simple observer/pub-sub pattern.
 * No external dependencies.
 */

/**
 * Create a reactive store with a given initial state.
 * @param {Object} initialState
 * @returns {Object} Store API: { get, set, subscribe, unsubscribe }
 */
export function createStore(initialState = {}) {
  let state = { ...initialState };

  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  /**
   * Get the full state or a specific key.
   * @param {string} [key]
   * @returns {*}
   */
  function get(key) {
    if (key === undefined) return { ...state };
    return state[key];
  }

  /**
   * Update one or more state keys and notify subscribers.
   * @param {Object|string} keyOrObject  Key string or object of updates
   * @param {*} [value]  Value (only when keyOrObject is a string)
   */
  function set(keyOrObject, value) {
    if (typeof keyOrObject === 'string') {
      const prev = state[keyOrObject];
      state[keyOrObject] = value;
      notify(keyOrObject, value, prev);
    } else {
      for (const [k, v] of Object.entries(keyOrObject)) {
        const prev = state[k];
        state[k] = v;
        notify(k, v, prev);
      }
    }
  }

  /**
   * Notify all listeners for a given key.
   * @param {string} key
   * @param {*} newValue
   * @param {*} prevValue
   */
  function notify(key, newValue, prevValue) {
    if (newValue === prevValue) return;

    const keyListeners = listeners.get(key);
    if (keyListeners) {
      for (const cb of keyListeners) {
        cb(newValue, prevValue);
      }
    }

    const globalListeners = listeners.get('*');
    if (globalListeners) {
      for (const cb of globalListeners) {
        cb({ key, value: newValue, prev: prevValue });
      }
    }
  }

  /**
   * Subscribe to state changes for a key (or '*' for all).
   * @param {string} key
   * @param {Function} callback  (newValue, prevValue) => void
   * @returns {Function} Unsubscribe function
   */
  function subscribe(key, callback) {
    if (!listeners.has(key)) {
      listeners.set(key, new Set());
    }
    listeners.get(key).add(callback);

    return () => unsubscribe(key, callback);
  }

  /**
   * Unsubscribe a specific callback.
   * @param {string} key
   * @param {Function} callback
   */
  function unsubscribe(key, callback) {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      keyListeners.delete(callback);
    }
  }

  /**
   * Reset state to initial values.
   */
  function reset() {
    state = { ...initialState };
  }

  return { get, set, subscribe, unsubscribe, reset };
}

/**
 * Application-wide store — shared state across modules.
 */
export const appStore = createStore({
  currentUser:      null,    // Authenticated user object
  sidebarCollapsed: false,   // Sidebar UI state
  activeProjectId:  null,    // Currently viewed project
  theme:            'light', // 'light' | 'dark' (future)
});

export default { createStore, appStore };
