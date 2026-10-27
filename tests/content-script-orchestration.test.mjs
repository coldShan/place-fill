import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../extension/src/content-script.js"), "utf8");

function runContentScriptWithSmartFillStub(overrides, envOverrides) {
  const env = envOverrides || {};
  const documentListeners = {};
  const windowListeners = {};
  const panelFocusInCalls = [];
  const smartFillPointerDownCalls = [];
  const syncTargetCalls = [];
  const runtimeMessages = [];
  let dockMessageArgs = null;
  let addCurrentPageToFavoritesCalls = 0;
  const removeFavoriteCalls = [];
  let exportFullBackupCalls = 0;
  let hideDockMessageCalls = 0;
  let panelOptions = null;
  let runtimeMessageListener = null;
  let smartFillOptions = null;
  let scopeClientOptions = null;
  let scopeResolver = null;
  let scopeChangeListener = null;
  let currentScope = "host:example.com";
  const startupEvents = [];
  const reloadScopeCalls = [];
  const toggleReadEnvs = [];
  const scopeClient = {
    getResolution() {
      return { fallbackScope: "host:example.com", marker: null, scope: currentScope, system: null };
    },
    getScope() {
      return currentScope;
    },
    onChange(listener) {
      scopeChangeListener = listener;
      return function () {};
    },
    start() {
      startupEvents.push("scope-start");
      return (env.scopeStart || Promise.resolve()).then(function () {
        startupEvents.push("scope-resolved");
        return scopeClient.getResolution();
      });
    }
  };
  const smartFillController = {
    fillTarget() {},
    handleDocumentPointerDown(target) {
      smartFillPointerDownCalls.push(target);
    },
    hide() {},
    isInteractionTarget() {
      return false;
    },
    mount() {},
    refreshPosition() {},
    resolveManualOverrideTarget() {
      return null;
    },
    setContextTarget() {},
    shouldPreserveOnFocusOut() {
      return false;
    },
    syncTarget(target) {
      syncTargetCalls.push(target);
    },
    ...overrides
  };

  const document = {
    activeElement: { id: "active" },
    body: { id: "body" },
    documentElement: { id: "html" },
    addEventListener(type, listener) {
      documentListeners[type] = listener;
    }
  };

  const windowObject = {
    addEventListener(type, listener) {
      windowListeners[type] = listener;
    },
    location: { hostname: "example.com" },
    setTimeout(fn, delay) {
      if (env.focusTimers && delay === 0) {
        env.focusTimers.push(fn);
        return env.focusTimers.length;
      }
      fn();
      return 1;
    },
    top: null
  };
  windowObject.top = windowObject;

  vm.runInNewContext(script, {
    chrome: {
      runtime: {
        lastError: null,
        onMessage: {
          addListener(listener) {
            runtimeMessageListener = listener;
          }
        },
        sendMessage(message, callback) {
          runtimeMessages.push(message);
          if (callback) callback(typeof env.runtimeResponse === "function" ? env.runtimeResponse(message) : {});
        }
      }
    },
    document,
    globalThis: {
      ChromeTestDataGenerators: {},
      ChromeTestDataPanelState: {},
      ChromeTestDataEditableTarget: {
        findEditableTarget() {
          return null;
        }
      },
      ChromeTestDataElementFormControl: {},
      ChromeTestDataIconAssets: {},
      ChromeTestDataFieldMeta: {},
      ChromeTestDataSiteFeatureToggle: {
        isSiteFeatureEnabled(value) {
          return value === true;
        },
        readSiteFeatureEnabled(readEnv) {
          toggleReadEnvs.push(readEnv);
          return Promise.resolve(env.siteFeatureEnabled !== false);
        }
      },
      ChromeTestDataSmartFill: {
        applyAiFieldMappings() {
          return Promise.resolve(true);
        },
        clearManualFieldOverride() {},
        getSupportedFieldKeys() {
          return env.supportedFieldKeys || [];
        },
        setManualFieldOverride() {},
        setScopeResolver(resolver) {
          scopeResolver = resolver;
        },
        ...(env.loadManualFieldOverrides ? {
          loadAiFieldMappings() {
            return Promise.resolve();
          },
          loadManualFieldOverrides() {
            startupEvents.push("load-overrides");
            return Promise.resolve();
          }
        } : {})
      },
      ChromeTestDataAiFormSnapshot: {
        buildAiFormSnapshot() {
          return env.snapshot || { allowedFieldKeys: [], fields: [] };
        }
      },
      ChromeTestDataSystemScope: {},
      ChromeTestDataContentScriptScope: {
        createScopeClient(options) {
          scopeClientOptions = options;
          return scopeClient;
        }
      },
      ChromeTestDataDataRecords: {
        readFavoriteProfiles() {
          return Promise.resolve([]);
        }
      },
      ChromeTestDataContentScriptPanel: {
        createContentScriptPanelController(options) {
          panelOptions = options;
          return {
            addCurrentPageToFavorites() {
              addCurrentPageToFavoritesCalls += 1;
              return Promise.resolve({ id: "added-page" });
            },
            consumeFieldValue() {},
            exportFullBackup() {
              exportFullBackupCalls += 1;
              return Promise.resolve();
            },
            getFieldValue() {
              return "";
            },
            getCurrentPageFavorite() {
              return Promise.resolve(null);
            },
            removeFavoriteProfile(id) {
              removeFavoriteCalls.push(id);
              return Promise.resolve(true);
            },
            handleDocumentFocusIn(target) {
              panelFocusInCalls.push(target);
            },
            handleDocumentPointerDown() {},
            hideDismissibleDockMessage() {
              hideDockMessageCalls += 1;
            },
            isSiteFeatureEnabled() {
              return env.siteFeatureEnabled !== false;
            },
            mount() {
              startupEvents.push("panel-mount");
            },
            reloadScope() {
              reloadScopeCalls.push(currentScope);
              return Promise.resolve();
            },
            showDockMessage(...args) {
              dockMessageArgs = args;
            },
            toggleVisible() {}
          };
        }
      },
      ChromeTestDataContentScriptSmartFill: {
        createContentScriptSmartFillController(options) {
          smartFillOptions = options;
          return smartFillController;
        }
      }
    },
    window: windowObject
  });

  return {
    changeScope(scope) {
      currentScope = scope;
      if (scopeChangeListener) scopeChangeListener(scopeClient.getResolution());
    },
    document,
    documentListeners,
    dispatchRuntimeMessage(message) {
      runtimeMessageListener(message);
    },
    getAddCurrentPageToFavoritesCalls() {
      return addCurrentPageToFavoritesCalls;
    },
    getDockMessageArgs() {
      return dockMessageArgs;
    },
    getExportFullBackupCalls() {
      return exportFullBackupCalls;
    },
    getHideDockMessageCalls() {
      return hideDockMessageCalls;
    },
    ready() {
      return new Promise(function (resolve) { setImmediate(resolve); });
    },
    reloadScopeCalls,
    removeFavoriteCalls,
    getScopeResolver() {
      return scopeResolver;
    },
    panelOptions,
    scopeClient,
    scopeClientOptions,
    startupEvents,
    toggleReadEnvs,
    panelFocusInCalls,
    runtimeMessages,
    smartFillPointerDownCalls,
    smartFillOptions,
    syncTargetCalls
  };
}

