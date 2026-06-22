import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../extension/background.js"), "utf8");

function createEvent() {
  return {
    addListener() {}
  };
}

test("background boots when contextMenus.onShown is unavailable", () => {
  const chrome = {
    action: { onClicked: createEvent() },
    contextMenus: {
      create() {},
      onClicked: createEvent(),
      removeAll(callback) {
        if (callback) callback();
      },
      update(_id, _props, callback) {
        if (callback) callback();
      }
    },
    runtime: {
      getManifest() {
        return { version: "0.3.5" };
      },
      lastError: null,
      onInstalled: createEvent(),
      onMessage: createEvent(),
      onStartup: createEvent()
    },
    storage: {
      local: {
        get(_keys, callback) {
          callback({});
        }
      },
      onChanged: createEvent()
    },
    tabs: {
      create() {},
      get(_tabId, callback) {
        callback({ id: 1, url: "https://example.com/form" });
      },
      onActivated: createEvent(),
      onUpdated: createEvent(),
      query(_queryInfo, callback) {
        callback([{ id: 1, url: "https://example.com/form" }]);
      },
      sendMessage() {}
    }
  };

  assert.doesNotThrow(function () {
    vm.runInNewContext(script, {
      URL,
      chrome,
      console,
      fetch() {
        throw new Error("not used");
      },
      globalThis: {
        ChromeTestDataFieldVisibility: {
          STORAGE_KEY: "ctdp.visibleFieldKeys.v1",
          isFieldVisible() {
            return true;
          },
          readVisibleFieldKeys() {
            return Promise.resolve([]);
          },
          writeVisibleFieldKeys() {
            return Promise.resolve([]);
          }
        },
        ChromeTestDataSiteFeatureToggle: {
          STORAGE_KEY: "ctdp.siteFeatureEnabled.v1",
          getDefaultSiteFeatureEnabled() {
            return true;
          },
          isSiteFeatureEnabled(value) {
            return value !== false;
          },
          normalizeSiteFeatureEnabledMap(value) {
            return value && typeof value === "object" ? value : {};
          },
          readSiteFeatureEnabledMap() {
            return Promise.resolve({});
          }
        },
        ChromeTestDataSmartFill: {
          formatSmartFillButtonLabel(fieldKey) {
            return fieldKey;
          },
          getSupportedFieldKeys() {
            return ["mobile"];
          }
        }
      },
      importScripts() {}
    });
  });
});

test("background accepts explicit site feature menu sync messages", () => {
  let onMessageListener = null;
  let updateCall = null;

  const chrome = {
    action: { onClicked: createEvent() },
    contextMenus: {
      create() {},
      onClicked: createEvent(),
      removeAll(callback) {
        if (callback) callback();
      },
      update(id, props, callback) {
        updateCall = { id, props };
        if (callback) callback();
      }
    },
    runtime: {
      getManifest() {
        return { version: "0.3.5" };
      },
      lastError: null,
      onInstalled: createEvent(),
      onMessage: {
        addListener(listener) {
          onMessageListener = listener;
        }
      },
      onStartup: createEvent()
    },
    storage: {
      local: {
        get(_keys, callback) {
          callback({});
        }
      },
      onChanged: createEvent()
    },
    tabs: {
      create() {},
      get(_tabId, callback) {
        callback({ id: 1, url: "https://example.com/form" });
      },
      onActivated: createEvent(),
      onUpdated: createEvent(),
      query(_queryInfo, callback) {
        callback([{ id: 1, url: "https://example.com/form" }]);
      },
      sendMessage() {}
    }
  };

  vm.runInNewContext(script, {
    URL,
    chrome,
    console,
    fetch() {
      throw new Error("not used");
    },
    globalThis: {
      ChromeTestDataFieldVisibility: {
        STORAGE_KEY: "ctdp.visibleFieldKeys.v1",
        isFieldVisible() {
          return true;
        },
        readVisibleFieldKeys() {
          return Promise.resolve([]);
        },
        writeVisibleFieldKeys() {
          return Promise.resolve([]);
        }
      },
      ChromeTestDataSiteFeatureToggle: {
        STORAGE_KEY: "ctdp.siteFeatureEnabled.v1",
        getDefaultSiteFeatureEnabled() {
          return true;
        },
        isSiteFeatureEnabled(value) {
          return value !== false;
        },
        normalizeSiteFeatureEnabledMap(value) {
          return value && typeof value === "object" ? value : {};
        },
        readSiteFeatureEnabledMap() {
          return Promise.resolve({});
        }
      },
      ChromeTestDataSmartFill: {
        formatSmartFillButtonLabel(fieldKey) {
          return fieldKey;
        },
        getSupportedFieldKeys() {
          return ["mobile"];
        }
      }
    },
    importScripts() {}
  });

  assert.equal(typeof onMessageListener, "function");
  onMessageListener({ type: "sync-site-feature-context-menu", enabled: false }, {}, function () {});
  assert.equal(updateCall.id, "ctdp-manual-annotation-root");
  assert.equal(updateCall.props.visible, false);
});

