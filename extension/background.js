"use strict";

function getChromeMajorVersion() {
  try {
    const match = String(navigator.userAgent || "").match(/(?:Chrome|Chromium)\/(\d+)/);
    return match ? Number(match[1]) : 0;
  } catch (_) {
    return 0;
  }
}

const backgroundImports = [
  "src/field-meta.js",
  "generated/system-scope-api.js",
  "src/site-feature-toggle.js",
  "src/ai-recognition.js",
  "src/smart-fill.js",
  "src/storage-mirror.js"
];
const localAnnotationFileSupported = getChromeMajorVersion() >= 122;
if (localAnnotationFileSupported) backgroundImports.push("src/local-annotation-file.js");
backgroundImports.push("generated/data-manager-bridge.js");
importScripts.apply(globalThis, backgroundImports);

const aiRecognitionApi = globalThis.ChromeTestDataAiRecognition;
const dataManagerBridgeApi = globalThis.ChromeTestDataDataManagerBridge;
const siteFeatureToggleApi = globalThis.ChromeTestDataSiteFeatureToggle;
const smartFillApi = globalThis.ChromeTestDataSmartFill;
const storageMirrorApi = globalThis.ChromeTestDataStorageMirror;
const systemScopeApi = globalThis.ChromeTestDataSystemScope;
const localAnnotationFileApi = globalThis.ChromeTestDataLocalAnnotationFile;
const MENU_ROOT_ID = "ctdp-manual-annotation-root";
const MENU_FIELD_PREFIX = "ctdp-manual-annotation:";
const MENU_NONE_ID = "ctdp-manual-annotation:none";
const MENU_CLEAR_ID = "ctdp-manual-annotation:clear";
const MENU_FAVORITE_ID = "ctdp-add-current-page-favorite";
const REPOSITORY_URL = "https://github.com/coldShan/place-fill";
const RELEASES_URL = REPOSITORY_URL + "/releases";
const LATEST_RELEASE_API_URL = "https://api.github.com/repos/coldShan/place-fill/releases/latest";
const BACKUP_REMINDER_ALARM_NAME = "weekly-backup-reminder";
const BACKUP_REMINDER_MESSAGE = "该备份数据啦！";
const BACKUP_REMINDER_PENDING_KEY = "ctdp.backupReminderPendingAt.v1";
const WEEK_IN_MINUTES = 7 * 24 * 60;
const TAB_SCOPES_STORAGE_KEY = "ctdp.tabScopes";
// Storage keys whose legacy (URL-keyed) shape the scope migration rewrites.
const LEGACY_MIGRATION_TRIGGER_KEYS = [
  "ctdp.favoriteProfiles.v1",
  "ctdp.generatedProfiles.v1",
  "ctdp.smartFillOverrides.v1",
  "ctdp.siteFeatureEnabled.v1",
  "ctdp.aiFieldMappings.v1"
];
let siteFeatureEnabledMap = {};
let localAnnotationPreparePromise = null;
// tabId -> ScopeResolution. chrome.storage.session keeps it across service worker restarts; the
// in-memory copy also serves the synchronous context-menu paths.
let tabScopes = {};
let tabScopesLoadPromise = null;
// Serializes every system-registry write: scope resolution, toggle writes, manual system picks
// and the legacy migration all read-modify-write the same storage keys.
let registryQueue = Promise.resolve();

function isHostScopedUrl(url) {
  try {
    const parsed = new URL(url);
    return !!parsed.hostname || parsed.protocol === "file:";
  } catch (_) {
    return false;
  }
}

// Hostless frames (about:blank, about:srcdoc, e.g. rich-text editors) belong to the page that
// hosts them, so they use the tab's URL instead of mapping to the file scope.
function resolveContextUrl(info, tab) {
  const frameUrl = info && (info.frameUrl || info.pageUrl);
  if (frameUrl && isHostScopedUrl(frameUrl)) return frameUrl;
  return (tab && tab.url) || (info && info.pageUrl) || frameUrl || "";
}

function getFallbackScopeForUrl(url) {
  if (!url || !systemScopeApi || typeof systemScopeApi.getFallbackScope !== "function") return "";
  try {
    const parsed = new URL(url);
    return systemScopeApi.getFallbackScope({ hostname: parsed.hostname, port: parsed.port, protocol: parsed.protocol });
  } catch (_) {
    return "";
  }
}

