import test from "node:test";
import assert from "node:assert/strict";

import {
  deleteSystem,
  dismissAnomalies,
  moveScopeData,
  normalizeSystemProfile,
  readScopeEnabled,
  readSystems,
  resolvePageScope,
  saveSystem,
  validateSystems,
  writeScopeEnabled,
  writeSystems,
  SITE_FEATURE_STORAGE_KEY,
  SYSTEM_PROFILES_STORAGE_KEY
} from "../extension/src-ts/shared/system-registry";
import {
  FAVORITE_PROFILES_STORAGE_KEY,
  GENERATED_PROFILES_STORAGE_KEY,
  readFavoriteProfiles,
  readGeneratedProfiles
} from "../extension/src-ts/shared/data-records";
import type { PageInfo, SystemEnvironment, SystemProfile } from "../extension/src-ts/shared/system-scope";

const OVERRIDES_KEY = "ctdp.smartFillOverrides.v1";
const AI_MAPPINGS_KEY = "ctdp.aiFieldMappings.v1";

function createStorageArea(initialState: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = { ...initialState };
  return {
    state,
    get(keys: string[] | string, callback: (result: Record<string, unknown>) => void) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      callback(Object.fromEntries(keyList.map((key) => [key, state[key]])));
    },
    set(value: Record<string, unknown>, callback?: () => void) {
      Object.assign(state, value);
      if (callback) callback();
    }
  };
}

function createEnv(initialState: Record<string, unknown> = {}, ids: string[] = ["id1", "id2", "id3", "id4"]) {
  const storageArea = createStorageArea(initialState);
  let index = 0;
  return {
    storageArea,
    env: {
      storageArea,
      now: () => 5000,
      createId: () => ids[index++] || "id" + (index + 10)
    }
  };
}

function environment(hostname: string, port = "", extra: Partial<SystemEnvironment> = {}): SystemEnvironment {
  return { id: "env-" + hostname + port, hostname, port, query: {}, lastPath: "", autoAdded: false, createdAt: 1, ...extra };
}

function system(id: string, name: string, environments: SystemEnvironment[], titles: string[] = [name]): SystemProfile {
  return { id, name, titles, environments, anomalies: [], createdAt: 1, updatedAt: 1 };
}

function pageInfo(overrides: Partial<PageInfo> = {}): PageInfo {
  return {
    protocol: "http:",
    hostname: "localhost",
    port: "5173",
    query: {},
    lastPath: "",
    title: "订单中心",
    origin: "http://localhost:5173",
    pathname: "/orders/list",
    ...overrides
  };
}

function profile(index: number) {
  return {
    address: "地址" + index,
    bankCard: "6222" + index,
    account: "acc" + index,
    companyName: "公司" + index,
    creditCode: "code" + index,
    email: "u" + index + "@example.com",
    fullName: "用户" + index,
    idNumber: "id" + index,
    landline: "021" + index,
    mobile: "138" + index,
    postalCode: "2000" + index
  };
}

test("readScopeEnabled falls back to the legacy local-host default only without an own entry", async () => {
  const { env } = createEnv({ [SITE_FEATURE_STORAGE_KEY]: { "legacy:localhost": true } });
  assert.equal(await readScopeEnabled("host:localhost:5173", env), true);
  assert.equal(await readScopeEnabled("host:localhost", env), true);
  assert.equal(await readScopeEnabled("host:test.crm.com", env), false);
  assert.equal(await readScopeEnabled("system:abc", env), false);

  const own = createEnv({
    [SITE_FEATURE_STORAGE_KEY]: { "legacy:localhost": true, "host:localhost:5173": false }
  });
  assert.equal(await readScopeEnabled("host:localhost:5173", own.env), false);
  assert.equal(await readScopeEnabled("host:localhost:3000", own.env), true);
});

