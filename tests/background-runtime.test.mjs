import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import aiRecognitionPkg from "../extension/src/ai-recognition.js";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../extension/background.js"), "utf8");

function createEvent() {
  return {
    addListener() {}
  };
}

test("background boots when contextMenus.onShown is unavailable", () => {
  const importedScripts = [];
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
      navigator: { userAgent: "Mozilla/5.0 Chrome/109.0.0.0 Safari/537.36" },
      importScripts(...paths) {
        importedScripts.push(...paths);
      }
    });
  });
  assert.equal(importedScripts.includes("src/local-annotation-file.js"), false);
});

test("background accepts explicit site feature menu sync messages", () => {
  let onMessageListener = null;
  const updateCalls = [];

  const chrome = {
    action: { onClicked: createEvent() },
    contextMenus: {
      create() {},
      onClicked: createEvent(),
      removeAll(callback) {
        if (callback) callback();
      },
      update(id, props, callback) {
        updateCalls.push({ id, props });
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
  updateCalls.length = 0;
  onMessageListener({ type: "sync-site-feature-context-menu", enabled: false }, {}, function () {});
  assert.deepEqual(updateCalls.map(function (call) { return call.id; }), [
    "ctdp-manual-annotation-root",
    "ctdp-add-current-page-favorite"
  ]);
  assert.equal(updateCalls.every(function (call) { return call.props.visible === false; }), true);
});

test("background opens the data manager and backup directory pages", () => {
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
      ChromeTestDataLocalAnnotationFile: {},
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
  assert.equal(createdTab && createdTab.url, "chrome-extension://testing/data-manager.html?scope=example.com&view=favorites&v=0.3.5");

  let response = null;
  onMessageListener({ type: "open-local-annotation-permission" }, {}, function (value) { response = value; });
  assert.equal(createdTab.url, "chrome-extension://testing/local-annotation-permission.html");
  assert.equal(response && response.ok, true);
  onMessageListener({ type: "open-local-annotation-permission", mode: "change" }, {}, function () {});
  assert.equal(createdTab.url, "chrome-extension://testing/local-annotation-permission.html?mode=change");
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

test("background exposes ai recognition config permission and classification messages", async () => {
  let onMessageListener = null;
  const permissionRequests = [];
  const fetchCalls = [];
  let createdTab = null;
  const stored = {};
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
    permissions: {
      contains(payload, callback) {
        callback(permissionRequests.some(function (origin) {
          return payload.origins && payload.origins.includes(origin);
        }));
      },
      request(payload, callback) {
        permissionRequests.push(payload.origins[0]);
        callback(true);
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
        get(keys, callback) {
          const result = {};
          (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(stored, key)) result[key] = stored[key];
          });
          callback(result);
        },
        remove(keys, callback) {
          (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
            delete stored[key];
          });
          if (callback) callback();
        },
        set(values, callback) {
          Object.assign(stored, values);
          if (callback) callback();
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
    AbortController,
    URL,
    chrome,
    clearTimeout,
    console,
    fetch(url, options) {
      fetchCalls.push({ url, body: JSON.parse(options.body) });
      return Promise.resolve({
        ok: true,
        status: 200,
        json() {
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    fields: [{ fingerprint: "field-1", fieldKey: "mobile", confidence: 0.91 }]
                  })
                }
              }
            ]
          });
        }
      });
    },
    globalThis: {
      ChromeTestDataAiRecognition: {
        ...aiRecognitionPkg,
        readAiRecognitionConfig() {
          return Promise.resolve(aiRecognitionPkg.normalizeAiRecognitionConfig(stored["ctdp.aiRecognitionConfig.v1"]));
        },
        writeAiRecognitionConfig(config) {
          stored["ctdp.aiRecognitionConfig.v1"] = aiRecognitionPkg.normalizeAiRecognitionConfig(config);
          return Promise.resolve(stored["ctdp.aiRecognitionConfig.v1"]);
        },
        classifyFormFields(options) {
          return aiRecognitionPkg.classifyFormFields(options);
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
    importScripts() {},
    setTimeout
  });

  const saved = await new Promise(function (resolve) {
    assert.equal(onMessageListener({
      type: "save-ai-recognition-config",
      config: {
        enabled: true,
        baseUrl: "https://api.example.com/v1",
        apiKey: "sk-secret",
        model: "compatible-model"
      }
    }, {}, resolve), true);
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.config.hasApiKey, true);
  assert.equal(saved.config.apiKey, undefined);
  assert.equal(saved.permissionPageOpened, true);
  assert.deepEqual(permissionRequests, []);
  assert.equal(createdTab && createdTab.url, "chrome-extension://testing/ai-permission.html?origin=https%3A%2F%2Fapi.example.com");

  permissionRequests.push("https://api.example.com/*");

  const classified = await new Promise(function (resolve) {
    assert.equal(onMessageListener({
      type: "classify-form-fields",
      snapshot: {
        fields: [{ fingerprint: "field-1", placeholder: "联系电话" }],
        allowedFieldKeys: ["mobile"]
      }
    }, {}, resolve), true);
  });

  assert.equal(fetchCalls[0].url, "https://api.example.com/v1/chat/completions");
  assert.deepEqual(classified.fields, [{ fingerprint: "field-1", fieldKey: "mobile", confidence: 0.91 }]);
});