// An entry recorded for a previous page of the tab is stale once the top-level URL maps to a
// different fallback scope. Without a known top URL the entry is trusted (tabs.onUpdated
// "loading" drops it on navigation anyway).
function getFreshTabScope(tabId, topUrl) {
  const entry = tabId ? tabScopes[tabId] : null;
  if (!entry || typeof entry.scope !== "string" || !entry.scope) return null;
  if (topUrl) {
    const currentFallback = getFallbackScopeForUrl(topUrl);
    if (currentFallback && entry.fallbackScope !== currentFallback) return null;
  }
  return entry;
}

// The tab's recognized scope wins (it covers every frame of the tab); without one, the URL's own
// fallback scope is what a content script would use before recognition finishes.
function getScopeForTab(tabId, topUrl, contextUrl) {
  const entry = getFreshTabScope(tabId, topUrl);
  if (entry) return entry.scope;
  return getFallbackScopeForUrl(contextUrl || topUrl);
}

function getSessionStorageArea() {
  return chrome.storage && chrome.storage.session && typeof chrome.storage.session.get === "function" ? chrome.storage.session : null;
}

function loadTabScopes() {
  if (!tabScopesLoadPromise) {
    tabScopesLoadPromise = new Promise(function (resolve) {
      const area = getSessionStorageArea();
      if (!area) {
        resolve();
        return;
      }
      area.get([TAB_SCOPES_STORAGE_KEY], function (result) {
        void chrome.runtime.lastError;
        const stored = result && result[TAB_SCOPES_STORAGE_KEY];
        if (stored && typeof stored === "object" && !Array.isArray(stored)) tabScopes = Object.assign({}, stored, tabScopes);
        resolve();
      });
    });
  }
  return tabScopesLoadPromise;
}

