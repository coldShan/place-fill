(function () {
  "use strict";

  const generators = globalThis.ChromeTestDataGenerators;
  const panelStateApi = globalThis.ChromeTestDataPanelState;
  const editableTargetApi = globalThis.ChromeTestDataEditableTarget;
  const iconAssetsApi = globalThis.ChromeTestDataIconAssets;
  const fieldMetaApi = globalThis.ChromeTestDataFieldMeta;
  const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
  const siteFeatureToggleApi = globalThis.ChromeTestDataSiteFeatureToggle;
  const smartFillApi = globalThis.ChromeTestDataSmartFill;
  const dataRecordsApi = globalThis.ChromeTestDataDataRecords;
  const panelControllerApi = globalThis.ChromeTestDataContentScriptPanel;
  const smartFillControllerApi = globalThis.ChromeTestDataContentScriptSmartFill;

  if (
    !generators ||
    !panelStateApi ||
    !editableTargetApi ||
    !iconAssetsApi ||
    !fieldMetaApi ||
    !fieldVisibilityApi ||
    !siteFeatureToggleApi ||
    !smartFillApi ||
    !panelControllerApi ||
    !smartFillControllerApi ||
    typeof document === "undefined"
  ) {
    return;
  }

  const canRenderPanel = window.top === window;
  const runtimeApi = typeof chrome !== "undefined" ? chrome.runtime : null;
  let smartFillController = null;

  function getCurrentScope() {
    if (!window || !window.location || typeof window.location.hostname !== "string") return "";
    return String(window.location.hostname || "").trim().toLowerCase();
  }

  function sendRuntimeMessage(message) {
    return new Promise(function (resolve) {
      if (!runtimeApi || typeof runtimeApi.sendMessage !== "function") {
        resolve({});
        return;
      }
      runtimeApi.sendMessage(message, function (response) {
        void runtimeApi.lastError;
        resolve(response || {});
      });
    });
  }

  function syncSiteFeatureContextMenu(enabled) {
    if (!runtimeApi || typeof runtimeApi.sendMessage !== "function") return;
    runtimeApi.sendMessage(
      {
        type: "sync-site-feature-context-menu",
        enabled: enabled !== false
      },
      function () {
        void runtimeApi.lastError;
      }
    );
  }

  function isDocumentShellTarget(target) {
    return !target || target === document || target === document.body || target === document.documentElement;
  }

  const panelController = panelControllerApi.createContentScriptPanelController({
    canRenderPanel,
    document,
    editableTargetApi,
    fieldMetaApi,
    fieldVisibilityApi,
    generators,
    iconAssetsApi,
    onOverridesImported: function () {
      if (!smartFillController) return;
      const target = editableTargetApi.findEditableTarget(document.activeElement) || smartFillController.resolveManualOverrideTarget();
      if (target) smartFillController.syncTarget(target);
    },
    onSiteFeatureEnabledChanged: function (enabled) {
      syncSiteFeatureContextMenu(enabled);
      if (!smartFillController) return;
      if (!enabled) {
        smartFillController.hide();
        return;
      }
      const target = editableTargetApi.findEditableTarget(document.activeElement) || smartFillController.resolveManualOverrideTarget();
      if (target) {
        smartFillController.syncTarget(target);
        return;
      }
      smartFillController.hide();
    },
    onVisibleFieldKeysChanged: function () {
      if (!smartFillController) return;
      const target = editableTargetApi.findEditableTarget(document.activeElement) || smartFillController.resolveManualOverrideTarget();
      if (target) {
        smartFillController.syncTarget(target);
        return;
      }
      smartFillController.hide();
    },
    panelStateApi,
    siteFeatureToggleApi,
    smartFillApi,
    window
  });

  smartFillController = smartFillControllerApi.createContentScriptSmartFillController({
    document,
    editableTargetApi,
    getFieldValue: panelController.getFieldValue,
    getCurrentScope: getCurrentScope,
    getVisibleFieldKeys: panelController.getVisibleFieldKeys,
    iconAssetsApi,
    isEnabled: panelController.isSiteFeatureEnabled,
    listRecommendedProfiles: function (scope) {
      if (!dataRecordsApi || typeof dataRecordsApi.readFavoriteProfiles !== "function") return Promise.resolve([]);
      return dataRecordsApi.readFavoriteProfiles(scope).then(function (entries) {
        return Array.isArray(entries) ? entries : [];
      });
    },
    onFieldFilled: panelController.consumeFieldValue,
    openDataManagerPage: function () {
      return sendRuntimeMessage({
        type: "open-data-manager-page",
        scope: getCurrentScope()
      });
    },
    smartFillApi,
    window
  });

  function startContentScript() {
    panelController.mount();
    smartFillController.mount();

    document.addEventListener(
      "focusin",
      function (event) {
        if (!isDocumentShellTarget(event.target)) panelController.handleDocumentFocusIn(event.target);
        if (smartFillController && typeof smartFillController.isInteractionTarget === "function" && smartFillController.isInteractionTarget(event.target)) {
          return;
        }
        smartFillController.syncTarget(event.target);
      },
      true
    );

    document.addEventListener(
      "focusout",
      function () {
        window.setTimeout(function () {
          if (smartFillController && typeof smartFillController.shouldPreserveOnFocusOut === "function" && smartFillController.shouldPreserveOnFocusOut()) {
            return;
          }
          smartFillController.syncTarget(document.activeElement);
        }, 0);
      },
      true
    );

    document.addEventListener(
      "contextmenu",
      function (event) {
        syncSiteFeatureContextMenu(panelController.isSiteFeatureEnabled());
        smartFillController.setContextTarget(event.target);
      },
      true
    );

    document.addEventListener(
      "pointerdown",
      function (event) {
        panelController.handleDocumentPointerDown(event.target);
      },
      true
    );

    window.addEventListener("scroll", function () {
      smartFillController.refreshPosition();
    });

    window.addEventListener("resize", function () {
      smartFillController.refreshPosition();
    });

    chrome.runtime.onMessage.addListener(function (message) {
      if (!message) return;
      if (message.type === "toggle-test-data-panel") {
        panelController.toggleVisible();
        return;
      }
      if (message.type === "apply-smart-fill-override") {
        const target = smartFillController.resolveManualOverrideTarget();
        if (!target) return;
        Promise.resolve(smartFillApi.setManualFieldOverride(target, message.fieldKey)).then(function (ok) {
          if (ok === false) return;
          panelController.loadVisibleFieldKeys().then(function () {
            smartFillController.fillTarget(target, message.fieldKey);
          });
        });
        return;
      }
      if (message.type === "clear-smart-fill-override") {
        const target = smartFillController.resolveManualOverrideTarget();
        if (!target) return;
        Promise.resolve(smartFillApi.clearManualFieldOverride(target)).then(function () {
          smartFillController.syncTarget(target);
        });
      }
    });
  }

  if (typeof smartFillApi.loadManualFieldOverrides === "function") {
    Promise.resolve(smartFillApi.loadManualFieldOverrides()).then(startContentScript, startContentScript);
  } else {
    startContentScript();
  }
})();