// ---------------------------------------------------------------------------
// System scope: tab scopes, resolution messages, migration triggers
// ---------------------------------------------------------------------------

const extensionRoot = join(here, "../extension");
const SITE_KEY = "ctdp.siteFeatureEnabled.v1";
const SYSTEMS_KEY = "ctdp.systemProfiles.v1";
const FAVORITES_KEY = "ctdp.favoriteProfiles.v1";
const BACKUP_PENDING_KEY = "ctdp.backupReminderPendingAt.v1";

function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createEmptyProfile() {
  return {
    creditCode: "", companyName: "", fullName: "", idNumber: "", bankCard: "", account: "",
    mobile: "", email: "", landline: "", address: "", postalCode: ""
  };
}

function favoriteRecord(id) {
  return { id, name: "常用" + id, note: "", createdAt: "100", updatedAt: "100", profile: createEmptyProfile() };
}

function pageInfo(url, title) {
  const parsed = new URL(url);
  const query = {};
  parsed.searchParams.forEach(function (value, key) { query[key] = value; });
  const segments = parsed.pathname.split("/").filter(Boolean);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    query,
    lastPath: segments.length ? segments[segments.length - 1] : "",
    title,
    origin: parsed.origin,
    pathname: parsed.pathname
  };
}

function createScopeHarness(options = {}) {
  const local = Object.assign({}, options.local || {});
  const session = Object.assign({}, options.session || {});
  const hasSession = options.session !== null;
  const changeListeners = [];
  const removedListeners = [];
  const messageListeners = [];
  const sentMessages = [];
  const localSets = [];
  const menuUpdates = [];
  const importedScripts = [];
  const listeners = {};
  const tabs = Object.assign({}, options.tabs || {});
  let idCounter = 0;

  function capture(name) {
    return { addListener(listener) { listeners[name] = listener; } };
  }

  function makeArea(store, record) {
    return {
      get(keys, callback) {
        const result = {};
        (Array.isArray(keys) ? keys : [keys]).forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(store, key)) result[key] = JSON.parse(JSON.stringify(store[key]));
        });
        callback(result);
      },
      remove(keys, callback) {
        (Array.isArray(keys) ? keys : [keys]).forEach(function (key) { delete store[key]; });
        if (callback) callback();
      },
      set(values, callback) {
        const changes = {};
        Object.keys(values).forEach(function (key) {
          changes[key] = { oldValue: store[key], newValue: JSON.parse(JSON.stringify(values[key])) };
          store[key] = JSON.parse(JSON.stringify(values[key]));
        });
        if (record) localSets.push(Object.keys(values));
        if (callback) callback();
        if (record) {
          changeListeners.forEach(function (listener) { listener(changes, "local"); });
        }
      }
    };
  }

  const chrome = {
    action: { onClicked: createEvent() },
    contextMenus: {
      create() {},
      onClicked: capture("contextMenusClicked"),
      onShown: capture("contextMenusShown"),
      removeAll(callback) { if (callback) callback(); },
      update(id, props, callback) {
        menuUpdates.push({ id, visible: props.visible });
        if (callback) callback();
      }
    },
    runtime: {
      getManifest() { return { version: "0.3.5" }; },
      getURL(path) { return "chrome-extension://testing/" + path; },
      lastError: null,
      onInstalled: createEvent(),
      onMessage: { addListener(listener) { messageListeners.push(listener); } },
      onStartup: createEvent()
    },
    storage: {
      local: makeArea(local, true),
      onChanged: { addListener(listener) { changeListeners.push(listener); } }
    },
    tabs: {
      create(payload) { harness.createdTab = payload; },
      get(tabId, callback) { callback(tabs[tabId] || { id: tabId, url: "https://example.com/form" }); },
      onActivated: createEvent(),
      onRemoved: { addListener(listener) { removedListeners.push(listener); } },
      onUpdated: capture("tabsUpdated"),
      query(_queryInfo, callback) { callback(options.activeTabs || []); },
      sendMessage(tabId, message, ...rest) {
        sentMessages.push({ tabId, message, options: rest.length > 1 ? rest[0] : undefined });
        const callback = rest[rest.length - 1];
        if (typeof callback === "function") callback();
      }
    }
  };
  if (hasSession) chrome.storage.session = makeArea(session, false);

  const sandbox = {
    URL,
    URLSearchParams,
    chrome,
    console,
    setTimeout,
    clearTimeout,
    fetch() { throw new Error("not used"); },
    navigator: { userAgent: "Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36" },
    crypto: { randomUUID() { idCounter += 1; return "id-" + idCounter; } },
    ChromeTestDataDataManagerBridge: {
      buildDataManagerPageUrl(baseUrl, scope, view) {
        return baseUrl + "data-manager.html?scope=" + scope + "&view=" + (view || "favorites");
      }
    }
  };
  sandbox.importScripts = function (...paths) {
    importedScripts.push(...paths);
    paths.forEach(function (path) {
      if (path === "generated/system-scope-api.js" || path === "src/site-feature-toggle.js") {
        vm.runInContext(readFileSync(join(extensionRoot, path), "utf8"), sandbox);
      }
    });
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);

  function send(message, sender) {
    return new Promise(function (resolve) {
      const returned = messageListeners[0](message, sender || {}, function (value) { resolve(plain(value)); });
      if (returned !== true) resolve("no-async-response");
    });
  }

  const harness = {
    chrome, local, session, tabs, importedScripts, sentMessages, localSets, menuUpdates, listeners, send,
    changeListeners, removedListeners, createdTab: null,
    topFrame(tabId) { return { tab: { id: tabId }, frameId: 0 }; },
    async settle() {
      for (let i = 0; i < 30; i += 1) await new Promise(function (resolve) { setImmediate(resolve); });
    }
  };
  return harness;
}

