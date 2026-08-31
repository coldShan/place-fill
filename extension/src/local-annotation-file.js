(function (rootScope) {
  "use strict";

  const DB_NAME = "place-fill-local-annotation-file";
  const DB_VERSION = 1;
  const STORE_NAME = "handles";
  const HANDLE_KEY = "annotation-directory";
  const ENABLED_STORAGE_KEY = "ctdp.localAnnotationFileEnabled.v1";
  const OVERRIDES_STORAGE_KEY = "ctdp.smartFillOverrides.v1";
  const DIRECTORY_NAME = "place-fill-data";
  const FILE_NAME = "place-fill-user-data.json";
  const LEGACY_FILE_FORMAT = "ctdp-smart-fill-overrides";
  const backupApi = rootScope.ChromeTestDataStorageMirror || (typeof require === "function" ? require("./storage-mirror.js") : null);

  function getStorageArea(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
    try {
      return chrome.storage.local;
    } catch (_) {
      return null;
    }
  }

  function getIndexedDbFactory(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "indexedDB")) return env.indexedDB || null;
    try {
      return indexedDB;
    } catch (_) {
      return null;
    }
  }

  function storageGet(keys, env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.get !== "function") return Promise.resolve({});
    return new Promise(function (resolve, reject) {
      let settled = false;
      function done(result) {
        if (settled) return;
        settled = true;
        resolve(result && typeof result === "object" ? result : {});
      }
      function fail(error) {
        if (settled) return;
        settled = true;
        reject(error || new Error("读取扩展存储失败"));
      }
      try {
        const result = storageArea.get(keys, done);
        if (result && typeof result.then === "function") result.then(done, fail);
      } catch (error) {
        fail(error);
      }
    });
  }

  function storageSet(values, env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.set !== "function") return Promise.reject(new Error("扩展存储不可用"));
    return new Promise(function (resolve, reject) {
      let settled = false;
      function done() {
        if (settled) return;
        settled = true;
        resolve();
      }
      function fail(error) {
        if (settled) return;
        settled = true;
        reject(error || new Error("写入扩展存储失败"));
      }
      try {
        const result = storageArea.set(values, done);
        if (result && typeof result.then === "function") result.then(done, fail);
      } catch (error) {
        fail(error);
      }
    });
  }

  function storageRemove(keys, env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.remove !== "function" || !keys.length) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      try {
        const result = storageArea.remove(keys, resolve);
        if (result && typeof result.then === "function") result.then(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  function requestToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error || new Error("目录授权存储操作失败"));
      };
    });
  }

  function openDatabase(env) {
    const factory = getIndexedDbFactory(env);
    if (!factory || typeof factory.open !== "function") return Promise.reject(new Error("IndexedDB 不可用"));
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    return requestToPromise(request);
  }

  function runHandleOperation(mode, operation, env) {
    if (env && env.handleStore) return Promise.resolve(operation(env.handleStore));
    return openDatabase(env).then(function (db) {
      return Promise.resolve(operation(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME))).finally(function () {
        db.close();
      });
    });
  }

  function readDirectoryHandle(env) {
    return runHandleOperation("readonly", function (store) {
      if (typeof store.read === "function") return store.read();
      return requestToPromise(store.get(HANDLE_KEY));
    }, env);
  }

  function writeDirectoryHandle(handle, env) {
    return runHandleOperation("readwrite", function (store) {
      if (typeof store.write === "function") return store.write(handle);
      return requestToPromise(store.put(handle, HANDLE_KEY));
    }, env);
  }

  function removeDirectoryHandle(env) {
    return runHandleOperation("readwrite", function (store) {
      if (typeof store.remove === "function") return store.remove();
      return requestToPromise(store.delete(HANDLE_KEY));
    }, env);
  }

  function buildPayload(storedValues) {
    return backupApi.buildFullBackupPayload(storedValues || {});
  }

  function parsePayload(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (_) {
      throw new Error("本地数据文件不是有效 JSON");
    }
    if (
      payload &&
      payload.format === LEGACY_FILE_FORMAT &&
      payload.version === 1 &&
      payload.type === "raw" &&
      payload.overrides &&
      typeof payload.overrides === "object" &&
      !Array.isArray(payload.overrides)
    ) {
      payload = {
        exportedAt: new Date().toISOString(),
        format: backupApi.FULL_BACKUP_FORMAT,
        migratedFromLegacy: true,
        storage: { [OVERRIDES_STORAGE_KEY]: payload.overrides },
        version: backupApi.FULL_BACKUP_VERSION
      };
    }
    backupApi.assertFullBackupPayload(payload);
    return payload;
  }

  async function restorePayload(payload, env) {
    const changes = backupApi.getFullBackupStorageChanges(payload);
    await storageRemove(changes.removeKeys, env);
    await storageSet(changes.values, env);
  }

  async function writeStoredPayload(directoryHandle, env) {
    const stored = await storageGet(backupApi.STORAGE_KEYS, env);
    await writePayload(directoryHandle, buildPayload(stored));
  }

  async function getPermissionState(directoryHandle) {
    if (!directoryHandle || typeof directoryHandle.queryPermission !== "function") return "denied";
    return directoryHandle.queryPermission({ mode: "readwrite" });
  }

  async function writePayload(parentDirectoryHandle, payload) {
    const directoryHandle = await parentDirectoryHandle.getDirectoryHandle(DIRECTORY_NAME, { create: true });
    const fileHandle = await directoryHandle.getFileHandle(FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();
    } catch (error) {
      if (typeof writable.abort === "function") await writable.abort().catch(function () {});
      throw error;
    }
  }

  async function hasExistingFile(parentDirectoryHandle) {
    try {
      const directoryHandle = await parentDirectoryHandle.getDirectoryHandle(DIRECTORY_NAME);
      await directoryHandle.getFileHandle(FILE_NAME);
      return true;
    } catch (error) {
      if (error && error.name === "NotFoundError") return false;
      throw error;
    }
  }

  async function readExistingPayload(parentDirectoryHandle) {
    const directoryHandle = await parentDirectoryHandle.getDirectoryHandle(DIRECTORY_NAME);
    const fileHandle = await directoryHandle.getFileHandle(FILE_NAME);
    return parsePayload(await (await fileHandle.getFile()).text());
  }

  async function disable(env) {
    await storageSet({ [ENABLED_STORAGE_KEY]: false }, env);
    return { enabled: false };
  }

  async function enable(directoryHandle, env, preserveExisting) {
    try {
      if ((await getPermissionState(directoryHandle)) !== "granted") throw new Error("未获得目录读写权限");
      if (preserveExisting) {
        const payload = await readExistingPayload(directoryHandle);
        await restorePayload(payload, env);
        if (payload.migratedFromLegacy) await writeStoredPayload(directoryHandle, env);
      } else {
        await writeStoredPayload(directoryHandle, env);
      }
      await writeDirectoryHandle(directoryHandle, env);
      await storageSet({ [ENABLED_STORAGE_KEY]: true }, env);
      return { directoryName: DIRECTORY_NAME, enabled: true, fileName: FILE_NAME, source: preserveExisting ? "file" : "storage" };
    } catch (error) {
      await storageSet({ [ENABLED_STORAGE_KEY]: false }, env).catch(function () {});
      await removeDirectoryHandle(env).catch(function () {});
      throw error;
    }
  }

  async function getEnabled(env) {
    const stored = await storageGet(ENABLED_STORAGE_KEY, env);
    return stored[ENABLED_STORAGE_KEY] === true;
  }

  function getStoredDirectoryHandle(env) {
    return readDirectoryHandle(env).catch(function () { return null; });
  }

  async function resume(directoryHandle, env) {
    return enable(directoryHandle, env, await hasExistingFile(directoryHandle));
  }

  async function resumeStored(env) {
    const directoryHandle = await getStoredDirectoryHandle(env);
    if (!directoryHandle) return { enabled: false, needsSelection: true };
    const permissionState = await getPermissionState(directoryHandle);
    if (permissionState === "granted") return resume(directoryHandle, env);
    return {
      enabled: false,
      needsSelection: permissionState === "denied",
      permissionRequired: permissionState === "prompt",
      permissionState
    };
  }

  async function getState(env) {
    if (!(await getEnabled(env))) return { enabled: false, permissionState: "denied" };
    const directoryHandle = await getStoredDirectoryHandle(env);
    if (!directoryHandle) {
      await disable(env);
      return { enabled: false, permissionState: "denied" };
    }
    const permissionState = await getPermissionState(directoryHandle);
    if (permissionState === "denied") {
      await disable(env);
      return { enabled: false, permissionState };
    }
    return {
      enabled: true,
      permissionRequired: permissionState === "prompt",
      permissionState
    };
  }

  async function reauthorize(directoryHandle, env) {
    if (!directoryHandle || typeof directoryHandle.requestPermission !== "function") throw new Error("无法恢复目录授权");
    if ((await directoryHandle.requestPermission({ mode: "readwrite" })) !== "granted") {
      await disable(env);
      throw new Error("未获得目录读写权限");
    }
    return resume(directoryHandle, env);
  }

  async function readPreferredOverrides(env) {
    if (!(await getEnabled(env))) return { enabled: false, source: "storage" };
    const directoryHandle = await getStoredDirectoryHandle(env);
    const permissionState = await getPermissionState(directoryHandle);
    if (permissionState === "prompt") {
      return { enabled: true, permissionRequired: true, source: "storage" };
    }
    if (permissionState !== "granted") {
      await disable(env);
      return { enabled: false, permissionLost: true, source: "storage" };
    }

    try {
      const backupDirectoryHandle = await directoryHandle.getDirectoryHandle(DIRECTORY_NAME);
      const fileHandle = await backupDirectoryHandle.getFileHandle(FILE_NAME);
      const file = await fileHandle.getFile();
      const payload = parsePayload(await file.text());
      await restorePayload(payload, env);
      if (payload.migratedFromLegacy) await writeStoredPayload(directoryHandle, env);
      return { enabled: true, overrides: payload.storage[OVERRIDES_STORAGE_KEY] || {}, source: "file" };
    } catch (error) {
      if (error && error.name === "NotFoundError") {
        await writeStoredPayload(directoryHandle, env);
        return { enabled: true, source: "storage" };
      }
      await disable(env);
      throw error;
    }
  }

  async function syncFromStorage(env) {
    if (!(await getEnabled(env))) return { enabled: false, skipped: true };
    const directoryHandle = await getStoredDirectoryHandle(env);
    const permissionState = await getPermissionState(directoryHandle);
    if (permissionState === "prompt") {
      return { enabled: true, permissionRequired: true, skipped: true };
    }
    if (permissionState !== "granted") {
      await disable(env);
      return { enabled: false, permissionLost: true };
    }
    try {
      await writeStoredPayload(directoryHandle, env);
      return { directoryName: DIRECTORY_NAME, enabled: true, fileName: FILE_NAME };
    } catch (error) {
      await disable(env);
      throw error;
    }
  }

  const api = {
    DIRECTORY_NAME,
    ENABLED_STORAGE_KEY,
    FILE_NAME,
    OVERRIDES_STORAGE_KEY,
    STORAGE_KEYS: backupApi.STORAGE_KEYS,
    buildPayload,
    disable,
    enable,
    getEnabled,
    hasExistingFile,
    getState,
    getStoredDirectoryHandle,
    parsePayload,
    readPreferredOverrides,
    reauthorize,
    resume,
    resumeStored,
    syncFromStorage
  };

  rootScope.ChromeTestDataLocalAnnotationFile = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
