"use strict";

importScripts("field-meta.js", "field-visibility.js", "smart-fill.js");

const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
const smartFillApi = globalThis.ChromeTestDataSmartFill;
const MENU_ROOT_ID = "ctdp-manual-annotation-root";
const MENU_FIELD_PREFIX = "ctdp-manual-annotation:";
const MENU_CLEAR_ID = "ctdp-manual-annotation:clear";

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

buildContextMenus();
