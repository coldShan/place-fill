import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../extension/src/content-script.js"), "utf8");

function createRuntimeEvent() {
  return {
    addListener() {}
  };
}

function runContentScriptWithSmartFillStub(overrides, envOverrides) {
  const env = envOverrides || {};
  const documentListeners = {};
  const windowListeners = {};
  const panelFocusInCalls = [];
  const syncTargetCalls = [];
  const runtimeMessages = [];
  let panelOptions = null;
  const smartFillController = {
    fillTarget() {},
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
        onMessage: createRuntimeEvent(),
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
            consumeFieldValue() {},
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
            isSiteFeatureEnabled() {
              return env.siteFeatureEnabled !== false;
            },
            loadVisibleFieldKeys() {
              return Promise.resolve();
            },
            mount() {},
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
    panelOptions,
    panelFocusInCalls,
    runtimeMessages,
    syncTargetCalls
  };
}

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
