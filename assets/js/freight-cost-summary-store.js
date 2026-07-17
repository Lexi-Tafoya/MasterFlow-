(function (global) {
  "use strict";

  const STORAGE_KEY = "masterflowFreightCostSummaryV1";

  function getStorage() {
    try {
      return global.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  function save(summary) {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(summary || {}));
    return true;
  }

  function load() {
    const storage = getStorage();
    if (!storage) return null;
    try {
      return JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function clear() {
    const storage = getStorage();
    if (!storage) return false;
    storage.removeItem(STORAGE_KEY);
    return true;
  }

  const api = Object.freeze({ STORAGE_KEY, save, load, clear });

  global.MasterFlowFreightCostSummaryStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
