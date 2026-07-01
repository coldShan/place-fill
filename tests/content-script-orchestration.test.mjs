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

function runContentScriptWithSmartFillStub(overrides) {
  const documentListeners = {};
  const windowListeners = {};
  const panelFocusInCalls = [];
  const syncTargetCalls = [];
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
        sendMessage(_message, callback) {
          if (callback) callback({});
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
        clearManualFieldOverride() {},
        setManualFieldOverride() {}
      },
      ChromeTestDataDataRecords: {
        readFavoriteProfiles() {
          return Promise.resolve([]);
        }
      },
      ChromeTestDataContentScriptPanel: {
        createContentScriptPanelController() {
          return {
            consumeFieldValue() {},
            getFieldValue() {
              return "";
            },
            getVisibleFieldKeys() {
              return [];
            },
            handleDocumentFocusIn(target) {
              panelFocusInCalls.push(target);
            },
            handleDocumentPointerDown() {},
            isSiteFeatureEnabled() {
              return true;
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
    panelFocusInCalls,
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
