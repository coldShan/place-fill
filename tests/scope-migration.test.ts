import test from "node:test";
import assert from "node:assert/strict";

import { migrateLegacyScopes } from "../extension/src-ts/shared/scope-migration";
import { SITE_FEATURE_STORAGE_KEY } from "../extension/src-ts/shared/system-registry";
import {
  FAVORITE_PROFILES_STORAGE_KEY,
  GENERATED_PROFILES_STORAGE_KEY,
  MAX_GENERATED_RECORDS
} from "../extension/src-ts/shared/data-records";

const OVERRIDES_KEY = "ctdp.smartFillOverrides.v1";
const AI_MAPPINGS_KEY = "ctdp.aiFieldMappings.v1";

function createEnv(initialState: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = JSON.parse(JSON.stringify(initialState));
  const setCalls: Record<string, unknown>[] = [];
  const storageArea = {
    state,
    setCalls,
    get(keys: string[] | string, callback: (result: Record<string, unknown>) => void) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      keyList.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(state, key)) result[key] = state[key];
      });
      callback(result);
    },
    set(value: Record<string, unknown>, callback?: () => void) {
      setCalls.push(value);
      Object.assign(state, value);
      if (callback) callback();
    }
  };
  return { storageArea, env: { storageArea, now: () => 9000, createId: () => "gen-id" } };
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

function favorite(id: string, index: number) {
  return { id, name: "常用" + id, note: "", createdAt: "100", updatedAt: "100", profile: profile(index) };
}

function history(id: string, createdAt: number, index: number) {
  return { id, createdAt: String(createdAt), profile: profile(index) };
}

test("migrates favorites and history from hostnames to fallback scopes", async () => {
  const { env, storageArea } = createEnv({
    [FAVORITE_PROFILES_STORAGE_KEY]: {
      "example.com": [favorite("f1", 1)],
      "192.168.1.2": [favorite("f2", 2)],
      localhost: [favorite("f3", 3)],
      "127.0.0.1": [favorite("f4", 4)]
    },
    [GENERATED_PROFILES_STORAGE_KEY]: {
      "example.com": [history("h1", 10, 1)],
      localhost: [history("h2", 20, 2)]
    }
  });

  const result = await migrateLegacyScopes(env);

  assert.equal(result.changed, true);
  const favorites = storageArea.state[FAVORITE_PROFILES_STORAGE_KEY] as Record<string, { id: string }[]>;
  assert.deepEqual(Object.keys(favorites).sort(), [
    "host:192.168.1.2",
    "host:example.com",
    "legacy:127.0.0.1",
    "legacy:localhost"
  ]);
  assert.equal(favorites["host:example.com"]![0]!.id, "f1");
  assert.equal(favorites["legacy:localhost"]![0]!.id, "f3");
  const generated = storageArea.state[GENERATED_PROFILES_STORAGE_KEY] as Record<string, { id: string }[]>;
  assert.deepEqual(Object.keys(generated).sort(), ["host:example.com", "legacy:localhost"]);
});

test("merges legacy records into an existing new-format scope", async () => {
  const history30 = Array.from({ length: MAX_GENERATED_RECORDS }, (_, index) =>
    history("n" + index, 1000 + index, index)
  );
  const { env, storageArea } = createEnv({
    [FAVORITE_PROFILES_STORAGE_KEY]: {
      "host:example.com": [favorite("new1", 1), favorite("new2", 2)],
      "example.com": [favorite("old-dup", 1), favorite("old-unique", 3)]
    },
    [GENERATED_PROFILES_STORAGE_KEY]: {
      "host:example.com": history30,
      "example.com": [history("old-newest", 5000, 40), history("old-oldest", 1, 41)]
    }
  });

  await migrateLegacyScopes(env);

  const favorites = storageArea.state[FAVORITE_PROFILES_STORAGE_KEY] as Record<string, { id: string }[]>;
  assert.deepEqual(Object.keys(favorites), ["host:example.com"]);
  assert.deepEqual(
    favorites["host:example.com"]!.map((entry) => entry.id),
    ["new1", "new2", "old-unique"]
  );
  const generated = storageArea.state[GENERATED_PROFILES_STORAGE_KEY] as Record<string, { id: string }[]>;
  assert.deepEqual(Object.keys(generated), ["host:example.com"]);
  assert.equal(generated["host:example.com"]!.length, MAX_GENERATED_RECORDS);
  assert.equal(generated["host:example.com"]![0]!.id, "old-newest");
  assert.equal(generated["host:example.com"]!.some((entry) => entry.id === "old-oldest"), false);
});

