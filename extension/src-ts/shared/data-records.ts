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
  createdAt: string;
  updatedAt: string;
  profile: ProfileFieldMap;
}

interface ChromeStorageAreaLike {
  get(keys: string[] | string, callback: (result: Record<string, unknown>) => void): void;
  set(value: Record<string, unknown>, callback?: () => void): void;
}

interface DataRecordsEnv {
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
          profile: normalizeProfile(current.profile as Partial<Record<string, unknown>>),
          updatedAt
        };
      })
      .sort(function (left, right) {
        return Number(right.updatedAt) - Number(left.updatedAt);
      });
  });

  return nextMap;
}

function isSameProfile(left: ProfileFieldMap, right: ProfileFieldMap): boolean {
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

export async function createFavoriteProfile(
  scope: string,
  input: { name?: string; profile: Partial<Record<string, unknown>> },
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
  input: { name?: string; profile: Partial<Record<string, unknown>> },
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
    profile: normalizeProfile(input.profile),
    updatedAt: String(now)
  };

  currentEntries.splice(entryIndex, 1);
  favoritesMap[normalizedScope] = [nextEntry].concat(currentEntries);
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

  const recordsMap = await readGeneratedProfilesMap(env);
  const records = recordsMap[normalizedScope] ? recordsMap[normalizedScope].slice() : [];
  const historyEntry = records.find(function (entry) {
    return entry.id === historyId;
  });
  if (!historyEntry) return null;

  recordsMap[normalizedScope] = records.filter(function (entry) {
    return entry.id !== historyId;
  });

  const favorite = await createFavoriteProfile(normalizedScope, { name, profile: historyEntry.profile }, env);
  await writeGeneratedProfilesMap(recordsMap, env);
  return favorite;
}

export { FIELD_KEYS, formatProfileForCopy, normalizeProfile, type ProfileFieldMap };