function seedSystem(id, name, titles, environments) {
  return {
    id, name, titles,
    environments: environments.map(function (item, index) {
      return Object.assign({ id: id + "-env" + index, hostname: "localhost", port: "", query: {}, lastPath: "", autoAdded: false, createdAt: 1 }, item);
    }),
    anomalies: [], createdAt: 1, updatedAt: 1
  };
}

test("background imports system-scope-api before the site feature toggle", () => {
  const harness = createScopeHarness();
  const imports = harness.importedScripts;
  assert.ok(imports.includes("generated/system-scope-api.js"));
  assert.ok(imports.indexOf("generated/system-scope-api.js") < imports.indexOf("src/site-feature-toggle.js"));
  assert.ok(imports.indexOf("src/field-meta.js") < imports.indexOf("generated/system-scope-api.js"));
});

test("resolve-page-scope only accepts the top frame", async () => {
  const harness = createScopeHarness();
  const info = pageInfo("https://example.com/app", "App");
  const rejected = await harness.send({ type: "resolve-page-scope", info, marker: null }, { tab: { id: 1 }, frameId: 3 });
  assert.equal(rejected, null);
  assert.equal(await harness.send({ type: "get-tab-scope" }, { tab: { id: 1 }, frameId: 3 }), null);
  const accepted = await harness.send({ type: "resolve-page-scope", info, marker: null }, harness.topFrame(1));
  assert.equal(accepted.scope, "host:example.com");
});

