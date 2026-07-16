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
  const aiFormSnapshotApi = globalThis.ChromeTestDataAiFormSnapshot;
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
    !aiFormSnapshotApi ||
    !panelControllerApi ||
    !smartFillControllerApi ||
    typeof document === "undefined"
  ) {
    return;
  }

  const canRenderPanel = window.top === window;
  const runtimeApi = typeof chrome !== "undefined" ? chrome.runtime : null;
  let smartFillController = null;
  let aiRecognitionPromise = null;
  let lastAiRecognitionSignature = "";

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

  function syncActiveSmartTarget() {
    if (!smartFillController) return;
    const target = editableTargetApi.findEditableTarget(document.activeElement) || smartFillController.resolveManualOverrideTarget();
    if (target) {
      smartFillController.syncTarget(target);
      return;
    }
    smartFillController.hide();
  }

  function isDocumentShellTarget(target) {
    return !target || target === document || target === document.body || target === document.documentElement;
  }

  function buildAiRecognitionSignature(snapshot) {
    const currentPath = window && window.location
      ? String(window.location.origin || "") + String(window.location.pathname || "")
      : "";
    return JSON.stringify({
      allowedFieldKeys: Array.isArray(snapshot.allowedFieldKeys) ? snapshot.allowedFieldKeys.slice() : [],
      fields: Array.isArray(snapshot.fields)
        ? snapshot.fields.map(function (field) {
          return {
            ariaLabel: field.ariaLabel || "",
            autocomplete: field.autocomplete || "",
            fingerprint: field.fingerprint || "",
            id: field.id || "",
            labels: Array.isArray(field.labels) ? field.labels.slice() : [],
            localFieldKey: field.localFieldKey || "",
            name: field.name || "",
            nearbyText: field.nearbyText || "",
            placeholder: field.placeholder || "",
            tag: field.tag || "",
            type: field.type || ""
          };
        })
        : [],
      path: currentPath
    });
  }

  function refreshAiRecognition() {
    if (!panelController || !panelController.isSiteFeatureEnabled()) return Promise.resolve(false);
    if (aiRecognitionPromise) return aiRecognitionPromise;
    const visibleFieldKeys = panelController.getVisibleFieldKeys();
    const supportedFieldKeys = smartFillApi.getSupportedFieldKeys(visibleFieldKeys);
    const snapshot = aiFormSnapshotApi.buildAiFormSnapshot({
      allowedFieldKeys: supportedFieldKeys,
      document,
      smartFillApi
    });
    if (!snapshot.fields.length) return Promise.resolve(false);
    const snapshotSignature = buildAiRecognitionSignature(snapshot);
    if (snapshotSignature === lastAiRecognitionSignature) return Promise.resolve(false);
    lastAiRecognitionSignature = snapshotSignature;
    aiRecognitionPromise = sendRuntimeMessage({
      type: "classify-form-fields",
      snapshot
    })
      .then(function (response) {
        const fields = response && Array.isArray(response.fields) ? response.fields : [];
        console.info("[place-fill] AI 识别输出", fields);
        if (!fields.length || typeof smartFillApi.applyAiFieldMappings !== "function") return false;
        fields.forEach(function (field) {
          const source = snapshot.fields.find(function (item) {
            return item.fingerprint === field.fingerprint;
          });
          if (source && source.localFieldKey) field.localFieldKey = source.localFieldKey;
        });
        return Promise.resolve(smartFillApi.applyAiFieldMappings(fields)).then(function () {
          syncActiveSmartTarget();
          return true;
        });
      })
      .catch(function () {
        return false;
      })
      .finally(function () {
        aiRecognitionPromise = null;
      });
    return aiRecognitionPromise;
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
      syncActiveSmartTarget();
    },
    onSiteFeatureEnabledChanged: function (enabled) {
      syncSiteFeatureContextMenu(enabled);
      if (!smartFillController) return;
      if (!enabled) {
        smartFillController.hide();
        return;
      }
      refreshAiRecognition();
      syncActiveSmartTarget();
    },
    onVisibleFieldKeysChanged: function () {
      refreshAiRecognition();
      syncActiveSmartTarget();
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
    refreshAiRecognition,
    window
  });

  function startContentScript() {
    panelController.mount();
    smartFillController.mount();
    window.setTimeout(refreshAiRecognition, 250);

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
      if (message.type === "show-backup-reminder") {
        panelController.showDockMessage(message.message || "该备份数据啦！", true, true);
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
    Promise.all([
      Promise.resolve(smartFillApi.loadManualFieldOverrides()),
      typeof smartFillApi.loadAiFieldMappings === "function" ? Promise.resolve(smartFillApi.loadAiFieldMappings()) : Promise.resolve()
    ]).then(startContentScript, startContentScript);
  } else {
    startContentScript();
  }
})();
