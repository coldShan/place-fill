import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  DATA_MANAGER_PAGE_ASSETS,
  loadDataManagerPage,
  resolveAssetUrl
} from "../extension/src/data-manager-loader.js";

const baseUrl = "chrome-extension://testing/";

function createFetch(files, calls = []) {
  return async function (url, init) {
    calls.push({ url, init });
    const path = new URL(url).pathname.slice(1);
    if (!(path in files)) return { ok: false };
    return {
      ok: true,
      async arrayBuffer() {
        return new TextEncoder().encode(files[path]).buffer;
      }
    };
  };
}

function createDocument() {
  const appended = [];
  function createElement(tagName) {
    const listeners = {};
    return {
      tagName,
      addEventListener(type, listener) {
        listeners[type] = listener;
      },
      fire(type) {
        if (listeners[type]) listeners[type]();
      }
    };
  }
  function container(name) {
    return {
      appendChild(element) {
        appended.push({ container: name, element });
        queueMicrotask(function () {
          element.fire("load");
        });
      }
    };
  }
  return { appended, createElement, head: container("head"), body: container("body") };
}

test("resolveAssetUrl fingerprints content and bypasses the HTTP cache", async () => {
  const calls = [];
  const deps = { baseUrl, fallbackVersion: "0.9.9", subtle: webcrypto.subtle };
  const first = await resolveAssetUrl("generated/data-manager.js", {
    ...deps,
    fetchImpl: createFetch({ "generated/data-manager.js": "old build" }, calls)
  });
  const second = await resolveAssetUrl("generated/data-manager.js", {
    ...deps,
    fetchImpl: createFetch({ "generated/data-manager.js": "new build" })
  });

  assert.match(first, /^chrome-extension:\/\/testing\/generated\/data-manager\.js\?v=[0-9a-f]{16}$/);
  assert.notEqual(first, second, "same version but different content must get a different URL");
  assert.deepEqual(calls[0].init, { cache: "no-store" });
});

test("resolveAssetUrl falls back to the manifest version when fetching fails", async () => {
  const url = await resolveAssetUrl("src/theme.css", {
    baseUrl,
    fallbackVersion: "0.9.9",
    fetchImpl: createFetch({}),
    subtle: webcrypto.subtle
  });

  assert.equal(url, "chrome-extension://testing/src/theme.css?v=0.9.9");
});

test("loadDataManagerPage attaches styles and scripts before importing the app module", async () => {
  const files = Object.fromEntries(DATA_MANAGER_PAGE_ASSETS.map(function (asset) {
    return [asset.path, "content of " + asset.path];
  }));
  const doc = createDocument();
  let appendedBeforeImport = -1;
  const imported = [];

  await loadDataManagerPage({
    baseUrl,
    doc,
    fallbackVersion: "0.9.9",
    fetchImpl: createFetch(files),
    async importModule(href) {
      appendedBeforeImport = doc.appended.length;
      imported.push(href);
    },
    subtle: webcrypto.subtle
  });

  assert.deepEqual(
    doc.appended.map(function ({ container, element }) {
      return [container, element.tagName, new URL(element.href || element.src).pathname];
    }),
    [
      ["head", "link", "/src/theme.css"],
      ["head", "link", "/generated/data-manager.css"],
      ["body", "script", "/src/icon-assets.js"],
      ["body", "script", "/src/generators.js"]
    ]
  );
  assert.equal(doc.appended[0].element.rel, "stylesheet");
  assert.equal(doc.appended[2].element.async, false);
  assert.equal(appendedBeforeImport, 4);
  assert.equal(imported.length, 1);
  assert.match(imported[0], /\/generated\/data-manager\.js\?v=[0-9a-f]{16}$/);
});
