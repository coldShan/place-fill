import { FIELD_KEYS, formatProfileForCopy, normalizeProfile, type ProfileFieldMap } from "./field-meta";

export type ScopeKey = string;

export interface HistoryEntry {
  id: string;
  createdAt: string;
  profile: ProfileFieldMap;
}

export interface FavoriteEntry {
  id: string;
  name: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  profile: ProfileFieldMap;
}

interface ChromeStorageAreaLike {
  get(keys: string[] | string, callback: (result: Record<string, unknown>) => void): void;
  set(value: Record<string, unknown>, callback?: () => void): void;
}

export interface DataRecordsEnv {
  now?: () => number;
  random?: () => number;
  storageArea?: ChromeStorageAreaLike | null;
}

export const GENERATED_PROFILES_STORAGE_KEY = "ctdp.generatedProfiles.v1";
export const FAVORITE_PROFILES_STORAGE_KEY = "ctdp.favoriteProfiles.v1";
export const MAX_GENERATED_RECORDS = 30;

function getStorageArea(env?: DataRecordsEnv): ChromeStorageAreaLike | null {
  if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (_error) {}
  return null;
}

function readStorageValue(storageArea: ChromeStorageAreaLike | null, key: string): Promise<unknown> {
  if (!storageArea) return Promise.resolve(undefined);
  return new Promise(function (resolve) {
    storageArea.get([key], function (result) {
      resolve(result ? result[key] : undefined);
    });
  });
}

function writeStorageValue(storageArea: ChromeStorageAreaLike | null, key: string, value: unknown): Promise<void> {
  if (!storageArea) return Promise.resolve();
  return new Promise(function (resolve) {
    storageArea.set({ [key]: value }, function () {
      resolve();
    });
  });
}

function normalizeTimestamp(value: unknown): string {
  const raw = String(value || "").trim();
  return /^\d+$/.test(raw) ? raw : "0";
}

function normalizeId(value: unknown): string {
  const raw = String(value || "").trim();
  return raw || "record-0";
}

function createId(now: number, random: () => number): string {
  return String(now) + "-" + Math.floor(random() * 1e6).toString(36);
}

function createUniqueId(now: number, random: () => number, usedIds: Set<string>): string {
  const baseId = createId(now, random);
  let id = baseId;
  for (let suffix = 1; usedIds.has(id); suffix += 1) id = baseId + "-" + suffix;
  usedIds.add(id);
  return id;
}

function collectIds(entries: { id: string }[]): Set<string> {
  return new Set(entries.map(function (entry) {
    return entry.id;
  }));
}

export function normalizeScopeKey(value: string): ScopeKey {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("://")) return "";
  if (/[/?#]/.test(normalized)) return "";
  if (!/^[a-z0-9.\-:]+$/i.test(normalized)) return "";
  return normalized;
}

function normalizeGeneratedProfilesMap(rawValue: unknown): Record<ScopeKey, HistoryEntry[]> {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};

  const nextMap: Record<ScopeKey, HistoryEntry[]> = {};

  Object.entries(rawValue).forEach(function ([scope, entries]) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !Array.isArray(entries)) return;

    nextMap[normalizedScope] = entries
      .filter(function (entry) {
        return !!entry && typeof entry === "object" && !Array.isArray(entry);
      })
      .map(function (entry) {
        const current = entry as Record<string, unknown>;
        return {
          createdAt: normalizeTimestamp(current.createdAt),
          id: normalizeId(current.id),
          profile: normalizeProfile(current.profile as Partial<Record<string, unknown>>)
        };
      })
      .sort(function (left, right) {
        return Number(right.createdAt) - Number(left.createdAt);
      })
      .slice(0, MAX_GENERATED_RECORDS);
  });

  return nextMap;
}

function normalizeFavoriteProfilesMap(rawValue: unknown): Record<ScopeKey, FavoriteEntry[]> {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};

  const nextMap: Record<ScopeKey, FavoriteEntry[]> = {};

  Object.entries(rawValue).forEach(function ([scope, entries]) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !Array.isArray(entries)) return;

    nextMap[normalizedScope] = entries
      .filter(function (entry) {
        return !!entry && typeof entry === "object" && !Array.isArray(entry);
      })
      .map(function (entry) {
        const current = entry as Record<string, unknown>;
        const createdAt = normalizeTimestamp(current.createdAt);
        const updatedAt = normalizeTimestamp(current.updatedAt || current.createdAt);
        return {
          createdAt,
          id: normalizeId(current.id),
          name: String(current.name || "").trim() || "常用数据",
          note: String(current.note || "").trim(),
          profile: normalizeProfile(current.profile as Partial<Record<string, unknown>>),
          updatedAt
        };
      });
  });

  return nextMap;
}

