import test from "node:test";
import assert from "node:assert/strict";

import {
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  normalizeScopeKey,
  readFavoriteProfiles,
  readGeneratedProfiles,
  recordGeneratedProfile,
  updateFavoriteProfile
} from "../extension/src-ts/shared/data-records";

function createStorageArea(initialState: Record<string, unknown> = {}) {
  const state = { ...initialState };
  return {
    get(keys: string[] | string, callback: (result: Record<string, unknown>) => void) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      callback(
        Object.fromEntries(
          keyList.map(function (key) {
            return [key, state[key]];
          })
        )
      );
    },
    set(value: Record<string, unknown>, callback?: () => void) {
      Object.assign(state, value);
      if (callback) callback();
    }
  };
}

function buildProfile(index: number) {
  return {
    address: "上海市徐汇区测试路 " + index + " 号",
    bankCard: "6222020202020" + String(index).padStart(3, "0"),
    account: String(100000 + index),
    companyName: "测试企业 " + index,
    creditCode: "91310000TEST" + String(index).padStart(6, "0"),
    email: "user" + index + "@example.com",
    fullName: "测试用户" + index,
    idNumber: "31010119900101" + String(index).padStart(4, "0"),
    landline: "021-6000" + String(index).padStart(4, "0"),
    mobile: "1380000" + String(index).padStart(4, "0")
  };
}

test("normalizeScopeKey lowercases valid hostname-like scope keys", () => {
  assert.equal(normalizeScopeKey(" Example.COM "), "example.com");
  assert.equal(normalizeScopeKey("192.168.0.10"), "192.168.0.10");
});

test("normalizeScopeKey rejects invalid scope input", () => {
  assert.equal(normalizeScopeKey(""), "");
  assert.equal(normalizeScopeKey("https://example.com"), "");
  assert.equal(normalizeScopeKey("example.com/path"), "");
});

test("recordGeneratedProfile isolates scopes and keeps the latest 30 entries", async () => {
  const storageArea = createStorageArea();

  for (let index = 0; index < 32; index += 1) {
    await recordGeneratedProfile("alpha.example.com", buildProfile(index), { storageArea, now: () => 1000 + index });
  }
  await recordGeneratedProfile("beta.example.com", buildProfile(99), { storageArea, now: () => 9999 });

  const alphaRecords = await readGeneratedProfiles("alpha.example.com", { storageArea });
  const betaRecords = await readGeneratedProfiles("beta.example.com", { storageArea });

  assert.equal(alphaRecords.length, 30);
  assert.equal(betaRecords.length, 1);
  assert.equal(alphaRecords[0]?.profile.fullName, "测试用户31");
  assert.equal(alphaRecords[alphaRecords.length - 1]?.profile.fullName, "测试用户2");
});

test("favorite profiles support create update and delete within a scope", async () => {
  const storageArea = createStorageArea();

  const created = await createFavoriteProfile(
    "alpha.example.com",
    {
      name: "常用数据 A",
      profile: buildProfile(1)
    },
    { storageArea, now: () => 1200 }
  );

  assert.equal(created.name, "常用数据 A");

  const updated = await updateFavoriteProfile(
    "alpha.example.com",
    created.id,
    {
      name: "常用数据 B",
      profile: buildProfile(2)
    },
    { storageArea, now: () => 1300 }
  );

  assert.equal(updated?.name, "常用数据 B");
  assert.equal(updated?.profile.fullName, "测试用户2");
  assert.equal(updated?.profile.account, "100002");

  const listAfterUpdate = await readFavoriteProfiles("alpha.example.com", { storageArea });
  assert.equal(listAfterUpdate.length, 1);
  assert.equal(listAfterUpdate[0]?.updatedAt, "1300");

  assert.equal(await deleteFavoriteProfile("alpha.example.com", created.id, { storageArea }), true);
  assert.deepEqual(await readFavoriteProfiles("alpha.example.com", { storageArea }), []);
});

test("createFavoriteProfile reuses an existing favorite with the same profile", async () => {
  const storageArea = createStorageArea();
  const scope = "alpha.example.com";
  const first = await createFavoriteProfile(scope, { name: "常用数据 A", profile: buildProfile(1) }, {
    storageArea,
    now: () => 1200,
    random: () => 0
  });
  const duplicate = await createFavoriteProfile(scope, { name: "常用数据 B", profile: buildProfile(1) }, {
    storageArea,
    now: () => 1300,
    random: () => 0.1
  });
  const favorites = await readFavoriteProfiles(scope, { storageArea });

  assert.equal(duplicate.id, first.id);
  assert.equal(favorites.length, 1);
  assert.equal(favorites[0]?.name, "常用数据 A");
});

test("createFavoriteFromHistory moves one generated record into favorites without duplicates", async () => {
  const storageArea = createStorageArea();
  const scope = "alpha.example.com";
  const [historyEntry] = await recordGeneratedProfile(scope, buildProfile(1), {
    storageArea,
    now: () => 1200,
    random: () => 0
  });
  assert.ok(historyEntry);

  const firstFavorite = await createFavoriteFromHistory(scope, historyEntry.id, "", {
    storageArea,
    now: () => 1300,
    random: () => 0.1
  });
  const duplicateFavorite = await createFavoriteFromHistory(scope, historyEntry.id, "", {
    storageArea,
    now: () => 1400,
    random: () => 0.2
  });

  assert.equal(firstFavorite?.profile.fullName, "测试用户1");
  assert.equal(duplicateFavorite, null);
  assert.equal((await readFavoriteProfiles(scope, { storageArea })).length, 1);
  assert.deepEqual(await readGeneratedProfiles(scope, { storageArea }), []);
});

test("createFavoriteFromHistory reuses an existing favorite with the same profile", async () => {
  const storageArea = createStorageArea();
  const scope = "alpha.example.com";
  const existing = await createFavoriteProfile(scope, { name: "已有常用数据", profile: buildProfile(2) }, {
    storageArea,
    now: () => 1100,
    random: () => 0
  });
  const [historyEntry] = await recordGeneratedProfile(scope, buildProfile(2), {
    storageArea,
    now: () => 1200,
    random: () => 0.1
  });
  assert.ok(historyEntry);

  const favorite = await createFavoriteFromHistory(scope, historyEntry.id, "", {
    storageArea,
    now: () => 1300,
    random: () => 0.2
  });
  const favorites = await readFavoriteProfiles(scope, { storageArea });

  assert.equal(favorite?.id, existing.id);
  assert.equal(favorites.length, 1);
  assert.equal(favorites[0]?.name, "已有常用数据");
  assert.deepEqual(await readGeneratedProfiles(scope, { storageArea }), []);
});
