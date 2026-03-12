(function (rootScope) {
  "use strict";

  function createContentScriptPanelController(options) {
    const opts = options || {};
    const generators = opts.generators;
    const panelStateApi = opts.panelStateApi;
    const iconAssetsApi = opts.iconAssetsApi;
    const fieldMetaApi = opts.fieldMetaApi;
    const fieldVisibilityApi = opts.fieldVisibilityApi;
    const siteFeatureToggleApi = opts.siteFeatureToggleApi;
    const smartFillApi = opts.smartFillApi;
    const doc = opts.document;
    const win = opts.window;
    const canRenderPanel = opts.canRenderPanel !== false;
    const onOverridesImported = typeof opts.onOverridesImported === "function" ? opts.onOverridesImported : function () {};
    const onSiteFeatureEnabledChanged = typeof opts.onSiteFeatureEnabledChanged === "function" ? opts.onSiteFeatureEnabledChanged : function () {};
    const onVisibleFieldKeysChanged = typeof opts.onVisibleFieldKeysChanged === "function" ? opts.onVisibleFieldKeysChanged : function () {};

    const fieldKeys = fieldMetaApi.getFieldKeys();
    const panelState = panelStateApi.createPanelState();
    const runtimeApi = typeof chrome !== "undefined" ? chrome.runtime : null;
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
    let versionStatus = null;
    let visibilityList = null;
    let siteFeatureToggle = null;

    const state = {
      copiedFieldKey: null,
      panelView: "main",
      profile: generators.generateProfile(),
      siteFeatureEnabled: siteFeatureToggleApi.getDefaultSiteFeatureEnabled(),
      visibleFieldKeys: fieldVisibilityApi.getDefaultVisibleFieldKeys()
    };

    function updatePanelState() {
      if (!root) return;
      const snap = panelState.snapshot();
      root.setAttribute("data-visible", String(snap.visible));
      root.setAttribute("data-collapsed", String(snap.collapsed));
      root.setAttribute("data-view", state.panelView);
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
        "    " + iconAssetsApi.renderIconMarkup(iconName, "ctdp-settings-card-icon", label),
        '    <span class="ctdp-field-visibility-label">' + label + "</span>",
        "  </span>",
        "</label>"
      ].join("");
    }

    function renderSiteFeatureToggleMarkup() {
      return [
        '<section class="ctdp-settings-card ctdp-settings-card-static">',
        '  <span class="ctdp-settings-card-head">',
        "    " + renderButtonIcon(iconAssetsApi.ACTION_ICONS.settings, "当前站点智能功能", "ctdp-settings-card-icon"),
        '    <span class="ctdp-settings-card-title">当前站点智能功能</span>',
        '    <label class="ctdp-switch" aria-label="切换当前站点智能功能">',
        '      <input class="ctdp-switch-input" type="checkbox" data-role="site-feature-toggle"' + (state.siteFeatureEnabled ? " checked" : "") + ">",
        '      <span class="ctdp-switch-track"><span class="ctdp-switch-thumb"></span></span>',
        "    </label>",
        "  </span>",
        '  <span class="ctdp-settings-card-note">关闭后，当前站点不启用智能识别和右键标注，其余功能不受影响</span>',
        "</section>"
      ].join("");
    }

    function cardTemplate(key, value) {
      const copied = state.copiedFieldKey === key;
      const label = fieldMetaApi.getFieldLabel(key);
      const iconName = fieldMetaApi.getFieldIconName(key);
      return [
        '<article class="ctdp-card" role="button" tabindex="0" data-role="copy-card" data-key="' + key + '" data-copied="' + String(copied) + '" aria-label="复制' + label + '">',
        '  <div class="ctdp-card-body">',
        "    " + iconAssetsApi.renderIconMarkup(iconName, "ctdp-card-icon"),
        '    <div class="ctdp-card-text">',
        '      <div class="ctdp-card-head">',
        '        <p class="ctdp-card-label">' + label + "</p>",
        copied ? "        " + renderCopiedStateMarkup() : "",
        "      </div>",
        '      <p class="ctdp-card-value">' + value + "</p>",
        "    </div>",
        "  </div>",
        "</article>"
      ].join("");
    }

    function renderCards() {
      if (!fieldGrid) return;
      fieldGrid.innerHTML = state.visibleFieldKeys
        .map(function (key) {
          return cardTemplate(key, state.profile[key]);
        })
        .join("");
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
        const copied = state.copiedFieldKey === key;
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
      const card = fieldGrid.querySelector('[data-role="copy-card"][data-key="' + fieldKey + '"]');
      if (!card) return;
      const valueNode = card.querySelector(".ctdp-card-value");
      if (valueNode) valueNode.textContent = state.profile[fieldKey];
    }

    function regenerateFieldValue(fieldKey) {
      const nextValue = generators.generateFieldValue(fieldKey);
      if (!nextValue) return "";
      state.profile[fieldKey] = nextValue;
      if (state.copiedFieldKey === fieldKey) state.copiedFieldKey = null;
      syncFieldCardValue(fieldKey);
      syncCopiedCardState();
      return nextValue;
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
      state.profile = generators.generateProfile();
      hideFallback();
      pulseFlash("regen");
      pulseRefreshGrid();
      render();
    }

    async function copyField(key) {
      const ok = await copyText(state.profile[key], { flashTone: null, manualFlashTone: null });
      state.copiedFieldKey = ok ? key : null;
      syncCopiedCardState();
    }

    async function copyAll() {
      await copyText(generators.formatProfileForCopy(state.profile, state.visibleFieldKeys));
      state.copiedFieldKey = null;
      syncCopiedCardState();
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

    function syncSiteFeatureEnabled(enabled) {
      state.siteFeatureEnabled = siteFeatureToggleApi.isSiteFeatureEnabled(enabled);
      syncSiteFeatureToggle();
      onSiteFeatureEnabledChanged(state.siteFeatureEnabled);
    }

    async function loadSiteFeatureEnabled() {
      syncSiteFeatureEnabled(await siteFeatureToggleApi.readSiteFeatureEnabled());
    }

    async function toggleSiteFeatureEnabled(enabled) {
      const nextEnabled = await siteFeatureToggleApi.writeSiteFeatureEnabled(enabled);
      syncSiteFeatureEnabled(nextEnabled);
      setSettingsStatus(nextEnabled ? "当前站点已启用智能识别和右键标注" : "当前站点已停用智能识别和右键标注", nextEnabled ? "success" : "warning");
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

    async function openRepositoryPage() {
      const response = await sendRuntimeMessage({ type: "open-extension-repository-page" });
      if (response && response.error) setVersionStatus(response.error, "error");
    }

    async function openReleasePage(url) {
      const response = await sendRuntimeMessage({
        type: "open-extension-release-page",
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
        setVersionStatus("当前已是最新版本", "success");
        return;
      }
      setVersionStatus("发现 v" + response.latestVersion, "warning");
      if (win.confirm("发现新版本 v" + response.latestVersion + "，是否前往 Release 页面？")) {
        await openReleasePage(response.releaseUrl);
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

    function exportOverrides(mode) {
      const isSanitized = mode === "sanitized";
      const payload = isSanitized
        ? smartFillApi.exportSanitizedManualFieldOverrides()
        : smartFillApi.exportManualFieldOverrides();
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

    async function importOverridesFile(file) {
      if (!file) return;
      const rawText = await readImportFile(file);
      let payload = null;
      try {
        payload = JSON.parse(rawText);
      } catch (_) {
        throw new Error("导入文件不是合法 JSON");
      }
      const result = smartFillApi.importManualFieldOverrides(payload);
      syncImportedOverrideState();
      setSettingsStatus("已导入 " + result.importedCount + " 条标注", "success");
    }

    function mount() {
      if (!canRenderPanel || root || !doc || !doc.documentElement) return;
      root = doc.createElement("div");
      root.className = "ctdp-root";
      root.setAttribute("data-visible", "false");
      root.setAttribute("data-collapsed", "false");
      root.innerHTML = [
        '<button class="ctdp-dock" type="button" data-role="expand" aria-label="展开测试数据面板" title="展开测试数据面板">' +
          iconAssetsApi.renderIconMarkup(iconAssetsApi.PRIMARY_LOGO_ICON, "ctdp-dock-icon", "测试数据面板") +
          "</button>",
        '<section class="ctdp-panel" aria-label="测试数据悬浮面板">',
        '  <div class="ctdp-flash" data-role="flash" aria-hidden="true"></div>',
        '  <div class="ctdp-view ctdp-main-view" data-role="main-view">',
        '    <header class="ctdp-toolbar">',
        '      <div class="ctdp-toolbar-group ctdp-toolbar-group-left">',
        '        <button class="ctdp-btn ctdp-footer-btn" type="button" data-role="open-settings" aria-label="打开设置" title="打开设置">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.settings, "打开设置", "ctdp-btn-icon") +
          "</button>",
        "      </div>",
        '      <div class="ctdp-toolbar-group ctdp-toolbar-group-right">',
        '        <button class="ctdp-btn ctdp-btn-primary" type="button" data-role="regen" aria-label="重新生成全部" title="重新生成全部">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.regen, "重新生成全部", "ctdp-btn-icon") +
          "</button>",
        '        <button class="ctdp-btn ctdp-btn-strong" type="button" data-role="copy-all" aria-label="复制整组数据" title="复制整组数据">' +
          renderButtonIcon(iconAssetsApi.ACTION_ICONS.copyAll, "复制整组数据", "ctdp-btn-icon") +
          "</button>",
        '        <button class="ctdp-btn ctdp-btn-primary" type="button" data-role="open-repository" aria-label="打开 GitHub 仓库" title="打开 GitHub 仓库">' +
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
        '        <p class="ctdp-settings-subtitle">选择展示字段，并导入、导出用户标注</p>',
        "      </div>",
        "    </header>",
        '    <div class="ctdp-settings-list">',
        renderSiteFeatureToggleMarkup(),
        '      <section class="ctdp-settings-card ctdp-settings-card-static">',
        '        <span class="ctdp-settings-card-head">' +
          renderButtonIcon(iconAssetsApi.SETTINGS_CARD_ICONS.visibleFields, "填充项选择", "ctdp-settings-card-icon") +
        '          <span class="ctdp-settings-card-title">填充项选择</span>' +
        "        </span>" +
        '        <span class="ctdp-settings-card-note">当前站点只有勾选的项目会出现在面板和智能填充中，右键标注始终提供全量字段</span>' +
        '        <div class="ctdp-field-visibility-list" data-role="field-visibility-list"></div>' +
        "      </section>",
        '      <button class="ctdp-settings-card" type="button" data-role="export-overrides">' +
        '        <span class="ctdp-settings-card-head">' +
          renderButtonIcon(iconAssetsApi.SETTINGS_CARD_ICONS.exportOverrides, "导出标注数据", "ctdp-settings-card-icon") +
        '          <span class="ctdp-settings-card-title">导出标注数据</span>' +
        "        </span>" +
        '        <span class="ctdp-settings-card-note">下载完整 JSON 备份</span>' +
        "      </button>",
        '      <button class="ctdp-settings-card" type="button" data-role="import-overrides">' +
        '        <span class="ctdp-settings-card-head">' +
          renderButtonIcon(iconAssetsApi.SETTINGS_CARD_ICONS.importOverrides, "导入标注数据", "ctdp-settings-card-icon") +
        '          <span class="ctdp-settings-card-title">导入标注数据</span>' +
        "        </span>" +
        '        <span class="ctdp-settings-card-note">合并并覆盖同键标注</span>' +
        "      </button>",
        '      <button class="ctdp-settings-card" type="button" data-role="export-sanitized-overrides">' +
        '        <span class="ctdp-settings-card-head">' +
          renderButtonIcon(iconAssetsApi.SETTINGS_CARD_ICONS.exportSanitizedOverrides, "脱敏导出", "ctdp-settings-card-icon") +
        '          <span class="ctdp-settings-card-title">脱敏导出</span>' +
        "        </span>" +
        '        <span class="ctdp-settings-card-note">只保留输入框指纹，可在当前站点回导</span>' +
        "      </button>",
        "    </div>",
        '    <p class="ctdp-settings-status" data-role="settings-status" data-tone="muted">填充项选择按当前站点保存，脱敏导出不会保留原始页面地址。</p>',
        "  </div>",
        '  <footer class="ctdp-footer" data-role="footer">',
        '    <div class="ctdp-footer-meta">',
        '      <div class="ctdp-footer-copy">',
        '        <span class="ctdp-footer-version" data-role="panel-version">v' + extensionVersion + "</span>",
        '        <span class="ctdp-footer-status" data-role="version-status" data-tone="muted">点击检查更新</span>',
        "      </div>",
        '      <button class="ctdp-btn ctdp-footer-btn" type="button" data-role="check-update" aria-label="检查更新" title="检查更新">' +
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
      visibilityList = root.querySelector('[data-role="field-visibility-list"]');
      siteFeatureToggle = root.querySelector('[data-role="site-feature-toggle"]');

      root.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-role]");
        if (!trigger) return;
        const role = trigger.getAttribute("data-role");

        if (role === "regen") {
          regenerateProfile();
          return;
        }
        if (role === "copy-all") {
          copyAll();
          return;
        }
        if (role === "copy-card") {
          copyField(trigger.getAttribute("data-key"));
          return;
        }
        if (role === "open-repository") {
          openRepositoryPage();
          return;
        }
        if (role === "check-update") {
          checkForUpdates();
          return;
        }
        if (role === "open-settings") {
          setPanelView("settings");
          return;
        }
        if (role === "settings-back") {
          setPanelView("main");
          return;
        }
        if (role === "export-overrides") {
          exportOverrides("raw");
          return;
        }
        if (role === "import-overrides") {
          if (importInput) importInput.click();
          return;
        }
        if (role === "export-sanitized-overrides") {
          exportOverrides("sanitized");
          return;
        }
        if (role === "expand") {
          expand();
        }
      });

      root.addEventListener("change", function (event) {
        const siteFeatureTrigger = event.target.closest('[data-role="site-feature-toggle"]');
        if (siteFeatureTrigger) {
          toggleSiteFeatureEnabled(siteFeatureTrigger.checked);
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
        copyField(trigger.getAttribute("data-key"));
      });

      flashNode.addEventListener("animationend", function () {
        flashNode.classList.remove("is-active");
      });

      importInput.addEventListener("change", async function () {
        const file = importInput.files && importInput.files[0];
        if (!file) return;
        try {
          await importOverridesFile(file);
        } catch (error) {
          setSettingsStatus(error && error.message ? error.message : "导入失败", "error");
        } finally {
          importInput.value = "";
        }
      });

      render();
      loadSiteFeatureEnabled();
      loadVisibleFieldKeys();
    }

    function toggleVisible() {
      if (!canRenderPanel) return;
      panelState.toggleVisible();
      updatePanelState();
    }

    function expand() {
      if (!canRenderPanel) return;
      panelState.expand();
      updatePanelState();
    }

    function collapse() {
      if (!canRenderPanel) return;
      panelState.collapse();
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
      collapse,
      consumeFieldValue,
      expand,
      getFieldValue,
      isSiteFeatureEnabled,
      getVisibleFieldKeys,
      handleDocumentFocusIn,
      handleDocumentPointerDown,
      loadSiteFeatureEnabled,
      loadVisibleFieldKeys,
      mount,
      syncImportedOverrideState,
      toggleVisible
    };
  }

  const api = {
    createContentScriptPanelController
  };

  rootScope.ChromeTestDataContentScriptPanel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