test("tabs on the same localhost port keep their own system scope", async () => {
  const harness = createScopeHarness({
    local: {
      [SYSTEMS_KEY]: [
        seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }]),
        seedSystem("sys-b", "系统B", ["系统B"], [{ port: "5173" }])
      ]
    }
  });
  const url = "http://localhost:5173/index";
  await harness.send({ type: "resolve-page-scope", info: pageInfo(url, "用户列表 - 系统A"), marker: null }, harness.topFrame(1));
  await harness.send({ type: "resolve-page-scope", info: pageInfo(url, "用户列表 - 系统B"), marker: null }, harness.topFrame(2));
  const frameOfTab1 = { tab: { id: 1 }, frameId: 5 };
  const frameOfTab2 = { tab: { id: 2 }, frameId: 7 };
  assert.equal((await harness.send({ type: "get-tab-scope" }, frameOfTab1)).scope, "system:sys-a");
  assert.equal((await harness.send({ type: "get-tab-scope" }, frameOfTab2)).scope, "system:sys-b");
});

test("resolve-page-scope persists tab scopes in session storage and broadcasts to all frames", async () => {
  const harness = createScopeHarness();
  const info = pageInfo("https://example.com/app", "App");
  const resolution = await harness.send({ type: "resolve-page-scope", info, marker: null }, harness.topFrame(4));
  assert.equal(harness.session["ctdp.tabScopes"]["4"].scope, "host:example.com");
  const broadcast = harness.sentMessages.filter(function (item) { return item.message.type === "page-scope-changed"; });
  assert.equal(broadcast.length, 1);
  assert.equal(broadcast[0].tabId, 4);
  assert.equal(broadcast[0].options, undefined);
  assert.deepEqual(plain(broadcast[0].message.resolution), resolution);
});

test("tab scopes survive a service worker restart through session storage", async () => {
  const session = { "ctdp.tabScopes": { 9: { scope: "system:s1", fallbackScope: "host:a.com", system: { id: "s1", name: "S" }, marker: null } } };
  const harness = createScopeHarness({ session });
  assert.equal((await harness.send({ type: "get-tab-scope" }, { tab: { id: 9 }, frameId: 2 })).scope, "system:s1");
});

test("tab scopes fall back to memory when chrome.storage.session is unavailable", async () => {
  const harness = createScopeHarness({ session: null });
  await harness.send({ type: "resolve-page-scope", info: pageInfo("https://example.com/a", "A"), marker: null }, harness.topFrame(3));
  assert.equal((await harness.send({ type: "get-tab-scope" }, { tab: { id: 3 }, frameId: 1 })).scope, "host:example.com");
});