export function isSameProfile(left: ProfileFieldMap, right: ProfileFieldMap): boolean {
  return FIELD_KEYS.every(function (fieldKey) {
    return left[fieldKey] === right[fieldKey];
  });
}

async function readGeneratedProfilesMap(env?: DataRecordsEnv): Promise<Record<ScopeKey, HistoryEntry[]>> {
  return normalizeGeneratedProfilesMap(await readStorageValue(getStorageArea(env), GENERATED_PROFILES_STORAGE_KEY));
}

async function writeGeneratedProfilesMap(nextMap: Record<ScopeKey, HistoryEntry[]>, env?: DataRecordsEnv): Promise<void> {
  await writeStorageValue(getStorageArea(env), GENERATED_PROFILES_STORAGE_KEY, nextMap);
}

async function readFavoriteProfilesMap(env?: DataRecordsEnv): Promise<Record<ScopeKey, FavoriteEntry[]>> {
  return normalizeFavoriteProfilesMap(await readStorageValue(getStorageArea(env), FAVORITE_PROFILES_STORAGE_KEY));
}

async function writeFavoriteProfilesMap(nextMap: Record<ScopeKey, FavoriteEntry[]>, env?: DataRecordsEnv): Promise<void> {
  await writeStorageValue(getStorageArea(env), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
}

export async function listKnownScopes(env?: DataRecordsEnv): Promise<ScopeKey[]> {
  const generatedMap = await readGeneratedProfilesMap(env);
  const favoriteMap = await readFavoriteProfilesMap(env);
  return Array.from(new Set(Object.keys(generatedMap).concat(Object.keys(favoriteMap)))).sort();
}

export async function readGeneratedProfiles(scope: string, env?: DataRecordsEnv): Promise<HistoryEntry[]> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const records = await readGeneratedProfilesMap(env);
  return records[normalizedScope] ? records[normalizedScope].slice() : [];
}

export async function recordGeneratedProfile(scope: string, profile: Partial<Record<string, unknown>>, env?: DataRecordsEnv): Promise<HistoryEntry[]> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];

  const now = env && typeof env.now === "function" ? env.now() : Date.now();
  const random = env && typeof env.random === "function" ? env.random : Math.random;
  const nextEntry: HistoryEntry = {
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

export async function readFavoriteProfiles(scope: string, env?: DataRecordsEnv): Promise<FavoriteEntry[]> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const favoritesMap = await readFavoriteProfilesMap(env);
  return favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
}

export async function reorderFavoriteProfiles(
  scope: string,
  orderedIds: string[],
  env?: DataRecordsEnv
): Promise<FavoriteEntry[]> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];

  const favoritesMap = await readFavoriteProfilesMap(env);
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const entriesById = new Map(currentEntries.map(function (entry) {
    return [entry.id, entry];
  }));
  const nextEntries: FavoriteEntry[] = [];

  orderedIds.forEach(function (id) {
    const entry = entriesById.get(id);
    if (!entry) return;
    nextEntries.push(entry);
    entriesById.delete(id);
  });
  favoritesMap[normalizedScope] = nextEntries.concat(Array.from(entriesById.values()));
  await writeFavoriteProfilesMap(favoritesMap, env);
  return favoritesMap[normalizedScope].slice();
}

export async function findFavoriteProfile(
  scope: string,
  profile: Partial<Record<string, unknown>>,
  env?: DataRecordsEnv
): Promise<FavoriteEntry | null> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return null;
  const normalizedProfile = normalizeProfile(profile);
  const favoritesMap = await readFavoriteProfilesMap(env);
  return (favoritesMap[normalizedScope] || []).find(function (entry) {
    return isSameProfile(entry.profile, normalizedProfile);
  }) || null;
}

export async function hasFavoriteProfile(
  scope: string,
  profile: Partial<Record<string, unknown>>,
  env?: DataRecordsEnv
): Promise<boolean> {
  return !!(await findFavoriteProfile(scope, profile, env));
}

