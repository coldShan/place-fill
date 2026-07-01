"use strict";

importScripts("src/field-meta.js", "src/field-visibility.js", "src/site-feature-toggle.js", "src/ai-recognition.js", "src/smart-fill.js", "src/storage-mirror.js", "generated/data-manager-bridge.js");

const aiRecognitionApi = globalThis.ChromeTestDataAiRecognition;
const dataManagerBridgeApi = globalThis.ChromeTestDataDataManagerBridge;
const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
const siteFeatureToggleApi = globalThis.ChromeTestDataSiteFeatureToggle;
const smartFillApi = globalThis.ChromeTestDataSmartFill;
const storageMirrorApi = globalThis.ChromeTestDataStorageMirror;
const MENU_ROOT_ID = "ctdp-manual-annotation-root";
const MENU_FIELD_PREFIX = "ctdp-manual-annotation:";
const MENU_CLEAR_ID = "ctdp-manual-annotation:clear";
const REPOSITORY_URL = "https://github.com/coldShan/place-fill";
const RELEASES_URL = REPOSITORY_URL + "/releases";
const LATEST_RELEASE_API_URL = "https://api.github.com/repos/coldShan/place-fill/releases/latest";
let siteFeatureEnabledMap = {};

function getUrlHostname(url) {
  if (!url) return "";
  try {
    return String(new URL(url).hostname || "").trim().toLowerCase();
  } catch (_) {
    return "";
  }
}

function resolveContextHostname(info, tab) {
  const contextHostname = getUrlHostname(info && (info.frameUrl || info.pageUrl));
  if (contextHostname) return contextHostname;
  if (tab && tab.url) return String(new URL(tab.url).hostname || "").trim().toLowerCase();
  return "";
}

async function buildContextMenus() {
  if (!chrome.contextMenus || !smartFillApi || !fieldVisibilityApi) return;
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: MENU_ROOT_ID,
      title: "手动标注为",
      contexts: ["editable"]
    });

    smartFillApi.getSupportedFieldKeys().forEach(function (fieldKey) {
      chrome.contextMenus.create({
        id: MENU_FIELD_PREFIX + fieldKey,
        parentId: MENU_ROOT_ID,
        title: smartFillApi.formatSmartFillButtonLabel(fieldKey),
        contexts: ["editable"]
      });
    });

    chrome.contextMenus.create({
      id: MENU_CLEAR_ID,
      parentId: MENU_ROOT_ID,
      title: "恢复自动识别",
      contexts: ["editable"]
    });
  });
}

function sendTabMessage(tabId, info, message) {
  if (!tabId || !message) return;
  chrome.tabs.sendMessage(tabId, message, { frameId: info.frameId }, function () {
    void chrome.runtime.lastError;
  });
}

function normalizeVersion(version) {
  return String(version || "")
    .trim()
    .replace(/^v/i, "");
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left)
    .split(".")
    .map(function (part) {
      return Number.parseInt(part, 10) || 0;
    });
  const rightParts = normalizeVersion(right)
    .split(".")
    .map(function (part) {
      return Number.parseInt(part, 10) || 0;
    });
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}

function openExtensionPage(url) {
  if (!url || !chrome.tabs || typeof chrome.tabs.create !== "function") return;
  chrome.tabs.create({ url: url });
}

function openDataManagerPage(scope) {
  if (!chrome.runtime || typeof chrome.runtime.getURL !== "function") return;
  const baseUrl = chrome.runtime.getURL("");
  const url = dataManagerBridgeApi && typeof dataManagerBridgeApi.buildDataManagerPageUrl === "function"
    ? dataManagerBridgeApi.buildDataManagerPageUrl(baseUrl, scope)
    : chrome.runtime.getURL("data-manager.html");
  openExtensionPage(url);
}

function openAiPermissionPage(origin) {
  if (!chrome.runtime || typeof chrome.runtime.getURL !== "function") return false;
  if (!origin) return false;
  openExtensionPage(chrome.runtime.getURL("ai-permission.html?origin=" + encodeURIComponent(origin)));
  return true;
}

async function checkExtensionUpdate() {
  const currentVersion = normalizeVersion(chrome.runtime.getManifest().version);
  const response = await fetch(LATEST_RELEASE_API_URL, {
    headers: {
      Accept: "application/vnd.github+json"
    }
  });
  if (response.status === 404) {
    return {
      currentVersion,
      hasUpdate: false,
      latestVersion: "",
      releaseUrl: RELEASES_URL,
      noReleases: true
    };
  }
  if (!response.ok) throw new Error(`检查更新失败（HTTP ${response.status}）`);
  const payload = await response.json();
  const latestVersion = normalizeVersion(payload && (payload.tag_name || payload.name));
  if (!latestVersion) throw new Error("未找到可用版本信息");
  const assets = Array.isArray(payload && payload.assets) ? payload.assets : [];
  const zipAsset = assets.find(function (asset) {
    return asset && typeof asset.name === "string" && asset.name.endsWith(".zip");
  });
  return {
    currentVersion,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    latestVersion,
    releaseUrl: payload && payload.html_url ? payload.html_url : RELEASES_URL,
    downloadUrl: zipAsset && zipAsset.browser_download_url ? zipAsset.browser_download_url : ""
  };
}

