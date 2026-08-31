import test from "node:test";
import assert from "node:assert/strict";
import localAnnotationPkg from "../extension/src/local-annotation-file.js";

const {
  DIRECTORY_NAME,
  ENABLED_STORAGE_KEY,
  FILE_NAME,
  buildPayload,
  disable,
  enable,
  getEnabled,
  getState,
  hasExistingFile,
  readPreferredOverrides,
  reauthorize,
  resumeStored,
  syncFromStorage
} = localAnnotationPkg;

function createStorageArea(initialState) {
  const state = { ...(initialState || {}) };
  return {
    state,
    get(keys, callback) {
      const requested = Array.isArray(keys) ? keys : [keys];
      const result = Object.fromEntries(requested.filter(function (key) {
        return Object.prototype.hasOwnProperty.call(state, key);
      }).map(function (key) {
        return [key, state[key]];
      }));
      if (callback) callback(result);
      return Promise.resolve(result);
    },
    set(values, callback) {
      Object.assign(state, values || {});
      if (callback) callback();
      return Promise.resolve();
    },
    remove(keys, callback) {
      (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
        delete state[key];
      });
      if (callback) callback();
      return Promise.resolve();
    }
  };
}

function createHandleStore() {
  let handle = null;
  return {
    read() {
      return handle;
    },
    remove() {
      handle = null;
    },
    write(nextHandle) {
      handle = nextHandle;
    }
  };
}

function createDirectoryHandle(initialText) {
  let text = initialText;
  let permission = "granted";
  let directoryExists = initialText !== undefined;
  const backupDirectoryHandle = {
    getFileHandle(name, options) {
      assert.equal(name, FILE_NAME);
      if (text === undefined && !(options && options.create)) {
        return Promise.reject(new DOMException("missing", "NotFoundError"));
      }
      if (text === undefined) text = "";
      return Promise.resolve({
        createWritable() {
          return Promise.resolve({
            abort() {
              return Promise.resolve();
            },
            close() {
              return Promise.resolve();
            },
            write(nextText) {
              text = String(nextText);
              return Promise.resolve();
            }
          });
        },
        getFile() {
          return Promise.resolve({
            text() {
              return Promise.resolve(text);
            }
          });
        }
      });
    }
  };
  return {
    clearFile() {
      text = undefined;
    },
    getText() {
      return text;
    },
    setPermission(nextPermission) {
      permission = nextPermission;
    },
    queryPermission() {
      return Promise.resolve(permission);
    },
    requestPermission() {
      permission = "granted";
      return Promise.resolve(permission);
    },
    getDirectoryHandle(name, options) {
      assert.equal(name, DIRECTORY_NAME);
      if (!directoryExists && !(options && options.create)) {
        return Promise.reject(new DOMException("missing", "NotFoundError"));
      }
      directoryExists = true;
      return Promise.resolve(backupDirectoryHandle);
    }
  };
}

function createEnv(overrides) {
  return {
    chromeMajorVersion: overrides && overrides.chromeMajorVersion || 122,
    handleStore: (overrides && overrides.handleStore) || createHandleStore(),
    storageArea: (overrides && overrides.storageArea) || createStorageArea()
  };
}

test("Chrome below 122 keeps directory backup disabled", async () => {
  const storageArea = createStorageArea({ [ENABLED_STORAGE_KEY]: true });
  const env = createEnv({ chromeMajorVersion: 109, storageArea });

  assert.deepEqual(await getState(env), {
    enabled: false,
    permissionState: "denied",
    supported: false
  });
  assert.equal(storageArea.state[ENABLED_STORAGE_KEY], false);
  assert.deepEqual(await readPreferredOverrides(env), {
    enabled: false,
    source: "storage",
    supported: false
  });
});

