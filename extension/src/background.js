"use strict";

importScripts("field-meta.js", "field-visibility.js", "smart-fill.js");

const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
const smartFillApi = globalThis.ChromeTestDataSmartFill;
const MENU_ROOT_ID = "ctdp-manual-annotation-root";
const MENU_FIELD_PREFIX = "ctdp-manual-annotation:";
const MENU_CLEAR_ID = "ctdp-manual-annotation:clear";
const REPOSITORY_URL = "https://github.com/coldShan/place-fill";
const RELEASES_URL = REPOSITORY_URL + "/releases";
const LATEST_RELEASE_API_URL = "https://api.github.com/repos/coldShan/place-fill/releases/latest";

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
  if (!response.ok) throw new Error("检查更新失败");
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

chrome.action.onClicked.addListener(function (tab) {
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "toggle-test-data-panel" }, function () {
    void chrome.runtime.lastError;
  });
});

chrome.runtime.onInstalled.addListener(buildContextMenus);
chrome.runtime.onStartup.addListener(buildContextMenus);
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local" || !changes || !Object.prototype.hasOwnProperty.call(changes, fieldVisibilityApi.STORAGE_KEY)) return;
    buildContextMenus();
  });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (!info || !tab || !tab.id) return;
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
  if (message.type === "open-extension-release-page") {
    openExtensionPage(message.url || RELEASES_URL);
    sendResponse({ ok: true });
    return;
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

buildContextMenus();
