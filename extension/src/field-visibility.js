(function (rootScope) {
  "use strict";

  function getFieldMetaApi() {
    if (rootScope.ChromeTestDataFieldMeta) return rootScope.ChromeTestDataFieldMeta;
    if (typeof require === "function") {
      try {
        return require("./field-meta.js");
      } catch (_) {}
    }
    return {
      getFieldKeys: function () {
        return [];
      },
      isSupportedFieldKey: function () {
        return false;
      }
    };
  }

  const STORAGE_KEY = "ctdp.visibleFieldKeys.v1";
  const fieldMetaApi = getFieldMetaApi();
  const DEFAULT_VISIBLE_FIELD_KEYS = Object.freeze(fieldMetaApi.getFieldKeys().slice(0, 6));

  function getDefaultVisibleFieldKeys() {
    return DEFAULT_VISIBLE_FIELD_KEYS.slice();
  }

  function normalizeVisibleFieldKeys(fieldKeys, options) {
    const opts = options || {};
    if (!Array.isArray(fieldKeys)) {
      return opts.fallbackToDefault === false ? [] : getDefaultVisibleFieldKeys();
    }

    const visibleSet = new Set(
      fieldKeys.filter(function (fieldKey) {
        return fieldMetaApi.isSupportedFieldKey(fieldKey);
      })
    );

    return fieldMetaApi.getFieldKeys().filter(function (fieldKey) {
      return visibleSet.has(fieldKey);
    });
  }

  function filterVisibleFieldKeys(fieldKeys, visibleFieldKeys) {
    const sourceFieldKeys = Array.isArray(fieldKeys) ? fieldKeys : fieldMetaApi.getFieldKeys();
    const visibleSet = new Set(normalizeVisibleFieldKeys(visibleFieldKeys, { fallbackToDefault: false }));
    return sourceFieldKeys.filter(function (fieldKey) {
      return visibleSet.has(fieldKey);
    });
  }

  function isFieldVisible(fieldKey, visibleFieldKeys) {
    return filterVisibleFieldKeys([fieldKey], visibleFieldKeys).length > 0;
  }

  function getStorageArea(env) {
    if (env && env.storageArea) return env.storageArea;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_) {}
    return null;
  }

  function readVisibleFieldKeys(env) {
    const storageArea = getStorageArea(env);
    if (!storageArea || typeof storageArea.get !== "function") {
      return Promise.resolve(getDefaultVisibleFieldKeys());
    }

    return new Promise(function (resolve) {
      storageArea.get([STORAGE_KEY], function (result) {
        resolve(normalizeVisibleFieldKeys(result && result[STORAGE_KEY]));
      });
    });
  }

  function writeVisibleFieldKeys(fieldKeys, env) {
    const storageArea = getStorageArea(env);
    const normalizedFieldKeys = normalizeVisibleFieldKeys(fieldKeys, { fallbackToDefault: false });
    if (!storageArea || typeof storageArea.set !== "function") {
      return Promise.resolve(normalizedFieldKeys);
    }

    return new Promise(function (resolve) {
      storageArea.set({ [STORAGE_KEY]: normalizedFieldKeys }, function () {
        resolve(normalizedFieldKeys);
      });
    }); 
  }

  const api = {
    STORAGE_KEY,
    filterVisibleFieldKeys,
    getDefaultVisibleFieldKeys,
    isFieldVisible,
    readVisibleFieldKeys,
    writeVisibleFieldKeys
  };

  rootScope.ChromeTestDataFieldVisibility = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