test("tabs.onRemoved clears the stored tab scope", async () => {
  const harness = createScopeHarness();
  await harness.send({ type: "resolve-page-scope", info: pageInfo("https://example.com/a", "A"), marker: null }, harness.topFrame(5));
  assert.equal((await harness.send({ type: "get-tab-scope" }, { tab: { id: 5 }, frameId: 1 })).scope, "host:example.com");
  harness.removedListeners.forEach(function (listener) { listener(5); });
  await harness.settle();
  assert.equal(await harness.send({ type: "get-tab-scope" }, { tab: { id: 5 }, frameId: 1 }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(harness.session["ctdp.tabScopes"] || {}, "5"), false);
});

test("get-tab-scope returns null for an unknown tab or a sender without a tab", async () => {
  const harness = createScopeHarness();
  assert.equal(await harness.send({ type: "get-tab-scope" }, { tab: { id: 77 }, frameId: 1 }), null);
  assert.equal(await harness.send({ type: "get-tab-scope" }, {}), null);
});

test("enabling the switch on a fallback scope creates and persists a system", async () => {
  const harness = createScopeHarness();
  const info = pageInfo("http://localhost:5173/index", "客户管理");
  const before = await harness.send({ type: "resolve-page-scope", info, marker: null }, harness.topFrame(1));
  assert.equal(before.scope, "host:localhost:5173");
  const after = await harness.send(
    { type: "set-site-feature-enabled", enabled: true, scope: before.scope, info, marker: null },
    harness.topFrame(1)
  );
  assert.equal(after.scope.startsWith("system:"), true);
  assert.equal(after.system.name, "客户管理");
  assert.equal(harness.local[SYSTEMS_KEY].length, 1);
  // The switch moves from the fallback scope onto the new system.
  assert.equal(harness.local[SITE_KEY][after.scope], true);
  assert.equal((await harness.send({ type: "get-tab-scope" }, { tab: { id: 1 }, frameId: 2 })).scope, after.scope);
});

test("disabling the switch keeps the system and resolves to the same scope", async () => {
  const harness = createScopeHarness();
  const info = pageInfo("http://localhost:5173/index", "客户管理");
  const created = await harness.send(
    { type: "set-site-feature-enabled", enabled: true, scope: "host:localhost:5173", info, marker: null },
    harness.topFrame(1)
  );
  const disabled = await harness.send(
    { type: "set-site-feature-enabled", enabled: false, scope: created.scope, info, marker: created.marker },
    harness.topFrame(1)
  );
  assert.equal(disabled.scope, created.scope);
  assert.equal(harness.local[SITE_KEY][created.scope], false);
  assert.equal(harness.local[SYSTEMS_KEY].length, 1);
});

test("select-system pins the tab to a chosen system and null restores auto recognition", async () => {
  const harness = createScopeHarness({
    local: { [SYSTEMS_KEY]: [seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }])] }
  });
  const info = pageInfo("http://localhost:5173/x", "其他页面");
  const picked = await harness.send({ type: "select-system", systemId: "sys-a", info }, harness.topFrame(1));
  assert.equal(picked.scope, "system:sys-a");
  assert.deepEqual(picked.marker, { id: "sys-a", name: "系统A", manual: true });
  assert.equal((await harness.send({ type: "get-tab-scope" }, { tab: { id: 1 }, frameId: 1 })).scope, "system:sys-a");
  assert.equal(harness.sentMessages.some(function (item) {
    return item.message.type === "page-scope-changed" && item.message.resolution.scope === "system:sys-a";
  }), true);

  const restored = await harness.send({ type: "select-system", systemId: null, info }, harness.topFrame(1));
  assert.equal(restored.scope, "host:localhost:5173");
  assert.equal(restored.marker, null);
  assert.equal((await harness.send({ type: "get-tab-scope" }, { tab: { id: 1 }, frameId: 1 })).scope, "host:localhost:5173");
});

test("list-systems returns id and name only", async () => {
  const harness = createScopeHarness({
    local: { [SYSTEMS_KEY]: [seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }])] }
  });
  assert.deepEqual(await harness.send({ type: "list-systems" }), [{ id: "sys-a", name: "系统A" }]);
});

test("registry writes run through one serial queue", async () => {
  const harness = createScopeHarness();
  const infoA = pageInfo("http://localhost:5001/", "甲系统");
  const infoB = pageInfo("http://localhost:5002/", "乙系统");
  await harness.send({ type: "set-site-feature-enabled", enabled: true, scope: "host:localhost:5001", info: infoA, marker: null }, harness.topFrame(1));
  const results = await Promise.all([
    harness.send({ type: "set-site-feature-enabled", enabled: true, scope: "host:localhost:5002", info: infoB, marker: null }, harness.topFrame(2)),
    harness.send({ type: "resolve-page-scope", info: infoA, marker: null }, harness.topFrame(1)),
    harness.send({ type: "list-systems" })
  ]);
  assert.equal(harness.local[SYSTEMS_KEY].length, 2);
  assert.equal(results[1].scope.startsWith("system:"), true);
});

test("open-data-manager-page passes the requested view through", async () => {
  const harness = createScopeHarness();
  await harness.send({ type: "open-data-manager-page", scope: "system:a", view: "systems" });
  assert.match(harness.createdTab.url, /scope=system%3Aa&view=systems/);
  await harness.send({ type: "open-data-manager-page", scope: "system:a" });
  assert.match(harness.createdTab.url, /scope=system%3Aa&view=favorites/);
});

