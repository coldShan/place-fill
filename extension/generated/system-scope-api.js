var ChromeTestDataSystemScopeBundle = (function() {
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
    { key: "address", label: "地址" },
    { key: "postalCode", label: "邮政编码" }
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
  const GENERATED_PROFILES_STORAGE_KEY = "ctdp.generatedProfiles.v1";
  const FAVORITE_PROFILES_STORAGE_KEY = "ctdp.favoriteProfiles.v1";
  const MAX_GENERATED_RECORDS = 30;
  function getStorageArea$1(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_error) {
    }
    return null;
  }
  function readStorageValue$1(storageArea, key) {
    if (!storageArea) return Promise.resolve(void 0);
    return new Promise(function(resolve) {
      storageArea.get([key], function(result) {
        resolve(result ? result[key] : void 0);
      });
    });
  }
  function writeStorageValue$1(storageArea, key, value) {
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
  function createUniqueId(now, random, usedIds) {
    const baseId = createId(now, random);
    let id = baseId;
    for (let suffix = 1; usedIds.has(id); suffix += 1) id = baseId + "-" + suffix;
    usedIds.add(id);
    return id;
  }
  function collectIds(entries) {
    return new Set(entries.map(function(entry) {
      return entry.id;
    }));
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
          note: String(current.note || "").trim(),
          profile: normalizeProfile(current.profile),
          updatedAt
        };
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
    return normalizeGeneratedProfilesMap(await readStorageValue$1(getStorageArea$1(env), GENERATED_PROFILES_STORAGE_KEY));
  }
  async function writeGeneratedProfilesMap(nextMap, env) {
    await writeStorageValue$1(getStorageArea$1(env), GENERATED_PROFILES_STORAGE_KEY, nextMap);
  }
  async function readFavoriteProfilesMap(env) {
    return normalizeFavoriteProfilesMap(await readStorageValue$1(getStorageArea$1(env), FAVORITE_PROFILES_STORAGE_KEY));
  }
  async function writeFavoriteProfilesMap(nextMap, env) {
    await writeStorageValue$1(getStorageArea$1(env), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
  }
  async function moveScopeRecords(fromScope, toScope, env) {
    const from = normalizeScopeKey(fromScope);
    const to = normalizeScopeKey(toScope);
    if (!from || !to || from === to) return;
    const now = env && typeof env.now === "function" ? env.now() : Date.now();
    const random = env && typeof env.random === "function" ? env.random : Math.random;
    const favoritesMap = await readFavoriteProfilesMap(env);
    if (Object.prototype.hasOwnProperty.call(favoritesMap, from)) {
      const merged = (favoritesMap[to] || []).slice();
      const usedIds = collectIds(merged);
      (favoritesMap[from] || []).forEach(function(entry) {
        const exists = merged.some(function(current) {
          return isSameProfile(current.profile, entry.profile);
        });
        if (exists) return;
        merged.push(usedIds.has(entry.id) ? { ...entry, id: createUniqueId(now, random, usedIds) } : entry);
        usedIds.add(entry.id);
      });
      favoritesMap[to] = merged;
      delete favoritesMap[from];
      await writeFavoriteProfilesMap(favoritesMap, env);
    }
    const generatedMap = await readGeneratedProfilesMap(env);
    if (Object.prototype.hasOwnProperty.call(generatedMap, from)) {
      const merged = (generatedMap[to] || []).slice();
      const usedIds = collectIds(merged);
      (generatedMap[from] || []).forEach(function(entry) {
        merged.push(usedIds.has(entry.id) ? { ...entry, id: createUniqueId(now, random, usedIds) } : entry);
        usedIds.add(entry.id);
      });
      generatedMap[to] = merged.sort(function(left, right) {
        return Number(right.createdAt) - Number(left.createdAt);
      }).slice(0, MAX_GENERATED_RECORDS);
      delete generatedMap[from];
      await writeGeneratedProfilesMap(generatedMap, env);
    }
  }
  const GENERIC_TITLES = ["vite app", "react app", "vue app", "document", "untitled"];
  const FILE_SCOPE = "file:local";
  const SCOPE_PREFIXES = ["system:", "host:", "legacy:", "file:"];
  const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
  const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"];
  function normalizeHostname(hostname) {
    return String(hostname || "").trim().toLowerCase();
  }
  function classifyHost(hostname) {
    const host = normalizeHostname(hostname);
    if (!host) {
      return "none";
    }
    if (LOCAL_HOSTNAMES.indexOf(host) !== -1 || host.endsWith(".localhost")) {
      return "local";
    }
    if (IPV4_PATTERN.test(host) || host.indexOf(":") !== -1) {
      return "ip";
    }
    return "domain";
  }
  function encodeHostname(hostname) {
    const host = normalizeHostname(hostname);
    if (host.indexOf(":") === -1 && host.charAt(0) !== "[") {
      return host;
    }
    const bare = host.replace(/^\[/, "").replace(/\]$/, "");
    return "v6-" + bare.replace(/:/g, "-");
  }
  function getFallbackScope(info) {
    const kind = classifyHost(info.hostname);
    if (kind === "none") {
      return FILE_SCOPE;
    }
    const encoded = encodeHostname(info.hostname);
    if (kind === "local" && info.port) {
      return "host:" + encoded + ":" + info.port;
    }
    return "host:" + encoded;
  }
  function buildSystemScope(id) {
    return "system:" + id;
  }
  function parseScopeKey(scope) {
    const text2 = String(scope || "");
    if (text2.startsWith("file://")) return null;
    for (const prefix of SCOPE_PREFIXES) {
      if (text2.startsWith(prefix)) {
        return { kind: prefix.slice(0, -1), value: text2.slice(prefix.length) };
      }
    }
    return null;
  }
  function isLegacyScopeKey(scope) {
    const text2 = String(scope || "");
    return text2 !== "" && parseScopeKey(text2) === null;
  }
  function isGenericTitle(title) {
    const normalized = String(title || "").trim().toLowerCase();
    return normalized === "" || GENERIC_TITLES.indexOf(normalized) !== -1;
  }
  const TITLE_SEPARATOR_PATTERN = /\s+-\s+|\s*[|_—–]\s*/;
  function stableTitleSegment(title) {
    const segments = String(title || "").split(TITLE_SEPARATOR_PATTERN);
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const segment = String(segments[index] || "").trim();
      if (!isGenericTitle(segment)) return segment;
    }
    return "";
  }
  function usableKeywords(system) {
    return (system.titles || []).map(function(item) {
      return String(item || "").trim();
    }).filter(function(item) {
      return !isGenericTitle(item);
    });
  }
  function titleMatchesSystem(system, title) {
    if (isGenericTitle(title)) {
      return "";
    }
    const normalizedTitle = String(title).trim().toLowerCase();
    let best = "";
    for (const keyword of usableKeywords(system)) {
      if (normalizedTitle.indexOf(keyword.toLowerCase()) !== -1 && keyword.length > best.length) {
        best = keyword;
      }
    }
    return best;
  }
  function readPageInfo(loc, title) {
    const query = {};
    new URLSearchParams(loc.search || "").forEach(function(value, key) {
      query[key] = value;
    });
    const segments = String(loc.pathname || "").split("/").filter(Boolean);
    return {
      protocol: loc.protocol,
      hostname: normalizeHostname(loc.hostname),
      port: loc.port || "",
      query,
      lastPath: segments.length ? segments[segments.length - 1] : "",
      title: String(title || ""),
      origin: loc.origin,
      pathname: loc.pathname
    };
  }
  function normalizeSessionMarker(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const record = raw;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id) {
      return null;
    }
    return {
      id,
      name: typeof record.name === "string" ? record.name : "",
      manual: record.manual === true
    };
  }
  function environmentMatches(environment, info) {
    if (encodeHostname(environment.hostname) !== encodeHostname(info.hostname)) {
      return false;
    }
    if ((environment.port || "") !== (info.port || "")) {
      return false;
    }
    const required = environment.query || {};
    for (const key of Object.keys(required)) {
      if (info.query[key] !== required[key]) {
        return false;
      }
    }
    return !environment.lastPath || environment.lastPath === info.lastPath;
  }
  function environmentConditionCount(environment) {
    return 1 + Object.keys(environment.query || {}).length + (environment.lastPath ? 1 : 0);
  }
  function hasHostPort(system, info) {
    return system.environments.some(function(environment) {
      return encodeHostname(environment.hostname) === encodeHostname(info.hostname) && (environment.port || "") === (info.port || "");
    });
  }
  function findBestTitleMatch(systems, title) {
    let best = null;
    let bestLength = 0;
    for (const candidate of systems) {
      const keyword = titleMatchesSystem(candidate, title);
      if (keyword.length > bestLength) {
        best = candidate;
        bestLength = keyword.length;
      }
    }
    return best;
  }
  function findLocalEnvironmentMatch(systems, info) {
    let best = null;
    let bestScore = -1;
    let bestKeywordLength = -1;
    for (const candidate of systems) {
      const keyword = titleMatchesSystem(candidate, info.title);
      if (usableKeywords(candidate).length > 0 ? !keyword : !isGenericTitle(info.title)) {
        continue;
      }
      for (const environment of candidate.environments) {
        if (!environmentMatches(environment, info)) {
          continue;
        }
        const score = environmentConditionCount(environment) + (keyword ? 1 : 0);
        if (score > bestScore || score === bestScore && keyword.length > bestKeywordLength) {
          best = candidate;
          bestScore = score;
          bestKeywordLength = keyword.length;
        }
      }
    }
    return best;
  }
  function isMarkerStillValid(system, systems, info) {
    if (isGenericTitle(info.title)) {
      return true;
    }
    if (titleMatchesSystem(system, info.title) !== "") {
      return true;
    }
    const otherSystemMatches = systems.some(function(candidate) {
      return candidate.id !== system.id && titleMatchesSystem(candidate, info.title) !== "";
    });
    return !otherSystemMatches && hasHostPort(system, info);
  }
  function decideScope(input) {
    const { systems, info, marker, fallbackEnabled } = input;
    const hostKind = classifyHost(info.hostname);
    if (hostKind === "none") {
      return { action: "fallback" };
    }
    const isLocal = hostKind === "local";
    if (marker) {
      const markerSystem = systems.find(function(item) {
        return item.id === marker.id;
      });
      if (markerSystem && (marker.manual || !isLocal || isMarkerStillValid(markerSystem, systems, info))) {
        return { action: "use", systemId: markerSystem.id, anomaly: null };
      }
    }
    if (!isLocal) {
      const encodedHost = encodeHostname(info.hostname);
      const hostSystem = systems.find(function(item) {
        return item.environments.some(function(environment) {
          return encodeHostname(environment.hostname) === encodedHost;
        });
      });
      const titleSystem2 = findBestTitleMatch(systems, info.title);
      if (hostSystem) {
        const anomaly = titleSystem2 && titleSystem2.id !== hostSystem.id && !titleMatchesSystem(hostSystem, info.title) ? { hostSystemId: hostSystem.id, titleSystemId: titleSystem2.id } : null;
        return { action: "use", systemId: hostSystem.id, anomaly };
      }
      if (titleSystem2) {
        return fallbackEnabled ? { action: "auto-add", systemId: titleSystem2.id } : { action: "fallback" };
      }
      return fallbackEnabled ? { action: "create" } : { action: "fallback" };
    }
    const matched = findLocalEnvironmentMatch(systems, info);
    if (matched) {
      return { action: "use", systemId: matched.id, anomaly: null };
    }
    const titleSystem = findBestTitleMatch(systems, info.title);
    if (titleSystem) {
      return fallbackEnabled ? { action: "auto-add", systemId: titleSystem.id } : { action: "fallback" };
    }
    if (!String(info.title || "").trim()) {
      return { action: "fallback" };
    }
    return fallbackEnabled ? { action: "create" } : { action: "fallback" };
  }
  const systemScope = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    FILE_SCOPE,
    GENERIC_TITLES,
    buildSystemScope,
    classifyHost,
    decideScope,
    encodeHostname,
    getFallbackScope,
    isGenericTitle,
    isLegacyScopeKey,
    normalizeSessionMarker,
    parseScopeKey,
    readPageInfo,
    stableTitleSegment,
    titleMatchesSystem
  }, Symbol.toStringTag, { value: "Module" }));
  const SYSTEM_PROFILES_STORAGE_KEY = "ctdp.systemProfiles.v1";
  const SITE_FEATURE_STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";
  const OVERRIDES_STORAGE_KEY$1 = "ctdp.smartFillOverrides.v1";
  const AI_MAPPINGS_STORAGE_KEY$1 = "ctdp.aiFieldMappings.v1";
  const MAX_TITLE_TEXT_LENGTH = 200;
  function getStorageArea(env) {
    if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
    } catch (_error) {
    }
    return null;
  }
  function readStorageValue(env, key) {
    const storageArea = getStorageArea(env);
    if (!storageArea) return Promise.resolve(void 0);
    return new Promise(function(resolve) {
      storageArea.get([key], function(result) {
        resolve(result ? result[key] : void 0);
      });
    });
  }
  function writeStorageValue(env, key, value) {
    const storageArea = getStorageArea(env);
    if (!storageArea) return Promise.resolve();
    return new Promise(function(resolve) {
      storageArea.set({ [key]: value }, function() {
        resolve();
      });
    });
  }
  function currentTime(env) {
    return env && typeof env.now === "function" ? env.now() : Date.now();
  }
  function generateId(env) {
    if (env && typeof env.createId === "function") return env.createId();
    let raw = "";
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") raw = crypto.randomUUID();
    } catch (_error) {
    }
    if (!raw) raw = Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
    return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
  }
  function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  function text(value) {
    return typeof value === "string" ? value : "";
  }
  function normalizeEnvironment(raw) {
    const record = asRecord(raw);
    const hostname = text(record.hostname).trim().toLowerCase();
    if (!hostname) return null;
    const query = {};
    Object.entries(asRecord(record.query)).forEach(function([key, value]) {
      if (typeof value === "string") query[key] = value;
    });
    return {
      id: text(record.id),
      hostname,
      port: text(record.port),
      query,
      lastPath: text(record.lastPath),
      autoAdded: record.autoAdded === true,
      createdAt: Number(record.createdAt) || 0
    };
  }
  function normalizeAnomaly(raw) {
    const record = asRecord(raw);
    const titleSystemId = text(record.titleSystemId);
    const url = text(record.url);
    if (!titleSystemId || !url) return null;
    return { titleSystemId, url, at: Number(record.at) || 0 };
  }
  function normalizeSystemProfile(raw) {
    const record = asRecord(raw);
    const id = text(record.id).trim();
    if (!id) return null;
    const environments = (Array.isArray(record.environments) ? record.environments : []).map(normalizeEnvironment).filter(function(item) {
      return item !== null;
    });
    const anomalies = (Array.isArray(record.anomalies) ? record.anomalies : []).map(normalizeAnomaly).filter(function(item) {
      return item !== null;
    });
    return {
      id,
      name: text(record.name),
      titles: (Array.isArray(record.titles) ? record.titles : []).filter(function(item) {
        return typeof item === "string";
      }),
      environments,
      anomalies,
      createdAt: Number(record.createdAt) || 0,
      updatedAt: Number(record.updatedAt) || 0
    };
  }
  async function readSystems(env) {
    const stored = await readStorageValue(env, SYSTEM_PROFILES_STORAGE_KEY);
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeSystemProfile).filter(function(item) {
      return item !== null;
    });
  }
  async function writeSystems(systems, env) {
    await writeStorageValue(env, SYSTEM_PROFILES_STORAGE_KEY, systems);
  }
  function validateSystems(systems) {
    const owners = /* @__PURE__ */ new Map();
    for (const item of systems) {
      for (const environment of item.environments) {
        if (classifyHost(environment.hostname) === "local" || classifyHost(environment.hostname) === "none") continue;
        const encoded = encodeHostname(environment.hostname);
        const owner = owners.get(encoded);
        if (owner && owner.id !== item.id) {
          return { ok: false, message: environment.hostname + " 已属于系统「" + owner.name + "」" };
        }
        if (!owner) owners.set(encoded, item);
      }
    }
    return { ok: true };
  }
  function environmentFallbackScope(environment) {
    return getFallbackScope({ hostname: environment.hostname, port: environment.port });
  }
  async function saveSystem(system, env) {
    const systems = await readSystems(env);
    const index = systems.findIndex(function(item) {
      return item.id === system.id;
    });
    const previousScopes = (index === -1 ? [] : systems[index].environments).map(environmentFallbackScope);
    const others = systems.filter(function(item) {
      return item.id !== system.id;
    });
    const verdict = validateSystems(others.concat([system]));
    if (!verdict.ok) return { ok: false, message: verdict.message };
    const next = { ...system, updatedAt: currentTime(env) };
    if (index === -1) systems.push(next);
    else systems[index] = next;
    await writeSystems(systems, env);
    const adopted = [];
    for (const environment of system.environments) {
      const fallbackScope = environmentFallbackScope(environment);
      if (previousScopes.indexOf(fallbackScope) !== -1 || adopted.indexOf(fallbackScope) !== -1) continue;
      adopted.push(fallbackScope);
      await adoptFallbackScope(fallbackScope, system.id, env);
    }
    return { ok: true };
  }
  function recordHasOwn(record, key) {
    return Object.prototype.hasOwnProperty.call(record, key);
  }
  async function moveKeyPrefix(storageKey, fromScope, toScope, env) {
    const stored = asRecord(await readStorageValue(env, storageKey));
    const fromPrefix = fromScope + "::";
    const toPrefix = toScope + "::";
    const next = {};
    const moved = {};
    let changed = false;
    Object.keys(stored).forEach(function(key) {
      if (key.startsWith(fromPrefix)) {
        moved[toPrefix + key.slice(fromPrefix.length)] = stored[key];
        changed = true;
      } else {
        next[key] = stored[key];
      }
    });
    if (!changed) return;
    Object.keys(moved).forEach(function(key) {
      if (!recordHasOwn(next, key)) next[key] = moved[key];
    });
    await writeStorageValue(env, storageKey, next);
  }
  async function moveToggle(fromScope, toScope, env) {
    const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
    if (!recordHasOwn(stored, fromScope)) return;
    const next = { ...stored };
    if (!recordHasOwn(next, toScope)) next[toScope] = stored[fromScope];
    delete next[fromScope];
    await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
  }
  async function moveScopeData(fromScope, toScope, env) {
    if (!fromScope || !toScope || fromScope === toScope) return;
    await moveScopeRecords(fromScope, toScope, env);
    await moveKeyPrefix(OVERRIDES_STORAGE_KEY$1, fromScope, toScope, env);
    await moveKeyPrefix(AI_MAPPINGS_STORAGE_KEY$1, fromScope, toScope, env);
    await moveToggle(fromScope, toScope, env);
  }
  async function deleteSystem(id, targetScope, env) {
    await moveScopeData(buildSystemScope(id), targetScope, env);
    const systems = await readSystems(env);
    await writeSystems(
      systems.filter(function(item) {
        return item.id !== id;
      }),
      env
    );
  }
  function isLocalFallbackScope(scope) {
    return legacyKeyForFallbackScope(scope) !== "";
  }
  function legacyKeyForFallbackScope(scope) {
    const parsed = parseScopeKey(scope);
    if (!parsed || parsed.kind !== "host") return "";
    const value = parsed.value;
    let hostname = value;
    if (value.startsWith("v6-")) {
      const lastDash = value.lastIndexOf(":");
      const bare = (lastDash === -1 ? value : value.slice(0, lastDash)).slice(3).replace(/-/g, ":");
      hostname = "[" + bare + "]";
    } else {
      const colon = value.indexOf(":");
      if (colon !== -1) hostname = value.slice(0, colon);
    }
    return classifyHost(hostname) === "local" ? "legacy:" + hostname : "";
  }
  async function readScopeEnabled(scope, env) {
    const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
    if (recordHasOwn(stored, scope)) return stored[scope] === true;
    const legacyKey = legacyKeyForFallbackScope(scope);
    return legacyKey ? stored[legacyKey] === true : false;
  }
  async function writeScopeEnabled(scope, enabled, env) {
    const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
    await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, { ...stored, [scope]: enabled });
  }
  async function adoptFallbackScope(fallbackScope, systemId, env) {
    const systemScope2 = buildSystemScope(systemId);
    const enabled = await readScopeEnabled(fallbackScope, env);
    await moveScopeData(fallbackScope, systemScope2, env);
    const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
    const next = { ...stored };
    if (!recordHasOwn(next, systemScope2)) next[systemScope2] = enabled;
    if (isLocalFallbackScope(fallbackScope)) next[fallbackScope] = false;
    await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
  }
  function buildEnvironment(info, autoAdded, env) {
    return {
      id: generateId(env),
      hostname: info.hostname,
      port: info.port,
      query: {},
      lastPath: "",
      autoAdded,
      createdAt: currentTime(env)
    };
  }
  function withMarker(system, input) {
    return { id: system.id, name: system.name, manual: !!input && input.manual === true && input.id === system.id };
  }
  function resolved(system, fallbackScope, marker) {
    return {
      scope: buildSystemScope(system.id),
      fallbackScope,
      system: { id: system.id, name: system.name },
      marker: withMarker(system, marker)
    };
  }
  async function resolvePageScope(input, env) {
    const { info, marker } = input;
    const fallbackScope = getFallbackScope(info);
    const fallbackEnabled = await readScopeEnabled(fallbackScope, env);
    const systems = await readSystems(env);
    const decision = decideScope({ systems, info, marker, fallbackEnabled });
    if (decision.action === "fallback") {
      return { scope: fallbackScope, fallbackScope, system: null, marker: null };
    }
    if (decision.action === "use") {
      const target = systems.find(function(item) {
        return item.id === decision.systemId;
      });
      if (decision.anomaly) {
        const hostSystem = systems.find(function(item) {
          return item.id === decision.anomaly.hostSystemId;
        });
        if (hostSystem) {
          const url = info.origin + info.pathname;
          const titleSystemId = decision.anomaly.titleSystemId;
          const exists = hostSystem.anomalies.some(function(item) {
            return item.url === url && item.titleSystemId === titleSystemId;
          });
          if (!exists) {
            hostSystem.anomalies = hostSystem.anomalies.concat([{ titleSystemId, url, at: currentTime(env) }]).slice(-20);
            await writeSystems(systems, env);
          }
        }
      }
      return resolved(target, fallbackScope, marker);
    }
    if (decision.action === "auto-add") {
      const target = systems.find(function(item) {
        return item.id === decision.systemId;
      });
      target.environments = target.environments.concat([buildEnvironment(info, true, env)]);
      target.updatedAt = currentTime(env);
      await writeSystems(systems, env);
      await adoptFallbackScope(fallbackScope, target.id, env);
      return resolved(target, fallbackScope, marker);
    }
    const keyword = stableTitleSegment(info.title).slice(0, MAX_TITLE_TEXT_LENGTH);
    const generic = isGenericTitle(keyword);
    const now = currentTime(env);
    const created = {
      id: generateId(env),
      name: generic ? fallbackScope.replace(/^host:/, "") : keyword,
      titles: generic ? [] : [keyword],
      environments: [buildEnvironment(info, false, env)],
      anomalies: [],
      createdAt: now,
      updatedAt: now
    };
    await writeSystems(systems.concat([created]), env);
    await adoptFallbackScope(fallbackScope, created.id, env);
    return resolved(created, fallbackScope, marker);
  }
  async function dismissAnomalies(systemId, env) {
    const systems = await readSystems(env);
    const target = systems.find(function(item) {
      return item.id === systemId;
    });
    if (!target || !target.anomalies.length) return;
    target.anomalies = [];
    await writeSystems(systems, env);
  }
  const systemRegistry = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    OVERRIDES_STORAGE_KEY: OVERRIDES_STORAGE_KEY$1,
    SITE_FEATURE_STORAGE_KEY,
    SYSTEM_PROFILES_STORAGE_KEY,
    asRecord,
    deleteSystem,
    dismissAnomalies,
    generateId,
    moveScopeData,
    normalizeSystemProfile,
    readScopeEnabled,
    readStorageValue,
    readSystems,
    recordHasOwn,
    resolvePageScope,
    saveSystem,
    validateSystems,
    writeScopeEnabled,
    writeStorageValue,
    writeSystems
  }, Symbol.toStringTag, { value: "Module" }));
  const OVERRIDES_STORAGE_KEY = "ctdp.smartFillOverrides.v1";
  const AI_MAPPINGS_STORAGE_KEY = "ctdp.aiFieldMappings.v1";
  function hostnameToScope(rawHostname) {
    const hostname = rawHostname.trim().toLowerCase();
    if (classifyHost(hostname) === "local") return "legacy:" + hostname;
    return getFallbackScope({ hostname, port: "" });
  }
  function migrateAnnotationKey(key) {
    if (parseScopeKey(key) !== null) return null;
    const separator = key.indexOf("::");
    if (separator <= 0) return null;
    const pageScope = key.slice(0, separator);
    if (pageScope.indexOf("://") === -1) return null;
    let url;
    try {
      url = new URL(pageScope);
    } catch (_error) {
      return null;
    }
    const scope = getFallbackScope({ protocol: url.protocol, hostname: url.hostname, port: url.port });
    return {
      newKey: scope + key.slice(separator),
      pathless: url.pathname === "" || url.pathname === "/"
    };
  }
  function shouldReplace(challenger, incumbent, compareValue) {
    const order = compareValue(challenger.value, incumbent.value);
    if (order !== 0) return order > 0;
    if (incumbent.existing !== challenger.existing) return challenger.existing;
    if (incumbent.pathless !== challenger.pathless) return challenger.pathless;
    return challenger.originalKey < incumbent.originalKey;
  }
  function timestampOf(value) {
    const updatedAt = asRecord(value).updatedAt;
    const parsed = typeof updatedAt === "string" ? Date.parse(updatedAt) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  }
  async function migrateAnnotationMap(storageKey, compareValue, env) {
    const stored = asRecord(await readStorageValue(env, storageKey));
    const kept = {};
    const migrated = [];
    Object.keys(stored).forEach(function(key) {
      const target = migrateAnnotationKey(key);
      if (!target) {
        kept[key] = { value: stored[key], existing: true, pathless: false, originalKey: key };
      } else {
        migrated.push({
          newKey: target.newKey,
          candidate: { value: stored[key], existing: false, pathless: target.pathless, originalKey: key }
        });
      }
    });
    if (!migrated.length) return false;
    migrated.forEach(function(item) {
      const incumbent = recordHasOwn(kept, item.newKey) ? kept[item.newKey] : void 0;
      if (!incumbent || shouldReplace(item.candidate, incumbent, compareValue)) kept[item.newKey] = item.candidate;
    });
    const next = {};
    Object.keys(kept).forEach(function(key) {
      next[key] = kept[key].value;
    });
    await writeStorageValue(env, storageKey, next);
    return true;
  }
  async function migrateFeatureToggles(env) {
    const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
    const legacyKeys = Object.keys(stored).filter(isLegacyScopeKey);
    if (!legacyKeys.length) return false;
    const next = {};
    Object.keys(stored).forEach(function(key) {
      if (!isLegacyScopeKey(key)) next[key] = stored[key];
    });
    legacyKeys.forEach(function(key) {
      const scope = hostnameToScope(key);
      if (!recordHasOwn(next, scope)) next[scope] = stored[key];
    });
    await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
    return true;
  }
  async function collectLegacyRecordKeys(env) {
    const keys = [];
    for (const storageKey of [FAVORITE_PROFILES_STORAGE_KEY, GENERATED_PROFILES_STORAGE_KEY]) {
      const stored = asRecord(await readStorageValue(env, storageKey));
      Object.keys(stored).forEach(function(key) {
        const normalized = normalizeScopeKey(key);
        if (normalized && isLegacyScopeKey(normalized) && keys.indexOf(normalized) === -1) keys.push(normalized);
      });
    }
    return keys;
  }
  async function migrateRecords(env) {
    let changed = false;
    for (const legacyKey of await collectLegacyRecordKeys(env)) {
      const scope = hostnameToScope(legacyKey);
      if (!normalizeScopeKey(scope)) continue;
      await moveScopeRecords(legacyKey, scope, env);
      changed = true;
    }
    return changed;
  }
  async function migrateLegacyScopes(env) {
    const recordsChanged = await migrateRecords(env);
    const togglesChanged = await migrateFeatureToggles(env);
    const overridesChanged = await migrateAnnotationMap(OVERRIDES_STORAGE_KEY, () => 0, env);
    const mappingsChanged = await migrateAnnotationMap(
      AI_MAPPINGS_STORAGE_KEY,
      function(challenger, incumbent) {
        return timestampOf(challenger) - timestampOf(incumbent);
      },
      env
    );
    return { changed: recordsChanged || togglesChanged || overridesChanged || mappingsChanged };
  }
  const scopeMigration = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    migrateLegacyScopes
  }, Symbol.toStringTag, { value: "Module" }));
  const systemScopeApi = { ...systemScope, ...systemRegistry, ...scopeMigration };
  const rootScope = globalThis;
  rootScope.ChromeTestDataSystemScope = systemScopeApi;
  return systemScopeApi;
})();