function persistTabScopes() {
  const area = getSessionStorageArea();
  if (!area || typeof area.set !== "function") return Promise.resolve();
  return new Promise(function (resolve) {
    area.set({ [TAB_SCOPES_STORAGE_KEY]: tabScopes }, function () {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

function broadcastPageScopeChanged(tabId, resolution) {
  if (!tabId || !chrome.tabs || typeof chrome.tabs.sendMessage !== "function") return;
  chrome.tabs.sendMessage(tabId, { resolution, type: "page-scope-changed" }, function () {
    void chrome.runtime.lastError;
  });
}

async function setTabScope(tabId, resolution) {
  await loadTabScopes();
  tabScopes[tabId] = resolution;
  await persistTabScopes();
  broadcastPageScopeChanged(tabId, resolution);
  syncRootMenuVisibilityForActiveTab();
  syncBackupReminderForActiveTab();
}

async function clearTabScope(tabId) {
  await loadTabScopes();
  if (!Object.prototype.hasOwnProperty.call(tabScopes, tabId)) return;
  delete tabScopes[tabId];
  await persistTabScopes();
}

function enqueueRegistryTask(task) {
  const run = registryQueue.then(task);
  registryQueue = run.then(function () {}, function () {});
  return run;
}

function runLegacyMigration() {
  if (!systemScopeApi || typeof systemScopeApi.migrateLegacyScopes !== "function") return Promise.resolve(null);
  return enqueueRegistryTask(function () {
    return systemScopeApi.migrateLegacyScopes();
  }).catch(function () {
    return null;
  });
}

function normalizePageInfo(info) {
  if (!info || typeof info !== "object" || typeof info.hostname !== "string") return null;
  return { ...info, query: info.query && typeof info.query === "object" ? info.query : {} };
}

// Content scripts (including their sessionStorage marker) are untrusted input here.
function normalizeResolveInput(info, marker) {
  const pageInfo = normalizePageInfo(info);
  if (!pageInfo || !systemScopeApi) return null;
  return { info: pageInfo, marker: systemScopeApi.normalizeSessionMarker(marker) };
}

function getSenderTabId(sender) {
  return sender && sender.tab && typeof sender.tab.id === "number" ? sender.tab.id : 0;
}

// Only the top frame is recognized; recording is skipped for iframe senders so a frame's own URL
// never overwrites the tab's scope.
function canRecordTabScope(sender) {
  return getSenderTabId(sender) > 0 && (sender.frameId === undefined || sender.frameId === 0);
}

function recordResolution(tabId, resolution, record) {
  if (!record) return Promise.resolve(resolution);
  return setTabScope(tabId, resolution).then(function () {
    return resolution;
  });
}

function resolveAndRecordPageScope(tabId, input, record) {
  return systemScopeApi.resolvePageScope(input).then(function (resolution) {
    return recordResolution(tabId, resolution, record);
  });
}

function selectSystemForTab(tabId, systemId, info, record) {
  if (!systemId) return resolveAndRecordPageScope(tabId, { info, marker: null }, record);
  return systemScopeApi.readSystems().then(function (systems) {
    const system = systems.find(function (item) {
      return item.id === systemId;
    });
    // A stale id behaves like "back to auto recognition".
    if (!system) return resolveAndRecordPageScope(tabId, { info, marker: null }, record);
    return recordResolution(tabId, {
      fallbackScope: systemScopeApi.getFallbackScope(info),
      marker: { id: system.id, manual: true, name: system.name },
      scope: systemScopeApi.buildSystemScope(system.id),
      system: { id: system.id, name: system.name }
    }, record);
  });
}

function setSiteFeatureEnabledForScope(tabId, scope, enabled, input, record) {
  return systemScopeApi.writeScopeEnabled(scope, enabled === true).then(function () {
    // Enabling a fallback scope turns the page into a system (new or auto-joined); resolving
    // again after a disable lands on the same scope because the system keeps participating.
    return resolveAndRecordPageScope(tabId, input, record);
  });
}

async function buildContextMenus() {
  if (!chrome.contextMenus || !smartFillApi) return;
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: MENU_FAVORITE_ID,
      title: "加入常用",
      contexts: ["all"]
    });

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
      id: MENU_NONE_ID,
      parentId: MENU_ROOT_ID,
      title: "无",
      contexts: ["editable"]
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

function getNextBackupReminderAt(now) {
  const current = new Date(now || Date.now());
  const next = new Date(current);
  next.setHours(10, 0, 0, 0);
  next.setDate(next.getDate() + (5 - next.getDay() + 7) % 7);
  if (next.getTime() <= current.getTime()) next.setDate(next.getDate() + 7);
  return next.getTime();
}

function ensureBackupReminderAlarm() {
  return isLocalAutoBackupReady().then(function (ready) {
    if (ready) return clearBackupReminder();
    if (!chrome.alarms || typeof chrome.alarms.get !== "function") return;
    chrome.alarms.get(BACKUP_REMINDER_ALARM_NAME, function (alarm) {
      void chrome.runtime.lastError;
      if (alarm) return;
      chrome.alarms.create(BACKUP_REMINDER_ALARM_NAME, {
        periodInMinutes: WEEK_IN_MINUTES,
        when: getNextBackupReminderAt()
      });
    });
  });
}

function sendBackupReminderState(tabId, pending) {
  if (!tabId || !chrome.tabs || typeof chrome.tabs.sendMessage !== "function") return;
  chrome.tabs.sendMessage(tabId, {
    message: BACKUP_REMINDER_MESSAGE,
    type: pending ? "show-backup-reminder" : "hide-backup-reminder"
  }, { frameId: 0 }, function () {
    void chrome.runtime.lastError;
  });
}

function hideBackupReminderForAllTabs() {
  if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
  chrome.tabs.query({}, function (tabs) {
    void chrome.runtime.lastError;
    (tabs || []).forEach(function (tab) {
      sendBackupReminderState(tab && tab.id, false);
    });
  });
}

function isLocalAutoBackupReady() {
  if (!localAnnotationFileApi || typeof localAnnotationFileApi.getState !== "function") return Promise.resolve(false);
  return localAnnotationFileApi.getState()
    .then(function (state) {
      return !!(state && state.enabled && state.permissionState === "granted");
    })
    .catch(function () {
      return false;
    });
}

function clearBackupReminder() {
  if (chrome.alarms && typeof chrome.alarms.clear === "function") {
    chrome.alarms.clear(BACKUP_REMINDER_ALARM_NAME, function () {
      void chrome.runtime.lastError;
    });
  }
  if (!chrome.storage || !chrome.storage.local || typeof chrome.storage.local.remove !== "function") {
    hideBackupReminderForAllTabs();
    return;
  }
  chrome.storage.local.remove(BACKUP_REMINDER_PENDING_KEY, function () {
    void chrome.runtime.lastError;
    hideBackupReminderForAllTabs();
  });
}

function isSiteFeatureEnabledForTab(tabId, url) {
  if (!siteFeatureToggleApi) return Promise.resolve(true);
  return loadTabScopes().then(function () {
    const scope = getScopeForTab(tabId, url, url);
    if (!scope) return true;
    if (typeof siteFeatureToggleApi.readSiteFeatureEnabled !== "function") return isSiteFeatureEnabledForScope(scope);
    return siteFeatureToggleApi.readSiteFeatureEnabled({ scope }).catch(function () {
      return false;
    });
  });
}

function syncBackupReminderForTab(tabId) {
  if (!tabId || !chrome.tabs || typeof chrome.tabs.get !== "function" || !chrome.storage || !chrome.storage.local) return;
  chrome.tabs.get(tabId, function (tab) {
    void chrome.runtime.lastError;
    Promise.all([isSiteFeatureEnabledForTab(tabId, tab && tab.url), isLocalAutoBackupReady()]).then(function (states) {
      if (!states[0] || states[1]) return sendBackupReminderState(tabId, false);
      chrome.storage.local.get(BACKUP_REMINDER_PENDING_KEY, function (values) {
        void chrome.runtime.lastError;
        sendBackupReminderState(tabId, !!(values && values[BACKUP_REMINDER_PENDING_KEY]));
      });
    });
  });
}

function syncBackupReminderForActiveTab() {
  if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    void chrome.runtime.lastError;
    const tab = tabs && tabs[0];
    syncBackupReminderForTab(tab && tab.id);
  });
}

function showBackupReminder() {
  return isLocalAutoBackupReady().then(function (ready) {
    if (ready) return clearBackupReminder();
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.set({ [BACKUP_REMINDER_PENDING_KEY]: Date.now() }, function () {
      void chrome.runtime.lastError;
      if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
        void chrome.runtime.lastError;
        syncBackupReminderForTab(tabs && tabs[0] && tabs[0].id);
      });
    });
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

function openDataManagerPage(scope, view, systemId) {
  if (!chrome.runtime || typeof chrome.runtime.getURL !== "function") return;
  const baseUrl = chrome.runtime.getURL("");
  const url = dataManagerBridgeApi && typeof dataManagerBridgeApi.buildDataManagerPageUrl === "function"
    ? dataManagerBridgeApi.buildDataManagerPageUrl(baseUrl, scope, view, systemId)
    : chrome.runtime.getURL("data-manager.html");
  const versionedUrl = new URL(url);
  versionedUrl.searchParams.set("v", chrome.runtime.getManifest().version);
  openExtensionPage(versionedUrl.href);
}

function openAiPermissionPage(origin) {
  if (!chrome.runtime || typeof chrome.runtime.getURL !== "function") return false;
  if (!origin) return false;
  openExtensionPage(chrome.runtime.getURL("ai-permission.html?origin=" + encodeURIComponent(origin)));
  return true;
}

function openLocalAnnotationPermissionPage(mode) {
  if (!localAnnotationFileApi || !chrome.runtime || typeof chrome.runtime.getURL !== "function") return false;
  openExtensionPage(chrome.runtime.getURL("local-annotation-permission.html" + (mode === "change" ? "?mode=change" : "")));
  return true;
}

function prepareLocalAnnotationOverrides() {
  if (!localAnnotationFileSupported || !localAnnotationFileApi || !smartFillApi) {
    return Promise.resolve({ enabled: false, source: "storage", supported: false });
  }
  if (localAnnotationPreparePromise) return localAnnotationPreparePromise;
  localAnnotationPreparePromise = localAnnotationFileApi.readPreferredOverrides().then(function (result) {
    if (!result || result.source !== "file") return result;
    return smartFillApi.replaceManualFieldOverrides(result.overrides, {
      storageArea: chrome.storage.local,
      suppressLocalAnnotationSync: true
    }).then(function () {
      return result;
    });
  }).finally(function () {
    localAnnotationPreparePromise = null;
  });
  return localAnnotationPreparePromise;
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

function isSiteFeatureEnabledForScope(scope) {
  if (!siteFeatureToggleApi || !scope) return true;
  if (typeof siteFeatureToggleApi.isScopeEnabledInMap !== "function") return siteFeatureToggleApi.getDefaultSiteFeatureEnabled();
  return siteFeatureToggleApi.isScopeEnabledInMap(siteFeatureEnabledMap, scope);
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
  [MENU_ROOT_ID, MENU_FAVORITE_ID].forEach(function (menuId) {
    chrome.contextMenus.update(menuId, { visible: visible }, function () {
      void chrome.runtime.lastError;
      if (typeof chrome.contextMenus.refresh === "function") chrome.contextMenus.refresh();
    });
  });
}

function syncRootMenuVisibilityForTab(tabId, topUrl, contextUrl) {
  updateRootMenuVisibility(isSiteFeatureEnabledForScope(getScopeForTab(tabId, topUrl, contextUrl)));
}

function syncRootMenuVisibilityForTabId(tabId) {
  if (!chrome.tabs || typeof chrome.tabs.get !== "function" || !tabId) return;
  chrome.tabs.get(tabId, function (tab) {
    void chrome.runtime.lastError;
    syncRootMenuVisibilityForTab(tabId, tab && tab.url);
  });
}

function syncRootMenuVisibilityForActiveTab() {
  if (!chrome.tabs || typeof chrome.tabs.query !== "function") return;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    void chrome.runtime.lastError;
    const tab = tabs && tabs[0];
    syncRootMenuVisibilityForTab(tab && tab.id, tab && tab.url);
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
  ensureBackupReminderAlarm();
  readSiteFeatureEnabledMap().catch(function () {});
  restoreStorageLocalMirrorIfEmpty().catch(function () {});
});
chrome.runtime.onStartup.addListener(buildContextMenus);
chrome.runtime.onStartup.addListener(function () {
  ensureBackupReminderAlarm();
  restoreStorageLocalMirrorIfEmpty()
    .then(readSiteFeatureEnabledMap, function () {
      return readSiteFeatureEnabledMap();
    })
    .catch(function () {})
    .finally(syncBackupReminderForActiveTab);
});
if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm && alarm.name === BACKUP_REMINDER_ALARM_NAME) showBackupReminder();
  });
}
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local" || !changes) return;
    if (localAnnotationFileApi && Object.prototype.hasOwnProperty.call(changes, localAnnotationFileApi.ENABLED_STORAGE_KEY)) {
      ensureBackupReminderAlarm();
    }
    if (siteFeatureToggleApi && Object.prototype.hasOwnProperty.call(changes, siteFeatureToggleApi.STORAGE_KEY)) {
      siteFeatureEnabledMap = siteFeatureToggleApi.normalizeSiteFeatureEnabledMap(changes[siteFeatureToggleApi.STORAGE_KEY].newValue);
      syncRootMenuVisibilityForActiveTab();
      syncBackupReminderForActiveTab();
    }
    if (LEGACY_MIGRATION_TRIGGER_KEYS.some(function (key) { return Object.prototype.hasOwnProperty.call(changes, key); })) {
      // The migration is idempotent: once nothing is legacy it writes nothing, so the onChanged
      // events caused by its own writes end after one extra no-op pass.
      runLegacyMigration();
    }
    mirrorStorageLocal().catch(function () {});
    if (localAnnotationFileApi && storageMirrorApi.STORAGE_KEYS.some(function (key) {
      return key !== localAnnotationFileApi.OVERRIDES_STORAGE_KEY && Object.prototype.hasOwnProperty.call(changes, key);
    })) {
      localAnnotationFileApi.syncFromStorage().catch(function () {});
    }
  });
}