async function syncVisibleFieldKeyForContext(fieldKey, info, tab) {
  if (!fieldVisibilityApi || !fieldKey) return;
  const hostname = resolveContextHostname(info, tab);
  if (!hostname) return;
  const visibleFieldKeys = await fieldVisibilityApi.readVisibleFieldKeys({ hostname });
  if (fieldVisibilityApi.isFieldVisible(fieldKey, visibleFieldKeys)) return;
  await fieldVisibilityApi.writeVisibleFieldKeys(visibleFieldKeys.concat(fieldKey), { hostname });
}

function isSiteFeatureEnabledForHostname(hostname) {
  if (!siteFeatureToggleApi || !hostname) return true;
  if (!Object.prototype.hasOwnProperty.call(siteFeatureEnabledMap, hostname)) {
    return siteFeatureToggleApi.getDefaultSiteFeatureEnabled();
  }
  return siteFeatureToggleApi.isSiteFeatureEnabled(siteFeatureEnabledMap[hostname]);
}

async function readSiteFeatureEnabledMap() {
  if (!siteFeatureToggleApi) return {};
  siteFeatureEnabledMap = await siteFeatureToggleApi.readSiteFeatureEnabledMap();
  return siteFeatureEnabledMap;
}

function mirrorStorageLocal() {
  if (!storageMirrorApi || typeof storageMirrorApi.mirrorStorageLocalToIndexedDb !== "function") return Promise.resolve(null);
  return storageMirrorApi.mirrorStorageLocalToIndexedDb();
}

function restoreStorageLocalMirrorIfEmpty() {
  if (!storageMirrorApi || typeof storageMirrorApi.restoreStorageLocalFromIndexedDbIfEmpty !== "function") return Promise.resolve({ restored: false });
  return storageMirrorApi.restoreStorageLocalFromIndexedDbIfEmpty();
}

function getAiOriginPattern(origin) {
  return origin ? String(origin).replace(/\/+$/g, "") + "/*" : "";
}

function requestOptionalOriginPermission(origin) {
  const pattern = getAiOriginPattern(origin);
  if (!pattern || !chrome.permissions || typeof chrome.permissions.request !== "function") return Promise.resolve(false);
  return new Promise(function (resolve) {
    let settled = false;
    function done(granted) {
      if (settled) return;
      settled = true;
      void chrome.runtime.lastError;
      resolve(granted === true);
    }
    try {
      const maybePromise = chrome.permissions.request({ origins: [pattern] }, done);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(done, function () { done(false); });
      }
    } catch (_) {
      done(false);
    }
  });
}

function containsOptionalOriginPermission(origin) {
  const pattern = getAiOriginPattern(origin);
  if (!pattern || !chrome.permissions || typeof chrome.permissions.contains !== "function") return Promise.resolve(false);
  return new Promise(function (resolve) {
    let settled = false;
    function done(granted) {
      if (settled) return;
      settled = true;
      void chrome.runtime.lastError;
      resolve(granted === true);
    }
    try {
      const maybePromise = chrome.permissions.contains({ origins: [pattern] }, done);
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(done, function () { done(false); });
      }
    } catch (_) {
      done(false);
    }
  });
}

async function requestAiHostPermission(origin) {
  if (await containsOptionalOriginPermission(origin)) return true;
  return requestOptionalOriginPermission(origin);
}

async function readAiRecognitionConfig() {
  if (!aiRecognitionApi || typeof aiRecognitionApi.readAiRecognitionConfig !== "function") return null;
  const config = await aiRecognitionApi.readAiRecognitionConfig();
  const permissionGranted = config.origin ? await containsOptionalOriginPermission(config.origin) : false;
  return { ...config, permissionGranted };
}

async function saveAiRecognitionConfig(inputConfig) {
  if (!aiRecognitionApi || typeof aiRecognitionApi.normalizeAiRecognitionConfig !== "function") throw new Error("AI 识别不可用");
  const existingConfig = await aiRecognitionApi.readAiRecognitionConfig();
  const nextInput = { ...(inputConfig || {}) };
  if (!String(nextInput.apiKey || "").trim() && existingConfig && existingConfig.apiKey) nextInput.apiKey = existingConfig.apiKey;
  let config = aiRecognitionApi.normalizeAiRecognitionConfig(nextInput);
  const permissionGranted = config.enabled && config.origin ? await containsOptionalOriginPermission(config.origin) : false;
  config = { ...config, permissionGranted };
  if (typeof aiRecognitionApi.writeAiRecognitionConfig === "function") await aiRecognitionApi.writeAiRecognitionConfig(config);
  return {
    config,
    permissionPageOpened: config.enabled && config.origin && !permissionGranted ? openAiPermissionPage(config.origin) : false
  };
}

