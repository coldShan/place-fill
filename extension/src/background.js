"use strict";

importScripts("field-meta.js", "field-visibility.js", "site-feature-toggle.js", "smart-fill.js");

const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
const siteFeatureToggleApi = globalThis.ChromeTestDataSiteFeatureToggle;
const smartFillApi = globalThis.ChromeTestDataSmartFill;
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
  return {
    currentVersion,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    latestVersion,
    releaseUrl: payload && payload.html_url ? payload.html_url : RELEASES_URL
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
});
chrome.runtime.onStartup.addListener(buildContextMenus);
chrome.runtime.onStartup.addListener(function () {
  readSiteFeatureEnabledMap().catch(function () {});
});
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local" || !changes) return;
    if (siteFeatureToggleApi && Object.prototype.hasOwnProperty.call(changes, siteFeatureToggleApi.STORAGE_KEY)) {
      siteFeatureEnabledMap = siteFeatureToggleApi.normalizeSiteFeatureEnabledMap(changes[siteFeatureToggleApi.STORAGE_KEY].newValue);
      syncRootMenuVisibilityForActiveTab();
    }
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
  if (message.type === "sync-site-feature-context-menu") {
    updateRootMenuVisibility(message.enabled !== false);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "open-extension-release-page") {
    openExtensionPage(message.url || RELEASES_URL);
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
buildContextMenus();
syncRootMenuVisibilityForActiveTab();