test("readScopeEnabled maps encoded IPv6 loopback scopes to the legacy [::1] default", async () => {
  const { env } = createEnv({ [SITE_FEATURE_STORAGE_KEY]: { "legacy:[::1]": true } });
  assert.equal(await readScopeEnabled("host:v6---1:5173", env), true);
  assert.equal(await readScopeEnabled("host:v6-2001-db8--1", env), false);
});

test("writeScopeEnabled stores the value under the scope key", async () => {
  const { env, storageArea } = createEnv();
  await writeScopeEnabled("host:a.com", true, env);
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], { "host:a.com": true });
  assert.equal(await readScopeEnabled("host:a.com", env), true);
});

test("readSystems/writeSystems round trip and tolerate bad storage", async () => {
  const { env } = createEnv({ [SYSTEM_PROFILES_STORAGE_KEY]: "garbage" });
  assert.deepEqual(await readSystems(env), []);
  const systems = [system("s1", "A", [environment("a.com")])];
  await writeSystems(systems, env);
  assert.deepEqual(await readSystems(env), systems);
});

test("validateSystems rejects shared non-local hosts but allows shared local host:port", () => {
  const conflict = validateSystems([
    system("a", "A", [environment("test.crm.com", "8080")]),
    system("b", "B", [environment("test.crm.com", "9090")])
  ]);
  assert.deepEqual(conflict, { ok: false, message: "test.crm.com 已属于系统「A」" });

  const local = validateSystems([
    system("a", "A", [environment("localhost", "5173")]),
    system("b", "B", [environment("localhost", "5173")])
  ]);
  assert.deepEqual(local, { ok: true });

  assert.deepEqual(
    validateSystems([system("a", "A", [environment("x.com"), environment("x.com", "81")])]),
    { ok: true }
  );
});

test("saveSystem refuses invalid lists without writing, and treats unknown ids as new", async () => {
  const { env, storageArea } = createEnv();
  const a = system("a", "A", [environment("test.crm.com")]);
  assert.deepEqual(await saveSystem(a, env), { ok: true });

  const before = JSON.stringify(storageArea.state[SYSTEM_PROFILES_STORAGE_KEY]);
  const result = await saveSystem(system("b", "B", [environment("test.crm.com")]), env);
  assert.equal(result.ok, false);
  assert.equal(result.message, "test.crm.com 已属于系统「A」");
  assert.equal(JSON.stringify(storageArea.state[SYSTEM_PROFILES_STORAGE_KEY]), before);

  const renamed = { ...a, name: "A2" };
  await saveSystem(renamed, env);
  const systems = await readSystems(env);
  assert.equal(systems.length, 1);
  assert.equal(systems[0]!.name, "A2");
  assert.equal(systems[0]!.updatedAt, 5000);

  await saveSystem(system("c", "C", [environment("c.com")]), env);
  assert.deepEqual((await readSystems(env)).map((item) => item.id), ["a", "c"]);
});