test("background opens the data manager page with a normalized scope", () => {
  let onMessageListener = null;
  let createdTab = null;

  const chrome = {
    action: { onClicked: createEvent() },
    contextMenus: {
      create() {},
      onClicked: createEvent(),
      removeAll(callback) {
        if (callback) callback();
      },
      update(_id, _props, callback) {
        if (callback) callback();
      }
    },
    runtime: {
      getManifest() {
        return { version: "0.3.5" };
      },
      getURL(path) {
        return "chrome-extension://testing/" + path;
      },
      lastError: null,
      onInstalled: createEvent(),
      onMessage: {
        addListener(listener) {
          onMessageListener = listener;
        }
      },
      onStartup: createEvent()
    },
    storage: {
      local: {
        get(_keys, callback) {
          callback({});
        }
      },
      onChanged: createEvent()
    },
    tabs: {
      create(payload) {
        createdTab = payload;
      },
      get(_tabId, callback) {
        callback({ id: 1, url: "https://example.com/form" });
      },
      onActivated: createEvent(),
      onUpdated: createEvent(),
      query(_queryInfo, callback) {
        callback([{ id: 1, url: "https://example.com/form" }]);
      },
      sendMessage() {}
    }
  };

  vm.runInNewContext(script, {
    URL,
    chrome,
    console,
    fetch() {
      throw new Error("not used");
    },
    globalThis: {
      ChromeTestDataDataManagerBridge: {
        buildDataManagerPageUrl(baseUrl, scope) {
          return baseUrl + "data-manager.html?scope=" + String(scope || "").trim().toLowerCase() + "&view=favorites";
        }
      },
      ChromeTestDataFieldVisibility: {
        STORAGE_KEY: "ctdp.visibleFieldKeys.v1",
        isFieldVisible() {
          return true;
        },
        readVisibleFieldKeys() {
          return Promise.resolve([]);
        },
        writeVisibleFieldKeys() {
          return Promise.resolve([]);
        }
      },
      ChromeTestDataSiteFeatureToggle: {
        STORAGE_KEY: "ctdp.siteFeatureEnabled.v1",
        getDefaultSiteFeatureEnabled() {
          return true;
        },
        isSiteFeatureEnabled(value) {
          return value !== false;
        },
        normalizeSiteFeatureEnabledMap(value) {
          return value && typeof value === "object" ? value : {};
        },
        readSiteFeatureEnabledMap() {
          return Promise.resolve({});
        }
      },
      ChromeTestDataSmartFill: {
        formatSmartFillButtonLabel(fieldKey) {
          return fieldKey;
        },
        getSupportedFieldKeys() {
          return ["mobile"];
        }
      }
    },
    importScripts() {}
  });

  assert.equal(typeof onMessageListener, "function");
  onMessageListener({ type: "open-data-manager-page", scope: " Example.COM " }, {}, function () {});
  assert.equal(createdTab && createdTab.url, "chrome-extension://testing/data-manager.html?scope=example.com&view=favorites");
});

test("background exposes storage mirror runtime messages", async () => {
  let onMessageListener = null;
  const calls = [];

  const chrome = {
    action: { onClicked: createEvent() },
    contextMenus: {
      create() {},
      onClicked: createEvent(),
      removeAll(callback) {
        if (callback) callback();
      },
      update(_id, _props, callback) {
        if (callback) callback();
      }
    },
    runtime: {
      getManifest() {
        return { version: "0.3.5" };
      },
      lastError: null,
      onInstalled: createEvent(),
      onMessage: {
        addListener(listener) {
          onMessageListener = listener;
        }
      },
      onStartup: createEvent()
    },
    storage: {
      local: {
        get(_keys, callback) {
          callback({});
        }
      },
      onChanged: createEvent()
    },
    tabs: {
      create() {},
      get(_tabId, callback) {
        callback({ id: 1, url: "https://example.com/form" });
      },
      onActivated: createEvent(),
      onUpdated: createEvent(),
      query(_queryInfo, callback) {
        callback([{ id: 1, url: "https://example.com/form" }]);
      },
      sendMessage() {}
    }
  };

  vm.runInNewContext(script, {
    URL,
    chrome,
    console,
    fetch() {
      throw new Error("not used");
    },
    globalThis: {
      ChromeTestDataFieldVisibility: {
        STORAGE_KEY: "ctdp.visibleFieldKeys.v1",
        isFieldVisible() {
          return true;
        },
        readVisibleFieldKeys() {
          return Promise.resolve([]);
        },
        writeVisibleFieldKeys() {
          return Promise.resolve([]);
        }
      },
      ChromeTestDataSiteFeatureToggle: {
        STORAGE_KEY: "ctdp.siteFeatureEnabled.v1",
        getDefaultSiteFeatureEnabled() {
          return true;
        },
        isSiteFeatureEnabled(value) {
          return value !== false;
        },
        normalizeSiteFeatureEnabledMap(value) {
          return value && typeof value === "object" ? value : {};
        },
        readSiteFeatureEnabledMap() {
          return Promise.resolve({});
        }
      },
      ChromeTestDataSmartFill: {
        formatSmartFillButtonLabel(fieldKey) {
          return fieldKey;
        },
        getSupportedFieldKeys() {
          return ["mobile"];
        }
      },
      ChromeTestDataStorageMirror: {
        mirrorStorageLocalToIndexedDb() {
          calls.push("mirror");
          return Promise.resolve({ ok: true });
        },
        restoreStorageLocalFromIndexedDbIfEmpty() {
          calls.push("restore");
          return Promise.resolve({ restored: true });
        }
      }
    },
    importScripts() {}
  });

  assert.equal(typeof onMessageListener, "function");
  const mirrorResponse = await new Promise(function (resolve) {
    assert.equal(onMessageListener({ type: "mirror-storage-local" }, {}, resolve), true);
  });
  const restoreResponse = await new Promise(function (resolve) {
    assert.equal(onMessageListener({ type: "restore-storage-local-mirror" }, {}, resolve), true);
  });

  assert.deepEqual(calls, ["restore", "mirror", "restore"]);
  assert.equal(mirrorResponse.ok, true);
  assert.equal(restoreResponse.ok, true);
  assert.equal(restoreResponse.restored, true);
});