export async function createFavoriteProfile(
  scope: string,
  input: { name?: string; note?: string; profile: Partial<Record<string, unknown>> },
  env?: DataRecordsEnv
): Promise<FavoriteEntry> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) {
    throw new Error("Invalid scope");
  }

  const normalizedProfile = normalizeProfile(input.profile);
  const favoritesMap = await readFavoriteProfilesMap(env);
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const existingFavorite = currentEntries.find(function (entry) {
    return isSameProfile(entry.profile, normalizedProfile);
  });
  if (existingFavorite) return existingFavorite;

  const now = env && typeof env.now === "function" ? env.now() : Date.now();
  const random = env && typeof env.random === "function" ? env.random : Math.random;
  const entry: FavoriteEntry = {
    createdAt: String(now),
    id: createId(now, random),
    name: String(input.name || "").trim() || "常用数据",
    note: String(input.note || "").trim(),
    profile: normalizedProfile,
    updatedAt: String(now)
  };

  favoritesMap[normalizedScope] = [entry].concat(currentEntries);
  await writeFavoriteProfilesMap(favoritesMap, env);
  return entry;
}

export async function updateFavoriteProfile(
  scope: string,
  id: string,
  input: { name?: string; note?: string; profile: Partial<Record<string, unknown>> },
  env?: DataRecordsEnv
): Promise<FavoriteEntry | null> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !id) return null;

  const now = env && typeof env.now === "function" ? env.now() : Date.now();
  const favoritesMap = await readFavoriteProfilesMap(env);
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const entryIndex = currentEntries.findIndex(function (entry) {
    return entry.id === id;
  });
  if (entryIndex === -1) return null;

  const currentEntry = currentEntries[entryIndex];
  if (!currentEntry) return null;
  const nextEntry: FavoriteEntry = {
    createdAt: currentEntry.createdAt,
    id: currentEntry.id,
    name: String(input.name || "").trim() || currentEntry.name,
    note: Object.prototype.hasOwnProperty.call(input, "note") ? String(input.note || "").trim() : currentEntry.note,
    profile: normalizeProfile(input.profile),
    updatedAt: String(now)
  };

  currentEntries[entryIndex] = nextEntry;
  favoritesMap[normalizedScope] = currentEntries;
  await writeFavoriteProfilesMap(favoritesMap, env);
  return nextEntry;
}

export async function deleteFavoriteProfile(scope: string, id: string, env?: DataRecordsEnv): Promise<boolean> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !id) return false;

  const favoritesMap = await readFavoriteProfilesMap(env);
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const nextEntries = currentEntries.filter(function (entry) {
    return entry.id !== id;
  });
  if (nextEntries.length === currentEntries.length) return false;

  favoritesMap[normalizedScope] = nextEntries;
  await writeFavoriteProfilesMap(favoritesMap, env);
  return true;
}

export async function createFavoriteFromHistory(
  scope: string,
  historyId: string,
  name = "",
  env?: DataRecordsEnv
): Promise<FavoriteEntry | null> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !historyId) return null;

  const records = await readGeneratedProfiles(normalizedScope, env);
  const historyEntry = records.find(function (entry) {
    return entry.id === historyId;
  });
  if (!historyEntry) return null;

  return createFavoriteProfile(normalizedScope, { name, profile: historyEntry.profile }, env);
}

export interface ScopeSummary {
  scope: ScopeKey;
  favorites: number;
  history: number;
}

export async function listScopeSummaries(env?: DataRecordsEnv): Promise<ScopeSummary[]> {
  const generatedMap = await readGeneratedProfilesMap(env);
  const favoriteMap = await readFavoriteProfilesMap(env);
  return Array.from(new Set(Object.keys(generatedMap).concat(Object.keys(favoriteMap))))
    .sort()
    .map(function (scope) {
      return {
        favorites: (favoriteMap[scope] || []).length,
        history: (generatedMap[scope] || []).length,
        scope
      };
    });
}

export type CopyFavoriteResult = { scope: ScopeKey; status: "created" | "duplicate" };