test("saveSystem adopts the fallback data of newly added environments only", async () => {
  const existing = system("A", "CRM", [environment("prod.crm.com")], ["CRM"]);
  const { env, storageArea } = createEnv({
    [SYSTEM_PROFILES_STORAGE_KEY]: [existing],
    [SITE_FEATURE_STORAGE_KEY]: { "host:staging.crm.com": true },
    [FAVORITE_PROFILES_STORAGE_KEY]: {
      "host:staging.crm.com": [{ id: "f1", name: "常用", note: "", createdAt: "10", updatedAt: "10", profile: profile(1) }],
      "host:prod.crm.com": [{ id: "f2", name: "旧", note: "", createdAt: "10", updatedAt: "10", profile: profile(2) }]
    },
    [OVERRIDES_KEY]: { "host:staging.crm.com::top::fp1": "mobile" }
  });

  const result = await saveSystem({ ...existing, environments: existing.environments.concat([environment("staging.crm.com")]) }, env);
  assert.deepEqual(result, { ok: true });
  assert.equal((await readFavoriteProfiles("system:A", env)).length, 1);
  assert.equal((await readFavoriteProfiles("host:staging.crm.com", env)).length, 0);
  // The environment that was already part of the system is not re-adopted.
  assert.equal((await readFavoriteProfiles("host:prod.crm.com", env)).length, 1);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], { "system:A::top::fp1": "mobile" });
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], { "system:A": true });

  // A brand-new system adopts its local environment and pins the port's fallback switch off.
  const local = createEnv({
    [SITE_FEATURE_STORAGE_KEY]: { "legacy:localhost": true },
    [OVERRIDES_KEY]: { "host:localhost:5173::top::fp1": "email" }
  });
  await saveSystem(system("B", "后台", [environment("localhost", "5173")]), local.env);
  assert.deepEqual(local.storageArea.state[OVERRIDES_KEY], { "system:B::top::fp1": "email" });
  assert.deepEqual(local.storageArea.state[SITE_FEATURE_STORAGE_KEY], {
    "legacy:localhost": true,
    "system:B": true,
    "host:localhost:5173": false
  });

  // A rejected save moves nothing.
  const conflict = createEnv({
    [SYSTEM_PROFILES_STORAGE_KEY]: [existing],
    [OVERRIDES_KEY]: { "host:prod.crm.com::top::fp1": "mobile" }
  });
  assert.equal((await saveSystem(system("C", "C", [environment("prod.crm.com")]), conflict.env)).ok, false);
  assert.deepEqual(conflict.storageArea.state[OVERRIDES_KEY], { "host:prod.crm.com::top::fp1": "mobile" });
});

test("normalizeSystemProfile accepts stored-shape systems and rejects garbage", () => {
  const valid = system("A", "CRM", [environment("prod.crm.com")], ["CRM"]);
  assert.deepEqual(normalizeSystemProfile(JSON.parse(JSON.stringify(valid))), valid);
  assert.equal(normalizeSystemProfile(null), null);
  assert.equal(normalizeSystemProfile({ name: "no id" }), null);
});

test("resolvePageScope creates a system from the page title and migrates fallback data", async () => {
  const fallback = "host:localhost:5173";
  const { env, storageArea } = createEnv(
    {
      [SITE_FEATURE_STORAGE_KEY]: { [fallback]: true },
      [FAVORITE_PROFILES_STORAGE_KEY]: {
        [fallback]: [{ id: "f1", name: "常用", note: "", createdAt: "10", updatedAt: "10", profile: profile(1) }]
      },
      [GENERATED_PROFILES_STORAGE_KEY]: { [fallback]: [{ id: "h1", createdAt: "20", profile: profile(2) }] },
      [OVERRIDES_KEY]: { [fallback + "::top::fp1"]: "mobile", "host:other.com::top::fp2": "email" },
      [AI_MAPPINGS_KEY]: { [fallback + "::top::fp3"]: { fieldKey: "email" } }
    },
    ["sys1", "env1"]
  );

  const result = await resolvePageScope({ info: pageInfo(), marker: null }, env);
  assert.deepEqual(result, {
    scope: "system:sys1",
    fallbackScope: fallback,
    system: { id: "sys1", name: "订单中心" },
    marker: { id: "sys1", name: "订单中心", manual: false }
  });

  const [created] = await readSystems(env);
  assert.equal(created!.id, "sys1");
  assert.equal(created!.name, "订单中心");
  assert.deepEqual(created!.titles, ["订单中心"]);
  assert.equal(created!.environments.length, 1);
  const createdEnv = created!.environments[0]!;
  assert.equal(createdEnv.hostname, "localhost");
  assert.equal(createdEnv.port, "5173");
  assert.deepEqual(createdEnv.query, {});
  assert.equal(createdEnv.lastPath, "");
  assert.equal(createdEnv.autoAdded, false);
  assert.deepEqual(created!.anomalies, []);
  assert.equal(created!.createdAt, 5000);

  assert.equal((await readFavoriteProfiles("system:sys1", env)).length, 1);
  assert.equal((await readGeneratedProfiles("system:sys1", env)).length, 1);
  assert.equal((await readFavoriteProfiles(fallback, env)).length, 0);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], {
    "system:sys1::top::fp1": "mobile",
    "host:other.com::top::fp2": "email"
  });
  assert.deepEqual(storageArea.state[AI_MAPPINGS_KEY], { "system:sys1::top::fp3": { fieldKey: "email" } });
  // The local fallback scope is pinned off so the port does not keep creating systems.
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], { "system:sys1": true, [fallback]: false });
  const generated =storageArea.state[GENERATED_PROFILES_STORAGE_KEY] as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(generated, fallback), false);
});