test("migration runs at startup and when a legacy-shaped key changes without looping", async () => {
  const legacyRecords = {
    "legacy.example.com": [favoriteRecord("r1")]
  };
  const harness = createScopeHarness({ local: { [FAVORITES_KEY]: legacyRecords } });
  await harness.settle();
  assert.equal(harness.localSets.length >= 1, true);
  const migrated = Object.keys(harness.local[FAVORITES_KEY]);
  assert.equal(migrated.includes("legacy.example.com"), false);
  assert.equal(migrated.some(function (key) { return key.startsWith("host:"); }), true);

  // A later legacy-format write triggers the onChanged migration once; the migration's own
  // write fires onChanged again but finds nothing legacy and writes nothing more.
  harness.localSets.length = 0;
  harness.local[FAVORITES_KEY] = Object.assign({}, harness.local[FAVORITES_KEY], {
    "another.example.com": [favoriteRecord("r2")]
  });
  harness.changeListeners.forEach(function (listener) {
    listener({ [FAVORITES_KEY]: { oldValue: {}, newValue: harness.local[FAVORITES_KEY] } }, "local");
  });
  await harness.settle();
  const favoriteWrites = harness.localSets.filter(function (keys) { return keys.includes(FAVORITES_KEY); });
  assert.equal(favoriteWrites.length, 1);
  assert.equal(Object.keys(harness.local[FAVORITES_KEY]).includes("another.example.com"), false);

  harness.localSets.length = 0;
  harness.changeListeners.forEach(function (listener) {
    listener({ [FAVORITES_KEY]: { oldValue: {}, newValue: harness.local[FAVORITES_KEY] } }, "local");
  });
  await harness.settle();
  assert.deepEqual(harness.localSets, []);
});

test("migration ignores unrelated storage changes and non-local areas", async () => {
  const harness = createScopeHarness();
  await harness.settle();
  harness.local[FAVORITES_KEY] = { "legacy.example.com": [favoriteRecord("r1")] };
  harness.localSets.length = 0;
  harness.changeListeners.forEach(function (listener) {
    listener({ "ctdp.dockTop.v1": { newValue: 10 } }, "local");
    listener({ [FAVORITES_KEY]: { newValue: harness.local[FAVORITES_KEY] } }, "session");
  });
  await harness.settle();
  assert.deepEqual(harness.localSets, []);
});

test("context menu visibility follows the tab scope toggle", async () => {
  const harness = createScopeHarness({
    local: {
      [SITE_KEY]: { "system:sys-a": true, "host:example.com": false, "legacy:localhost": true },
      [SYSTEMS_KEY]: [seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }])]
    },
    tabs: {
      1: { id: 1, url: "http://localhost:5173/x" },
      2: { id: 2, url: "https://example.com/y" },
      3: { id: 3, url: "http://localhost:3000/z" }
    }
  });
  await harness.settle();
  await harness.send({ type: "resolve-page-scope", info: pageInfo("http://localhost:5173/x", "系统A"), marker: null }, harness.topFrame(1));
  const shown = harness.listeners.contextMenusShown;

  function visibilityFor(tabId, frameUrl) {
    harness.menuUpdates.length = 0;
    shown({ frameUrl }, harness.tabs[tabId]);
    return harness.menuUpdates.map(function (item) { return item.visible; });
  }

  // Tab 1: the fallback scope has no entry, but the resolved system scope is on.
  assert.deepEqual(visibilityFor(1, "http://localhost:5173/x"), [true, true]);
  // Tab 2: no tab scope, its fallback scope is explicitly off.
  assert.deepEqual(visibilityFor(2, "https://example.com/y"), [false, false]);
  // Tab 3: no tab scope; the legacy local-host record still enables the port fallback scope.
  assert.deepEqual(visibilityFor(3, "http://localhost:3000/z"), [true, true]);
});

test("context menu clicks are guarded by the tab scope toggle", async () => {
  const harness = createScopeHarness({
    local: {
      [SITE_KEY]: { "system:sys-a": true, "host:example.com": false },
      [SYSTEMS_KEY]: [seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }])]
    },
    tabs: { 1: { id: 1, url: "http://localhost:5173/x" }, 2: { id: 2, url: "https://example.com/y" } }
  });
  await harness.settle();
  await harness.send({ type: "resolve-page-scope", info: pageInfo("http://localhost:5173/x", "系统A"), marker: null }, harness.topFrame(1));
  harness.sentMessages.length = 0;
  const clicked = harness.listeners.contextMenusClicked;
  clicked({ menuItemId: "ctdp-manual-annotation:clear", frameUrl: "https://example.com/y", frameId: 0 }, harness.tabs[2]);
  assert.equal(harness.sentMessages.length, 0);
  clicked({ menuItemId: "ctdp-manual-annotation:clear", frameUrl: "http://localhost:5173/x", frameId: 0 }, harness.tabs[1]);
  assert.equal(harness.sentMessages.length, 1);
  assert.equal(harness.sentMessages[0].message.type, "clear-smart-fill-override");
});

