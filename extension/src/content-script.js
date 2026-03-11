(function () {
  "use strict";

  const generators = globalThis.ChromeTestDataGenerators;
  const panelStateApi = globalThis.ChromeTestDataPanelState;
  const editableTargetApi = globalThis.ChromeTestDataEditableTarget;
  const iconAssetsApi = globalThis.ChromeTestDataIconAssets;
  const fieldMetaApi = globalThis.ChromeTestDataFieldMeta;
  const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
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
    !smartFillApi ||
    !panelControllerApi ||
    !smartFillControllerApi ||
    typeof document === "undefined"
  ) {
    return;
  }

  const canRenderPanel = window.top === window;
  let smartFillController = null;

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
    smartFillApi,
    window
  });

  smartFillController = smartFillControllerApi.createContentScriptSmartFillController({
    document,
    editableTargetApi,
    getFieldValue: panelController.getFieldValue,
    getVisibleFieldKeys: panelController.getVisibleFieldKeys,
    iconAssetsApi,
    onFieldFilled: panelController.consumeFieldValue,
    smartFillApi,
    window
  });

  panelController.mount();
  smartFillController.mount();

  document.addEventListener(
    "focusin",
    function (event) {
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
      smartFillController.setContextTarget(event.target);
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