if (chrome.contextMenus && chrome.contextMenus.onShown) {
  chrome.contextMenus.onShown.addListener(function (info, tab) {
    syncRootMenuVisibilityForTab(tab && tab.id, (tab && tab.url) || (info && info.pageUrl), resolveContextUrl(info, tab));
  });
}

if (chrome.tabs && chrome.tabs.onActivated) {
  chrome.tabs.onActivated.addListener(function (activeInfo) {
    syncRootMenuVisibilityForTabId(activeInfo && activeInfo.tabId);
    syncBackupReminderForTab(activeInfo && activeInfo.tabId);
  });
}

if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (!changeInfo || (!Object.prototype.hasOwnProperty.call(changeInfo, "status") && !Object.prototype.hasOwnProperty.call(changeInfo, "url"))) return;
    // A new document is loading: the previous page's scope no longer applies (same-document
    // routing never reports "loading", so SPA navigation keeps it).
    if (changeInfo.status === "loading") {
      enqueueRegistryTask(function () {
        return clearTabScope(tabId);
      }).catch(function () {});
    }
    syncRootMenuVisibilityForTab(tabId, (tab && tab.url) || changeInfo.url);
    if (changeInfo.status === "complete" && tab && tab.active) syncBackupReminderForTab(tabId);
  });
}

