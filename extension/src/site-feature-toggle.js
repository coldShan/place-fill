(function (rootScope) {
  "use strict";

  const STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";

  function getDefaultSiteFeatureEnabled() {
    return true;
  }

  function isSiteFeatureEnabled(value) {
    return value !== false;
  }

  function getStorageArea(env) {
    if (env && env.storageArea) return env.storageArea;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_) {}
    return null;
  }

  function getLocationHostname(env) {
    if (env && typeof env.hostname === "string") return String(env.hostname || "").trim().toLowerCase();
    const locationLike = env && env.location;
    if (locationLike && typeof locationLike.hostname === "string") return String(locationLike.hostname || "").trim().toLowerCase();
    try {
      if (typeof location !== "undefined" && typeof location.hostname === "string") {
        return String(location.hostname || "").trim().toLowerCase();
      }
    } catch (_) {}
    return "";
  }

  function normalizeSiteFeatureEnabledMap(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
    return Object.fromEntries(
      Object.entries(rawValue)
        .map(function ([hostname, enabled]) {
          return [String(hostname || "").trim().toLowerCase(), enabled === false ? false : true];
        })
        .filter(function ([hostname]) {
          return Boolean(hostname);
        })
    );
  }

  function readSiteFeatureEnabledMap(env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.get !== "function") {
      return Promise.resolve({});
    }

    return new Promise(function (resolve) {
      storageArea.get([STORAGE_KEY], function (result) {
        resolve(normalizeSiteFeatureEnabledMap(result && result[STORAGE_KEY]));
      });
    });
  }

  async function readSiteFeatureEnabled(env) {
    const hostname = getLocationHostname(env);
    if (!hostname) return getDefaultSiteFeatureEnabled();
    const enabledMap = await readSiteFeatureEnabledMap(env);
    if (!Object.prototype.hasOwnProperty.call(enabledMap, hostname)) return getDefaultSiteFeatureEnabled();
    return isSiteFeatureEnabled(enabledMap[hostname]);
  }

  async function writeSiteFeatureEnabled(enabled, env) {
    const storageArea = getStorageArea(env);
    const hostname = getLocationHostname(env);
    const normalizedEnabled = isSiteFeatureEnabled(enabled);
    if (!hostname) return normalizedEnabled;
    if (!storageArea || typeof storageArea.set !== "function") return normalizedEnabled;

    const enabledMap = await readSiteFeatureEnabledMap(env);
    enabledMap[hostname] = normalizedEnabled;

    return new Promise(function (resolve) {
      storageArea.set({ [STORAGE_KEY]: enabledMap }, function () {
        resolve(normalizedEnabled);
      });
    });
  }

  const api = {
    STORAGE_KEY,
    getDefaultSiteFeatureEnabled,
    isSiteFeatureEnabled,
    normalizeSiteFeatureEnabledMap,
    readSiteFeatureEnabled,
    readSiteFeatureEnabledMap,
    writeSiteFeatureEnabled
  };

  rootScope.ChromeTestDataSiteFeatureToggle = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