test("clicking the backup reminder exports all data and dismisses it after success", async () => {
  const runtime = runContentScriptWithSmartFillStub({}, {
    runtimeResponse(message) {
      if (message.type === "read-backup-reminder-state") {
        return { message: "该备份数据啦！", pending: true };
      }
      return {};
    }
  });

  await new Promise(function (resolve) { setImmediate(resolve); });
  const args = runtime.getDockMessageArgs();
  assert.equal(args[0], "该备份数据啦！");
  assert.equal(typeof args[4], "function");

  await args[4]();

  assert.equal(runtime.getExportFullBackupCalls(), 1);
  assert.equal(runtime.getHideDockMessageCalls(), 1);
  assert.equal(runtime.runtimeMessages.at(-1).type, "dismiss-backup-reminder");
});

test("backup reminder messages stay hidden on disabled sites", async () => {
  const runtime = runContentScriptWithSmartFillStub({}, { siteFeatureEnabled: false });
  await runtime.ready();
  await new Promise(function (resolve) { setImmediate(resolve); });
  const hideCalls = runtime.getHideDockMessageCalls();

  runtime.dispatchRuntimeMessage({ message: "该备份数据啦！", type: "show-backup-reminder" });
  await new Promise(function (resolve) { setImmediate(resolve); });

  assert.equal(runtime.getDockMessageArgs(), null);
  assert.equal(runtime.getHideDockMessageCalls(), hideCalls + 1);
});

