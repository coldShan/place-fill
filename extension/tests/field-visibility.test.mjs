import test from "node:test";
import assert from "node:assert/strict";
import fieldVisibilityPkg from "../src/field-visibility.js";

const {
  filterVisibleFieldKeys,
  getDefaultVisibleFieldKeys,
  isFieldVisible,
  readVisibleFieldKeys,
  writeVisibleFieldKeys
} = fieldVisibilityPkg;

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

test("field visibility defaults to the first six core fill items", () => {
  assert.deepEqual(getDefaultVisibleFieldKeys(), ["creditCode", "companyName", "fullName", "idNumber", "bankCard", "mobile"]);
});

test("field visibility falls back to defaults when storage is empty or invalid", async () => {
  assert.deepEqual(
    await readVisibleFieldKeys({
      location: { hostname: "alpha.example.com" },
      storageArea: createStorageArea()
    }),
    getDefaultVisibleFieldKeys()
  );
  assert.deepEqual(
    await readVisibleFieldKeys({
      location: { hostname: "alpha.example.com" },
      storageArea: createStorageArea({
        "ctdp.visibleFieldKeys.v1": {
          "alpha.example.com": ["unknown", "address", "unknown"]
        }
      })
    }),
    ["address"]
  );
  assert.deepEqual(
    await readVisibleFieldKeys({
      location: { hostname: "alpha.example.com" },
      storageArea: createStorageArea({
        "ctdp.visibleFieldKeys.v1": "broken"
      })
    }),
    getDefaultVisibleFieldKeys()
  );
});

test("field visibility persists normalized selections in field metadata order", async () => {
  const storageArea = createStorageArea();
  const alphaEnv = { location: { hostname: "alpha.example.com" }, storageArea };
  const betaEnv = { location: { hostname: "beta.example.com" }, storageArea };
  const visibleFieldKeys = await writeVisibleFieldKeys(["mobile", "companyName", "companyName", "address"], alphaEnv);

  assert.deepEqual(visibleFieldKeys, ["companyName", "mobile", "address"]);
  assert.deepEqual(await readVisibleFieldKeys(alphaEnv), ["companyName", "mobile", "address"]);
  assert.deepEqual(await readVisibleFieldKeys(betaEnv), getDefaultVisibleFieldKeys());
});

test("field visibility helpers filter and check supported visible field keys", () => {
  assert.deepEqual(filterVisibleFieldKeys(["creditCode", "email", "mobile", "address"], ["mobile", "address"]), ["mobile", "address"]);
  assert.equal(isFieldVisible("mobile", ["companyName", "mobile"]), true);
  assert.equal(isFieldVisible("email", ["companyName", "mobile"]), false);
});
