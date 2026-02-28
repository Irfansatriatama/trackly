/**
 * TRACKLY — db.js
 * IndexedDB wrapper with CRUD helpers for all object stores.
 * All database operations must go through this module.
 * Full implementation in Phase 3.
 */

const DB_NAME = 'trackly_db';
const DB_VERSION = 3;

/** @type {IDBDatabase|null} */
let _db = null;

/**
 * Object store definitions: name → { keyPath, indexes }
 */
const STORES = {
  users:        { keyPath: 'id', indexes: [] },
  projects:     { keyPath: 'id', indexes: [] },
  tasks:        { keyPath: 'id', indexes: ['project_id', 'sprint_id'] },
  sprints:      { keyPath: 'id', indexes: ['project_id'] },
  clients:      { keyPath: 'id', indexes: [] },
  assets:       { keyPath: 'id', indexes: [] },
  maintenance:  { keyPath: 'id', indexes: ['project_id', 'status'] },
  invoices:     { keyPath: 'id', indexes: ['project_id'] },
  activity_log: { keyPath: 'id', indexes: ['project_id', 'user_id'] },
  meetings:     { keyPath: 'id', indexes: ['date'] },
  discussions:  { keyPath: 'id', indexes: ['project_id'] },
  settings:     { keyPath: 'key', indexes: [] },
};

/**
 * Open (or reuse) the IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      for (const [storeName, config] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
          for (const index of config.indexes) {
            store.createIndex(index, index, { unique: false });
          }
        }
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onerror = (event) => {
      reject(new Error(`IndexedDB open error: ${event.target.error}`));
    };
  });
}

/**
 * Get all records from a store.
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single record by primary key.
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getById(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all records matching a specific index value.
 * @param {string} storeName
 * @param {string} indexName
 * @param {*} value
 * @returns {Promise<Array>}
 */
export async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a new record.
 * @param {string} storeName
 * @param {Object} record
 * @returns {Promise<string>} The generated key
 */
export async function add(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing record (full replace).
 * @param {string} storeName
 * @param {Object} record
 * @returns {Promise<string>}
 */
export async function update(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a record by primary key.
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function remove(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all records from a store.
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count records in a store.
 * @param {string} storeName
 * @returns {Promise<number>}
 */
export async function count(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export default { openDB, getAll, getById, getByIndex, add, update, remove, clearStore, count };
