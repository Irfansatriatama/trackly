/**
 * TRACKLY — db.js (Firebase Firestore Version)
 * Replaces IndexedDB wrapper with Firebase Firestore SDK.
 * Export signatures mirror the previous local versions to avoid breaking module imports.
 */

import { db } from './firebase-init.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getCountFromServer,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

/**
 * Open/init database. Now just returns the firestore instance.
 * @returns {Promise<Object>}
 */
export async function openDB() {
  return Promise.resolve(db);
}

/**
 * Get all records from a store.
 * @param {string} storeName (aka collection name)
 * @returns {Promise<Array>}
 */
export async function getAll(storeName) {
  const querySnapshot = await getDocs(collection(db, storeName));
  return querySnapshot.docs.map(doc => doc.data());
}

/**
 * Get a single record by primary key.
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getById(storeName, id) {
  const docRef = doc(db, storeName, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : undefined;
}

/**
 * Get all records matching a specific index value.
 * @param {string} storeName
 * @param {string} indexName
 * @param {*} value
 * @returns {Promise<Array>}
 */
export async function getByIndex(storeName, indexName, value) {
  // In Trackly, 'shared_with' is an array with multiEntry: true locally. 
  // In Firestore, this requires 'array-contains'.
  const operator = indexName === 'shared_with' ? 'array-contains' : '==';
  const q = query(collection(db, storeName), where(indexName, operator, value));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data());
}

/**
 * Add a new record.
 * @param {string} storeName
 * @param {Object} record
 * @returns {Promise<string>} The generated key
 */
export async function add(storeName, record) {
  if (!record.id) {
    throw new Error('Record is missing an ID');
  }
  const docRef = doc(db, storeName, record.id);
  // setDoc without merge completely overwrites or creates, matching IDB store.add/put behavior
  await setDoc(docRef, record);
  return record.id;
}

/**
 * Update an existing record.
 * @param {string} storeName
 * @param {Object} record
 * @returns {Promise<string>}
 */
export async function update(storeName, record) {
  if (!record.id) {
    throw new Error('Record is missing an ID');
  }
  const docRef = doc(db, storeName, record.id);
  // Using setDoc directly simulates IDB's full-object replace.
  await setDoc(docRef, record);
  return record.id;
}

/**
 * Delete a record by primary key.
 * @param {string} storeName
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function remove(storeName, id) {
  const docRef = doc(db, storeName, id);
  await deleteDoc(docRef);
}

/**
 * Clear all records from a store.
 * Not recommended for large Firestore collections but functional for small test data and the "Reset data" settings.
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export async function clearStore(storeName) {
  try {
    const querySnapshot = await getDocs(collection(db, storeName));
    if (querySnapshot.empty) return;

    // Firestore batches have a 500 doc limit. We chunk by 400.
    const docs = querySnapshot.docs;
    const chunkMap = [];
    for (let i = 0; i < docs.length; i += 400) {
      chunkMap.push(docs.slice(i, i + 400));
    }

    for (const chunk of chunkMap) {
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error(`Failed to clear store ${storeName}:`, err);
    throw err;
  }
}

/**
 * Count records in a store.
 * @param {string} storeName
 * @returns {Promise<number>}
 */
export async function count(storeName) {
  const coll = collection(db, storeName);
  const snapshot = await getCountFromServer(coll);
  return snapshot.data().count;
}

export default { openDB, getAll, getById, getByIndex, add, update, remove, clearStore, count };
