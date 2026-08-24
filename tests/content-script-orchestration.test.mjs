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
  let exportFullBackupCalls = 0;
  let hideDockMessageCalls = 0;
  let panelOptions = null;
  let runtimeMessageListener = null;
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
    setTimeout(fn) {
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
      ChromeTestDataFieldVisibility: {},
      ChromeTestDataSiteFeatureToggle: {},
      ChromeTestDataSmartFill: {
        applyAiFieldMappings() {
          return Promise.resolve(true);
        },
        clearManualFieldOverride() {},
        getSupportedFieldKeys() {
          return env.supportedFieldKeys || [];
        },
        setManualFieldOverride() {}
      },
      ChromeTestDataAiFormSnapshot: {
        buildAiFormSnapshot() {
          return env.snapshot || { allowedFieldKeys: [], fields: [] };
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
            },
            consumeFieldValue() {},
            exportFullBackup() {
              exportFullBackupCalls += 1;
              return Promise.resolve();
            },
            getFieldValue() {
              return "";
            },
            getVisibleFieldKeys() {
              return env.visibleFieldKeys || [];
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
            loadVisibleFieldKeys() {
              return Promise.resolve();
            },
            mount() {},
            showDockMessage(...args) {
              dockMessageArgs = args;
            },
            toggleVisible() {}
          };
        }
      },
      ChromeTestDataContentScriptSmartFill: {
        createContentScriptSmartFillController() {
          return smartFillController;
        }
      }
    },
    window: windowObject
  });

  return {
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
    panelOptions,
    panelFocusInCalls,
    runtimeMessages,
    smartFillPointerDownCalls,
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

  await Promise.resolve();
  const args = runtime.getDockMessageArgs();
  assert.equal(args[0], "该备份数据啦！");
  assert.equal(typeof args[4], "function");

  await args[4]();

  assert.equal(runtime.getExportFullBackupCalls(), 1);
  assert.equal(runtime.getHideDockMessageCalls(), 1);
  assert.equal(runtime.runtimeMessages.at(-1).type, "dismiss-backup-reminder");
});

test("focusout keeps the smart-fill controller alive while it is preserving an internal interaction", () => {
  const runtime = runContentScriptWithSmartFillStub({
    shouldPreserveOnFocusOut() {
      return true;
    }
  });

  runtime.documentListeners.focusout();

  assert.deepEqual(runtime.syncTargetCalls, []);
});

test("focusout syncs the current active element when no smart-fill interaction is in progress", () => {
  const runtime = runContentScriptWithSmartFillStub();

  runtime.documentListeners.focusout();

  assert.deepEqual(runtime.syncTargetCalls, [runtime.document.activeElement]);
});

test("focusin ignores targets that belong to the smart-fill interaction itself", () => {
  const runtime = runContentScriptWithSmartFillStub({
    isInteractionTarget(node) {
      return node && node.id === "recommend-item";
    }
  });

  runtime.documentListeners.focusin({ target: { id: "recommend-item" } });

  assert.deepEqual(runtime.syncTargetCalls, []);
});

test("focusin on the document shell does not ask the panel to collapse", () => {
  const runtime = runContentScriptWithSmartFillStub();

  runtime.documentListeners.focusin({ target: runtime.document.body });

  assert.deepEqual(runtime.panelFocusInCalls, []);
});

test("pointerdown delegates outside-click handling to smart fill", () => {
  const runtime = runContentScriptWithSmartFillStub();
  const target = { id: "blank-area" };

  runtime.documentListeners.pointerdown({ target });

  assert.deepEqual(runtime.smartFillPointerDownCalls, [target]);
});

test("quick favorite context action delegates page capture to the panel controller", () => {
  const runtime = runContentScriptWithSmartFillStub();

  runtime.dispatchRuntimeMessage({ type: "add-current-page-to-favorites" });

  assert.equal(runtime.getAddCurrentPageToFavoritesCalls(), 1);
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
    supportedFieldKeys: ["mobile"],
    visibleFieldKeys: ["mobile"]
  });

  await Promise.resolve();
  await Promise.resolve();
  runtime.panelOptions.onSiteFeatureEnabledChanged(true);
  await Promise.resolve();
  await Promise.resolve();
  runtime.panelOptions.onVisibleFieldKeysChanged();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(
    runtime.runtimeMessages.filter(function (message) {
      return message.type === "classify-form-fields";
    }).length,
    1
  );
});
