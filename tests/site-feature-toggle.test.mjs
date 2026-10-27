import test from "node:test";
import assert from "node:assert/strict";
import siteFeatureTogglePkg from "../extension/src/site-feature-toggle.js";

const {
  getDefaultSiteFeatureEnabled,
  isScopeEnabledInMap,
  isSiteFeatureEnabled,
  normalizeSiteFeatureEnabledMap,
  readSiteFeatureEnabled,
  writeSiteFeatureEnabled
} = siteFeatureTogglePkg;

function createStorageArea(initialState) {
  const state = { ...(initialState || {}) };
  return {
    get(keys, callback) {
      if (Array.isArray(keys)) {
        callback(
          Object.fromEntries(
            keys
              .filter(function (key) {
                return Object.prototype.hasOwnProperty.call(state, key);
              })
              .map(function (key) {
                return [key, state[key]];
              })
          )
        );
        return;
      }
      callback({ ...state });
    },
    set(values, callback) {
      Object.assign(state, values || {});
      if (callback) callback();
    },
    snapshot() {
      return JSON.parse(JSON.stringify(state));
    }
  };
}

const KEY = "ctdp.siteFeatureEnabled.v1";

test("site feature toggle defaults to disabled when storage is empty or invalid", async () => {
  assert.equal(getDefaultSiteFeatureEnabled(), false);
  assert.equal(isSiteFeatureEnabled(undefined), false);
  assert.equal(isSiteFeatureEnabled(false), false);
  assert.equal(isSiteFeatureEnabled(true), true);
  assert.equal(await readSiteFeatureEnabled({ scope: "system:abc", storageArea: createStorageArea() }), false);
  assert.equal(
    await readSiteFeatureEnabled({ scope: "system:abc", storageArea: createStorageArea({ [KEY]: "broken" }) }),
    false
  );
});

test("site feature toggle persists boolean state by scope key", async () => {
  const storageArea = createStorageArea();
  const alphaEnv = { scope: "system:abc", storageArea };
  const betaEnv = { scope: "system:def", storageArea };

  assert.equal(await writeSiteFeatureEnabled(false, alphaEnv), false);
  assert.equal(await readSiteFeatureEnabled(alphaEnv), false);
  assert.equal(await readSiteFeatureEnabled(betaEnv), false);
  assert.equal(await writeSiteFeatureEnabled(true, alphaEnv), true);
  assert.equal(await readSiteFeatureEnabled(alphaEnv), true);
  assert.equal(await readSiteFeatureEnabled(betaEnv), false);
  assert.equal(await writeSiteFeatureEnabled(true, betaEnv), true);
  assert.deepEqual(storageArea.snapshot()[KEY], { "system:abc": true, "system:def": true });
});

test("site feature toggle without a scope returns the default and never writes", async () => {
  const storageArea = createStorageArea({ [KEY]: { "system:abc": true } });
  assert.equal(await readSiteFeatureEnabled({ storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ scope: "", storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ hostname: "localhost", storageArea }), false);
  assert.equal(await writeSiteFeatureEnabled(true, { storageArea }), true);
  assert.equal(await writeSiteFeatureEnabled(true, { scope: "", storageArea }), true);
  assert.deepEqual(storageArea.snapshot()[KEY], { "system:abc": true });
});

test("local host fallback scopes read the legacy hostname record when they have no own entry", async () => {
  const storageArea = createStorageArea({
    [KEY]: { "legacy:localhost": true, "legacy:127.0.0.1": true, "legacy:[::1]": true }
  });
  assert.equal(await readSiteFeatureEnabled({ scope: "host:localhost:5173", storageArea }), true);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:localhost", storageArea }), true);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:127.0.0.1:8080", storageArea }), true);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:v6---1:3000", storageArea }), true);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:v6---1", storageArea }), true);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:dev.localhost:3000", storageArea }), false);
});

test("an own entry on the fallback scope overrides the legacy record", async () => {
  const storageArea = createStorageArea({
    [KEY]: { "legacy:localhost": true, "host:localhost:5173": false }
  });
  assert.equal(await readSiteFeatureEnabled({ scope: "host:localhost:5173", storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:localhost:3000", storageArea }), true);
});

test("legacy fallback does not apply to external hosts, system scopes or file scope", async () => {
  const storageArea = createStorageArea({
    [KEY]: { "legacy:example.com": true, "legacy:localhost": true, "legacy:local": true }
  });
  assert.equal(await readSiteFeatureEnabled({ scope: "host:example.com", storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ scope: "host:192.168.1.5:8080", storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ scope: "system:abc", storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ scope: "file:local", storageArea }), false);
  assert.equal(await readSiteFeatureEnabled({ scope: "legacy:localhost", storageArea }), true);
});

test("isScopeEnabledInMap applies the same own-entry and legacy local-host rules synchronously", () => {
  const map = { "host:localhost:5173": false, "legacy:localhost": true, "system:a": true };
  assert.equal(isScopeEnabledInMap(map, "system:a"), true);
  assert.equal(isScopeEnabledInMap(map, "host:localhost:5173"), false);
  assert.equal(isScopeEnabledInMap(map, "host:localhost:3000"), true);
  assert.equal(isScopeEnabledInMap(map, "host:example.com"), false);
  assert.equal(isScopeEnabledInMap({}, ""), false);
});

test("normalizeSiteFeatureEnabledMap keeps scope keys intact and coerces values to booleans", () => {
  assert.deepEqual(
    normalizeSiteFeatureEnabledMap({ "system:Abc": true, "host:localhost:5173": "yes", "": true, "legacy:x": false }),
    { "system:Abc": true, "host:localhost:5173": false, "legacy:x": false }
  );
  assert.deepEqual(normalizeSiteFeatureEnabledMap(null), {});
  assert.deepEqual(normalizeSiteFeatureEnabledMap([true]), {});
});