async function classifyFormFields(snapshot) {
  if (!aiRecognitionApi || typeof aiRecognitionApi.classifyFormFields !== "function") return { fields: [] };
  const config = await readAiRecognitionConfig();
  if (!config) return { fields: [] };
  const result = await aiRecognitionApi.classifyFormFields({
    config,
    fetchFn: fetch,
    snapshot: snapshot || {},
    supportedFieldKeys: smartFillApi && typeof smartFillApi.getSupportedFieldKeys === "function" ? smartFillApi.getSupportedFieldKeys() : []
  });
  return result;
}

async function testAiRecognitionConfig(inputConfig) {
  const existingConfig = await aiRecognitionApi.readAiRecognitionConfig();
  const nextInput = inputConfig ? { ...inputConfig } : existingConfig;
  if (nextInput && !String(nextInput.apiKey || "").trim() && existingConfig && existingConfig.apiKey) nextInput.apiKey = existingConfig.apiKey;
  const config = aiRecognitionApi.normalizeAiRecognitionConfig(nextInput);
  const result = await aiRecognitionApi.classifyFormFields({
    config: { ...config, permissionGranted: true },
    fetchFn: fetch,
    snapshot: {
      allowedFieldKeys: ["mobile"],
      fields: [{ fingerprint: "test-field", label: "手机号", localFieldKey: "mobile", tag: "input", type: "text" }]
    },
    supportedFieldKeys: ["mobile"]
  });
  return { fields: result.fields, ok: true };
}

function updateRootMenuVisibility(visible) {
  if (!chrome.contextMenus || typeof chrome.contextMenus.update !== "function") return;
  chrome.contextMenus.update(MENU_ROOT_ID, { visible: visible }, function () {
    void chrome.runtime.lastError;
    if (typeof chrome.contextMenus.refresh === "function") chrome.contextMenus.refresh();
  });
}

function syncRootMenuVisibilityForHostname(hostname) {
  updateRootMenuVisibility(isSiteFeatureEnabledForHostname(hostname));
}

function syncRootMenuVisibilityForUrl(url) {
  syncRootMenuVisibilityForHostname(getUrlHostname(url));
}

function syncRootMenuVisibilityForTabId(tabId) {
  if (!chrome.tabs || typeof chrome.tabs.get !== "function" || !tabId) return;
  chrome.tabs.get(tabId, function (tab) {
    void chrome.runtime.lastError;
    syncRootMenuVisibilityForUrl(tab && tab.url);
  });
}

function syncRootMenuVisibilityForActiveTab() {
  if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    void chrome.runtime.lastError;
    syncRootMenuVisibilityForUrl(tabs && tabs[0] && tabs[0].url);
  });
}

chrome.action.onClicked.addListener(function (tab) {
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "toggle-test-data-panel" }, function () {
    void chrome.runtime.lastError;
  });
});

chrome.runtime.onInstalled.addListener(buildContextMenus);
chrome.runtime.onInstalled.addListener(function () {
  readSiteFeatureEnabledMap().catch(function () {});
  restoreStorageLocalMirrorIfEmpty().catch(function () {});
});
chrome.runtime.onStartup.addListener(buildContextMenus);
chrome.runtime.onStartup.addListener(function () {
  restoreStorageLocalMirrorIfEmpty()
    .then(readSiteFeatureEnabledMap, function () {
      return readSiteFeatureEnabledMap();
    })
    .catch(function () {});
});
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local" || !changes) return;
    if (siteFeatureToggleApi && Object.prototype.hasOwnProperty.call(changes, siteFeatureToggleApi.STORAGE_KEY)) {
      siteFeatureEnabledMap = siteFeatureToggleApi.normalizeSiteFeatureEnabledMap(changes[siteFeatureToggleApi.STORAGE_KEY].newValue);
      syncRootMenuVisibilityForActiveTab();
    }
    mirrorStorageLocal().catch(function () {});
  });
}

if (chrome.contextMenus && chrome.contextMenus.onShown) {
  chrome.contextMenus.onShown.addListener(function (info, tab) {
    syncRootMenuVisibilityForHostname(resolveContextHostname(info, tab));
  });
}

