(function (global) {
  "use strict";

  const DB_NAME = "masterflow-file-handles";
  const DB_VERSION = 1;
  const STORE_NAME = "handles";

  function isSupported() {
    return typeof global.indexedDB !== "undefined" && typeof global.showOpenFilePicker === "function";
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(mode, run) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = run(store);
      transaction.oncomplete = () => resolve(request ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // FileSystemFileHandle objects are structured-cloneable, so IndexedDB can store them
  // directly; only the handle (not file contents) persists, matching the private-data rule
  // that nothing here is written to disk outside the browser's own storage.
  async function save(key, handles) {
    if (!isSupported()) return false;
    await withStore("readwrite", (store) => store.put(handles, key));
    return true;
  }

  async function load(key) {
    if (!isSupported()) return [];
    const handles = await withStore("readonly", (store) => store.get(key));
    return Array.isArray(handles) ? handles : [];
  }

  async function clear(key) {
    if (!isSupported()) return false;
    await withStore("readwrite", (store) => store.delete(key));
    return true;
  }

  const api = Object.freeze({ isSupported, save, load, clear });

  global.MasterFlowFileHandleStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
