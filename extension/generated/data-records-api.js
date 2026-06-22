var ChromeTestDataDataRecordsBundle = (function() {
  "use strict";
  const FIELD_DEFINITIONS = [
    { key: "creditCode", label: "统一社会信用代码" },
    { key: "companyName", label: "公司名称" },
    { key: "fullName", label: "姓名" },
    { key: "idNumber", label: "身份证号" },
    { key: "bankCard", label: "银行卡号" },
    { key: "account", label: "账号" },
    { key: "mobile", label: "手机号" },
    { key: "email", label: "邮箱" },
    { key: "landline", label: "固定电话" },
    { key: "address", label: "地址" }
  ];
  const FIELD_KEYS = FIELD_DEFINITIONS.map(function(definition) {
    return definition.key;
  });
  function createEmptyProfile() {
    return Object.fromEntries(
      FIELD_KEYS.map(function(fieldKey) {
        return [fieldKey, ""];
      })
    );
  }
  function normalizeProfile(profile) {
    const nextProfile = createEmptyProfile();
    FIELD_KEYS.forEach(function(fieldKey) {
      const value = profile && typeof profile[fieldKey] === "string" ? profile[fieldKey] : "";
      nextProfile[fieldKey] = String(value || "");
    });
    return nextProfile;
  }
  function formatProfileForCopy(profile) {
    const normalized = normalizeProfile(profile);
    return FIELD_DEFINITIONS.map(function(definition) {
      return definition.label + "：" + normalized[definition.key];
    }).join("\n");
  }
  const GENERATED_PROFILES_STORAGE_KEY = "ctdp.generatedProfiles.v1";
  const FAVORITE_PROFILES_STORAGE_KEY = "ctdp.favoriteProfiles.v1";
  const MAX_GENERATED_RECORDS = 30;
  function getStorageArea(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_error) {
    }
    return null;
  }
  function readStorageValue(storageArea, key) {
    if (!storageArea) return Promise.resolve(void 0);
    return new Promise(function(resolve) {
      storageArea.get([key], function(result) {
        resolve(result ? result[key] : void 0);
      });
    });
  }
  function writeStorageValue(storageArea, key, value) {
    if (!storageArea) return Promise.resolve();
    return new Promise(function(resolve) {
      storageArea.set({ [key]: value }, function() {
        resolve();
      });
    });
  }
  function normalizeTimestamp(value) {
    const raw = String(value || "").trim();
    return /^\d+$/.test(raw) ? raw : "0";
  }
  function normalizeId(value) {
    const raw = String(value || "").trim();
    return raw || "record-0";
  }
  function createId(now, random) {
    return String(now) + "-" + Math.floor(random() * 1e6).toString(36);
  }
  function normalizeScopeKey(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized.includes("://")) return "";
    if (/[/?#]/.test(normalized)) return "";
    if (!/^[a-z0-9.\-:]+$/i.test(normalized)) return "";
    return normalized;
  }
  function normalizeGeneratedProfilesMap(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
    const nextMap = {};
    Object.entries(rawValue).forEach(function([scope, entries]) {
      const normalizedScope = normalizeScopeKey(scope);
      if (!normalizedScope || !Array.isArray(entries)) return;
      nextMap[normalizedScope] = entries.filter(function(entry) {
        return !!entry && typeof entry === "object" && !Array.isArray(entry);
      }).map(function(entry) {
        const current = entry;
        return {
          createdAt: normalizeTimestamp(current.createdAt),
          id: normalizeId(current.id),
          profile: normalizeProfile(current.profile)
        };
      }).sort(function(left, right) {
        return Number(right.createdAt) - Number(left.createdAt);
      }).slice(0, MAX_GENERATED_RECORDS);
    });
    return nextMap;
  }
  function normalizeFavoriteProfilesMap(rawValue) {
    if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
    const nextMap = {};
    Object.entries(rawValue).forEach(function([scope, entries]) {
      const normalizedScope = normalizeScopeKey(scope);
      if (!normalizedScope || !Array.isArray(entries)) return;
      nextMap[normalizedScope] = entries.filter(function(entry) {
        return !!entry && typeof entry === "object" && !Array.isArray(entry);
      }).map(function(entry) {
        const current = entry;
        const createdAt = normalizeTimestamp(current.createdAt);
        const updatedAt = normalizeTimestamp(current.updatedAt || current.createdAt);
        return {
          createdAt,
          id: normalizeId(current.id),
          name: String(current.name || "").trim() || "常用数据",
          profile: normalizeProfile(current.profile),
          updatedAt
        };
      }).sort(function(left, right) {
        return Number(right.updatedAt) - Number(left.updatedAt);
      });
    });
    return nextMap;
  }
  function isSameProfile(left, right) {
    return FIELD_KEYS.every(function(fieldKey) {
      return left[fieldKey] === right[fieldKey];
    });
  }
  async function readGeneratedProfilesMap(env) {
    return normalizeGeneratedProfilesMap(await readStorageValue(getStorageArea(env), GENERATED_PROFILES_STORAGE_KEY));
  }
  async function writeGeneratedProfilesMap(nextMap, env) {
    await writeStorageValue(getStorageArea(env), GENERATED_PROFILES_STORAGE_KEY, nextMap);
  }
  async function readFavoriteProfilesMap(env) {
    return normalizeFavoriteProfilesMap(await readStorageValue(getStorageArea(env), FAVORITE_PROFILES_STORAGE_KEY));
  }
  async function writeFavoriteProfilesMap(nextMap, env) {
    await writeStorageValue(getStorageArea(env), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
  }
  async function listKnownScopes(env) {
    const generatedMap = await readGeneratedProfilesMap(env);
    const favoriteMap = await readFavoriteProfilesMap(env);
    return Array.from(new Set(Object.keys(generatedMap).concat(Object.keys(favoriteMap)))).sort();
  }
  async function readGeneratedProfiles(scope, env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope) return [];
    const records = await readGeneratedProfilesMap(env);
    return records[normalizedScope] ? records[normalizedScope].slice() : [];
  }
  async function recordGeneratedProfile(scope, profile, env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope) return [];
    const now = env && typeof env.now === "function" ? env.now() : Date.now();
    const random = env && typeof env.random === "function" ? env.random : Math.random;
    const nextEntry = {
      createdAt: String(now),
      id: createId(now, random),
      profile: normalizeProfile(profile)
    };
    const recordsMap = await readGeneratedProfilesMap(env);
    const currentEntries = recordsMap[normalizedScope] ? recordsMap[normalizedScope].slice() : [];
    recordsMap[normalizedScope] = [nextEntry].concat(currentEntries).slice(0, MAX_GENERATED_RECORDS);
    await writeGeneratedProfilesMap(recordsMap, env);
    return recordsMap[normalizedScope].slice();
  }
  async function readFavoriteProfiles(scope, env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope) return [];
    const favoritesMap = await readFavoriteProfilesMap(env);
    return favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  }
  async function createFavoriteProfile(scope, input, env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope) {
      throw new Error("Invalid scope");
    }
    const normalizedProfile = normalizeProfile(input.profile);
    const favoritesMap = await readFavoriteProfilesMap(env);
    const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
    const existingFavorite = currentEntries.find(function(entry2) {
      return isSameProfile(entry2.profile, normalizedProfile);
    });
    if (existingFavorite) return existingFavorite;
    const now = env && typeof env.now === "function" ? env.now() : Date.now();
    const random = env && typeof env.random === "function" ? env.random : Math.random;
    const entry = {
      createdAt: String(now),
      id: createId(now, random),
      name: String(input.name || "").trim() || "常用数据",
      profile: normalizedProfile,
      updatedAt: String(now)
    };
    favoritesMap[normalizedScope] = [entry].concat(currentEntries);
    await writeFavoriteProfilesMap(favoritesMap, env);
    return entry;
  }
  async function updateFavoriteProfile(scope, id, input, env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !id) return null;
    const now = env && typeof env.now === "function" ? env.now() : Date.now();
    const favoritesMap = await readFavoriteProfilesMap(env);
    const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
    const entryIndex = currentEntries.findIndex(function(entry) {
      return entry.id === id;
    });
    if (entryIndex === -1) return null;
    const currentEntry = currentEntries[entryIndex];
    if (!currentEntry) return null;
    const nextEntry = {
      createdAt: currentEntry.createdAt,
      id: currentEntry.id,
      name: String(input.name || "").trim() || currentEntry.name,
      profile: normalizeProfile(input.profile),
      updatedAt: String(now)
    };
    currentEntries.splice(entryIndex, 1);
    favoritesMap[normalizedScope] = [nextEntry].concat(currentEntries);
    await writeFavoriteProfilesMap(favoritesMap, env);
    return nextEntry;
  }
  async function deleteFavoriteProfile(scope, id, env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !id) return false;
    const favoritesMap = await readFavoriteProfilesMap(env);
    const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
    const nextEntries = currentEntries.filter(function(entry) {
      return entry.id !== id;
    });
    if (nextEntries.length === currentEntries.length) return false;
    favoritesMap[normalizedScope] = nextEntries;
    await writeFavoriteProfilesMap(favoritesMap, env);
    return true;
  }
  async function createFavoriteFromHistory(scope, historyId, name = "", env) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !historyId) return null;
    const recordsMap = await readGeneratedProfilesMap(env);
    const records = recordsMap[normalizedScope] ? recordsMap[normalizedScope].slice() : [];
    const historyEntry = records.find(function(entry) {
      return entry.id === historyId;
    });
    if (!historyEntry) return null;
    recordsMap[normalizedScope] = records.filter(function(entry) {
      return entry.id !== historyId;
    });
    const favorite = await createFavoriteProfile(normalizedScope, { name, profile: historyEntry.profile }, env);
    await writeGeneratedProfilesMap(recordsMap, env);
    return favorite;
  }
  const dataRecordsApi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    FAVORITE_PROFILES_STORAGE_KEY,
    FIELD_KEYS,
    GENERATED_PROFILES_STORAGE_KEY,
    MAX_GENERATED_RECORDS,
    createFavoriteFromHistory,
    createFavoriteProfile,
    deleteFavoriteProfile,
    formatProfileForCopy,
    listKnownScopes,
    normalizeProfile,
    normalizeScopeKey,
    readFavoriteProfiles,
    readGeneratedProfiles,
    recordGeneratedProfile,
    updateFavoriteProfile
  }, Symbol.toStringTag, { value: "Module" }));
  const rootScope = globalThis;
  rootScope.ChromeTestDataDataRecords = dataRecordsApi;
  return dataRecordsApi;
})();
