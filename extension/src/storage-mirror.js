(function (rootScope) {
  "use strict";

  const DB_NAME = "place-fill-storage-mirror";
  const DB_VERSION = 1;
  const STORE_NAME = "snapshots";
  const SNAPSHOT_KEY = "chrome.storage.local";
  const MIRROR_FORMAT = "place-fill-indexeddb-storage-mirror";
  const MIRROR_VERSION = 1;
  const STORAGE_KEYS = [
    "ctdp.favoriteProfiles.v1",
    "ctdp.generatedProfiles.v1",
    "ctdp.smartFillOverrides.v1",
    "ctdp.visibleFieldKeys.v1",
    "ctdp.siteFeatureEnabled.v1",
    "ctdp.focusStyle.v1",
    "ctdp.dockTop.v1"
  ];

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function getStorageArea(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_) {}
    return null;
  }

  function getIndexedDbFactory(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "indexedDB")) return env.indexedDB || null;
    try {
      if (typeof indexedDB !== "undefined") return indexedDB;
    } catch (_) {}
    return null;
  }

  function requestToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error || new Error("IndexedDB 操作失败"));
      };
    });
  }

  function openDatabase(env) {
    const indexedDbFactory = getIndexedDbFactory(env);
    if (!indexedDbFactory || typeof indexedDbFactory.open !== "function") return Promise.reject(new Error("IndexedDB 不可用"));
    const request = indexedDbFactory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames || !db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    return requestToPromise(request);
  }

  function runStoreOperation(mode, operation, env) {
    if (env && env.mirrorStore) return operation(env.mirrorStore);
    return openDatabase(env).then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = operation({
          read: function () {
            return requestToPromise(store.get(SNAPSHOT_KEY)).then(function (record) {
              return record ? record.snapshot : null;
            });
          },
          write: function (snapshot) {
            return requestToPromise(store.put({ id: SNAPSHOT_KEY, snapshot })).then(function () {
              return snapshot;
            });
          }
        });
        Promise.resolve(request).then(resolve, reject);
      }).finally(function () {
        if (db && typeof db.close === "function") db.close();
      });
    });
  }

  function readStorageValues(env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.get !== "function") return Promise.resolve({});
    return new Promise(function (resolve) {
      try {
        const maybePromise = storageArea.get(STORAGE_KEYS, function (result) {
          resolve(result && typeof result === "object" ? result : {});
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(function (result) {
            resolve(result && typeof result === "object" ? result : {});
          }, function () {
            resolve({});
          });
        }
      } catch (_) {
        resolve({});
      }
    });
  }

  function writeStorageValues(values, env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.set !== "function") return Promise.resolve(false);
    const nextValues = values && typeof values === "object" ? values : {};
    if (!Object.keys(nextValues).length) return Promise.resolve(false);
    return new Promise(function (resolve) {
      try {
        const maybePromise = storageArea.set(nextValues, function () {
          resolve(true);
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise.then(function () {
            resolve(true);
          }, function () {
            resolve(false);
          });
        }
      } catch (_) {
        resolve(false);
      }
    });
  }

  function buildSnapshot(storedValues) {
    const storage = {};
    STORAGE_KEYS.forEach(function (key) {
      storage[key] = hasOwn(storedValues, key) ? storedValues[key] : null;
    });
    return {
      format: MIRROR_FORMAT,
      storage,
      updatedAt: new Date().toISOString(),
      version: MIRROR_VERSION
    };
  }

  function isSupportedSnapshot(snapshot) {
    return !!(
      snapshot &&
      typeof snapshot === "object" &&
      !Array.isArray(snapshot) &&
      snapshot.format === MIRROR_FORMAT &&
      snapshot.version === MIRROR_VERSION &&
      snapshot.storage &&
      typeof snapshot.storage === "object" &&
      !Array.isArray(snapshot.storage)
    );
  }

  function hasStoredUserData(values) {
    return STORAGE_KEYS.some(function (key) {
      return hasOwn(values, key) && values[key] != null;
    });
  }

  function getRestorableValues(snapshot) {
    const values = {};
    if (!isSupportedSnapshot(snapshot)) return values;
    STORAGE_KEYS.forEach(function (key) {
      if (hasOwn(snapshot.storage, key) && snapshot.storage[key] != null) values[key] = snapshot.storage[key];
    });
    return values;
  }

  function readIndexedDbSnapshot(env) {
    return runStoreOperation("readonly", function (mirrorStore) {
      return mirrorStore.read();
    }, env);
  }

  async function mirrorStorageLocalToIndexedDb(env) {
    const storedValues = await readStorageValues(env);
    if (!hasStoredUserData(storedValues)) {
      const existingSnapshot = await readIndexedDbSnapshot(env).catch(function () {
        return null;
      });
      if (hasStoredUserData(existingSnapshot && existingSnapshot.storage)) return existingSnapshot;
    }
    const snapshot = buildSnapshot(storedValues);
    await runStoreOperation("readwrite", function (mirrorStore) {
      return mirrorStore.write(snapshot);
    }, env);
    return snapshot;
  }

  async function restoreStorageLocalFromIndexedDbIfEmpty(env) {
    const localValues = await readStorageValues(env);
    if (hasStoredUserData(localValues)) return { restored: false };
    const snapshot = await readIndexedDbSnapshot(env);
    const values = getRestorableValues(snapshot);
    if (!Object.keys(values).length) return { restored: false };
    const ok = await writeStorageValues(values, env);
    return { restored: ok };
  }

  const api = {
    DB_NAME,
    MIRROR_FORMAT,
    STORAGE_KEYS,
    mirrorStorageLocalToIndexedDb,
    readIndexedDbSnapshot,
    restoreStorageLocalFromIndexedDbIfEmpty
  };

  rootScope.ChromeTestDataStorageMirror = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