export async function copyFavoriteToScopes(
  scope: string,
  favoriteId: string,
  targetScopes: string[],
  env?: DataRecordsEnv
): Promise<CopyFavoriteResult[] | null> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !favoriteId) return null;

  const favoritesMap = await readFavoriteProfilesMap(env);
  const source = (favoritesMap[normalizedScope] || []).find(function (entry) {
    return entry.id === favoriteId;
  });
  if (!source) return null;

  const targets = Array.from(new Set(targetScopes.map(normalizeScopeKey))).filter(function (target) {
    return !!target && target !== normalizedScope;
  });
  const now = env && typeof env.now === "function" ? env.now() : Date.now();
  const random = env && typeof env.random === "function" ? env.random : Math.random;
  const results: CopyFavoriteResult[] = targets.map(function (target) {
    const currentEntries = favoritesMap[target] ? favoritesMap[target].slice() : [];
    const exists = currentEntries.some(function (entry) {
      return isSameProfile(entry.profile, source.profile);
    });
    if (exists) return { scope: target, status: "duplicate" };
    const copied: FavoriteEntry = {
      createdAt: String(now),
      id: createUniqueId(now, random, collectIds(currentEntries)),
      name: source.name,
      note: source.note,
      profile: normalizeProfile(source.profile),
      updatedAt: String(now)
    };
    favoritesMap[target] = [copied].concat(currentEntries);
    return { scope: target, status: "created" };
  });

  if (results.some(function (result) { return result.status === "created"; })) {
    await writeFavoriteProfilesMap(favoritesMap, env);
  }
  return results;
}

/**
 * Moves every favorite and history entry from `fromScope` into `toScope`, then removes `fromScope`.
 * Favorites are deduplicated by profile (target entries win); history is merged newest first
 * and truncated to MAX_GENERATED_RECORDS.
 */
export async function moveScopeRecords(fromScope: string, toScope: string, env?: DataRecordsEnv): Promise<void> {
  const from = normalizeScopeKey(fromScope);
  const to = normalizeScopeKey(toScope);
  if (!from || !to || from === to) return;

  const now = env && typeof env.now === "function" ? env.now() : Date.now();
  const random = env && typeof env.random === "function" ? env.random : Math.random;

  const favoritesMap = await readFavoriteProfilesMap(env);
  if (Object.prototype.hasOwnProperty.call(favoritesMap, from)) {
    const merged = (favoritesMap[to] || []).slice();
    const usedIds = collectIds(merged);
    (favoritesMap[from] || []).forEach(function (entry) {
      const exists = merged.some(function (current) {
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
    (generatedMap[from] || []).forEach(function (entry) {
      merged.push(usedIds.has(entry.id) ? { ...entry, id: createUniqueId(now, random, usedIds) } : entry);
      usedIds.add(entry.id);
    });
    generatedMap[to] = merged
      .sort(function (left, right) {
        return Number(right.createdAt) - Number(left.createdAt);
      })
      .slice(0, MAX_GENERATED_RECORDS);
    delete generatedMap[from];
    await writeGeneratedProfilesMap(generatedMap, env);
  }
}

export { FIELD_KEYS, formatProfileForCopy, normalizeProfile, type ProfileFieldMap };

export async function importFavoriteProfiles(
  scope: string,
  inputs: { name?: string; note?: string; profile: Partial<Record<string, unknown>> }[],
  env?: DataRecordsEnv
): Promise<{ created: FavoriteEntry[]; skipped: number }> {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) throw new Error("Invalid scope");

  const favoritesMap = await readFavoriteProfilesMap(env);
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const now = env && typeof env.now === "function" ? env.now() : Date.now();
  const random = env && typeof env.random === "function" ? env.random : Math.random;
  const created: FavoriteEntry[] = [];
  const usedIds = collectIds(currentEntries);
  let skipped = 0;

  inputs.forEach(function (input) {
    const profile = normalizeProfile(input.profile);
    const exists = currentEntries.concat(created).some(function (entry) {
      return isSameProfile(entry.profile, profile);
    });
    if (exists) {
      skipped += 1;
      return;
    }
    created.push({
      createdAt: String(now),
      id: createUniqueId(now, random, usedIds),
      name: String(input.name || "").trim() || "常用数据",
      note: String(input.note || "").trim(),
      profile,
      updatedAt: String(now)
    });
  });

  if (created.length) {
    favoritesMap[normalizedScope] = currentEntries.concat(created);
    await writeFavoriteProfilesMap(favoritesMap, env);
  }
  return { created, skipped };
}
