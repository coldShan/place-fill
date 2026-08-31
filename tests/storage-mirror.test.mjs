import test from "node:test";
import assert from "node:assert/strict";

const storageMirrorModule = await import("../extension/src/storage-mirror.js");
const storageMirror = storageMirrorModule.default || storageMirrorModule;

function createStorageArea(initialValues) {
  const values = { ...(initialValues || {}) };
  return {
    values,
    get(keys, callback) {
      const result = {};
      keys.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(values, key)) result[key] = values[key];
      });
      callback(result);
    },
    set(nextValues, callback) {
      Object.assign(values, nextValues);
      if (callback) callback();
    }
  };
}

function createMirrorStore(initialSnapshot) {
  let snapshot = initialSnapshot || null;
  return {
    read() {
      return Promise.resolve(snapshot);
    },
    write(nextSnapshot) {
      snapshot = nextSnapshot;
      return Promise.resolve(snapshot);
    }
  };
}

test("storage mirror writes a full chrome local snapshot", async () => {
  const storageArea = createStorageArea({
    "ctdp.favoriteProfiles.v1": { "example.com": [{ id: "fav-1" }] },
    "ctdp.siteFeatureEnabled.v1": { "example.com": true },
    "ctdp.floatingIconEnabled.v1": false
  });
  const mirrorStore = createMirrorStore();

  const snapshot = await storageMirror.mirrorStorageLocalToIndexedDb({ mirrorStore, storageArea });

  assert.equal(snapshot.format, "place-fill-indexeddb-storage-mirror");
  assert.deepEqual(snapshot.storage["ctdp.favoriteProfiles.v1"], { "example.com": [{ id: "fav-1" }] });
  assert.deepEqual(snapshot.storage["ctdp.siteFeatureEnabled.v1"], { "example.com": true });
  assert.equal(snapshot.storage["ctdp.floatingIconEnabled.v1"], false);
  assert.equal(snapshot.storage["ctdp.generatedProfiles.v1"], null);
  assert.equal(await storageMirror.readIndexedDbSnapshot({ mirrorStore }), snapshot);
});

test("local file and manual export share the full backup shape", () => {
  const payload = storageMirror.buildFullBackupPayload({
    "ctdp.favoriteProfiles.v1": [{ id: "fav-1" }],
    "ctdp.smartFillOverrides.v1": { field: "fullName" }
  });

  assert.equal(payload.format, "place-fill-full-backup");
  assert.equal(payload.version, 1);
  assert.deepEqual(payload.storage["ctdp.favoriteProfiles.v1"], [{ id: "fav-1" }]);
  assert.deepEqual(payload.storage["ctdp.smartFillOverrides.v1"], { field: "fullName" });
  assert.equal(payload.storage["ctdp.generatedProfiles.v1"], null);
  assert.deepEqual(storageMirror.getFullBackupStorageChanges(payload), {
    removeKeys: [
      "ctdp.generatedProfiles.v1",
      "ctdp.visibleFieldKeys.v1",
      "ctdp.siteFeatureEnabled.v1",
      "ctdp.floatingIconEnabled.v1",
      "ctdp.focusStyle.v1",
      "ctdp.dockTop.v1"
    ],
    values: {
      "ctdp.favoriteProfiles.v1": [{ id: "fav-1" }],
      "ctdp.smartFillOverrides.v1": { field: "fullName" }
    }
  });
});

test("storage mirror restores chrome local data only when local storage is empty", async () => {
  const storageArea = createStorageArea({});
  const mirrorStore = createMirrorStore({
    format: "place-fill-indexeddb-storage-mirror",
    storage: {
      "ctdp.favoriteProfiles.v1": { "example.com": [{ id: "fav-1" }] },
      "ctdp.generatedProfiles.v1": null
    },
    version: 1
  });

  const result = await storageMirror.restoreStorageLocalFromIndexedDbIfEmpty({ mirrorStore, storageArea });

  assert.equal(result.restored, true);
  assert.deepEqual(storageArea.values["ctdp.favoriteProfiles.v1"], { "example.com": [{ id: "fav-1" }] });
  assert.equal(Object.prototype.hasOwnProperty.call(storageArea.values, "ctdp.generatedProfiles.v1"), false);
});

test("storage mirror does not overwrite existing chrome local data", async () => {
  const storageArea = createStorageArea({
    "ctdp.favoriteProfiles.v1": { "current.example": [{ id: "current" }] }
  });
  const mirrorStore = createMirrorStore({
    format: "place-fill-indexeddb-storage-mirror",
    storage: {
      "ctdp.favoriteProfiles.v1": { "old.example": [{ id: "old" }] }
    },
    version: 1
  });

  const result = await storageMirror.restoreStorageLocalFromIndexedDbIfEmpty({ mirrorStore, storageArea });

  assert.equal(result.restored, false);
  assert.deepEqual(storageArea.values["ctdp.favoriteProfiles.v1"], { "current.example": [{ id: "current" }] });
});

test("storage mirror keeps the existing indexeddb snapshot when chrome local is empty", async () => {
  const storageArea = createStorageArea({});
  const existingSnapshot = {
    format: "place-fill-indexeddb-storage-mirror",
    storage: {
      "ctdp.favoriteProfiles.v1": { "example.com": [{ id: "fav-1" }] }
    },
    version: 1
  };
  const mirrorStore = createMirrorStore(existingSnapshot);

  const snapshot = await storageMirror.mirrorStorageLocalToIndexedDb({ mirrorStore, storageArea });

  assert.equal(snapshot, existingSnapshot);
  assert.equal(await storageMirror.readIndexedDbSnapshot({ mirrorStore }), existingSnapshot);
});