test("resolvePageScope names a system after the host when the title is generic", async () => {
  const { env } = createEnv({ [SITE_FEATURE_STORAGE_KEY]: { "host:localhost:5173": true } }, ["sys1", "env1"]);
  const result = await resolvePageScope({ info: pageInfo({ title: "Vite App" }), marker: null }, env);
  assert.equal(result.scope, "system:sys1");
  assert.deepEqual(result.system, { id: "sys1", name: "localhost:5173" });
  const [created] = await readSystems(env);
  assert.equal(created!.name, "localhost:5173");
  assert.deepEqual(created!.titles, []);
});

test("resolvePageScope names a new system and its keyword after the stable title segment, capped at 200", async () => {
  const { env } = createEnv({ [SITE_FEATURE_STORAGE_KEY]: { "host:localhost:5173": true } }, ["sys1", "env1"]);
  const result = await resolvePageScope({ info: pageInfo({ title: "用户列表 - 客户管理" }), marker: null }, env);
  assert.deepEqual(result.system, { id: "sys1", name: "客户管理" });
  const [created] = await readSystems(env);
  assert.equal(created!.name, "客户管理");
  assert.deepEqual(created!.titles, ["客户管理"]);

  const long = createEnv({ [SITE_FEATURE_STORAGE_KEY]: { "host:localhost:5173": true } }, ["sys2", "env2"]);
  await resolvePageScope({ info: pageInfo({ title: "页 - " + "长".repeat(250) }), marker: null }, long.env);
  const [capped] = await readSystems(long.env);
  assert.equal(capped!.name, "长".repeat(200));
  assert.deepEqual(capped!.titles, ["长".repeat(200)]);
});

for (const withLegacy of [false, true]) {
  test(
    "SPA route titles on one local port resolve to a single system (" + (withLegacy ? "legacy localhost:true" : "port switch on") + ")",
    async () => {
      const toggles = withLegacy ? { "legacy:localhost": true } : { "host:localhost:5173": true };
      const { env, storageArea } = createEnv({ [SITE_FEATURE_STORAGE_KEY]: toggles }, ["sys1", "env1", "sys2", "env2", "sys3", "env3"]);
      const routes = ["用户列表 - 客户管理", "订单列表 - 客户管理", "客户详情 - 客户管理", "客户管理"];

      // Same tab: the marker is carried between routes.
      let marker = null as Awaited<ReturnType<typeof resolvePageScope>>["marker"];
      for (const title of routes) {
        const result = await resolvePageScope({ info: pageInfo({ title }), marker }, env);
        assert.equal(result.scope, "system:sys1", title);
        marker = result.marker;
      }
      // A route title without the stable segment keeps the tab's marker (host:port is known).
      assert.equal((await resolvePageScope({ info: pageInfo({ title: "登录" }), marker }, env)).scope, "system:sys1");

      // New tabs (no marker) land on the same system for every route.
      for (const title of routes) {
        assert.equal((await resolvePageScope({ info: pageInfo({ title }), marker: null }, env)).scope, "system:sys1", title);
      }
      assert.equal((await readSystems(env)).length, 1);

      // The legacy per-port default applied once: the port's own fallback switch is now off, so an
      // unrelated project on the same port is not turned into a system automatically.
      assert.equal((storageArea.state[SITE_FEATURE_STORAGE_KEY] as Record<string, unknown>)["host:localhost:5173"], false);
      const other = await resolvePageScope({ info: pageInfo({ title: "办公平台" }), marker: null }, env);
      assert.equal(other.scope, "host:localhost:5173");
      assert.equal((await readSystems(env)).length, 1);
    }
  );
}

