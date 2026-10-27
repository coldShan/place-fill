(function (rootScope) {
  "use strict";

  const STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";

  function getDefaultSiteFeatureEnabled() {
    return false;
  }

  function isSiteFeatureEnabled(value) {
    return value === true;
  }

  function getStorageArea(env) {
    if (env && env.storageArea) return env.storageArea;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_) {}
    return null;
  }

  function getScope(env) {
    return env && typeof env.scope === "string" ? env.scope.trim() : "";
  }

  // Mirrors `legacyKeyForFallbackScope` in system-registry.ts: only `host:<local host>[:port]`
  // scopes fall back to the pre-scope `legacy:<hostname>` record.
  function isLocalHostname(hostname) {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".localhost")
    );
  }

  function getLegacyKeyForFallbackScope(scope) {
    if (scope.indexOf("host:") !== 0) return "";
    const value = scope.slice("host:".length);
    let hostname = value;
    if (value.indexOf("v6-") === 0) {
      const lastColon = value.lastIndexOf(":");
      const bare = (lastColon === -1 ? value : value.slice(0, lastColon)).slice(3).replace(/-/g, ":");
      hostname = "[" + bare + "]";
    } else {
      const colon = value.indexOf(":");
      if (colon !== -1) hostname = value.slice(0, colon);
    }
    return isLocalHostname(hostname.trim().toLowerCase()) ? "legacy:" + hostname : "";
  }

  function normalizeSiteFeatureEnabledMap(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
    return Object.fromEntries(
      Object.entries(rawValue)
        .map(function ([scope, enabled]) {
          return [String(scope || "").trim(), enabled === true];
        })
        .filter(function ([scope]) {
          return Boolean(scope);
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
    const scope = getScope(env);
    if (!scope) return getDefaultSiteFeatureEnabled();
    const enabledMap = await readSiteFeatureEnabledMap(env);
    if (Object.prototype.hasOwnProperty.call(enabledMap, scope)) return isSiteFeatureEnabled(enabledMap[scope]);
    const legacyKey = getLegacyKeyForFallbackScope(scope);
    if (legacyKey && Object.prototype.hasOwnProperty.call(enabledMap, legacyKey)) {
      return isSiteFeatureEnabled(enabledMap[legacyKey]);
    }
    return getDefaultSiteFeatureEnabled();
  }

  async function writeSiteFeatureEnabled(enabled, env) {
    const storageArea = getStorageArea(env);
    const scope = getScope(env);
    const normalizedEnabled = isSiteFeatureEnabled(enabled);
    if (!scope) return normalizedEnabled;
    if (!storageArea || typeof storageArea.set !== "function") return normalizedEnabled;

    const enabledMap = await readSiteFeatureEnabledMap(env);
    enabledMap[scope] = normalizedEnabled;

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