test("local data file stays disabled until authorization and first full backup write succeed", async () => {
  const storageArea = createStorageArea({
    "ctdp.favoriteProfiles.v1": [{ id: "favorite-1" }],
    "ctdp.smartFillOverrides.v1": { "https://example.com/app::top::name": "fullName" }
  });
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea });

  assert.equal(await getEnabled(env), false);
  await enable(directoryHandle, env);

  assert.equal(await getEnabled(env), true);
  assert.equal(storageArea.state[ENABLED_STORAGE_KEY], true);
  const payload = JSON.parse(directoryHandle.getText());
  assert.equal(payload.format, "place-fill-full-backup");
  assert.deepEqual(payload.storage["ctdp.favoriteProfiles.v1"], [{ id: "favorite-1" }]);
  assert.deepEqual(payload.storage["ctdp.smartFillOverrides.v1"], {
    "https://example.com/app::top::name": "fullName"
  });
});

test("existing local annotation file is detected before overwrite", async () => {
  assert.equal(await hasExistingFile(createDirectoryHandle()), false);
  assert.equal(await hasExistingFile(createDirectoryHandle(JSON.stringify(buildPayload({
    "ctdp.smartFillOverrides.v1": { local: "email" }
  })))), true);
});

test("legacy annotation-only files migrate without clearing other browser data", async () => {
  const directoryHandle = createDirectoryHandle(JSON.stringify({
    format: "ctdp-smart-fill-overrides",
    storageKey: "ctdp.smartFillOverrides.v1",
    type: "raw",
    version: 1,
    overrides: { legacy: "email" }
  }));
  const storageArea = createStorageArea({ "ctdp.favoriteProfiles.v1": [{ id: "favorite-1" }] });

  await enable(directoryHandle, createEnv({ storageArea }), true);

  assert.deepEqual(storageArea.state["ctdp.favoriteProfiles.v1"], [{ id: "favorite-1" }]);
  assert.deepEqual(storageArea.state["ctdp.smartFillOverrides.v1"], { legacy: "email" });
  assert.equal(JSON.parse(directoryHandle.getText()).format, "place-fill-full-backup");
});

test("canceling overwrite preserves and restores the existing full backup", async () => {
  const localPayload = JSON.stringify(buildPayload({
    "ctdp.favoriteProfiles.v1": [{ id: "local-favorite" }],
    "ctdp.smartFillOverrides.v1": { local: "companyName" }
  }));
  const directoryHandle = createDirectoryHandle(localPayload);
  const storageArea = createStorageArea({ "ctdp.smartFillOverrides.v1": { browser: "mobile" } });
  const env = createEnv({ storageArea });

  const result = await enable(directoryHandle, env, true);

  assert.equal(result.source, "file");
  assert.equal(directoryHandle.getText(), localPayload);
  assert.deepEqual(storageArea.state["ctdp.favoriteProfiles.v1"], [{ id: "local-favorite" }]);
  assert.deepEqual(storageArea.state["ctdp.smartFillOverrides.v1"], { local: "companyName" });
  assert.equal(await getEnabled(env), true);
});

test("turning auto-save off keeps the handle and restores without selecting again", async () => {
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea: createStorageArea({ "ctdp.smartFillOverrides.v1": { browser: "email" } }) });
  await enable(directoryHandle, env);

  await disable(env);
  assert.equal(await getEnabled(env), false);

  const result = await resumeStored(env);
  assert.equal(result.enabled, true);
  assert.equal(result.source, "file");
  assert.equal(await getEnabled(env), true);
});

test("stored handle only asks for recovery or reselection when permission requires it", async () => {
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea: createStorageArea({ "ctdp.smartFillOverrides.v1": {} }) });
  await enable(directoryHandle, env);
  await disable(env);

  directoryHandle.setPermission("prompt");
  assert.deepEqual(await resumeStored(env), {
    enabled: false,
    needsSelection: false,
    permissionRequired: true,
    permissionState: "prompt"
  });

  directoryHandle.setPermission("denied");
  assert.deepEqual(await resumeStored(env), {
    enabled: false,
    needsSelection: true,
    permissionRequired: false,
    permissionState: "denied"
  });
});

