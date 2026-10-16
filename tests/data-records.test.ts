import test from "node:test";
import assert from "node:assert/strict";

import {
  copyFavoriteToScopes,
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  findFavoriteProfile,
  hasFavoriteProfile,
  importFavoriteProfiles,
  listScopeSummaries,
  normalizeScopeKey,
  readFavoriteProfiles,
  readGeneratedProfiles,
  recordGeneratedProfile,
  reorderFavoriteProfiles,
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
    mobile: "1380000" + String(index).padStart(4, "0"),
    postalCode: String(200000 + index)
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

test("legacy favorites without notes remain readable", async () => {
  const storageArea = createStorageArea({
    "ctdp.favoriteProfiles.v1": {
      "alpha.example.com": [{
        createdAt: "1200",
        id: "legacy-1",
        name: "旧常用数据",
        profile: buildProfile(1),
        updatedAt: "1200"
      }]
    }
  });

  assert.equal((await readFavoriteProfiles("alpha.example.com", { storageArea }))[0]?.note, "");
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
      note: "财务测试账号",
      profile: buildProfile(1)
    },
    { storageArea, now: () => 1200 }
  );

  assert.equal(created.name, "常用数据 A");
  assert.equal(created.note, "财务测试账号");

  const updated = await updateFavoriteProfile(
    "alpha.example.com",
    created.id,
    {
      name: "常用数据 B",
      note: "更新后的备注",
      profile: buildProfile(2)
    },
    { storageArea, now: () => 1300 }
  );

  assert.equal(updated?.name, "常用数据 B");
  assert.equal(updated?.note, "更新后的备注");
  assert.equal(updated?.profile.fullName, "测试用户2");
  assert.equal(updated?.profile.postalCode, "200002");
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

test("favorite profiles keep a persisted custom order", async () => {
  const storageArea = createStorageArea();
  const scope = "alpha.example.com";
  const first = await createFavoriteProfile(scope, { profile: buildProfile(1) }, { storageArea, now: () => 1200 });
  const second = await createFavoriteProfile(scope, { profile: buildProfile(2) }, { storageArea, now: () => 1300 });
  const third = await createFavoriteProfile(scope, { profile: buildProfile(3) }, { storageArea, now: () => 1400 });

  await reorderFavoriteProfiles(scope, [first.id, third.id, second.id], { storageArea });
  await updateFavoriteProfile(scope, third.id, { note: "编辑后仍在原位", profile: third.profile }, {
    storageArea,
    now: () => 1500
  });

  assert.deepEqual((await readFavoriteProfiles(scope, { storageArea })).map(function (entry) { return entry.id; }), [
    first.id,
    third.id,
    second.id
  ]);
});

test("findFavoriteProfile and hasFavoriteProfile use normalized profile deduplication", async () => {
  const storageArea = createStorageArea();
  const favorite = await createFavoriteProfile("alpha.example.com", { profile: buildProfile(1) }, { storageArea });

  assert.equal((await findFavoriteProfile("ALPHA.EXAMPLE.COM", buildProfile(1), { storageArea }))?.id, favorite.id);
  assert.equal(await findFavoriteProfile("alpha.example.com", buildProfile(2), { storageArea }), null);
  assert.equal(await hasFavoriteProfile("ALPHA.EXAMPLE.COM", buildProfile(1), { storageArea }), true);
  assert.equal(await hasFavoriteProfile("alpha.example.com", buildProfile(2), { storageArea }), false);
  assert.equal(await hasFavoriteProfile("beta.example.com", buildProfile(1), { storageArea }), false);
});

test("createFavoriteFromHistory keeps the generated record and reuses the favorite on repeat", async () => {
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
  assert.equal(duplicateFavorite?.id, firstFavorite?.id);
  assert.equal((await readFavoriteProfiles(scope, { storageArea })).length, 1);
  assert.deepEqual((await readGeneratedProfiles(scope, { storageArea })).map(function (entry) {
    return entry.id;
  }), [historyEntry.id]);
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
  assert.equal((await readGeneratedProfiles(scope, { storageArea })).length, 1);
});

test("copyFavoriteToScopes copies one favorite into other scopes and skips duplicates", async () => {
  const storageArea = createStorageArea();
  const source = await createFavoriteProfile("alpha.example.com", { name: "主账号", note: "备注", profile: buildProfile(1) }, {
    storageArea,
    now: () => 1000,
    random: () => 0
  });
  await createFavoriteProfile("gamma.example.com", { profile: buildProfile(1) }, {
    storageArea,
    now: () => 1100,
    random: () => 0.1
  });
  await recordGeneratedProfile("delta.example.com", buildProfile(5), { storageArea, now: () => 1150, random: () => 0.15 });

  const results = await copyFavoriteToScopes(
    "alpha.example.com",
    source.id,
    ["Beta.Example.com", "beta.example.com", "gamma.example.com", "alpha.example.com", "https://bad.example.com/x"],
    { storageArea, now: () => 1200, random: () => 0.2 }
  );

  assert.deepEqual(results, [
    { scope: "beta.example.com", status: "created" },
    { scope: "gamma.example.com", status: "duplicate" }
  ]);
  const [copied] = await readFavoriteProfiles("beta.example.com", { storageArea });
  assert.equal(copied?.name, "主账号");
  assert.equal(copied?.note, "备注");
  assert.equal(copied?.createdAt, "1200");
  assert.notEqual(copied?.id, source.id);
  assert.deepEqual(copied?.profile, source.profile);
  assert.equal((await readFavoriteProfiles("gamma.example.com", { storageArea })).length, 1);
  assert.equal((await readFavoriteProfiles("alpha.example.com", { storageArea })).length, 1);
  assert.equal(await copyFavoriteToScopes("alpha.example.com", "missing", ["beta.example.com"], { storageArea }), null);

  assert.deepEqual(await listScopeSummaries({ storageArea }), [
    { favorites: 1, history: 0, scope: "alpha.example.com" },
    { favorites: 1, history: 0, scope: "beta.example.com" },
    { favorites: 0, history: 1, scope: "delta.example.com" },
    { favorites: 1, history: 0, scope: "gamma.example.com" }
  ]);
});

test("importFavoriteProfiles appends new favorites in one write and skips duplicates", async () => {
  const storageArea = createStorageArea();
  const scope = "alpha.example.com";
  const existing = await createFavoriteProfile(scope, { profile: buildProfile(1) }, { storageArea, now: () => 1000, random: () => 0 });
  let writes = 0;
  const countingArea = {
    get: storageArea.get,
    set(value: Record<string, unknown>, callback?: () => void) {
      writes += 1;
      storageArea.set(value, callback);
    }
  };

  const result = await importFavoriteProfiles(scope, [
    { name: "导入一", note: "说明", profile: buildProfile(2) },
    { profile: buildProfile(1) },
    { profile: buildProfile(2) },
    { name: "导入二", profile: buildProfile(3) }
  ], { storageArea: countingArea, now: () => 2000, random: () => 0.3 });

  assert.equal(writes, 1);
  assert.equal(result.skipped, 2);
  assert.deepEqual(result.created.map(function (entry) { return entry.name; }), ["导入一", "导入二"]);
  const favorites = await readFavoriteProfiles(scope, { storageArea });
  assert.deepEqual(favorites.map(function (entry) { return entry.name; }), [existing.name, "导入一", "导入二"]);
  assert.equal(favorites[1]?.note, "说明");
});

test("importFavoriteProfiles keeps ids unique when timestamps and random values repeat", async () => {
  const storageArea = createStorageArea();
  const scope = "alpha.example.com";
  const existing = await createFavoriteProfile(scope, { profile: buildProfile(1) }, { storageArea, now: () => 3000, random: () => 0 });
  await importFavoriteProfiles(scope, [
    { profile: buildProfile(2) },
    { profile: buildProfile(3) },
    { profile: buildProfile(4) }
  ], { storageArea, now: () => 3000, random: () => 0 });
  const ids = (await readFavoriteProfiles(scope, { storageArea })).map(function (entry) { return entry.id; });
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, 4);
  assert.equal(ids[0], existing.id);

  await createFavoriteProfile("beta.example.com", { profile: buildProfile(5) }, { storageArea, now: () => 3000, random: () => 0 });
  await copyFavoriteToScopes(scope, existing.id, ["beta.example.com"], { storageArea, now: () => 3000, random: () => 0 });
  const betaIds = (await readFavoriteProfiles("beta.example.com", { storageArea })).map(function (entry) { return entry.id; });
  assert.equal(new Set(betaIds).size, 2);
});