test("backup reminder visibility follows the tab scope toggle", async () => {
  const harness = createScopeHarness({
    local: {
      [SITE_KEY]: { "system:sys-a": true, "host:example.com": false },
      [SYSTEMS_KEY]: [seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }])],
      [BACKUP_PENDING_KEY]: 123
    }
  });
  await harness.settle();
  await harness.send({ type: "resolve-page-scope", info: pageInfo("http://localhost:5173/x", "系统A"), marker: null }, harness.topFrame(1));
  const enabledState = await harness.send(
    { type: "read-backup-reminder-state" },
    { tab: { id: 1, url: "http://localhost:5173/x" }, frameId: 0 }
  );
  assert.equal(enabledState.pending, true);
  const disabledState = await harness.send(
    { type: "read-backup-reminder-state" },
    { tab: { id: 2, url: "https://example.com/y" }, frameId: 0 }
  );
  assert.equal(disabledState.pending, false);
});

test("a tab scope from a previous page is ignored after navigating to another host", async () => {
  const harness = createScopeHarness({
    local: {
      [SITE_KEY]: { "system:sys-a": true, "host:example.com": false },
      [SYSTEMS_KEY]: [seedSystem("sys-a", "系统A", ["系统A"], [{ port: "5173" }])]
    },
    tabs: { 1: { id: 1, url: "https://example.com/y" } }
  });
  await harness.settle();
  await harness.send({ type: "resolve-page-scope", info: pageInfo("http://localhost:5173/x", "系统A"), marker: null }, harness.topFrame(1));
  const sameSite = { tab: { id: 1, url: "http://localhost:5173/other" }, frameId: 2 };
  assert.equal((await harness.send({ type: "get-tab-scope" }, sameSite)).scope, "system:sys-a");
  const navigated = { tab: { id: 1, url: "https://example.com/y" }, frameId: 2 };
  assert.equal(await harness.send({ type: "get-tab-scope" }, navigated), null);

  // The menu also falls back to the new page's own scope (off) instead of the stale system (on).
  harness.menuUpdates.length = 0;
  harness.listeners.contextMenusShown({ frameUrl: "https://example.com/y", pageUrl: "https://example.com/y" }, harness.tabs[1]);
  assert.deepEqual(harness.menuUpdates.map(function (item) { return item.visible; }), [false, false]);
});

test("tabs.onUpdated loading drops the tab scope while complete keeps it", async () => {
  const harness = createScopeHarness();
  await harness.send({ type: "resolve-page-scope", info: pageInfo("https://example.com/a", "A"), marker: null }, harness.topFrame(6));
  const iframeSender = { tab: { id: 6 }, frameId: 3 };
  harness.listeners.tabsUpdated(6, { status: "complete" }, { id: 6, url: "https://example.com/a" });
  await harness.settle();
  assert.equal((await harness.send({ type: "get-tab-scope" }, iframeSender)).scope, "host:example.com");
  harness.listeners.tabsUpdated(6, { status: "loading" }, { id: 6, url: "https://example.com/a" });
  await harness.settle();
  assert.equal(await harness.send({ type: "get-tab-scope" }, iframeSender), null);
  assert.equal(Object.prototype.hasOwnProperty.call(harness.session["ctdp.tabScopes"] || {}, "6"), false);
});

test("hostless frames use the tab URL for the context menu and click guard", async () => {
  const harness = createScopeHarness({
    local: { [SITE_KEY]: { "host:example.com": true } },
    tabs: { 1: { id: 1, url: "https://example.com/editor" } }
  });
  await harness.settle();
  harness.menuUpdates.length = 0;
  harness.listeners.contextMenusShown({ frameUrl: "about:blank", pageUrl: "https://example.com/editor" }, harness.tabs[1]);
  assert.deepEqual(harness.menuUpdates.map(function (item) { return item.visible; }), [true, true]);
  harness.sentMessages.length = 0;
  harness.listeners.contextMenusClicked(
    { menuItemId: "ctdp-manual-annotation:clear", frameUrl: "about:srcdoc", pageUrl: "https://example.com/editor", frameId: 4 },
    harness.tabs[1]
  );
  assert.equal(harness.sentMessages.length, 1);
  assert.equal(harness.sentMessages[0].message.type, "clear-smart-fill-override");
});