if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener(function (tabId) {
    enqueueRegistryTask(function () {
      return clearTabScope(tabId);
    }).catch(function () {});
  });
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (!info || !tab || !tab.id) return;
  if (!isSiteFeatureEnabledForScope(getScopeForTab(tab.id, tab.url || info.pageUrl, resolveContextUrl(info, tab)))) return;
  if (info.menuItemId === MENU_FAVORITE_ID) {
    sendTabMessage(tab.id, info, { type: "add-current-page-to-favorites" });
    return;
  }
  if (info.menuItemId === MENU_CLEAR_ID) {
    sendTabMessage(tab.id, info, { type: "clear-smart-fill-override" });
    return;
  }
  if (info.menuItemId === MENU_NONE_ID) {
    sendTabMessage(tab.id, info, { type: "suppress-smart-fill-recognition" });
    return;
  }
  if (typeof info.menuItemId !== "string" || !info.menuItemId.startsWith(MENU_FIELD_PREFIX)) return;
  const fieldKey = info.menuItemId.slice(MENU_FIELD_PREFIX.length);
  sendTabMessage(tab.id, info, {
    type: "apply-smart-fill-override",
    fieldKey
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || typeof message.type !== "string") return;
  if (message.type === "open-extension-repository-page") {
    openExtensionPage(REPOSITORY_URL);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "open-data-manager-page") {
    openDataManagerPage(message.scope, message.view, message.systemId);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "sync-site-feature-context-menu") {
    updateRootMenuVisibility(message.enabled !== false);
    sendResponse({ ok: true });
    return;
  }
  if (message.type === "resolve-page-scope") {
    const input = normalizeResolveInput(message.info, message.marker);
    const tabId = getSenderTabId(sender);
    if (!input || !tabId || sender.frameId !== 0) {
      sendResponse(null);
      return;
    }
    enqueueRegistryTask(function () {
      return resolveAndRecordPageScope(tabId, input, true);
    }).then(sendResponse, function () {
      sendResponse(null);
    });
    return true;
  }
  if (message.type === "get-tab-scope") {
    const tabId = getSenderTabId(sender);
    if (!tabId) {
      sendResponse(null);
      return;
    }
    loadTabScopes().then(function () {
      sendResponse(getFreshTabScope(tabId, sender.tab.url));
    });
    return true;
  }
  if (message.type === "set-site-feature-enabled") {
    const input = normalizeResolveInput(message.info, message.marker);
    const scope = typeof message.scope === "string" ? message.scope.trim() : "";
    if (!input || !scope) {
      sendResponse(null);
      return;
    }
    const tabId = getSenderTabId(sender);
    const record = canRecordTabScope(sender);
    enqueueRegistryTask(function () {
      return setSiteFeatureEnabledForScope(tabId, scope, message.enabled, input, record);
    }).then(sendResponse, function () {
      sendResponse(null);
    });
    return true;
  }
  if (message.type === "select-system") {
    const input = normalizeResolveInput(message.info, null);
    const systemId = typeof message.systemId === "string" && message.systemId ? message.systemId : null;
    if (!input) {
      sendResponse(null);
      return;
    }
    const tabId = getSenderTabId(sender);
    const record = canRecordTabScope(sender);
    enqueueRegistryTask(function () {
      return selectSystemForTab(tabId, systemId, input.info, record);
    }).then(sendResponse, function () {
      sendResponse(null);
    });
    return true;
  }
  if (message.type === "list-systems") {
    if (!systemScopeApi) {
      sendResponse([]);
      return;
    }
    systemScopeApi.readSystems()
      .then(function (systems) {
        sendResponse(systems.map(function (system) {
          return { id: system.id, name: system.name };
        }));
      })
      .catch(function () {
        sendResponse([]);
      });
    return true;
  }
  if (message.type === "read-backup-reminder-state") {
    Promise.all([isSiteFeatureEnabledForTab(getSenderTabId(sender), sender && sender.tab && sender.tab.url), isLocalAutoBackupReady()]).then(function (states) {
      chrome.storage.local.get(BACKUP_REMINDER_PENDING_KEY, function (values) {
        const error = chrome.runtime.lastError;
        sendResponse({
          message: BACKUP_REMINDER_MESSAGE,
          ok: !error,
          pending: states[0] && !states[1] && !!(values && values[BACKUP_REMINDER_PENDING_KEY])
        });
      });
    });
    return true;
  }
  if (message.type === "dismiss-backup-reminder") {
    chrome.storage.local.remove(BACKUP_REMINDER_PENDING_KEY, function () {
      hideBackupReminderForAllTabs();
      sendResponse({ ok: !chrome.runtime.lastError });
    });
    return true;
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
  if (message.type === "open-local-annotation-permission") {
    sendResponse({ ok: openLocalAnnotationPermissionPage(message.mode) });
    return;
  }
  if (message.type === "disable-local-annotation-file") {
    if (!localAnnotationFileApi) {
      sendResponse({ enabled: false, ok: true, supported: false });
      return;
    }
    localAnnotationFileApi.disable()
      .then(function () {
        sendResponse({ enabled: false, ok: true });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "关闭本地自动保存失败", ok: false });
      });
    return true;
  }
  if (message.type === "enable-local-annotation-file") {
    if (!localAnnotationFileApi) {
      sendResponse({ enabled: false, ok: true, supported: false });
      return;
    }
    localAnnotationFileApi.resumeStored()
      .then(function (result) {
        sendResponse({ ...result, ok: true });
      })
      .catch(function (error) {
        sendResponse({ enabled: false, error: error && error.message ? error.message : "恢复本地自动保存失败", ok: false });
      });
    return true;
  }
  if (message.type === "read-local-annotation-file-state") {
    if (!localAnnotationFileApi) {
      sendResponse({ enabled: false, ok: true, permissionState: "denied", supported: false });
      return;
    }
    localAnnotationFileApi.getState()
      .then(function (result) {
        sendResponse({ ...result, ok: true });
      })
      .catch(function (error) {
        sendResponse({ enabled: false, error: error && error.message ? error.message : "读取本地目录授权失败", ok: false });
      });
    return true;
  }
  if (message.type === "prepare-local-annotation-file") {
    prepareLocalAnnotationOverrides()
      .then(function (result) {
        sendResponse({
          enabled: !!(result && result.enabled),
          ok: true,
          permissionRequired: !!(result && result.permissionRequired),
          source: result && result.source,
          supported: !result || result.supported !== false
        });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "读取本地数据文件失败", ok: false });
      });
    return true;
  }
  if (message.type === "sync-local-annotation-file") {
    if (!localAnnotationFileApi) {
      sendResponse({ enabled: false, ok: true, skipped: true, supported: false });
      return;
    }
    localAnnotationFileApi.syncFromStorage()
      .then(function (result) {
        sendResponse({ enabled: !!(result && result.enabled), ok: true, skipped: !!(result && result.skipped) });
      })
      .catch(function (error) {
        sendResponse({ error: error && error.message ? error.message : "保存本地数据文件失败", ok: false });
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

runLegacyMigration();
loadTabScopes().then(syncRootMenuVisibilityForActiveTab);
readSiteFeatureEnabledMap().catch(function () {});
restoreStorageLocalMirrorIfEmpty()
  .then(function (result) {
    if (result && result.restored) return readSiteFeatureEnabledMap();
    return null;
  })
  .catch(function () {});
buildContextMenus();
ensureBackupReminderAlarm();
syncRootMenuVisibilityForActiveTab();