test("directory permission reminder appears outside settings and opens authorization", async () => {
  const runtime = runContentScriptWithSmartFillStub({}, {
    loadManualFieldOverrides: true,
    runtimeResponse(message) {
      if (message.type === "prepare-local-annotation-file") return { permissionRequired: true };
      return {};
    }
  });

  await new Promise(function (resolve) { setImmediate(resolve); });
  const args = runtime.getDockMessageArgs();
  assert.equal(args[0], "本地数据目录需要重新授权");
  assert.equal(args[1], true);
  assert.equal(args[2], true);
  assert.equal(args[5], "恢复目录权限");

  await args[4]();
  assert.equal(runtime.runtimeMessages.at(-1).type, "open-local-annotation-permission");
});

test("directory permission reminder stays hidden on disabled sites", async () => {
  const runtime = runContentScriptWithSmartFillStub({}, {
    loadManualFieldOverrides: true,
    siteFeatureEnabled: false,
    runtimeResponse(message) {
      if (message.type === "prepare-local-annotation-file") return { permissionRequired: true };
      return {};
    }
  });

  await new Promise(function (resolve) { setImmediate(resolve); });
  assert.equal(runtime.getDockMessageArgs(), null);
  assert.equal(runtime.runtimeMessages.some(function (message) {
    return message.type === "open-local-annotation-permission";
  }), false);
});

test("focus events coalesce and recognize only the final active target", async () => {
  const focusTimers = [];
  const runtime = runContentScriptWithSmartFillStub({}, { focusTimers });
  await runtime.ready();
  runtime.documentListeners.focusout();
  runtime.document.activeElement = { id: "next" };
  runtime.documentListeners.focusin({ target: runtime.document.activeElement });
  runtime.documentListeners.focusout();
  runtime.document.activeElement = { id: "final" };
  runtime.documentListeners.focusin({ target: runtime.document.activeElement });
  assert.equal(focusTimers.length, 1);
  assert.deepEqual(runtime.syncTargetCalls, []);
  focusTimers.shift()();
  assert.deepEqual(runtime.syncTargetCalls, [runtime.document.activeElement]);
  runtime.document.activeElement = runtime.document.body;
  runtime.documentListeners.focusout();
  focusTimers.shift()();
  assert.deepEqual(runtime.syncTargetCalls, [{ id: "final" }, runtime.document.body]);
});

test("pending focus sync skips internal controls but permits a new external focus", async () => {
  const focusTimers = [];
  const internal = { id: "favorite" };
  const runtime = runContentScriptWithSmartFillStub({
    isInteractionTarget(target) { return target === internal; },
    shouldPreserveOnFocusOut() { return true; }
  }, { focusTimers });
  await runtime.ready();
  runtime.documentListeners.focusout();
  runtime.document.activeElement = internal;
  runtime.documentListeners.focusin({ target: internal });
  focusTimers.shift()();
  assert.deepEqual(runtime.syncTargetCalls, []);
  runtime.documentListeners.focusout();
  runtime.document.activeElement = { id: "external" };
  runtime.documentListeners.focusin({ target: runtime.document.activeElement });
  focusTimers.shift()();
  assert.deepEqual(runtime.syncTargetCalls, [runtime.document.activeElement]);
});

test("focusout keeps the smart-fill controller alive while it is preserving an internal interaction", async () => {
  const runtime = runContentScriptWithSmartFillStub({
    shouldPreserveOnFocusOut() {
      return true;
    }
  });
  await runtime.ready();

  runtime.documentListeners.focusout();

  assert.deepEqual(runtime.syncTargetCalls, []);
});

test("focusout syncs the current active element when no smart-fill interaction is in progress", async () => {
  const runtime = runContentScriptWithSmartFillStub();
  await runtime.ready();

  runtime.documentListeners.focusout();

  assert.deepEqual(runtime.syncTargetCalls, [runtime.document.activeElement]);
});

test("focusin ignores targets that belong to the smart-fill interaction itself", async () => {
  const runtime = runContentScriptWithSmartFillStub({
    isInteractionTarget(node) {
      return node && node.id === "recommend-item";
    }
  });
  await runtime.ready();

  runtime.documentListeners.focusin({ target: { id: "recommend-item" } });

  assert.deepEqual(runtime.syncTargetCalls, []);
});