test("resolvePageScope falls back when the fallback switch is off", async () => {
  const { env } = createEnv();
  const result = await resolvePageScope({ info: pageInfo(), marker: null }, env);
  assert.deepEqual(result, { scope: "host:localhost:5173", fallbackScope: "host:localhost:5173", system: null, marker: null });
  assert.deepEqual(await readSystems(env), []);
});

test("resolvePageScope reads the legacy local default for the fallback switch", async () => {
  const { env } = createEnv({ [SITE_FEATURE_STORAGE_KEY]: { "legacy:localhost": true } }, ["sys1", "env1"]);
  const result = await resolvePageScope({ info: pageInfo(), marker: null }, env);
  assert.equal(result.scope, "system:sys1");
  assert.equal(await readScopeEnabled("system:sys1", env), true);
});

test("resolvePageScope auto-adds a new host to the title-matched system", async () => {
  const existing = system("s1", "CRM", [environment("prod.crm.com")], ["CRM"]);
  const { env } = createEnv(
    {
      [SYSTEM_PROFILES_STORAGE_KEY]: [existing],
      [SITE_FEATURE_STORAGE_KEY]: { "host:test.crm.com": true }
    },
    ["envNew"]
  );
  const info = pageInfo({
    hostname: "test.crm.com",
    port: "",
    origin: "https://test.crm.com",
    protocol: "https:",
    title: "CRM 客户管理"
  });
  const result = await resolvePageScope({ info, marker: null }, env);
  assert.equal(result.scope, "system:s1");
  assert.deepEqual(result.marker, { id: "s1", name: "CRM", manual: false });
  const [saved] = await readSystems(env);
  assert.equal(saved!.environments.length, 2);
  const added = saved!.environments[1]!;
  assert.equal(added.hostname, "test.crm.com");
  assert.equal(added.autoAdded, true);
  assert.deepEqual(added.query, {});
  assert.equal(added.createdAt, 5000);
});

test("resolvePageScope auto-add moves the new host's fallback data into the system", async () => {
  const existing = system("A", "CRM", [environment("prod.crm.com")], ["CRM"]);
  const { env, storageArea } = createEnv(
    {
      [SYSTEM_PROFILES_STORAGE_KEY]: [existing],
      [SITE_FEATURE_STORAGE_KEY]: { "host:staging.crm.com": true },
      [FAVORITE_PROFILES_STORAGE_KEY]: {
        "host:staging.crm.com": [{ id: "f1", name: "常用", note: "", createdAt: "10", updatedAt: "10", profile: profile(1) }]
      },
      [OVERRIDES_KEY]: { "host:staging.crm.com::top::fp1": "mobile" }
    },
    ["envNew"]
  );
  const info = pageInfo({
    hostname: "staging.crm.com",
    port: "",
    origin: "https://staging.crm.com",
    protocol: "https:",
    title: "CRM 客户管理"
  });
  const result = await resolvePageScope({ info, marker: null }, env);
  assert.equal(result.scope, "system:A");
  assert.equal((await readFavoriteProfiles("system:A", env)).length, 1);
  assert.equal((await readFavoriteProfiles("host:staging.crm.com", env)).length, 0);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], { "system:A::top::fp1": "mobile" });
  assert.equal(await readScopeEnabled("system:A", env), true);
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], { "system:A": true });
});

