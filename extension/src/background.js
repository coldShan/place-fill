"use strict";

importScripts("field-meta.js", "field-visibility.js", "smart-fill.js");

const fieldVisibilityApi = globalThis.ChromeTestDataFieldVisibility;
const smartFillApi = globalThis.ChromeTestDataSmartFill;
const MENU_ROOT_ID = "ctdp-manual-annotation-root";
const MENU_FIELD_PREFIX = "ctdp-manual-annotation:";
const MENU_CLEAR_ID = "ctdp-manual-annotation:clear";
async function buildContextMenus() {
  if (!chrome.contextMenus || !smartFillApi || !fieldVisibilityApi) return;
  const visibleFieldKeys = await fieldVisibilityApi.readVisibleFieldKeys();
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: MENU_ROOT_ID,
      title: "手动标注为",
      contexts: ["editable"]
    });

    smartFillApi.getSupportedFieldKeys(visibleFieldKeys).forEach(function (fieldKey) {
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
  sendTabMessage(tab.id, info, {
    type: "apply-smart-fill-override",
    fieldKey: info.menuItemId.slice(MENU_FIELD_PREFIX.length)
  });
});

buildContextMenus();