test("migrates feature toggles and keeps existing new-format values", async () => {
  const { env, storageArea } = createEnv({
    [SITE_FEATURE_STORAGE_KEY]: { "example.com": true, localhost: true, "192.168.1.2": false }
  });
  await migrateLegacyScopes(env);
  assert.deepEqual(storageArea.state[SITE_FEATURE_STORAGE_KEY], {
    "host:example.com": true,
    "legacy:localhost": true,
    "host:192.168.1.2": false
  });

  const mixed = createEnv({
    [SITE_FEATURE_STORAGE_KEY]: { "example.com": true, "host:example.com": false, "system:s1": true }
  });
  await migrateLegacyScopes(mixed.env);
  assert.deepEqual(mixed.storageArea.state[SITE_FEATURE_STORAGE_KEY], {
    "host:example.com": false,
    "system:s1": true
  });
});

test("migrates annotation keys by folding origin and first-level path", async () => {
  const { env, storageArea } = createEnv({
    [OVERRIDES_KEY]: {
      "http://localhost:5173/admin::top::fp1": "fullName",
      "https://test.crm.com/crm::*::fp2": "email",
      "https://test.crm.com::*::fp3": "mobile",
      "host:keep.com::top::fp4": "address",
      "not a url::top::fp5": "email",
      "no-separator": "email"
    }
  });

  const result = await migrateLegacyScopes(env);

  assert.equal(result.changed, true);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], {
    "host:keep.com::top::fp4": "address",
    "not a url::top::fp5": "email",
    "no-separator": "email",
    "host:localhost:5173::top::fp1": "fullName",
    "host:test.crm.com::*::fp2": "email",
    "host:test.crm.com::*::fp3": "mobile"
  });
});

test("annotation conflicts keep the entry without a path, otherwise the first one", async () => {
  const withoutPath = createEnv({
    [OVERRIDES_KEY]: {
      "http://a.com/x::top::fp": "email",
      "http://a.com::top::fp": "mobile",
      "http://a.com/y::top::fp2": "email",
      "http://a.com/z::top::fp2": "mobile"
    }
  });
  await migrateLegacyScopes(withoutPath.env);
  assert.deepEqual(withoutPath.storageArea.state[OVERRIDES_KEY], {
    "host:a.com::top::fp": "mobile",
    "host:a.com::top::fp2": "email"
  });

  const existing = createEnv({
    [OVERRIDES_KEY]: { "host:a.com::top::fp": "address", "http://a.com::top::fp": "mobile" }
  });
  await migrateLegacyScopes(existing.env);
  assert.deepEqual(existing.storageArea.state[OVERRIDES_KEY], { "host:a.com::top::fp": "address" });
});

test("annotation conflict tiebreak is independent of storage order", async () => {
  const reversed = createEnv({
    [OVERRIDES_KEY]: {
      "http://a.com/z::top::fp": "mobile",
      "http://a.com/y::top::fp": "email",
      "http://a.com/::top::fp2": "mobile",
      "http://a.com::top::fp2": "email"
    }
  });
  await migrateLegacyScopes(reversed.env);
  // y < z; "http://a.com/::" vs "http://a.com::": "/" (0x2f) < ":" (0x3a), so the slash variant wins.
  assert.deepEqual(reversed.storageArea.state[OVERRIDES_KEY], {
    "host:a.com::top::fp": "email",
    "host:a.com::top::fp2": "mobile"
  });

  const forward = createEnv({
    [OVERRIDES_KEY]: {
      "http://a.com::top::fp2": "email",
      "http://a.com/::top::fp2": "mobile"
    }
  });
  await migrateLegacyScopes(forward.env);
  assert.deepEqual(forward.storageArea.state[OVERRIDES_KEY], { "host:a.com::top::fp2": "mobile" });
});