test("focusin on the document shell does not ask the panel to collapse", async () => {
  const runtime = runContentScriptWithSmartFillStub();
  await runtime.ready();

  runtime.documentListeners.focusin({ target: runtime.document.body });

  assert.deepEqual(runtime.panelFocusInCalls, []);
});

test("pointerdown delegates outside-click handling to smart fill", async () => {
  const runtime = runContentScriptWithSmartFillStub();
  await runtime.ready();
  const target = { id: "blank-area" };

  runtime.documentListeners.pointerdown({ target });

  assert.deepEqual(runtime.smartFillPointerDownCalls, [target]);
});

test("quick favorite context action delegates page capture to the panel controller", async () => {
  const runtime = runContentScriptWithSmartFillStub();
  await runtime.ready();

  runtime.dispatchRuntimeMessage({ type: "add-current-page-to-favorites" });

  assert.equal(runtime.getAddCurrentPageToFavoritesCalls(), 1);
});

test("smart fill star delegates capture without favorite state or removal callbacks", async () => {
  const runtime = runContentScriptWithSmartFillStub();
  await runtime.ready();

  runtime.smartFillOptions.onAddCurrentPageToFavorites();

  assert.equal(runtime.getAddCurrentPageToFavoritesCalls(), 1);
  assert.deepEqual(runtime.removeFavoriteCalls, []);
  assert.equal(runtime.smartFillOptions.getCurrentPageFavorite, undefined);
  assert.equal(runtime.smartFillOptions.onRemoveFavorite, undefined);
  assert.equal(typeof runtime.smartFillOptions.listRecommendedProfiles, "function");
});

test("content script skips duplicate ai recognition snapshots", async () => {
  const runtime = runContentScriptWithSmartFillStub({}, {
    runtimeResponse(message) {
      return message.type === "classify-form-fields" ? { fields: [] } : {};
    },
    snapshot: {
      allowedFieldKeys: ["mobile"],
      fields: [{ fingerprint: "field-1", localFieldKey: "mobile", placeholder: "联系电话" }]
    },
    supportedFieldKeys: ["mobile"]
  });

  await runtime.ready();
  runtime.panelOptions.onSiteFeatureEnabledChanged(true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(
    runtime.runtimeMessages.filter(function (message) {
      return message.type === "classify-form-fields";
    }).length,
    1
  );
});

test("the panel mounts and annotations load only after the page scope is resolved", async () => {
  let resolveStart;
  const runtime = runContentScriptWithSmartFillStub({}, {
    loadManualFieldOverrides: true,
    scopeStart: new Promise(function (resolve) { resolveStart = resolve; })
  });

  await runtime.ready();
  assert.deepEqual(runtime.startupEvents, ["scope-start"]);
  assert.equal(runtime.runtimeMessages.length, 0);

  resolveStart();
  await runtime.ready();
  assert.deepEqual(runtime.startupEvents, ["scope-start", "scope-resolved", "load-overrides", "panel-mount"]);
});

test("the scope client is wired into smart fill, the panel and every toggle read", async () => {
  const runtime = runContentScriptWithSmartFillStub({}, {
    runtimeResponse(message) {
      return message.type === "read-backup-reminder-state" ? { message: "该备份数据啦！", pending: true } : {};
    }
  });
  await runtime.ready();

  assert.equal(runtime.scopeClientOptions.isTopFrame, true);
  assert.equal(typeof runtime.scopeClientOptions.sendRuntimeMessage, "function");
  assert.equal(runtime.panelOptions.scopeClient, runtime.scopeClient);
  assert.equal(runtime.getScopeResolver()(), "host:example.com");
  assert.equal(runtime.smartFillOptions.getCurrentScope(), "host:example.com");
  assert.ok(runtime.toggleReadEnvs.length > 0);
  assert.ok(runtime.toggleReadEnvs.every(function (readEnv) { return readEnv && readEnv.scope === "host:example.com"; }));
});

test("a scope change reloads the panel's scoped state and resyncs the smart-fill target", async () => {
  let hides = 0;
  const runtime = runContentScriptWithSmartFillStub({ hide() { hides += 1; } });
  await runtime.ready();
  const hidesBefore = hides;

  runtime.changeScope("system:a");

  assert.deepEqual(runtime.reloadScopeCalls, ["system:a"]);
  assert.equal(runtime.getScopeResolver()(), "system:a");
  // No editable target is focused, so the resync hides the smart-fill button.
  assert.equal(hides, hidesBefore + 1);
});