test("resolvePageScope records anomalies without query, deduplicated and capped at 20", async () => {
  const a = system("a", "A", [environment("a.com")], ["Alpha"]);
  const b = system("b", "B", [environment("b.com")], ["Beta"]);
  const { env } = createEnv({ [SYSTEM_PROFILES_STORAGE_KEY]: [a, b] });
  const info = pageInfo({
    hostname: "a.com",
    port: "",
    protocol: "https:",
    origin: "https://a.com",
    pathname: "/page",
    query: { token: "secret" },
    title: "Beta 管理"
  });

  const first = await resolvePageScope({ info, marker: null }, env);
  assert.equal(first.scope, "system:a");
  await resolvePageScope({ info, marker: null }, env);
  let [savedA] = await readSystems(env);
  assert.deepEqual(savedA!.anomalies, [{ titleSystemId: "b", url: "https://a.com/page", at: 5000 }]);
  assert.equal(JSON.stringify(savedA).indexOf("secret"), -1);

  for (let index = 0; index < 25; index += 1) {
    await resolvePageScope({ info: { ...info, pathname: "/p" + index }, marker: null }, env);
  }
  [savedA] = await readSystems(env);
  assert.equal(savedA!.anomalies.length, 20);
  assert.equal(savedA!.anomalies[19]!.url, "https://a.com/p24");

  await dismissAnomalies("a", env);
  [savedA] = await readSystems(env);
  assert.deepEqual(savedA!.anomalies, []);
});

test("resolvePageScope keeps manual markers when used and ignores unknown markers", async () => {
  const a = system("a", "A", [environment("a.com")], ["Alpha"]);
  const { env } = createEnv({ [SYSTEM_PROFILES_STORAGE_KEY]: [a] });
  const info = pageInfo({ hostname: "other.com", port: "", origin: "https://other.com", title: "Other" });
  const manual = await resolvePageScope({ info, marker: { id: "a", name: "A", manual: true } }, env);
  assert.deepEqual(manual.marker, { id: "a", name: "A", manual: true });
  assert.equal(manual.scope, "system:a");

  const stale = await resolvePageScope(
    { info: pageInfo({ hostname: "zzz.com", port: "", title: "Z" }), marker: { id: "gone", name: "x", manual: false } },
    env
  );
  assert.equal(stale.marker, null);
  assert.equal(stale.system, null);
});

test("moveScopeData merges records, annotations, mappings and toggles into the target", async () => {
  const { env, storageArea } = createEnv({
    [SITE_FEATURE_STORAGE_KEY]: { "host:a.com": true, "host:b.com": false, "system:t": false },
    [OVERRIDES_KEY]: {
      "host:a.com::top::fp1": "mobile",
      "host:a.com::top::fp2": "email",
      "system:t::top::fp2": "fullName"
    },
    [AI_MAPPINGS_KEY]: { "host:a.com::top::fp9": { fieldKey: "email" } }
  });
  await moveScopeData("host:a.com", "system:t", env);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], {
    "system:t::top::fp1": "mobile",
    "system:t::top::fp2": "fullName"
  });
  assert.deepEqual(storageArea.state[AI_MAPPINGS_KEY], { "system:t::top::fp9": { fieldKey: "email" } });
  // target already has its own toggle entry, so it is kept; the source entry is removed
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], { "host:b.com": false, "system:t": false });
});

test("deleteSystem moves data back to the target scope and drops the system and its toggle", async () => {
  const s1 = system("s1", "A", [environment("test.crm.com")]);
  const s2 = system("s2", "B", [environment("b.com")]);
  const { env, storageArea } = createEnv({
    [SYSTEM_PROFILES_STORAGE_KEY]: [s1, s2],
    [SITE_FEATURE_STORAGE_KEY]: { "system:s1": true, "system:s2": true },
    [FAVORITE_PROFILES_STORAGE_KEY]: {
      "system:s1": [{ id: "f1", name: "常用", note: "", createdAt: "10", updatedAt: "10", profile: profile(1) }]
    },
    [OVERRIDES_KEY]: { "system:s1::top::fp1": "mobile" }
  });
  await deleteSystem("s1", "host:test.crm.com", env);
  assert.deepEqual((await readSystems(env)).map((item) => item.id), ["s2"]);
  assert.equal((await readFavoriteProfiles("host:test.crm.com", env)).length, 1);
  assert.equal((await readFavoriteProfiles("system:s1", env)).length, 0);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], { "host:test.crm.com::top::fp1": "mobile" });
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], { "host:test.crm.com": true, "system:s2": true });
});