if (chrome.tabs && chrome.tabs.onActivated) {
  chrome.tabs.onActivated.addListener(function (activeInfo) {
    syncRootMenuVisibilityForTabId(activeInfo && activeInfo.tabId);
  });
}

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener(function (_tabId, changeInfo, tab) {
    if (!changeInfo || (!Object.prototype.hasOwnProperty.call(changeInfo, "status") && !Object.prototype.hasOwnProperty.call(changeInfo, "url"))) return;
    syncRootMenuVisibilityForUrl((tab && tab.url) || changeInfo.url);
  });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (!info || !tab || !tab.id) return;
  const hostname = resolveContextHostname(info, tab);
  if (!isSiteFeatureEnabledForHostname(hostname)) return;
  if (info.menuItemId === MENU_CLEAR_ID) {
    sendTabMessage(tab.id, info, { type: "clear-smart-fill-override" });
    return;
  }
  if (typeof info.menuItemId !== "string" || !info.menuItemId.startsWith(MENU_FIELD_PREFIX)) return;
  const fieldKey = info.menuItemId.slice(MENU_FIELD_PREFIX.length);
  syncVisibleFieldKeyForContext(fieldKey, info, tab)
    .catch(function () {})
    .finally(function () {
      sendTabMessage(tab.id, info, {
        type: "apply-smart-fill-override",
        fieldKey
      });
    });
});

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  if (!message || typeof message.type !== "string") return;
  if (message.type === "open-extension-repository-page") {
    openExtensionPage(REPOSITORY_URL);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "open-data-manager-page") {
    openDataManagerPage(message.scope);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "sync-site-feature-context-menu") {
    updateRootMenuVisibility(message.enabled !== false);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "mirror-storage-local") {
    mirrorStorageLocal()
      .then(function () {
        sendResponse({ ok: true });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "镜像写入失败", ok: false });
      });
    return true;
  }
  if (message.type === "restore-storage-local-mirror") {
    restoreStorageLocalMirrorIfEmpty()
      .then(function (result) {
        sendResponse({ ok: true, restored: !!(result && result.restored) });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "镜像恢复失败", ok: false, restored: false });
      });
    return true;
  }
  if (message.type === "read-ai-recognition-config") {
    readAiRecognitionConfig()
      .then(function (config) {
        sendResponse({ config: aiRecognitionApi && typeof aiRecognitionApi.getPublicConfig === "function" ? aiRecognitionApi.getPublicConfig(config || {}) : {}, ok: true });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "读取 AI 配置失败", ok: false });
      });
    return true;
  }
  if (message.type === "save-ai-recognition-config") {
    saveAiRecognitionConfig(message.config)
      .then(function (result) {
        sendResponse({ config: aiRecognitionApi.getPublicConfig(result.config), ok: true, permissionPageOpened: result.permissionPageOpened === true });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "保存 AI 配置失败", ok: false });
      });
    return true;
  }
  if (message.type === "request-ai-host-permission") {
    requestAiHostPermission(message.origin)
      .then(function (granted) {
        sendResponse({ granted, ok: true });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "AI 接口授权失败", granted: false, ok: false });
      });
    return true;
  }
  if (message.type === "test-ai-recognition-config") {
    testAiRecognitionConfig(message.config)
      .then(function (result) {
        sendResponse(result);
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "AI 识别测试失败", ok: false });
      });
    return true;
  }
  if (message.type === "classify-form-fields") {
    classifyFormFields(message.snapshot)
      .then(function (result) {
        sendResponse({ fields: result.fields || [], ok: true });
      })
      .catch(function () {
        sendResponse({ fields: [], ok: false });
      });
    return true;
  }
  if (message.type === "open-extension-release-page") {
    openExtensionPage(message.url || RELEASES_URL);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "download-extension-update") {
    openExtensionPage(message.url);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "check-github-reachable") {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 30000);
    fetch("https://api.github.com", { method: "HEAD", signal: controller.signal })
      .then(function () {
        clearTimeout(timer);
        sendResponse({ reachable: true });
      })
      .catch(function () {
        clearTimeout(timer);
        sendResponse({ reachable: false });
      });
    return true;
  }
  if (message.type === "check-extension-update") {
    checkExtensionUpdate()
      .then(function (result) {
        sendResponse(result);
      })
      .catch(function (error) {
        sendResponse({
          currentVersion: normalizeVersion(chrome.runtime.getManifest().version),
          error: error && error.message ? error.message : "检查更新失败",
          hasUpdate: false,
          latestVersion: "",
          releaseUrl: RELEASES_URL
        });
      });
    return true;
  }
});

readSiteFeatureEnabledMap().catch(function () {});
restoreStorageLocalMirrorIfEmpty()
  .then(function (result) {
    if (result && result.restored) return readSiteFeatureEnabledMap();
    return null;
  })
  .catch(function () {});
buildContextMenus();
syncRootMenuVisibilityForActiveTab();
