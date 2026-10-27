import {
  FAVORITE_PROFILES_STORAGE_KEY,
  GENERATED_PROFILES_STORAGE_KEY,
  moveScopeRecords,
  normalizeScopeKey
} from "./data-records";
import {
  SITE_FEATURE_STORAGE_KEY,
  asRecord,
  readStorageValue,
  recordHasOwn,
  writeStorageValue,
  type RegistryEnv
} from "./system-registry";
import { classifyHost, getFallbackScope, isLegacyScopeKey, parseScopeKey } from "./system-scope";

const OVERRIDES_STORAGE_KEY = "ctdp.smartFillOverrides.v1";
const AI_MAPPINGS_STORAGE_KEY = "ctdp.aiFieldMappings.v1";

interface MigrationCandidate {
  value: unknown;
  existing: boolean;
  pathless: boolean;
  originalKey: string;
}

/** Maps a legacy hostname key (favorites, history, feature switches) to its fallback scope. */
function hostnameToScope(rawHostname: string): string {
  const hostname = rawHostname.trim().toLowerCase();
  if (classifyHost(hostname) === "local") return "legacy:" + hostname;
  return getFallbackScope({ protocol: "", hostname, port: "" });
}

/** Maps a legacy annotation key (`origin[/path]::frame::fingerprint`) to its fallback-scope key. */
function migrateAnnotationKey(key: string): { newKey: string; pathless: boolean } | null {
  if (parseScopeKey(key) !== null) return null;
  const separator = key.indexOf("::");
  if (separator <= 0) return null;
  const pageScope = key.slice(0, separator);
  if (pageScope.indexOf("://") === -1) return null;
  let url: URL;
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

function shouldReplace(
  challenger: MigrationCandidate,
  incumbent: MigrationCandidate,
  compareValue: (challenger: unknown, incumbent: unknown) => number
): boolean {
  const order = compareValue(challenger.value, incumbent.value);
  if (order !== 0) return order > 0;
  if (incumbent.existing !== challenger.existing) return challenger.existing;
  if (incumbent.pathless !== challenger.pathless) return challenger.pathless;
  // Deterministic regardless of storage order: plain code-unit comparison of the original keys.
  return challenger.originalKey < incumbent.originalKey;
}

function timestampOf(value: unknown): number {
  const updatedAt = asRecord(value).updatedAt;
  const parsed = typeof updatedAt === "string" ? Date.parse(updatedAt) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

async function migrateAnnotationMap(
  storageKey: string,
  compareValue: (challenger: unknown, incumbent: unknown) => number,
  env?: RegistryEnv
): Promise<boolean> {
  const stored = asRecord(await readStorageValue(env, storageKey));
  const kept: Record<string, MigrationCandidate> = {};
  const migrated: { newKey: string; candidate: MigrationCandidate }[] = [];

  Object.keys(stored).forEach(function (key) {
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

  migrated.forEach(function (item) {
    const incumbent = recordHasOwn(kept, item.newKey) ? kept[item.newKey] : undefined;
    if (!incumbent || shouldReplace(item.candidate, incumbent, compareValue)) kept[item.newKey] = item.candidate;
  });

  const next: Record<string, unknown> = {};
  Object.keys(kept).forEach(function (key) {
    next[key] = (kept[key] as MigrationCandidate).value;
  });
  await writeStorageValue(env, storageKey, next);
  return true;
}

async function migrateFeatureToggles(env?: RegistryEnv): Promise<boolean> {
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  const legacyKeys = Object.keys(stored).filter(isLegacyScopeKey);
  if (!legacyKeys.length) return false;

  const next: Record<string, unknown> = {};
  Object.keys(stored).forEach(function (key) {
    if (!isLegacyScopeKey(key)) next[key] = stored[key];
  });
  legacyKeys.forEach(function (key) {
    const scope = hostnameToScope(key);
    if (!recordHasOwn(next, scope)) next[scope] = stored[key];
  });
  await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
  return true;
}

async function collectLegacyRecordKeys(env?: RegistryEnv): Promise<string[]> {
  const keys: string[] = [];
  for (const storageKey of [FAVORITE_PROFILES_STORAGE_KEY, GENERATED_PROFILES_STORAGE_KEY]) {
    const stored = asRecord(await readStorageValue(env, storageKey));
    Object.keys(stored).forEach(function (key) {
      const normalized = normalizeScopeKey(key);
      if (normalized && isLegacyScopeKey(normalized) && keys.indexOf(normalized) === -1) keys.push(normalized);
    });
  }
  return keys;
}

async function migrateRecords(env?: RegistryEnv): Promise<boolean> {
  let changed = false;
  for (const legacyKey of await collectLegacyRecordKeys(env)) {
    const scope = hostnameToScope(legacyKey);
    // Scopes the records helpers cannot store (for example `legacy:[::1]`) are left untouched.
    if (!normalizeScopeKey(scope)) continue;
    await moveScopeRecords(legacyKey, scope, env);
    changed = true;
  }
  return changed;
}

/**
 * Cheap check whether a (changed) storage value still holds keys the migration would rewrite, so
 * storage.onChanged only queues the migration for legacy-shaped writes.
 */
export function hasLegacyScopeData(storageKey: string, value: unknown): boolean {
  const keys = Object.keys(asRecord(value));
  if (storageKey === FAVORITE_PROFILES_STORAGE_KEY || storageKey === GENERATED_PROFILES_STORAGE_KEY) {
    return keys.some(function (key) {
      const normalized = normalizeScopeKey(key);
      return !!normalized && isLegacyScopeKey(normalized);
    });
  }
  if (storageKey === SITE_FEATURE_STORAGE_KEY) return keys.some(isLegacyScopeKey);
  if (storageKey === OVERRIDES_STORAGE_KEY || storageKey === AI_MAPPINGS_STORAGE_KEY) {
    return keys.some(function (key) {
      return migrateAnnotationKey(key) !== null;
    });
  }
  return false;
}

/**
 * One-shot, idempotent migration of URL-keyed data to scope keys. Only legacy keys are touched and
 * they are merged into any existing new-format key; when nothing is legacy no write happens.
 */
export async function migrateLegacyScopes(env?: RegistryEnv): Promise<{ changed: boolean }> {
  const recordsChanged = await migrateRecords(env);
  const togglesChanged = await migrateFeatureToggles(env);
  const overridesChanged = await migrateAnnotationMap(OVERRIDES_STORAGE_KEY, () => 0, env);
  const mappingsChanged = await migrateAnnotationMap(
    AI_MAPPINGS_STORAGE_KEY,
    function (challenger, incumbent) {
      return timestampOf(challenger) - timestampOf(incumbent);
    },
    env
  );
  return { changed: recordsChanged || togglesChanged || overridesChanged || mappingsChanged };
}
