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

  const panelController = panelControllerApi.createContentScriptPanelController({
    canRenderPanel,
    document,
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
    getVisibleFieldKeys: panelController.getVisibleFieldKeys,
    iconAssetsApi,
    isEnabled: panelController.isSiteFeatureEnabled,
    onFieldFilled: panelController.consumeFieldValue,
    smartFillApi,
    window
  });

  panelController.mount();
  smartFillController.mount();

  document.addEventListener(
    "focusin",
    function (event) {
      panelController.handleDocumentFocusIn(event.target);
      smartFillController.syncTarget(event.target);
    },
    true
  );

  document.addEventListener(
    "focusout",
    function () {
      window.setTimeout(function () {
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
      smartFillApi.setManualFieldOverride(target, message.fieldKey);
      panelController.loadVisibleFieldKeys().then(function () {
        smartFillController.fillTarget(target, message.fieldKey);
      });
      return;
    }
    if (message.type === "clear-smart-fill-override") {
      const target = smartFillController.resolveManualOverrideTarget();
      if (!target) return;
      smartFillApi.clearManualFieldOverride(target);
      smartFillController.syncTarget(target);
    }
  });
})();