test("AI mapping updatedAt ties use the same deterministic tiebreak", async () => {
  const mapping = (fieldKey: string) => ({
    fieldKey,
    confidence: 0.9,
    localFieldKey: "",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  const { env, storageArea } = createEnv({
    [AI_MAPPINGS_KEY]: {
      "http://a.com/z::top::fp": mapping("mobile"),
      "http://a.com/y::top::fp": mapping("email")
    }
  });
  await migrateLegacyScopes(env);
  assert.deepEqual(storageArea.state[AI_MAPPINGS_KEY], { "host:a.com::top::fp": mapping("email") });
});

test("migrates file:// annotation keys to the file:local scope", async () => {
  const { env, storageArea } = createEnv({
    [OVERRIDES_KEY]: {
      "file:///Users/x/form.html::top::fp": "fullName",
      "file://::top::fp2": "email"
    }
  });
  const result = await migrateLegacyScopes(env);
  assert.equal(result.changed, true);
  assert.deepEqual(storageArea.state[OVERRIDES_KEY], {
    "file:local::top::fp": "fullName",
    "file:local::top::fp2": "email"
  });
  storageArea.setCalls.length = 0;
  assert.deepEqual(await migrateLegacyScopes(env), { changed: false });
  assert.equal(storageArea.setCalls.length, 0);
});

test("AI mapping conflicts keep the entry with the newer updatedAt", async () => {
  const mapping = (fieldKey: string, updatedAt: string) => ({ fieldKey, confidence: 0.9, localFieldKey: "", updatedAt });
  const { env, storageArea } = createEnv({
    [AI_MAPPINGS_KEY]: {
      "http://a.com::top::fp": mapping("email", "2026-01-01T00:00:00.000Z"),
      "http://a.com/x::top::fp": mapping("mobile", "2026-02-01T00:00:00.000Z"),
      "https://b.com::top::fp": mapping("email", "2026-03-01T00:00:00.000Z"),
      "host:b.com::top::fp": mapping("mobile", "2026-01-01T00:00:00.000Z")
    }
  });

  await migrateLegacyScopes(env);

  assert.deepEqual(storageArea.state[AI_MAPPINGS_KEY], {
    "host:a.com::top::fp": mapping("mobile", "2026-02-01T00:00:00.000Z"),
    "host:b.com::top::fp": mapping("email", "2026-03-01T00:00:00.000Z")
  });
});

test("is idempotent and never writes when nothing is legacy", async () => {
  const { env, storageArea } = createEnv({
    [FAVORITE_PROFILES_STORAGE_KEY]: { "example.com": [favorite("f1", 1)] },
    [GENERATED_PROFILES_STORAGE_KEY]: { localhost: [history("h1", 10, 1)] },
    [SITE_FEATURE_STORAGE_KEY]: { "example.com": true },
    [OVERRIDES_KEY]: { "http://localhost:5173/admin::top::fp1": "fullName" },
    [AI_MAPPINGS_KEY]: {
      "https://a.com/crm::*::fp": { fieldKey: "email", confidence: 1, localFieldKey: "", updatedAt: "" }
    }
  });

  assert.equal((await migrateLegacyScopes(env)).changed, true);
  const snapshot = JSON.stringify(storageArea.state);
  storageArea.setCalls.length = 0;

  const second = await migrateLegacyScopes(env);

  assert.deepEqual(second, { changed: false });
  assert.equal(storageArea.setCalls.length, 0);
  assert.equal(JSON.stringify(storageArea.state), snapshot);
});

test("does nothing on empty storage or without a storage area", async () => {
  const empty = createEnv();
  assert.deepEqual(await migrateLegacyScopes(empty.env), { changed: false });
  assert.equal(empty.storageArea.setCalls.length, 0);
  assert.deepEqual(await migrateLegacyScopes({ storageArea: null }), { changed: false });
});
