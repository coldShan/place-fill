(function (rootScope) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function sampleFavoriteProfiles(favoriteProfiles, count, randomFn) {
    const random = typeof randomFn === "function" ? randomFn : Math.random;
    const pool = Array.isArray(favoriteProfiles)
      ? favoriteProfiles.filter(function (entry) { return entry && entry.profile && typeof entry.profile === "object"; }).slice()
      : [];
    const samples = [];
    while (samples.length < count && pool.length > 0) {
      const index = Math.max(0, Math.min(pool.length - 1, Math.floor(random() * pool.length)));
      samples.push(pool.splice(index, 1)[0].profile);
    }
    return samples;
  }

  function closeOtherSettingsSections(sections, activeSection) {
    if (!activeSection || !activeSection.open) return;
    Array.from(sections || []).forEach(function (section) {
      if (section !== activeSection) section.open = false;
    });
  }

  function hasAutoFillTargetValue(entry) {
    if (!entry) return false;
    const targets = Array.from(entry.targets || []);
    if (entry.kind === "checkbox" || entry.kind === "radio" || entry.kind === "choice") {
      return targets.some(function (target) { return !!target.checked; });
    }
    if (entry.adapter === "element" && entry.kind === "select" && entry.root && typeof entry.root.querySelector === "function") {
      if (entry.root.querySelector(".el-tag")) return true;
      const input = entry.root.querySelector('input[role="combobox"]') || entry.root.querySelector("input");
      if (input && String(input.value || "").trim()) return true;
    }
    if (entry.target && !targets.includes(entry.target)) targets.push(entry.target);
    return targets.some(function (target) {
      const value = target && target.isContentEditable ? target.textContent : target && target.value;
      return String(value == null ? "" : value).trim() !== "";
    });
  }

  function resolveAutoFillScope(doc) {
    const scopes = Array.from(doc.querySelectorAll(
      'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"], .el-dialog__wrapper, .el-overlay-dialog, .el-drawer__container'
    )).filter(function (node) {
      if (!node || typeof node.querySelectorAll !== "function" || node.hidden || node.getAttribute && node.getAttribute("aria-hidden") === "true") return false;
      if (typeof node.getClientRects === "function" && node.getClientRects().length === 0) return false;
      const win = node.ownerDocument && node.ownerDocument.defaultView;
      if (!win || typeof win.getComputedStyle !== "function") return true;
      const style = win.getComputedStyle(node);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    return scopes[scopes.length - 1] || doc;
  }

  function collectPageAutoFillTargets(doc, editableTargetApi, smartFillApi, fieldVisibilityApi, visibleFieldKeys, elementFormControlApi) {
    if (!doc || !editableTargetApi || !smartFillApi) return [];
    const candidates = Array.from(resolveAutoFillScope(doc).querySelectorAll(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
    ));
    const targets = [];
    const seen = new Set();
    const elementRoots = new Set();

    candidates.forEach(function (node) {
      const elementEntry = elementFormControlApi && elementFormControlApi.describeElementControl(node);
      if (elementEntry) {
        if (elementRoots.has(elementEntry.root)) return;
        elementRoots.add(elementEntry.root);
        targets.push(elementEntry);
        return;
      }

      const kind = editableTargetApi.getGenericFormControlKind(node);
      if (kind === "checkbox" || kind === "radio") {
        const name = String(node.name || "");
        const rootNode = typeof node.getRootNode === "function" ? node.getRootNode() : doc;
        const existing = name && targets.find(function (entry) {
          return entry.kind === kind &&
            entry.name === name &&
            entry.form === (node.form || null) &&
            entry.rootNode === rootNode;
        });
        if (existing) {
          existing.targets.push(node);
        } else {
          targets.push({
            form: node.form || null,
            kind,
            name,
            rootNode,
            target: node,
            targets: [node]
          });
        }
        return;
      }
      if (kind) {
        targets.push({ kind, target: node, targets: [node] });
        return;
      }

      const editable = editableTargetApi.findEditableTarget(node);
      if (!editable || seen.has(editable)) return;
      seen.add(editable);
      const fieldKey = smartFillApi.inferFieldKeyForSmartFill(editable);
      if (!fieldKey) return;
      if (!fieldVisibilityApi.isFieldVisible(fieldKey, visibleFieldKeys)) return;
      targets.push({ fieldKey, target: editable, targets: [editable] });
    });

    return targets.filter(function (entry) { return !hasAutoFillTargetValue(entry); });
  }

  function collectPageFavoriteProfile(doc, editableTargetApi, smartFillApi) {
    if (!doc || !editableTargetApi || !smartFillApi) return {};
    const profile = {};
    const seen = new Set();
    Array.from(doc.querySelectorAll(
      'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]'
    )).forEach(function (node) {
      const target = editableTargetApi.findEditableTarget(node);
      if (!target || seen.has(target)) return;
      seen.add(target);
      if (String(target.type || "").toLowerCase() === "password") return;
      const fieldKey = smartFillApi.inferFieldKeyForSmartFill(target);
      const value = String(target.isContentEditable ? target.textContent || "" : target.value || "");
      if (fieldKey && value.trim() && !profile[fieldKey]) profile[fieldKey] = value;
    });
    return profile;
  }

  function createContentScriptPanelController(options) {
    const opts = options || {};
    const generators = opts.generators;
    const panelStateApi = opts.panelStateApi;
    const iconAssetsApi = opts.iconAssetsApi;
    const fieldMetaApi = opts.fieldMetaApi;
    const fieldVisibilityApi = opts.fieldVisibilityApi;
    const siteFeatureToggleApi = opts.siteFeatureToggleApi;
    const smartFillApi = opts.smartFillApi;
    const editableTargetApi = opts.editableTargetApi;
    const elementFormControlApi = opts.elementFormControlApi;
    const doc = opts.document;
    const win = opts.window;
    const canRenderPanel = opts.canRenderPanel !== false;
    const onOverridesImported = typeof opts.onOverridesImported === "function" ? opts.onOverridesImported : function () {};
    const onSiteFeatureEnabledChanged = typeof opts.onSiteFeatureEnabledChanged === "function" ? opts.onSiteFeatureEnabledChanged : function () {};
    const onVisibleFieldKeysChanged = typeof opts.onVisibleFieldKeysChanged === "function" ? opts.onVisibleFieldKeysChanged : function () {};

    const fieldKeys = fieldMetaApi.getFieldKeys();
    const IDENTITY_FIELD_KEYS = ["fullName", "companyName"];
    const HIDDEN_BIZCARD_FIELD_KEYS = ["account"];
    const MOBILE_KEY = "mobile";
    const panelState = panelStateApi.createPanelState();
    const runtimeApi = typeof chrome !== "undefined" ? chrome.runtime : null;
    const dataRecordsApi = rootScope.ChromeTestDataDataRecords;
    const extensionVersion = runtimeApi && typeof runtimeApi.getManifest === "function" ? String(runtimeApi.getManifest().version || "") : "";
    let root = null;
    let fieldGrid = null;
    let mainView = null;
    let settingsView = null;
    let footer = null;
    let fallbackBox = null;
    let fallbackText = null;
    let flashNode = null;
    let settingsStatus = null;
    let importInput = null;
    let importMode = "overrides";
    let versionStatus = null;
    let githubBtn = null;
    let checkUpdateBtn = null;
    let visibilityList = null;
    let siteFeatureStatus = null;
    let siteFeatureToggle = null;
    let floatingIconToggle = null;
    let localAnnotationFileToggle = null;
    let localAnnotationFileNote = null;
    let localAnnotationFileAuthorizeButton = null;
    let focusStyleToggle = null;
    let aiRecognitionToggle = null;
    let aiBaseUrlInput = null;
    let aiApiKeyInput = null;
    let aiModelInput = null;
    let aiRecognitionStatus = null;
    let aiRecognitionConfigPanel = null;
    let dockLauncher = null;
    let dockBtn = null;
    let dockMessage = null;
    let dockMessageActionButton = null;
    let dockMessageText = null;
    let dockMessageTimer = null;
    let dockMessageAction = null;
    let dockMessageDismiss = null;
    let autoFillAborted = false;
    let autoFillRunning = false;
    let dockDragJustEnded = false;

    const FOCUS_STYLE_STORAGE_KEY = "ctdp.focusStyle.v1";
    const DOCK_TOP_STORAGE_KEY = "ctdp.dockTop.v1";
    const FLOATING_ICON_ENABLED_STORAGE_KEY = "ctdp.floatingIconEnabled.v1";
    const FAVORITE_PROFILES_STORAGE_KEY = "ctdp.favoriteProfiles.v1";
    const GENERATED_PROFILES_STORAGE_KEY = "ctdp.generatedProfiles.v1";
    const SMART_FILL_OVERRIDES_STORAGE_KEY = "ctdp.smartFillOverrides.v1";
    const LOCAL_ANNOTATION_FILE_ENABLED_STORAGE_KEY = "ctdp.localAnnotationFileEnabled.v1";
    const VISIBLE_FIELD_KEYS_STORAGE_KEY = "ctdp.visibleFieldKeys.v1";
    const SITE_FEATURE_ENABLED_STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";
    const FULL_BACKUP_FORMAT = "place-fill-full-backup";
    const FULL_BACKUP_VERSION = 1;
    const FULL_BACKUP_STORAGE_KEYS = [
      FAVORITE_PROFILES_STORAGE_KEY,
      GENERATED_PROFILES_STORAGE_KEY,
      SMART_FILL_OVERRIDES_STORAGE_KEY,
      VISIBLE_FIELD_KEYS_STORAGE_KEY,
      SITE_FEATURE_ENABLED_STORAGE_KEY,
      FLOATING_ICON_ENABLED_STORAGE_KEY,
      FOCUS_STYLE_STORAGE_KEY,
      DOCK_TOP_STORAGE_KEY
    ];
    const DOCK_DEFAULT_TOP = 112;
    const DOCK_HEIGHT = 72;
    const CTDP_ROOT_TOP = 18;

    const state = {
      copiedFieldKey: null,
      copiedProfileIndex: null,
      favoriteCardProfiles: [],
      favoriteProfiles: [],
      panelView: "main",
      profile: generators.generateProfile(),
      siteFeatureEnabled: siteFeatureToggleApi.getDefaultSiteFeatureEnabled(),
      floatingIconEnabled: true,
      localAnnotationFileEnabled: false,
      localAnnotationFilePermissionRequired: false,
      aiRecognitionConfig: {
        baseUrl: "",
        enabled: false,
        hasApiKey: false,
        model: "gpt-4o-mini",
        origin: "",
        permissionGranted: false
      },
      visibleFieldKeys: fieldVisibilityApi.getDefaultVisibleFieldKeys(),
      focusStyle: "subtle",
      dockTop: DOCK_DEFAULT_TOP
    };

    function updatePanelState() {
      if (!root) return;
      const snap = panelState.snapshot();
      root.setAttribute("data-visible", String(snap.visible));
      root.setAttribute("data-collapsed", String(snap.collapsed));
      root.setAttribute("data-view", state.panelView);
      root.setAttribute("data-site-feature-enabled", String(state.siteFeatureEnabled));
      root.setAttribute("data-floating-icon-enabled", String(state.floatingIconEnabled));
    }

    function shouldShowFloatingIcon() {
      return state.floatingIconEnabled && state.siteFeatureEnabled;
    }

    function syncFloatingIconVisibility() {
      const snap = panelState.snapshot();
      if (shouldShowFloatingIcon() && !snap.visible) panelState.showCollapsed();
      if (!shouldShowFloatingIcon() && snap.collapsed) panelState.hide();
      updatePanelState();
    }

    function updatePanelView() {
      if (!root || !mainView || !settingsView) return;
      const isSettings = state.panelView === "settings";
      mainView.hidden = isSettings;
      settingsView.hidden = !isSettings;
      updatePanelState();
    }

    function isPanelInteractionTarget(target) {
      return !!(root && target && typeof root.contains === "function" && root.contains(target));
    }

    function setPanelView(view) {
      state.panelView = view === "settings" ? "settings" : "main";
      updatePanelView();
    }

    function pulseFlash(tone) {
      if (!flashNode) return;
      flashNode.setAttribute("data-tone", tone || "copy");
      flashNode.classList.remove("is-active");
      void flashNode.offsetWidth;
      flashNode.classList.add("is-active");
    }

    function hideDockMessage() {
      if (dockMessageTimer) win.clearTimeout(dockMessageTimer);
      if (dockMessage) {
        dockMessage.hidden = true;
        dockMessage.removeAttribute("data-dismissible");
        dockMessage.removeAttribute("data-actionable");
      }
      if (dockMessageActionButton) {
        dockMessageActionButton.disabled = true;
        dockMessageActionButton.removeAttribute("title");
      }
      if (root) root.removeAttribute("data-dock-message");
      dockMessageTimer = null;
      dockMessageAction = null;
      dockMessageDismiss = null;
    }

    function showDockMessage(message, ensureVisible, dismissible, onDismiss, onAction, actionTitle) {
      if (!dockBtn || !dockMessage || !dockMessageActionButton || !dockMessageText || !message) return;
      hideDockMessage();
      dockMessageAction = typeof onAction === "function" ? onAction : null;
      dockMessageDismiss = typeof onDismiss === "function" ? onDismiss : null;
      if (ensureVisible && shouldShowFloatingIcon()) {
        const snap = panelState.snapshot();
        if (!snap.visible) panelState.toggleCollapsed();
        else if (!snap.collapsed) panelState.collapse();
        updatePanelState();
        if (root) root.setAttribute("data-dock-message", "true");
      }
      dockMessageText.textContent = message;
      dockMessageActionButton.disabled = !dockMessageAction;
      if (dockMessageAction) dockMessageActionButton.setAttribute("title", actionTitle || "备份全部数据");
      dockMessage.setAttribute("data-actionable", String(!!dockMessageAction));
      dockMessage.setAttribute("data-dismissible", String(!!dismissible));
      dockMessage.hidden = false;
      void dockMessage.offsetWidth;
      if (!dismissible) dockMessageTimer = win.setTimeout(hideDockMessage, 4000);
    }

    function hideDismissibleDockMessage() {
      if (dockMessageDismiss) hideDockMessage();
    }

    function pulseRefreshGrid() {
      if (!fieldGrid) return;
      fieldGrid.classList.remove("is-refreshing");
      void fieldGrid.offsetWidth;
      fieldGrid.classList.add("is-refreshing");
    }

    function hideFallback() {
      if (!fallbackBox || !fallbackText) return;
      fallbackBox.hidden = true;
      fallbackText.value = "";
    }

    function showFallback(text) {
      if (!fallbackBox || !fallbackText) return;
      fallbackText.value = text;
      fallbackBox.hidden = false;
      fallbackText.focus();
      fallbackText.select();
    }

    async function copyText(text, opts) {
      const copyOptions = opts || {};
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(text);
          hideFallback();
          if (copyOptions.flashTone !== null) pulseFlash(copyOptions.flashTone || "copy");
          return true;
        } catch (_) {}
      }
      showFallback(text);
      if (copyOptions.manualFlashTone !== null) pulseFlash(copyOptions.manualFlashTone || "manual");
      return false;
    }

    function renderButtonIcon(iconName, label, className) {
      return iconAssetsApi.renderIconMarkup(iconName, className, label);
    }

    function renderCopiedStateMarkup() {
      return (
        '<span class="ctdp-card-copy-state">' +
        iconAssetsApi.renderIconMarkup(iconAssetsApi.ACTION_ICONS.copied, "ctdp-copy-state-icon") +
        "<span>已复制</span></span>"
      );
    }

    function renderVisibilityToggleMarkup(fieldKey) {
      const label = fieldMetaApi.getFieldLabel(fieldKey);
      const iconName = fieldMetaApi.getFieldIconName(fieldKey);
      const checked = fieldVisibilityApi.isFieldVisible(fieldKey, state.visibleFieldKeys);
      return [
        '<label class="ctdp-field-visibility-item">',
        '  <input class="ctdp-field-visibility-checkbox" type="checkbox" data-role="field-visibility-toggle" data-key="' + fieldKey + '"' + (checked ? " checked" : "") + ">",
        '  <span class="ctdp-field-visibility-copy">',
        "    " + iconAssetsApi.renderIconMarkup(iconName, "ctdp-settings-row-icon"),
        '    <span class="ctdp-field-visibility-label">' + label + "</span>",
        "  </span>",
        "</label>"
      ].join("");
    }

    function renderSiteFeatureToggleMarkup() {
      return [
        '<section class="ctdp-settings-row ctdp-settings-row-static">',
        '  <span class="ctdp-settings-row-head">',
        '    <span class="ctdp-settings-row-copy">',
        '      <span class="ctdp-settings-row-title">启用智能功能</span>',
        '      <span class="ctdp-settings-row-note">控制当前站点的智能识别和右键标注</span>',
        "    </span>",
        '    <label class="ctdp-switch" aria-label="切换当前站点智能功能">',
        '      <input class="ctdp-switch-input" type="checkbox" data-role="site-feature-toggle"' + (state.siteFeatureEnabled ? " checked" : "") + ">",
        '      <span class="ctdp-switch-track"><span class="ctdp-switch-thumb"></span></span>',
        "    </label>",
        "  </span>",
        "</section>"
      ].join("");
    }

    function getSiteFeatureStatusText() {
      return state.siteFeatureEnabled ? "当前站点已启用智能识别和右键标注" : "当前站点已停用智能识别和右键标注";
    }

    function renderFocusStyleToggleMarkup() {
      return [
        '<section class="ctdp-settings-row ctdp-settings-row-static">',
        '  <span class="ctdp-settings-row-head">',
        '    <span class="ctdp-settings-row-copy">',
        '      <span class="ctdp-settings-row-title">增强焦点效果</span>',
        '      <span class="ctdp-settings-row-note">开启后使用更醒目的炫彩光晕</span>',
        "    </span>",
        '    <label class="ctdp-switch" aria-label="切换焦点边框风格">',
        '      <input class="ctdp-switch-input" type="checkbox" data-role="focus-style-toggle"' + (state.focusStyle === "bold" ? " checked" : "") + ">",
        '      <span class="ctdp-switch-track"><span class="ctdp-switch-thumb"></span></span>',
        "    </label>",
        "  </span>",
        "</section>"
      ].join("");
    }

    function renderFloatingIconToggleMarkup() {
      return [
        '<section class="ctdp-settings-row ctdp-settings-row-static">',
        '  <span class="ctdp-settings-row-head">',
        '    <span class="ctdp-settings-row-copy">',
        '      <span class="ctdp-settings-row-title">显示悬浮图标</span>',
        '      <span class="ctdp-settings-row-note">开启后仅在已启用的站点自动显示</span>',
        "    </span>",
        '    <label class="ctdp-switch" aria-label="切换悬浮图标">',
        '      <input class="ctdp-switch-input" type="checkbox" data-role="floating-icon-toggle"' + (state.floatingIconEnabled ? " checked" : "") + ">",
        '      <span class="ctdp-switch-track"><span class="ctdp-switch-thumb"></span></span>',
        "    </label>",
        "  </span>",
        "</section>"
      ].join("");
    }

    function getLocalAnnotationFileNoteText() {
      if (state.localAnnotationFilePermissionRequired) return "目录权限需要重新确认，浏览器内标注不受影响";
      return state.localAnnotationFileEnabled
        ? "已授权，标注后自动更新 place-fill-data/place-fill-user-data.json"
        : "默认关闭；开启后自动创建 place-fill-data 数据目录";
    }

    function renderLocalAnnotationFileToggleMarkup() {
      return [
        '<section class="ctdp-settings-row ctdp-settings-row-static">',
        '  <span class="ctdp-settings-row-head">',
        '    <span class="ctdp-settings-row-copy">',
        '      <span class="ctdp-settings-row-title">自动保存标注到本地</span>',
        '      <span class="ctdp-settings-row-note" data-role="local-annotation-file-note">' + getLocalAnnotationFileNoteText() + "</span>",
        "    </span>",
        '    <label class="ctdp-switch" aria-label="切换本地标注自动保存">',
        '      <input class="ctdp-switch-input" type="checkbox" data-role="local-annotation-file-toggle"' + (state.localAnnotationFileEnabled ? " checked" : "") + '>',
        '      <span class="ctdp-switch-track"><span class="ctdp-switch-thumb"></span></span>',
        "    </label>",
        "  </span>",
        '  <button class="ctdp-ai-action" type="button" data-role="reauthorize-local-annotation-file" hidden>恢复目录权限</button>',
        "</section>"
      ].join("");
    }

    function syncLocalAnnotationFileEnabled(enabled, permissionRequired) {
      state.localAnnotationFileEnabled = enabled === true;
      state.localAnnotationFilePermissionRequired = permissionRequired === true;
      if (localAnnotationFileToggle) localAnnotationFileToggle.checked = state.localAnnotationFileEnabled;
      if (localAnnotationFileNote) localAnnotationFileNote.textContent = getLocalAnnotationFileNoteText();
      if (localAnnotationFileAuthorizeButton) localAnnotationFileAuthorizeButton.hidden = !state.localAnnotationFilePermissionRequired;
    }

    async function loadLocalAnnotationFileEnabled() {
      try {
        const response = await sendRuntimeMessage({ type: "read-local-annotation-file-state" });
        syncLocalAnnotationFileEnabled(response && response.enabled, response && response.permissionRequired);
      } catch (_) {
        syncLocalAnnotationFileEnabled(false);
      }
    }

    async function toggleLocalAnnotationFileEnabled(enabled) {
      if (enabled) {
        syncLocalAnnotationFileEnabled(false);
        const restored = await sendRuntimeMessage({ type: "enable-local-annotation-file" });
        if (restored && restored.enabled) {
          if (typeof smartFillApi.loadManualFieldOverrides === "function") await smartFillApi.loadManualFieldOverrides();
          syncLocalAnnotationFileEnabled(true);
          setSettingsStatus("已恢复本地标注自动保存", "success");
          return;
        }
        setSettingsStatus(restored && restored.permissionRequired ? "请恢复原目录访问权限" : "请完成目录读写授权", "warning");
        const opened = await sendRuntimeMessage({ type: "open-local-annotation-permission" });
        if (!opened || opened.ok !== true) setSettingsStatus("无法打开目录授权页", "error");
        return;
      }
      const response = await sendRuntimeMessage({ type: "disable-local-annotation-file" });
      syncLocalAnnotationFileEnabled(false);
      setSettingsStatus(response && response.ok ? "已关闭本地标注自动保存" : (response && response.error ? response.error : "关闭失败"), response && response.ok ? "success" : "error");
    }

    function syncFloatingIconToggle() {
      if (floatingIconToggle) floatingIconToggle.checked = state.floatingIconEnabled;
    }

    function syncFloatingIconEnabled(enabled) {
      state.floatingIconEnabled = enabled !== false;
      syncFloatingIconToggle();
      syncFloatingIconVisibility();
    }

    async function loadFloatingIconEnabled() {
      try {
        const stored = await chrome.storage.local.get(FLOATING_ICON_ENABLED_STORAGE_KEY);
        syncFloatingIconEnabled(stored && stored[FLOATING_ICON_ENABLED_STORAGE_KEY]);
      } catch (_) {
        syncFloatingIconEnabled(true);
      }
    }

    async function setFloatingIconEnabled(enabled) {
      syncFloatingIconEnabled(enabled);
      try {
        await chrome.storage.local.set({ [FLOATING_ICON_ENABLED_STORAGE_KEY]: state.floatingIconEnabled });
      } catch (_) {}
    }

    function getAiRecognitionStatusText() {
      const config = state.aiRecognitionConfig;
      if (!config.enabled) return "AI 识别已停用";
      if (!config.baseUrl || !config.model || !config.hasApiKey) return "请填写 HTTPS Base URL、API Key 和模型名";
      if (!config.permissionGranted) return "AI 接口域名未授权";
      return "AI 识别已启用";
    }

    function renderAiRecognitionMarkup() {
      const config = state.aiRecognitionConfig;
      return [
        '<section class="ctdp-settings-row ctdp-settings-row-static">',
        '  <span class="ctdp-settings-row-head">',
        '    <span class="ctdp-settings-row-copy">',
        '      <span class="ctdp-settings-row-title">启用 AI 识别</span>',
        '      <span class="ctdp-settings-row-note">开启后显示接口配置表单</span>',
        "    </span>",
        '    <label class="ctdp-switch" aria-label="切换 AI 识别">',
        '      <input class="ctdp-switch-input" type="checkbox" data-role="ai-recognition-toggle"' + (config.enabled ? " checked" : "") + ">",
        '      <span class="ctdp-switch-track"><span class="ctdp-switch-thumb"></span></span>',
        "    </label>",
        "  </span>",
        "</section>",
        '<div class="ctdp-ai-settings" data-role="ai-recognition-config"' + (config.enabled ? "" : " hidden") + ">",
        '  <label class="ctdp-ai-field">',
        '    <span>Base URL</span>',
        '    <input type="url" data-role="ai-base-url" placeholder="https://api.example.com/v1" value="' + escapeHtml(config.baseUrl || "") + '">',
        "  </label>",
        '  <label class="ctdp-ai-field">',
        '    <span>API Key</span>',
        '    <input type="password" data-role="ai-api-key" placeholder="' + (config.hasApiKey ? "已保存，留空保持不变" : "输入 API Key") + '">',
        "  </label>",
        '  <label class="ctdp-ai-field">',
        '    <span>模型</span>',
        '    <input type="text" data-role="ai-model" placeholder="gpt-4o-mini" value="' + escapeHtml(config.model || "gpt-4o-mini") + '">',
        "  </label>",
        '  <span class="ctdp-ai-actions">',
        '    <button class="ctdp-ai-action" type="button" data-role="save-ai-recognition">保存并授权</button>',
        '    <button class="ctdp-ai-action" type="button" data-role="test-ai-recognition">测试连接</button>',
        '    <button class="ctdp-ai-action" type="button" data-role="clear-ai-cache">清除缓存</button>',
        "  </span>",
        "</div>"
      ].join("");
    }

    function renderSettingsActionMarkup(role, iconName, title, note, className) {
      return [
        '<button class="ctdp-settings-row ctdp-settings-row-action' + (className ? " " + className : "") + '" type="button" data-role="' + role + '">',
        '  <span class="ctdp-settings-row-head">',
        "    " + renderButtonIcon(iconName, "", "ctdp-settings-row-icon"),
        '    <span class="ctdp-settings-row-copy">',
        '      <span class="ctdp-settings-row-title">' + title + "</span>",
        '      <span class="ctdp-settings-row-note">' + note + "</span>",
        "    </span>",
        "  </span>",
        "</button>"
      ].join("");
    }

    function renderVisibleFieldsMarkup() {
      return [
        '<section class="ctdp-settings-row ctdp-settings-row-static ctdp-visible-fields">',
        '  <span class="ctdp-settings-row-title">填充项选择</span>',
        '  <span class="ctdp-settings-row-note">仅勾选项会显示在面板和智能填充中</span>',
        '  <div class="ctdp-field-visibility-list" data-role="field-visibility-list"></div>',
        "</section>"
      ].join("");
    }

    function renderDataSettingsMarkup() {
      return [
        renderLocalAnnotationFileToggleMarkup(),
        renderSettingsActionMarkup("export-full-backup", "download", "备份全部数据", "备份常用数据、标注和站点设置"),
        renderSettingsActionMarkup("import-full-backup", "upload", "恢复全部数据", "从完整备份恢复并覆盖本地数据", "ctdp-settings-row-restore"),
        '<details class="ctdp-settings-more">',
        '  <summary class="ctdp-settings-more-summary">更多数据工具</summary>',
        '  <div class="ctdp-settings-more-content">',
        renderSettingsActionMarkup("export-overrides", "download", "导出标注数据", "下载完整 JSON 标注"),
        renderSettingsActionMarkup("import-overrides", "upload", "导入标注数据", "合并并覆盖同键标注"),
        renderSettingsActionMarkup("export-sanitized-overrides", "shield", "脱敏导出", "仅保留输入框指纹"),
        "  </div>",
        "</details>"
      ].join("");
    }

    function renderSettingsSectionMarkup(key, title, note, iconName, content, open, noteRole) {
      return [
        '<details class="ctdp-settings-section" data-settings-section="' + key + '"' + (open ? " open" : "") + ">",
        '  <summary class="ctdp-settings-section-summary">',
        "    " + renderButtonIcon(iconName, "", "ctdp-settings-section-icon"),
        '    <span class="ctdp-settings-section-copy">',
        '      <span class="ctdp-settings-section-title">' + title + "</span>",
        '      <span class="ctdp-settings-section-note"' + (noteRole ? ' data-role="' + noteRole + '"' : "") + ">" + note + "</span>",
        "    </span>",
        "  </summary>",
        '  <div class="ctdp-settings-section-content">',
        content,
        "  </div>",
        "</details>"
      ].join("");
    }

    function getFocusStyleNoteText() {
      return state.focusStyle === "bold" ? "炫彩光晕 / 张扬" : "细边框 / 极简";
    }

    function applyFocusStyle() {
      if (!doc || !doc.documentElement) return;
      doc.documentElement.setAttribute("data-ctdp-focus-style", state.focusStyle);
    }

    function syncFocusStyleToggle() {
      if (!focusStyleToggle) return;
      focusStyleToggle.checked = state.focusStyle === "bold";
      const note = root && root.querySelector('[data-role="focus-style-note"]');
      if (note) note.textContent = getFocusStyleNoteText();
    }

    async function loadFocusStyle() {
      try {
        const stored = await chrome.storage.local.get(FOCUS_STYLE_STORAGE_KEY);
        state.focusStyle = (stored && stored[FOCUS_STYLE_STORAGE_KEY]) === "bold" ? "bold" : "subtle";
      } catch (_) {
        state.focusStyle = "subtle";
      }
      syncFocusStyleToggle();
      applyFocusStyle();
    }

    async function setFocusStyle(bold) {
      state.focusStyle = bold ? "bold" : "subtle";
      syncFocusStyleToggle();
      applyFocusStyle();
      try {
        const entry = {};
        entry[FOCUS_STYLE_STORAGE_KEY] = state.focusStyle;
        await chrome.storage.local.set(entry);
      } catch (_) {}
    }

    function applyDockTop() {
      if (!dockLauncher) return;
      dockLauncher.style.top = state.dockTop + "px";
      if (dockMessage) dockMessage.style.top = state.dockTop + DOCK_HEIGHT / 2 + "px";
    }

    async function loadDockTop() {
      try {
        const stored = await chrome.storage.local.get(DOCK_TOP_STORAGE_KEY);
        const val = stored && stored[DOCK_TOP_STORAGE_KEY];
        if (typeof val === "number" && val >= 0) {
          const viewH = win ? win.innerHeight : (doc.documentElement.clientHeight || 600);
          state.dockTop = Math.min(val, viewH - CTDP_ROOT_TOP - DOCK_HEIGHT);
        }
      } catch (_) {}
      applyDockTop();
    }

    async function saveDockTop() {
      try {
        const entry = {};
        entry[DOCK_TOP_STORAGE_KEY] = state.dockTop;
        await chrome.storage.local.set(entry);
      } catch (_) {}
    }

    function setupDockDrag() {
      if (!dockBtn) return;
      let dragStartY = 0;
      let dragStartTop = 0;
      let dragging = false;

      function onMouseMove(e) {
        if (!dragging) return;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dy) > 3) dockDragJustEnded = true;
        const viewH = win ? win.innerHeight : (doc.documentElement.clientHeight || 600);
        const maxTop = viewH - CTDP_ROOT_TOP - DOCK_HEIGHT;
        state.dockTop = Math.max(0, Math.min(dragStartTop + dy, maxTop));
        applyDockTop();
      }

      function onMouseUp() {
        if (!dragging) return;
        dragging = false;
        if (root) root.removeAttribute("data-dragging");
        doc.removeEventListener("mousemove", onMouseMove);
        doc.removeEventListener("mouseup", onMouseUp);
        if (dockDragJustEnded) saveDockTop();
      }

      dockBtn.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        dragStartY = e.clientY;
        dragStartTop = state.dockTop;
        dragging = true;
        dockDragJustEnded = false;
        if (root) root.setAttribute("data-dragging", "true");
        doc.addEventListener("mousemove", onMouseMove);
        doc.addEventListener("mouseup", onMouseUp);
      });
    }

    function identityTemplate(key, value, profileIndex) {
      const label = fieldMetaApi.getFieldLabel(key);
      const iconName = fieldMetaApi.getFieldIconName(key);
      return '<article class="ctdp-card ctdp-card-identity" role="button" tabindex="0"'
        + ' data-role="copy-card" data-key="' + key + '" data-profile-index="' + profileIndex + '" data-copied="false"'
        + ' aria-label="复制' + label + '">'
        + '<div class="ctdp-card-body">'
        + iconAssetsApi.renderIconMarkup(iconName, "ctdp-card-icon")
        + '<p class="ctdp-card-value">' + escapeHtml(value) + "</p>"
        + "</div></article>";
    }

    function mobileHeaderTemplate(key, value, profileIndex) {
      const label = fieldMetaApi.getFieldLabel(key);
      const iconName = fieldMetaApi.getFieldIconName(key);
      return '<article class="ctdp-card ctdp-card-mobile-header" role="button" tabindex="0"'
        + ' data-role="copy-card" data-key="' + key + '" data-profile-index="' + profileIndex + '" data-copied="false"'
        + ' aria-label="复制' + label + '">'
        + '<div class="ctdp-card-body">'
        + iconAssetsApi.renderIconMarkup(iconName, "ctdp-card-icon")
        + '<p class="ctdp-card-value">' + escapeHtml(value) + "</p>"
        + "</div></article>";
    }

    function fieldRowTemplate(key, value, profileIndex) {
      const label = fieldMetaApi.getFieldLabel(key);
      const iconName = fieldMetaApi.getFieldIconName(key);
      return '<article class="ctdp-card ctdp-card-row" role="button" tabindex="0"'
        + ' data-role="copy-card" data-key="' + key + '" data-profile-index="' + profileIndex + '" data-copied="false"'
        + ' aria-label="复制' + label + '">'
        + '<div class="ctdp-card-body">'
        + iconAssetsApi.renderIconMarkup(iconName, "ctdp-card-icon")
        + '<div class="ctdp-card-text">'
        + '<p class="ctdp-card-label">' + label + "</p>"
        + '<p class="ctdp-card-value">' + escapeHtml(value) + "</p>"
        + "</div></div></article>";
    }

    function pairedRowTemplate(key1, val1, key2, val2, profileIndex) {
      return '<div class="ctdp-bizcard-pair">'
        + fieldRowTemplate(key1, val1, profileIndex)
        + fieldRowTemplate(key2, val2, profileIndex)
        + "</div>";
    }

    function renderProfileCard(profile, profileIndex, cardKind, emptyText) {
      const visIdentityKeys = IDENTITY_FIELD_KEYS.filter(function (k) {
        return state.visibleFieldKeys.indexOf(k) !== -1;
      });
      const mobileVisible = state.visibleFieldKeys.indexOf(MOBILE_KEY) !== -1;
      const visBodyKeys = state.visibleFieldKeys.filter(function (k) {
        return IDENTITY_FIELD_KEYS.indexOf(k) === -1 && k !== MOBILE_KEY && HIDDEN_BIZCARD_FIELD_KEYS.indexOf(k) === -1;
      });

      const parts = [
        '<section class="ctdp-bizcard" data-card-kind="' + cardKind + '">',
        '  <div class="ctdp-bizcard-paper">'
      ];

      if (!profile) {
        parts.push('<div class="ctdp-bizcard-empty">' + escapeHtml(emptyText) + "</div>");
        parts.push("</div></section>");
        return parts.join("");
      }

      const hasHeader = visIdentityKeys.length > 0 || mobileVisible;
      if (hasHeader) {
        parts.push('<div class="ctdp-bizcard-header">');
        const fullNameVisible = state.visibleFieldKeys.indexOf("fullName") !== -1;
        if (fullNameVisible || mobileVisible) {
          parts.push('<div class="ctdp-bizcard-name-row">');
          if (fullNameVisible) { parts.push(identityTemplate("fullName", profile["fullName"], profileIndex)); }
          if (mobileVisible) { parts.push(mobileHeaderTemplate(MOBILE_KEY, profile[MOBILE_KEY], profileIndex)); }
          parts.push("</div>");
        }
        if (state.visibleFieldKeys.indexOf("companyName") !== -1) {
          parts.push(identityTemplate("companyName", profile["companyName"], profileIndex));
        }
        parts.push("</div>");
      }

      if (hasHeader && visBodyKeys.length > 0) {
        parts.push('<hr class="ctdp-bizcard-divider" aria-hidden="true">');
      }

      if (visBodyKeys.length > 0) {
        parts.push('<div class="ctdp-bizcard-body">');
        let i = 0;
        while (i < visBodyKeys.length) {
          const k = visBodyKeys[i];
          if (k === "email" && i + 1 < visBodyKeys.length && visBodyKeys[i + 1] === "landline") {
            parts.push(pairedRowTemplate("email", profile["email"], "landline", profile["landline"], profileIndex));
            i += 2;
          } else {
            parts.push(fieldRowTemplate(k, profile[k], profileIndex));
            i++;
          }
        }
        parts.push("</div>");
      }

      parts.push("</div></section>");
      return parts.join("");
    }

    function renderCards() {
      if (!fieldGrid) return;
      const hasVisibleFields = state.visibleFieldKeys.some(function (k) {
        return HIDDEN_BIZCARD_FIELD_KEYS.indexOf(k) === -1;
      });
      if (!hasVisibleFields) {
        fieldGrid.innerHTML = "";
        return;
      }

      const parts = ['<div class="ctdp-bizcard-stack">'];
      parts.push(renderProfileCard(state.profile, 0, "generated", "暂无随机数据"));
      state.favoriteCardProfiles.forEach(function (profile, index) {
        parts.push(renderProfileCard(profile, index + 1, index === 0 ? "favorite-a" : "favorite-b", ""));
      });
      parts.push("</div>");
      fieldGrid.innerHTML = parts.join("");
      bindBizcardTilt();
    }

    function bindBizcardTilt() {
      var papers = fieldGrid ? fieldGrid.querySelectorAll(".ctdp-bizcard-paper") : [];

      papers.forEach(function (paper) {
        paper.addEventListener("mousemove", function (e) {
          var rect = paper.getBoundingClientRect();
          var dx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2); // -1..1
          var dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2); // -1..1
          var px = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
          var py = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
          var card = paper.closest(".ctdp-bizcard");
          const cardKind = card && card.getAttribute("data-card-kind");

          // 3D 倾斜
          paper.style.transform =
            "rotateX(" + (-dy * 3).toFixed(2) + "deg) rotateY(" + (dx * 6).toFixed(2) + "deg)";
          // 白色高光跟随光标
          paper.style.setProperty("--ctdp-light-x", px + "%");
          paper.style.setProperty("--ctdp-light-y", py + "%");
          if (cardKind !== "generated") {
            paper.style.boxShadow =
              "inset 0 1px 0 rgba(255,255,255,0.92)," +
              "0 1px 2px rgba(31,41,55,0.08)," +
              "0 8px 18px rgba(31,41,55,0.08)";
            return;
          }
          // 动态阴影：跟随倾斜角度偏移
          var sx = (dx * -6).toFixed(1);
          var sy = (dy * -4 + 8).toFixed(1);
          paper.style.boxShadow =
            "inset 0 1px 0 rgba(255,255,255,0.34)," +
            "inset 0 -1px 0 rgba(126,92,0,0.12)," +
            sx + "px " + sy + "px 22px rgba(15,23,42,0.14)," +
            "0 2px 5px rgba(15,23,42,0.12)";
        });

        paper.addEventListener("mouseleave", function () {
          paper.style.transform = "";
          paper.style.removeProperty("--ctdp-light-x");
          paper.style.removeProperty("--ctdp-light-y");
          paper.style.boxShadow = "";
        });
      });
    }

    function renderVisibilityList() {
      if (!visibilityList) return;
      visibilityList.innerHTML = fieldKeys
        .map(function (fieldKey) {
          return renderVisibilityToggleMarkup(fieldKey);
        })
        .join("");
    }

    function syncCopiedCardState() {
      if (!fieldGrid) return;
      fieldGrid.querySelectorAll('[data-role="copy-card"]').forEach(function (card) {
        const key = card.getAttribute("data-key");
        const profileIndex = Number(card.getAttribute("data-profile-index") || "0");
        const copied = state.copiedFieldKey === key && state.copiedProfileIndex === profileIndex;
        card.setAttribute("data-copied", String(copied));
        const head = card.querySelector(".ctdp-card-head");
        const badge = head && head.querySelector(".ctdp-card-copy-state");
        if (!head) return;
        if (copied && !badge) head.insertAdjacentHTML("beforeend", renderCopiedStateMarkup());
        if (!copied && badge) badge.remove();
      });
    }

    function syncFieldCardValue(fieldKey) {
      if (!fieldGrid) return;
      const card = fieldGrid.querySelector('[data-role="copy-card"][data-profile-index="0"][data-key="' + fieldKey + '"]');
      if (!card) return;
      const valueNode = card.querySelector(".ctdp-card-value");
      if (valueNode) valueNode.textContent = state.profile[fieldKey];
    }

    function regenerateFieldValue(fieldKey) {
      const nextValue = generators.generateFieldValue(fieldKey);
      if (!nextValue) return "";
      state.profile[fieldKey] = nextValue;
      if (state.copiedFieldKey === fieldKey && state.copiedProfileIndex === 0) {
        state.copiedFieldKey = null;
        state.copiedProfileIndex = null;
      }
      syncFieldCardValue(fieldKey);
      syncCopiedCardState();
      return nextValue;
    }

    function refreshFavoriteCardProfiles() {
      state.favoriteCardProfiles = sampleFavoriteProfiles(state.favoriteProfiles, 5);
    }

    function render() {
      if (!fieldGrid) return;
      renderCards();
      renderVisibilityList();
      syncSiteFeatureToggle();
      updatePanelState();
      updatePanelView();
    }

    function regenerateProfile() {
      state.copiedFieldKey = null;
      state.copiedProfileIndex = null;
      state.profile = generators.generateProfile();
      refreshFavoriteCardProfiles();
      recordGeneratedProfile();
      hideFallback();
      pulseFlash("regen");
      pulseRefreshGrid();
      render();
      loadFavoriteProfiles();
    }

    function getProfileByIndex(profileIndex) {
      const index = Number(profileIndex || 0);
      return index === 0 ? state.profile : state.favoriteCardProfiles[index - 1];
    }

    async function copyField(key, profileIndex) {
      const profile = getProfileByIndex(profileIndex);
      if (!profile) return;
      const ok = await copyText(profile[key], { flashTone: null, manualFlashTone: null });
      state.copiedFieldKey = ok ? key : null;
      state.copiedProfileIndex = ok ? Number(profileIndex || 0) : null;
      syncCopiedCardState();
    }

    async function copyAll() {
      await copyText(generators.formatProfileForCopy(state.profile, state.visibleFieldKeys));
      state.copiedFieldKey = null;
      state.copiedProfileIndex = null;
      syncCopiedCardState();
    }

    function setAutoFillButtonState(running) {
      if (!root) return;
      root.querySelectorAll('[data-role="auto-fill"], [data-role="quick-auto-fill"]').forEach(function (button) {
        button.setAttribute("data-running", String(running));
      });
    }

    function setAutoFillPageAuraState(running) {
      if (!root) return;
      root.setAttribute("data-autofill-running", String(running));
    }

    function collectAutoFillTargets() {
      return collectPageAutoFillTargets(
        doc,
        editableTargetApi,
        smartFillApi,
        fieldVisibilityApi,
        state.visibleFieldKeys,
        elementFormControlApi
      );
    }

    function delay(ms) {
      return new Promise(function (resolve) { win.setTimeout(resolve, ms); });
    }

    async function addCurrentPageToFavorites() {
      if (typeof opts.refreshAiRecognition === "function") {
        await Promise.race([opts.refreshAiRecognition(), delay(900)]);
      }
      const profile = collectPageFavoriteProfile(doc, editableTargetApi, smartFillApi);
      if (!Object.keys(profile).length) {
        showDockMessage("未识别到可加入常用的数据", true);
        return false;
      }
      const scope = getCurrentScopeKey();
      if (!scope || !dataRecordsApi || typeof dataRecordsApi.createFavoriteProfile !== "function") {
        showDockMessage("加入常用失败", true);
        return false;
      }
      try {
        const favorite = await dataRecordsApi.createFavoriteProfile(scope, { profile });
        await loadFavoriteProfiles();
        showDockMessage("已加入常用", true);
        return favorite;
      } catch (_) {
        showDockMessage("加入常用失败", true);
        return false;
      }
    }

    function getCurrentPageFavorite() {
      const profile = collectPageFavoriteProfile(doc, editableTargetApi, smartFillApi);
      const scope = getCurrentScopeKey();
      if (!scope || !Object.keys(profile).length || !dataRecordsApi || typeof dataRecordsApi.findFavoriteProfile !== "function") {
        return Promise.resolve(null);
      }
      return dataRecordsApi.findFavoriteProfile(scope, profile).catch(function () {
        return null;
      });
    }

    async function removeFavoriteProfile(id) {
      const scope = getCurrentScopeKey();
      if (!scope || !id || !dataRecordsApi || typeof dataRecordsApi.deleteFavoriteProfile !== "function") return false;
      try {
        const removed = await dataRecordsApi.deleteFavoriteProfile(scope, id);
        if (!removed) return false;
        await loadFavoriteProfiles();
        showDockMessage("已移除常用", true);
        return true;
      } catch (_) {
        showDockMessage("移除常用失败", true);
        return false;
      }
    }

    async function autoFillPage() {
      if (autoFillRunning) {
        autoFillAborted = true;
        return;
      }
      if (typeof opts.refreshAiRecognition === "function") {
        await Promise.race([opts.refreshAiRecognition(), delay(900)]);
      }
      var targets = collectAutoFillTargets();
      if (targets.length === 0) return;

      autoFillRunning = true;
      autoFillAborted = false;
      setAutoFillButtonState(true);
      setAutoFillPageAuraState(true);

      try {
        for (var i = 0; i < targets.length; i++) {
          if (autoFillAborted) break;
          var entry = targets[i];
          if (hasAutoFillTargetValue(entry)) continue;
          var value = entry.fieldKey ? getFieldValue(entry.fieldKey) : "";
          if (entry.fieldKey && !value) continue;

          entry.target.scrollIntoView({ behavior: "smooth", block: "center" });
          await delay(120);
          if (autoFillAborted) break;

          var filled = entry.adapter === "element"
            ? await elementFormControlApi.fillElementControl(entry, {
              document: doc,
              editableTargetApi: editableTargetApi
            })
            : entry.fieldKey
              ? editableTargetApi.fillEditableTarget(entry.target, value)
              : editableTargetApi.fillGenericFormControl(entry.targets);
          if (!filled) continue;
          hideFallback();
          pulseFlash("copy");
          if (entry.fieldKey) regenerateFieldValue(entry.fieldKey);

          if (i < targets.length - 1) await delay(200);
        }

        var wasAborted = autoFillAborted;
        if (!wasAborted) {
          pulseFlash("regen");
          showDockMessage("填完啦！");
        }
      } finally {
        autoFillRunning = false;
        autoFillAborted = false;
        setAutoFillButtonState(false);
        setAutoFillPageAuraState(false);
      }
    }

    function syncVisibleFieldKeys(nextVisibleFieldKeys) {
      state.visibleFieldKeys = fieldVisibilityApi.filterVisibleFieldKeys(fieldKeys, nextVisibleFieldKeys);
      if (!fieldVisibilityApi.isFieldVisible(state.copiedFieldKey, state.visibleFieldKeys)) {
        state.copiedFieldKey = null;
      }
      render();
      onVisibleFieldKeysChanged(state.visibleFieldKeys);
    }

    function syncSiteFeatureToggle() {
      if (!siteFeatureToggle) return;
      siteFeatureToggle.checked = state.siteFeatureEnabled;
    }

    function syncSiteFeatureStatus() {
      if (!siteFeatureStatus) return;
      siteFeatureStatus.textContent = getSiteFeatureStatusText();
    }

    function getAiRecognitionDraftConfig() {
      return {
        enabled: !!(aiRecognitionToggle && aiRecognitionToggle.checked),
        baseUrl: aiBaseUrlInput ? aiBaseUrlInput.value : "",
        apiKey: aiApiKeyInput ? aiApiKeyInput.value : "",
        model: aiModelInput ? aiModelInput.value : ""
      };
    }

    function syncAiRecognitionControls() {
      if (aiRecognitionToggle) aiRecognitionToggle.checked = state.aiRecognitionConfig.enabled;
      if (aiRecognitionConfigPanel) aiRecognitionConfigPanel.hidden = !state.aiRecognitionConfig.enabled;
      if (aiBaseUrlInput) aiBaseUrlInput.value = state.aiRecognitionConfig.baseUrl || "";
      if (aiModelInput) aiModelInput.value = state.aiRecognitionConfig.model || "gpt-4o-mini";
      if (aiApiKeyInput) {
        aiApiKeyInput.value = "";
        aiApiKeyInput.placeholder = state.aiRecognitionConfig.hasApiKey ? "已保存，留空保持不变" : "输入 API Key";
      }
      if (aiRecognitionStatus) aiRecognitionStatus.textContent = getAiRecognitionStatusText();
    }

    async function toggleAiRecognitionEnabled(enabled) {
      const previousConfig = { ...state.aiRecognitionConfig };
      state.aiRecognitionConfig.enabled = enabled === true;
      syncAiRecognitionControls();
      try {
        const response = await sendRuntimeMessage({
          type: "save-ai-recognition-config",
          config: getAiRecognitionDraftConfig()
        });
        if (!response || response.error) throw new Error(response && response.error ? response.error : "AI 开关保存失败");
        if (response.config) state.aiRecognitionConfig = {
          baseUrl: response.config.baseUrl || "",
          enabled: response.config.enabled === true,
          hasApiKey: response.config.hasApiKey === true,
          model: response.config.model || "gpt-4o-mini",
          origin: response.config.origin || "",
          permissionGranted: response.config.permissionGranted === true
        };
        syncAiRecognitionControls();
        if (!state.aiRecognitionConfig.enabled) {
          setSettingsStatus("AI 识别已关闭", "success");
        } else if (state.aiRecognitionConfig.permissionGranted) {
          setSettingsStatus("AI 识别已开启", "success");
        } else if (response.permissionPageOpened) {
          setSettingsStatus("AI 识别已开启，请在授权页完成接口授权", "warning");
        } else {
          setSettingsStatus("AI 识别已开启，请完善并保存接口配置", "warning");
        }
      } catch (error) {
        state.aiRecognitionConfig = previousConfig;
        syncAiRecognitionControls();
        setSettingsStatus(error && error.message ? error.message : "AI 开关保存失败", "error");
      }
    }

    async function loadAiRecognitionConfig() {
      const response = await sendRuntimeMessage({ type: "read-ai-recognition-config" });
      if (response && response.config) {
        state.aiRecognitionConfig = {
          baseUrl: response.config.baseUrl || "",
          enabled: response.config.enabled === true,
          hasApiKey: response.config.hasApiKey === true,
          model: response.config.model || "gpt-4o-mini",
          origin: response.config.origin || "",
          permissionGranted: response.config.permissionGranted === true
        };
      }
      syncAiRecognitionControls();
    }

    async function saveAiRecognitionConfig() {
      setSettingsStatus("正在保存 AI 识别配置", "muted");
      const response = await sendRuntimeMessage({
        type: "save-ai-recognition-config",
        config: getAiRecognitionDraftConfig()
      });
      if (!response || response.error) {
        setSettingsStatus(response && response.error ? response.error : "AI 配置保存失败", "error");
        return;
      }
      if (response.config) state.aiRecognitionConfig = {
        baseUrl: response.config.baseUrl || "",
        enabled: response.config.enabled === true,
        hasApiKey: response.config.hasApiKey === true,
        model: response.config.model || "gpt-4o-mini",
        origin: response.config.origin || "",
        permissionGranted: response.config.permissionGranted === true
      };
      syncAiRecognitionControls();
      if (!state.aiRecognitionConfig.enabled) {
        setSettingsStatus("AI 识别已关闭", "success");
      } else {
        setSettingsStatus(
          response.config && response.config.permissionGranted
            ? "AI 识别配置已保存并授权"
            : (response.permissionPageOpened ? "AI 配置已保存，请在授权页点击授权按钮" : "AI 配置已保存，但接口域名未授权"),
          response.config && response.config.permissionGranted ? "success" : "warning"
        );
      }
    }

    function setupSettingsAccordion() {
      const sections = root ? root.querySelectorAll("[data-settings-section]") : [];
      Array.from(sections).forEach(function (section) {
        section.addEventListener("toggle", function () {
          closeOtherSettingsSections(sections, section);
        });
      });
    }

    async function testAiRecognitionConfig() {
      setSettingsStatus("正在测试 AI 识别接口", "muted");
      const response = await sendRuntimeMessage({
        type: "test-ai-recognition-config",
        config: getAiRecognitionDraftConfig()
      });
      setSettingsStatus(response && response.ok ? "AI 识别测试通过" : (response && response.error ? response.error : "AI 识别测试失败"), response && response.ok ? "success" : "error");
    }

    async function clearAiRecognitionCache() {
      if (smartFillApi && typeof smartFillApi.clearAiFieldMappings === "function") await smartFillApi.clearAiFieldMappings();
      onOverridesImported();
      setSettingsStatus("已清除 AI 识别缓存", "success");
    }

    function syncSiteFeatureEnabled(enabled) {
      state.siteFeatureEnabled = siteFeatureToggleApi.isSiteFeatureEnabled(enabled);
      syncSiteFeatureToggle();
      syncSiteFeatureStatus();
      syncFloatingIconVisibility();
      onSiteFeatureEnabledChanged(state.siteFeatureEnabled);
    }

    async function loadSiteFeatureEnabled() {
      syncSiteFeatureEnabled(await siteFeatureToggleApi.readSiteFeatureEnabled());
    }

    async function toggleSiteFeatureEnabled(enabled) {
      const nextEnabled = await siteFeatureToggleApi.writeSiteFeatureEnabled(enabled);
      syncSiteFeatureEnabled(nextEnabled);
    }

    async function toggleFieldVisibility(fieldKey, checked) {
      const requestedFieldKeys = checked
        ? state.visibleFieldKeys.concat(fieldKey)
        : state.visibleFieldKeys.filter(function (visibleFieldKey) {
            return visibleFieldKey !== fieldKey;
          });
      const nextVisibleFieldKeys = await fieldVisibilityApi.writeVisibleFieldKeys(requestedFieldKeys);
      syncVisibleFieldKeys(nextVisibleFieldKeys);
      setSettingsStatus(nextVisibleFieldKeys.length ? "已更新填充项显示范围" : "当前未勾选任何填充项", nextVisibleFieldKeys.length ? "success" : "warning");
    }

    async function loadVisibleFieldKeys() {
      syncVisibleFieldKeys(await fieldVisibilityApi.readVisibleFieldKeys());
    }

    function setSettingsStatus(text, tone) {
      if (!settingsStatus) return;
      settingsStatus.hidden = !text;
      settingsStatus.textContent = text || "";
      settingsStatus.setAttribute("data-tone", tone || "muted");
    }

    function setVersionStatus(text, tone) {
      if (!versionStatus) return;
      versionStatus.textContent = text || "";
      versionStatus.setAttribute("data-tone", tone || "muted");
    }

    function setGithubControlsHidden(hidden) {
      const method = hidden ? "add" : "remove";
      if (githubBtn) githubBtn.classList[method]("is-hidden");
      if (checkUpdateBtn) checkUpdateBtn.classList[method]("is-hidden");
      if (versionStatus) versionStatus.classList[method]("is-hidden");
    }

    function hideGithubControls() {
      setGithubControlsHidden(true);
    }

    function revealGithubControls() {
      setGithubControlsHidden(false);
      setVersionStatus("点击检查更新", "muted");
    }

    function sendRuntimeMessage(message) {
      return new Promise(function (resolve) {
        if (!runtimeApi || typeof runtimeApi.sendMessage !== "function") {
          resolve({ error: "扩展后台不可用" });
          return;
        }
        runtimeApi.sendMessage(message, function (response) {
          if (runtimeApi.lastError) {
            resolve({ error: runtimeApi.lastError.message || "请求失败" });
            return;
          }
          resolve(response || {});
        });
      });
    }

    function getCurrentScopeKey() {
      if (!win || !win.location || typeof win.location.hostname !== "string") return "";
      return String(win.location.hostname || "").trim().toLowerCase();
    }

    function recordGeneratedProfile() {
      const scope = getCurrentScopeKey();
      if (!scope || !dataRecordsApi || typeof dataRecordsApi.recordGeneratedProfile !== "function") return Promise.resolve([]);
      return dataRecordsApi.recordGeneratedProfile(scope, state.profile).catch(function () {
        return [];
      });
    }

    async function loadFavoriteProfiles() {
      const scope = getCurrentScopeKey();
      if (!scope || !dataRecordsApi || typeof dataRecordsApi.readFavoriteProfiles !== "function") return [];
      state.favoriteProfiles = await dataRecordsApi.readFavoriteProfiles(scope).catch(function () {
        return [];
      });
      refreshFavoriteCardProfiles();
      renderCards();
      return state.favoriteProfiles;
    }

    async function openRepositoryPage() {
      const response = await sendRuntimeMessage({ type: "open-extension-repository-page" });
      if (response && response.error) setVersionStatus(response.error, "error");
    }

    async function openDataManagerPage() {
      const response = await sendRuntimeMessage({
        type: "open-data-manager-page",
        scope: getCurrentScopeKey()
      });
      if (response && response.error) setSettingsStatus(response.error, "error");
    }

    async function openReleasePage(url) {
      const response = await sendRuntimeMessage({
        type: "open-extension-release-page",
        url: url || ""
      });
      if (response && response.error) setVersionStatus(response.error, "error");
    }

    async function openDownloadUrl(url) {
      const response = await sendRuntimeMessage({
        type: "download-extension-update",
        url: url || ""
      });
      if (response && response.error) setVersionStatus(response.error, "error");
    }

    async function checkForUpdates() {
      setVersionStatus("正在检查更新", "muted");
      const response = await sendRuntimeMessage({ type: "check-extension-update" });
      if (!response || response.error) {
        setVersionStatus(response && response.error ? response.error : "检查更新失败", "error");
        return;
      }
      if (!response.hasUpdate) {
        setVersionStatus(response.noReleases ? "仓库暂无 Release" : "当前已是最新版本", "success");
        return;
      }
      setVersionStatus("发现 v" + response.latestVersion, "warning");
      if (win.confirm("发现新版本 v" + response.latestVersion + "，是否立即下载？")) {
        if (response.downloadUrl) {
          await openDownloadUrl(response.downloadUrl);
        } else {
          await openReleasePage(response.releaseUrl);
        }
      }
    }

    function downloadJsonFile(fileName, payload) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = doc.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      win.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 0);
    }

    function getLocalStorageArea() {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
      } catch (_) {}
      return null;
    }

    function assertLocalStorageAvailable() {
      const storageArea = getLocalStorageArea();
      if (!storageArea) throw new Error("本地存储不可用");
      return storageArea;
    }

    function hasOwn(object, key) {
      return Object.prototype.hasOwnProperty.call(object || {}, key);
    }

    function readStorageValues(keys) {
      const storageArea = assertLocalStorageAvailable();
      return new Promise(function (resolve, reject) {
        let settled = false;
        function done(result) {
          if (settled) return;
          settled = true;
          resolve(result && typeof result === "object" ? result : {});
        }
        function fail(error) {
          if (settled) return;
          settled = true;
          reject(error || new Error("读取本地存储失败"));
        }
        try {
          const maybePromise = storageArea.get(keys, done);
          if (maybePromise && typeof maybePromise.then === "function") maybePromise.then(done, fail);
        } catch (error) {
          fail(error);
        }
      });
    }

    function writeStorageValues(values) {
      const storageArea = assertLocalStorageAvailable();
      const keys = Object.keys(values || {});
      if (!keys.length) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        let settled = false;
        function done() {
          if (settled) return;
          settled = true;
          resolve();
        }
        function fail(error) {
          if (settled) return;
          settled = true;
          reject(error || new Error("写入本地存储失败"));
        }
        try {
          const maybePromise = storageArea.set(values, done);
          if (maybePromise && typeof maybePromise.then === "function") maybePromise.then(done, fail);
        } catch (error) {
          fail(error);
        }
      });
    }

    function removeStorageValues(keys) {
      const storageArea = assertLocalStorageAvailable();
      const nextKeys = Array.isArray(keys) ? keys.filter(Boolean) : [];
      if (!nextKeys.length) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        let settled = false;
        function done() {
          if (settled) return;
          settled = true;
          resolve();
        }
        function fail(error) {
          if (settled) return;
          settled = true;
          reject(error || new Error("清理本地存储失败"));
        }
        try {
          const maybePromise = storageArea.remove(nextKeys, done);
          if (maybePromise && typeof maybePromise.then === "function") maybePromise.then(done, fail);
        } catch (error) {
          fail(error);
        }
      });
    }

    function buildFullBackupPayload(storedValues) {
      const storage = {};
      FULL_BACKUP_STORAGE_KEYS.forEach(function (key) {
        storage[key] = hasOwn(storedValues, key) ? storedValues[key] : null;
      });
      return {
        exportedAt: new Date().toISOString(),
        format: FULL_BACKUP_FORMAT,
        storage,
        version: FULL_BACKUP_VERSION
      };
    }

    async function exportOverrides(mode) {
      const isSanitized = mode === "sanitized";
      const payload = isSanitized
        ? await smartFillApi.exportSanitizedManualFieldOverrides()
        : await smartFillApi.exportManualFieldOverrides();
      const count = isSanitized ? payload.entries.length : Object.keys(payload.overrides).length;
      if (!count) {
        setSettingsStatus("暂无可导出的标注数据", "warning");
        return;
      }
      downloadJsonFile(
        isSanitized ? "place-fill-overrides-sanitized.json" : "place-fill-overrides.json",
        payload
      );
      setSettingsStatus(isSanitized ? "已导出脱敏标注数据" : "已导出标注数据", "success");
    }

    async function exportFullBackup() {
      const storedValues = await readStorageValues(FULL_BACKUP_STORAGE_KEYS);
      downloadJsonFile("place-fill-full-backup.json", buildFullBackupPayload(storedValues));
      setSettingsStatus("已导出全部数据备份", "success");
    }

    function readImportFile(file) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.addEventListener("load", function () {
          resolve(String(reader.result || ""));
        });
        reader.addEventListener("error", function () {
          reject(new Error("读取文件失败"));
        });
        reader.readAsText(file, "UTF-8");
      });
    }

    function syncImportedOverrideState() {
      onOverridesImported();
    }

    function assertFullBackupPayload(payload) {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("导入文件不是合法备份");
      }
      if (payload.format !== FULL_BACKUP_FORMAT) {
        throw new Error("导入文件不是全量备份");
      }
      if (payload.version !== FULL_BACKUP_VERSION) {
        throw new Error("备份版本不兼容");
      }
      if (!payload.storage || typeof payload.storage !== "object" || Array.isArray(payload.storage)) {
        throw new Error("备份文件缺少本地数据");
      }
      if (!FULL_BACKUP_STORAGE_KEYS.some(function (key) { return hasOwn(payload.storage, key); })) {
        throw new Error("备份文件没有可恢复的数据");
      }
    }

    async function refreshAfterFullBackupImport() {
      await Promise.all([
        loadFloatingIconEnabled(),
        loadSiteFeatureEnabled(),
        loadFocusStyle(),
        loadVisibleFieldKeys(),
        loadDockTop(),
        loadFavoriteProfiles()
      ]);
      syncImportedOverrideState();
      render();
    }

    async function importFullBackupFile(file) {
      if (!file) return;
      const rawText = await readImportFile(file);
      let payload = null;
      try {
        payload = JSON.parse(rawText);
      } catch (_) {
        throw new Error("导入文件不是合法 JSON");
      }
      assertFullBackupPayload(payload);

      const values = {};
      const removeKeys = [];
      FULL_BACKUP_STORAGE_KEYS.forEach(function (key) {
        if (key === SMART_FILL_OVERRIDES_STORAGE_KEY || !hasOwn(payload.storage, key)) return;
        if (payload.storage[key] == null) {
          removeKeys.push(key);
          return;
        }
        values[key] = payload.storage[key];
      });

      await removeStorageValues(removeKeys);
      await writeStorageValues(values);
      if (hasOwn(payload.storage, SMART_FILL_OVERRIDES_STORAGE_KEY)) {
        const overrides = payload.storage[SMART_FILL_OVERRIDES_STORAGE_KEY];
        if (overrides != null && (typeof overrides !== "object" || Array.isArray(overrides))) {
          throw new Error("备份中的标注数据无效");
        }
        await smartFillApi.replaceManualFieldOverrides(overrides || {});
      }
      await sendRuntimeMessage({ type: "mirror-storage-local" });
      await refreshAfterFullBackupImport();
      setSettingsStatus("已恢复全部数据", "success");
    }

    async function importOverridesFile(file) {
      if (!file) return;
      const rawText = await readImportFile(file);
      let payload = null;
      try {
        payload = JSON.parse(rawText);
      } catch (_) {
        throw new Error("导入文件不是合法 JSON");
      }
      const result = await smartFillApi.importManualFieldOverrides(payload);
      syncImportedOverrideState();
      setSettingsStatus("已导入 " + result.importedCount + " 条标注", "success");
    }

    function mount() {
      if (!canRenderPanel || root || !doc || !doc.documentElement) return;
      root = doc.createElement("div");
      root.className = "ctdp-root";
      root.setAttribute("data-visible", "false");
      root.setAttribute("data-collapsed", "false");
      root.setAttribute("data-autofill-running", "false");
      root.setAttribute("data-site-feature-enabled", String(state.siteFeatureEnabled));
      root.setAttribute("data-floating-icon-enabled", String(state.floatingIconEnabled));
      root.innerHTML = [
        '<div class="ctdp-autofill-aura" data-role="autofill-aura" aria-hidden="true">',
        '  <div class="ctdp-autofill-status" data-role="autofill-status">',
        '    <span class="ctdp-autofill-dot"></span>',
        '    <span data-role="autofill-status-text">填写中…</span>',
        "  </div>",
        "</div>",
        '<div class="ctdp-dock-message" data-role="dock-message" hidden>',
        '  <button class="ctdp-dock-message-action" type="button" data-role="run-dock-message-action" aria-live="polite" disabled>',
        '    <span data-role="dock-message-text"></span>',
        "  </button>",
        '  <button class="ctdp-dock-message-close" type="button" data-role="dismiss-dock-message" aria-label="关闭提醒" title="关闭提醒">×</button>',
        "</div>",
        '<div class="ctdp-dock-launcher" data-role="dock-launcher">',
        '  <button class="ctdp-dock" type="button" data-role="expand" aria-label="展开测试数据面板" title="展开测试数据面板">' +
          iconAssetsApi.renderIconMarkup(iconAssetsApi.PRIMARY_LOGO_ICON, "ctdp-dock-icon", "测试数据面板") +
          "</button>",
        '  <nav class="ctdp-dock-actions" aria-label="快捷操作">',
        '    <button class="ctdp-dock-action" type="button" data-role="quick-auto-fill" aria-label="一键填充" title="一键填充" data-label="一键填充">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.autoFill, "", "ctdp-dock-action-icon") +
          "</button>",
        '    <button class="ctdp-dock-action" type="button" data-role="quick-export" aria-label="导出全部数据" title="导出全部数据" data-label="导出">' +
          renderButtonIcon("download", "", "ctdp-dock-action-icon") +
          "</button>",
        '    <button class="ctdp-dock-action" type="button" data-role="quick-import" aria-label="导入全部数据" title="导入全部数据" data-label="导入">' +
          renderButtonIcon("upload", "", "ctdp-dock-action-icon") +
          "</button>",
        "  </nav>",
        "</div>",
        '<section class="ctdp-panel" aria-label="测试数据悬浮面板">',
        '  <div class="ctdp-flash" data-role="flash" aria-hidden="true"></div>',
        '  <div class="ctdp-view ctdp-main-view" data-role="main-view">',
        '    <header class="ctdp-toolbar">',
        '      <div class="ctdp-toolbar-group ctdp-toolbar-group-left">',
        '        <button class="ctdp-btn ctdp-footer-btn" type="button" data-role="open-settings" aria-label="打开设置" title="打开设置">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.settings, "打开设置", "ctdp-btn-icon") +
          "</button>",
        '        <button class="ctdp-btn ctdp-footer-btn" type="button" data-role="open-data-manager" aria-label="打开数据管理" title="打开数据管理">' +
          renderButtonIcon("list-filter", "打开数据管理", "ctdp-btn-icon") +
          "</button>",
        "      </div>",
        '      <div class="ctdp-toolbar-group ctdp-toolbar-group-right">',
        '        <button class="ctdp-btn ctdp-btn-action" type="button" data-role="auto-fill" aria-label="一键填充页面" title="一键填充页面">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.autoFill, "", "ctdp-btn-icon") +
          '<span class="ctdp-action-label">一键填充</span>' +
          "</button>",
        '        <button class="ctdp-btn ctdp-btn-primary" type="button" data-role="regen" aria-label="重新生成全部" title="重新生成全部">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.regen, "重新生成全部", "ctdp-btn-icon") +
          "</button>",
        '        <button class="ctdp-btn ctdp-btn-strong" type="button" data-role="copy-all" aria-label="复制整组数据" title="复制整组数据">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.copyAll, "复制整组数据", "ctdp-btn-icon") +
          "</button>",
        '        <button class="ctdp-btn ctdp-btn-primary is-hidden" type="button" data-role="open-repository" aria-label="打开 GitHub 仓库" title="打开 GitHub 仓库">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.github, "打开 GitHub 仓库", "ctdp-btn-icon") +
          "</button>",
        "      </div>",
        "    </header>",
        '    <main class="ctdp-grid" data-role="field-grid"></main>',
        "  </div>",
        '  <div class="ctdp-view ctdp-settings-view" data-role="settings-view" hidden>',
        '    <header class="ctdp-settings-header">',
        '      <button class="ctdp-btn ctdp-footer-btn ctdp-settings-back" type="button" data-role="settings-back" aria-label="返回主面板" title="返回主面板">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.back, "返回主面板", "ctdp-btn-icon") +
          "</button>",
        '      <div class="ctdp-settings-copy">',
        '        <p class="ctdp-settings-title">设置</p>',
        "      </div>",
        "    </header>",
        '    <div class="ctdp-settings-list">',
        renderSettingsSectionMarkup(
          "site",
          "当前站点",
          getSiteFeatureStatusText(),
          iconAssetsApi.ACTION_ICONS.settings,
          renderSiteFeatureToggleMarkup() + renderVisibleFieldsMarkup(),
          true,
          "site-feature-status"
        ),
        renderSettingsSectionMarkup(
          "experience",
          "填充体验",
          getFocusStyleNoteText(),
          "wand-sparkles",
          renderFloatingIconToggleMarkup() + renderFocusStyleToggleMarkup(),
          false,
          "focus-style-note"
        ),
        renderSettingsSectionMarkup(
          "ai",
          "AI 识别",
          getAiRecognitionStatusText(),
          "shield",
          renderAiRecognitionMarkup(),
          false,
          "ai-recognition-status"
        ),
        renderSettingsSectionMarkup(
          "data",
          "数据与隐私",
          "备份、恢复与标注工具",
          "download",
          renderDataSettingsMarkup(),
          false
        ),
        "    </div>",
        '    <p class="ctdp-settings-status" data-role="settings-status" data-tone="muted" hidden></p>',
        "  </div>",
        '  <footer class="ctdp-footer" data-role="footer">',
        '    <div class="ctdp-footer-meta">',
        '      <div class="ctdp-footer-copy">',
        '        <span class="ctdp-footer-version" data-role="panel-version">v' + extensionVersion + "</span>",
        '        <span class="ctdp-footer-status is-hidden" data-role="version-status" data-tone="muted">点击检查更新</span>',
        "      </div>",
        '      <button class="ctdp-btn ctdp-footer-btn is-hidden" type="button" data-role="check-update" aria-label="检查更新" title="检查更新">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.updateCheck, "检查更新", "ctdp-btn-icon") +
          "</button>",
        "    </div>",
        '    <label class="ctdp-fallback" data-role="fallback-box" hidden>',
        '      <span>自动复制失败时，按 <strong>Ctrl/Cmd + C</strong> 手动复制：</span>',
        '      <textarea data-role="fallback-text" spellcheck="false" readonly></textarea>',
        "    </label>",
        "  </footer>",
        '  <input type="file" data-role="import-file" accept=".json,application/json" hidden>',
        "</section>"
      ].join("");

      doc.documentElement.appendChild(root);

      mainView = root.querySelector('[data-role="main-view"]');
      settingsView = root.querySelector('[data-role="settings-view"]');
      fieldGrid = root.querySelector('[data-role="field-grid"]');
      footer = root.querySelector('[data-role="footer"]');
      fallbackBox = root.querySelector('[data-role="fallback-box"]');
      fallbackText = root.querySelector('[data-role="fallback-text"]');
      flashNode = root.querySelector('[data-role="flash"]');
      settingsStatus = root.querySelector('[data-role="settings-status"]');
      importInput = root.querySelector('[data-role="import-file"]');
      versionStatus = root.querySelector('[data-role="version-status"]');
      githubBtn = root.querySelector('[data-role="open-repository"]');
      checkUpdateBtn = root.querySelector('[data-role="check-update"]');
      visibilityList = root.querySelector('[data-role="field-visibility-list"]');
      siteFeatureStatus = root.querySelector('[data-role="site-feature-status"]');
      siteFeatureToggle = root.querySelector('[data-role="site-feature-toggle"]');
      floatingIconToggle = root.querySelector('[data-role="floating-icon-toggle"]');
      localAnnotationFileToggle = root.querySelector('[data-role="local-annotation-file-toggle"]');
      localAnnotationFileNote = root.querySelector('[data-role="local-annotation-file-note"]');
      localAnnotationFileAuthorizeButton = root.querySelector('[data-role="reauthorize-local-annotation-file"]');
      focusStyleToggle = root.querySelector('[data-role="focus-style-toggle"]');
      aiRecognitionToggle = root.querySelector('[data-role="ai-recognition-toggle"]');
      aiBaseUrlInput = root.querySelector('[data-role="ai-base-url"]');
      aiApiKeyInput = root.querySelector('[data-role="ai-api-key"]');
      aiModelInput = root.querySelector('[data-role="ai-model"]');
      aiRecognitionStatus = root.querySelector('[data-role="ai-recognition-status"]');
      aiRecognitionConfigPanel = root.querySelector('[data-role="ai-recognition-config"]');
      dockLauncher = root.querySelector('[data-role="dock-launcher"]');
      dockMessage = root.querySelector('[data-role="dock-message"]');
      dockMessageActionButton = root.querySelector('[data-role="run-dock-message-action"]');
      dockMessageText = root.querySelector('[data-role="dock-message-text"]');
      dockBtn = root.querySelector('[data-role="expand"]');
      setupSettingsAccordion();

      root.addEventListener("click", function (event) {
        const actionTrigger = event.target.closest('[data-role="run-dock-message-action"]');
        if (actionTrigger && dockMessageAction) {
          Promise.resolve().then(dockMessageAction).catch(function () {});
          return;
        }
        const trigger = event.target.closest("[data-role]");
        if (!trigger) return;
        const role = trigger.getAttribute("data-role");

        if (role === "dismiss-dock-message") {
          const onDismiss = dockMessageDismiss;
          hideDockMessage();
          if (onDismiss) onDismiss();
          return;
        }
        if (role === "auto-fill" || role === "quick-auto-fill") {
          autoFillPage();
          return;
        }
        if (role === "quick-export") {
          exportFullBackup().then(function () {
            showDockMessage("已导出全部数据");
          }).catch(function (error) {
            showDockMessage(error && error.message ? error.message : "导出失败");
          });
          return;
        }
        if (role === "quick-import") {
          importMode = "quick-full-backup";
          if (importInput) importInput.click();
          return;
        }
        if (role === "regen") {
          regenerateProfile();
          return;
        }
        if (role === "copy-all") {
          copyAll();
          return;
        }
        if (role === "copy-card") {
          copyField(trigger.getAttribute("data-key"), trigger.getAttribute("data-profile-index"));
          return;
        }
        if (role === "open-repository") {
          openRepositoryPage();
          return;
        }
        if (role === "open-data-manager") {
          openDataManagerPage();
          return;
        }
        if (role === "check-update") {
          checkForUpdates();
          return;
        }
        if (role === "open-settings") {
          setPanelView("settings");
          loadLocalAnnotationFileEnabled();
          return;
        }
        if (role === "reauthorize-local-annotation-file") {
          setSettingsStatus("请在授权页选择“每次访问都允许”或“始终允许”", "warning");
          sendRuntimeMessage({ type: "open-local-annotation-permission" }).catch(function () {});
          return;
        }
        if (role === "settings-back") {
          setPanelView("main");
          return;
        }
        if (role === "export-overrides") {
          exportOverrides("raw").catch(function () {
            setSettingsStatus("导出失败", "error");
          });
          return;
        }
        if (role === "import-overrides") {
          importMode = "overrides";
          if (importInput) importInput.click();
          return;
        }
        if (role === "export-full-backup") {
          exportFullBackup().catch(function (error) {
            setSettingsStatus(error && error.message ? error.message : "导出失败", "error");
          });
          return;
        }
        if (role === "import-full-backup") {
          importMode = "full-backup";
          if (importInput) importInput.click();
          return;
        }
        if (role === "export-sanitized-overrides") {
          exportOverrides("sanitized").catch(function () {
            setSettingsStatus("导出失败", "error");
          });
          return;
        }
        if (role === "save-ai-recognition") {
          saveAiRecognitionConfig().catch(function (error) {
            setSettingsStatus(error && error.message ? error.message : "AI 配置保存失败", "error");
          });
          return;
        }
        if (role === "test-ai-recognition") {
          testAiRecognitionConfig().catch(function (error) {
            setSettingsStatus(error && error.message ? error.message : "AI 识别测试失败", "error");
          });
          return;
        }
        if (role === "clear-ai-cache") {
          clearAiRecognitionCache().catch(function () {
            setSettingsStatus("AI 识别缓存清除失败", "error");
          });
          return;
        }
        if (role === "expand") {
          if (dockDragJustEnded) { dockDragJustEnded = false; return; }
          expand();
        }
      });

      root.addEventListener("change", function (event) {
        const siteFeatureTrigger = event.target.closest('[data-role="site-feature-toggle"]');
        if (siteFeatureTrigger) {
          toggleSiteFeatureEnabled(siteFeatureTrigger.checked);
          return;
        }
        const floatingIconTrigger = event.target.closest('[data-role="floating-icon-toggle"]');
        if (floatingIconTrigger) {
          setFloatingIconEnabled(floatingIconTrigger.checked);
          return;
        }
        const focusStyleTrigger = event.target.closest('[data-role="focus-style-toggle"]');
        if (focusStyleTrigger) {
          setFocusStyle(focusStyleTrigger.checked);
          return;
        }
        const localAnnotationFileTrigger = event.target.closest('[data-role="local-annotation-file-toggle"]');
        if (localAnnotationFileTrigger) {
          toggleLocalAnnotationFileEnabled(localAnnotationFileTrigger.checked).catch(function (error) {
            syncLocalAnnotationFileEnabled(false);
            setSettingsStatus(error && error.message ? error.message : "目录授权失败", "error");
          });
          return;
        }
        const aiRecognitionTrigger = event.target.closest('[data-role="ai-recognition-toggle"]');
        if (aiRecognitionTrigger) {
          toggleAiRecognitionEnabled(aiRecognitionTrigger.checked);
          return;
        }
        const trigger = event.target.closest('[data-role="field-visibility-toggle"]');
        if (!trigger) return;
        toggleFieldVisibility(trigger.getAttribute("data-key"), trigger.checked);
      });

      fieldGrid.addEventListener("animationend", function (event) {
        if (event.animationName === "ctdp-scan-refresh") fieldGrid.classList.remove("is-refreshing");
      });

      fieldGrid.addEventListener("keydown", function (event) {
        const trigger = event.target.closest('[data-role="copy-card"]');
        if (!trigger) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        copyField(trigger.getAttribute("data-key"), trigger.getAttribute("data-profile-index"));
      });

      flashNode.addEventListener("animationend", function () {
        flashNode.classList.remove("is-active");
      });

      importInput.addEventListener("change", async function () {
        const file = importInput.files && importInput.files[0];
        if (!file) return;
        const isQuickImport = importMode === "quick-full-backup";
        try {
          if (importMode === "full-backup" || isQuickImport) {
            await importFullBackupFile(file);
          } else {
            await importOverridesFile(file);
          }
          if (isQuickImport) showDockMessage("已导入全部数据");
        } catch (error) {
          setSettingsStatus(error && error.message ? error.message : "导入失败", "error");
          if (isQuickImport) showDockMessage(error && error.message ? error.message : "导入失败");
        } finally {
          importMode = "overrides";
          importInput.value = "";
        }
      });

      setupDockDrag();
      render();
      recordGeneratedProfile();
      loadFavoriteProfiles();
      hideGithubControls();
      loadFloatingIconEnabled().then(loadSiteFeatureEnabled);
      loadLocalAnnotationFileEnabled();
      loadAiRecognitionConfig();
      loadFocusStyle();
      loadVisibleFieldKeys();
      loadDockTop();
      win.addEventListener("focus", function () {
        if (state.panelView === "settings") loadLocalAnnotationFileEnabled();
      });
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function (changes, areaName) {
          if (areaName !== "local" || !changes) return;
          if (changes[FLOATING_ICON_ENABLED_STORAGE_KEY]) {
            syncFloatingIconEnabled(changes[FLOATING_ICON_ENABLED_STORAGE_KEY].newValue);
          }
          if (changes[SITE_FEATURE_ENABLED_STORAGE_KEY]) loadSiteFeatureEnabled();
          if (changes[LOCAL_ANNOTATION_FILE_ENABLED_STORAGE_KEY]) {
            loadLocalAnnotationFileEnabled();
            if (changes[LOCAL_ANNOTATION_FILE_ENABLED_STORAGE_KEY].newValue === true) {
              setSettingsStatus("本地目录授权成功，已开启标注自动保存", "success");
            } else if (changes[LOCAL_ANNOTATION_FILE_ENABLED_STORAGE_KEY].oldValue === true) {
              setSettingsStatus("本地目录不可用，已关闭标注自动保存", "warning");
            }
          }
        });
      }
      sendRuntimeMessage({ type: "check-github-reachable" }).then(function (res) {
        if (res && res.reachable) revealGithubControls();
      });
    }

    function toggleVisible() {
      if (!canRenderPanel) return;
      if (panelState.snapshot().collapsed) panelState.expand();
      else panelState.toggleVisible();
      updatePanelState();
    }

    function expand() {
      if (!canRenderPanel) return;
      panelState.expand();
      updatePanelState();
    }

    function collapse() {
      if (!canRenderPanel) return;
      if (shouldShowFloatingIcon()) panelState.collapse();
      else panelState.hide();
      updatePanelState();
    }

    function handleDocumentFocusIn(target) {
      if (isPanelInteractionTarget(target)) return;
      collapse();
    }

    function handleDocumentPointerDown(target) {
      if (isPanelInteractionTarget(target)) return;
      collapse();
    }

    function getFieldValue(fieldKey) {
      return typeof state.profile[fieldKey] === "string" ? state.profile[fieldKey] : "";
    }

    function getVisibleFieldKeys() {
      return state.visibleFieldKeys.slice();
    }

    function isSiteFeatureEnabled() {
      return state.siteFeatureEnabled;
    }

    function consumeFieldValue(fieldKey) {
      hideFallback();
      pulseFlash("copy");
      regenerateFieldValue(fieldKey);
    }

    return {
      addCurrentPageToFavorites,
      collapse,
      consumeFieldValue,
      expand,
      exportFullBackup,
      getFieldValue,
      getCurrentPageFavorite,
      isSiteFeatureEnabled,
      getVisibleFieldKeys,
      handleDocumentFocusIn,
      handleDocumentPointerDown,
      hideDismissibleDockMessage,
      loadSiteFeatureEnabled,
      loadVisibleFieldKeys,
      mount,
      removeFavoriteProfile,
      showDockMessage,
      syncImportedOverrideState,
      toggleVisible
    };
  }

  const api = {
    closeOtherSettingsSections,
    collectPageAutoFillTargets,
    collectPageFavoriteProfile,
    createContentScriptPanelController,
    hasAutoFillTargetValue,
    sampleFavoriteProfiles
  };

  rootScope.ChromeTestDataContentScriptPanel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