test("enabled local data file is preferred and follows all later storage changes", async () => {
  const storageArea = createStorageArea({
    "ctdp.favoriteProfiles.v1": [{ id: "browser-favorite" }],
    "ctdp.smartFillOverrides.v1": { browser: "mobile" }
  });
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea });
  await enable(directoryHandle, env);

  directoryHandle.clearFile();
  storageArea.state["ctdp.favoriteProfiles.v1"] = [{ id: "fallback-favorite" }];
  storageArea.state["ctdp.smartFillOverrides.v1"] = { fallback: "email" };
  const missingResult = await readPreferredOverrides(env);
  assert.equal(missingResult.source, "storage");
  assert.deepEqual(JSON.parse(directoryHandle.getText()).storage["ctdp.favoriteProfiles.v1"], [{ id: "fallback-favorite" }]);
  assert.deepEqual(JSON.parse(directoryHandle.getText()).storage["ctdp.smartFillOverrides.v1"], { fallback: "email" });

  storageArea.state["ctdp.favoriteProfiles.v1"] = [{ id: "current-favorite" }];
  storageArea.state["ctdp.smartFillOverrides.v1"] = { current: "address" };
  await syncFromStorage(env);
  assert.deepEqual(JSON.parse(directoryHandle.getText()).storage["ctdp.favoriteProfiles.v1"], [{ id: "current-favorite" }]);
  assert.deepEqual(JSON.parse(directoryHandle.getText()).storage["ctdp.smartFillOverrides.v1"], { current: "address" });

  const localPayload = buildPayload({
    "ctdp.favoriteProfiles.v1": [{ id: "local-favorite" }],
    "ctdp.smartFillOverrides.v1": { local: "companyName" }
  });
  const backupDirectory = await directoryHandle.getDirectoryHandle(DIRECTORY_NAME);
  const writable = await (await backupDirectory.getFileHandle(FILE_NAME)).createWritable();
  await writable.write(JSON.stringify(localPayload));
  await writable.close();
  assert.deepEqual((await readPreferredOverrides(env)).overrides, { local: "companyName" });
  assert.deepEqual(storageArea.state["ctdp.favoriteProfiles.v1"], [{ id: "local-favorite" }]);
});

test("refresh prompt keeps local annotation auto-save enabled for reauthorization", async () => {
  const storageArea = createStorageArea({ "ctdp.smartFillOverrides.v1": {} });
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea });
  await enable(directoryHandle, env);
  directoryHandle.setPermission("prompt");

  const result = await readPreferredOverrides(env);
  assert.equal(result.permissionRequired, true);
  assert.equal(await getEnabled(env), true);
  assert.equal((await getState(env)).permissionRequired, true);

  await reauthorize(directoryHandle, env);
  assert.equal((await getState(env)).permissionState, "granted");
  assert.equal(await getEnabled(env), true);
});

test("explicitly denied directory permission closes local annotation auto-save", async () => {
  const storageArea = createStorageArea({ "ctdp.smartFillOverrides.v1": {} });
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea });
  await enable(directoryHandle, env);
  directoryHandle.setPermission("denied");

  assert.equal((await getState(env)).enabled, false);
  assert.equal(await getEnabled(env), false);
});

test("invalid local annotation JSON keeps browser data and closes auto-save", async () => {
  const storageArea = createStorageArea({ "ctdp.smartFillOverrides.v1": { browser: "mobile" } });
  const directoryHandle = createDirectoryHandle();
  const env = createEnv({ storageArea });
  await enable(directoryHandle, env);
  const backupDirectory = await directoryHandle.getDirectoryHandle(DIRECTORY_NAME);
  const writable = await (await backupDirectory.getFileHandle(FILE_NAME)).createWritable();
  await writable.write("not-json");
  await writable.close();

  await assert.rejects(readPreferredOverrides(env), /不是有效 JSON/);
  assert.deepEqual(storageArea.state["ctdp.smartFillOverrides.v1"], { browser: "mobile" });
  assert.equal(await getEnabled(env), false);
});
