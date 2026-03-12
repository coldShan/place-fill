import test from "node:test";
import assert from "node:assert/strict";
import siteFeatureTogglePkg from "../extension/src/site-feature-toggle.js";

const {
  getDefaultSiteFeatureEnabled,
  isSiteFeatureEnabled,
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
    }
  };
}

test("site feature toggle defaults to enabled when storage is empty or invalid", async () => {
  assert.equal(getDefaultSiteFeatureEnabled(), true);
  assert.equal(isSiteFeatureEnabled(undefined), true);
  assert.equal(isSiteFeatureEnabled(false), false);
  assert.equal(
    await readSiteFeatureEnabled({
      location: { hostname: "alpha.example.com" },
      storageArea: createStorageArea()
    }),
    true
  );
  assert.equal(
    await readSiteFeatureEnabled({
      location: { hostname: "alpha.example.com" },
      storageArea: createStorageArea({
        "ctdp.siteFeatureEnabled.v1": "broken"
      })
    }),
    true
  );
});

test("site feature toggle persists boolean state by hostname", async () => {
  const storageArea = createStorageArea();
  const alphaEnv = { location: { hostname: "alpha.example.com" }, storageArea };
  const betaEnv = { location: { hostname: "beta.example.com" }, storageArea };

  assert.equal(await writeSiteFeatureEnabled(false, alphaEnv), false);
  assert.equal(await readSiteFeatureEnabled(alphaEnv), false);
  assert.equal(await readSiteFeatureEnabled(betaEnv), true);
  assert.equal(await writeSiteFeatureEnabled(true, alphaEnv), true);
  assert.equal(await readSiteFeatureEnabled(alphaEnv), true);
});
