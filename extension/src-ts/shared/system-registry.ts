import { moveScopeRecords } from "./data-records";
import {
  buildSystemScope,
  classifyHost,
  decideScope,
  encodeHostname,
  getFallbackScope,
  isGenericTitle,
  parseScopeKey,
  type PageInfo,
  type SessionMarker,
  type SystemAnomaly,
  type SystemEnvironment,
  type SystemProfile
} from "./system-scope";

export const SYSTEM_PROFILES_STORAGE_KEY = "ctdp.systemProfiles.v1";
export const SITE_FEATURE_STORAGE_KEY = "ctdp.siteFeatureEnabled.v1";

const OVERRIDES_STORAGE_KEY = "ctdp.smartFillOverrides.v1";
const AI_MAPPINGS_STORAGE_KEY = "ctdp.aiFieldMappings.v1";
const MAX_ANOMALIES = 20;

interface StorageAreaLike {
  get(keys: string[] | string, callback: (result: Record<string, unknown>) => void): void;
  set(value: Record<string, unknown>, callback?: () => void): void;
}

export interface RegistryEnv {
  storageArea?: StorageAreaLike | null;
  now?: () => number;
  createId?: () => string;
}

export interface ScopeResolution {
  scope: string;
  fallbackScope: string;
  system: { id: string; name: string } | null;
  marker: SessionMarker | null;
}

function getStorageArea(env?: RegistryEnv): StorageAreaLike | null {
  if (env && Object.prototype.hasOwnProperty.call(env, "storageArea")) return env.storageArea || null;
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (_error) {}
  return null;
}

function readStorageValue(env: RegistryEnv | undefined, key: string): Promise<unknown> {
  const storageArea = getStorageArea(env);
  if (!storageArea) return Promise.resolve(undefined);
  return new Promise(function (resolve) {
    storageArea.get([key], function (result) {
      resolve(result ? result[key] : undefined);
    });
  });
}

function writeStorageValue(env: RegistryEnv | undefined, key: string, value: unknown): Promise<void> {
  const storageArea = getStorageArea(env);
  if (!storageArea) return Promise.resolve();
  return new Promise(function (resolve) {
    storageArea.set({ [key]: value }, function () {
      resolve();
    });
  });
}

function currentTime(env?: RegistryEnv): number {
  return env && typeof env.now === "function" ? env.now() : Date.now();
}

function generateId(env?: RegistryEnv): string {
  if (env && typeof env.createId === "function") return env.createId();
  let raw = "";
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") raw = crypto.randomUUID();
  } catch (_error) {}
  if (!raw) raw = Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeEnvironment(raw: unknown): SystemEnvironment | null {
  const record = asRecord(raw);
  const hostname = text(record.hostname).trim().toLowerCase();
  if (!hostname) return null;
  const query: Record<string, string> = {};
  Object.entries(asRecord(record.query)).forEach(function ([key, value]) {
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

function normalizeAnomaly(raw: unknown): SystemAnomaly | null {
  const record = asRecord(raw);
  const titleSystemId = text(record.titleSystemId);
  const url = text(record.url);
  if (!titleSystemId || !url) return null;
  return { titleSystemId, url, at: Number(record.at) || 0 };
}

function normalizeSystem(raw: unknown): SystemProfile | null {
  const record = asRecord(raw);
  const id = text(record.id).trim();
  if (!id) return null;
  const environments = (Array.isArray(record.environments) ? record.environments : [])
    .map(normalizeEnvironment)
    .filter(function (item): item is SystemEnvironment {
      return item !== null;
    });
  const anomalies = (Array.isArray(record.anomalies) ? record.anomalies : [])
    .map(normalizeAnomaly)
    .filter(function (item): item is SystemAnomaly {
      return item !== null;
    });
  return {
    id,
    name: text(record.name),
    titles: (Array.isArray(record.titles) ? record.titles : []).filter(function (item): item is string {
      return typeof item === "string";
    }),
    environments,
    anomalies,
    createdAt: Number(record.createdAt) || 0,
    updatedAt: Number(record.updatedAt) || 0
  };
}

export async function readSystems(env?: RegistryEnv): Promise<SystemProfile[]> {
  const stored = await readStorageValue(env, SYSTEM_PROFILES_STORAGE_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.map(normalizeSystem).filter(function (item): item is SystemProfile {
    return item !== null;
  });
}

export async function writeSystems(systems: SystemProfile[], env?: RegistryEnv): Promise<void> {
  await writeStorageValue(env, SYSTEM_PROFILES_STORAGE_KEY, systems);
}

export function validateSystems(systems: SystemProfile[]): { ok: true } | { ok: false; message: string } {
  const owners = new Map<string, SystemProfile>();
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

export async function saveSystem(system: SystemProfile, env?: RegistryEnv): Promise<{ ok: boolean; message?: string }> {
  const systems = await readSystems(env);
  const index = systems.findIndex(function (item) {
    return item.id === system.id;
  });
  const others = systems.filter(function (item) {
    return item.id !== system.id;
  });
  // The saved system is validated last so a conflict names the system that already owns the host.
  const verdict = validateSystems(others.concat([system]));
  if (!verdict.ok) return { ok: false, message: verdict.message };

  const next = { ...system, updatedAt: currentTime(env) };
  if (index === -1) systems.push(next);
  else systems[index] = next;
  await writeSystems(systems, env);
  return { ok: true };
}

function recordHasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

async function moveKeyPrefix(
  storageKey: string,
  fromScope: string,
  toScope: string,
  env?: RegistryEnv
): Promise<void> {
  const stored = asRecord(await readStorageValue(env, storageKey));
  const fromPrefix = fromScope + "::";
  const toPrefix = toScope + "::";
  const next: Record<string, unknown> = {};
  const moved: Record<string, unknown> = {};
  let changed = false;
  Object.keys(stored).forEach(function (key) {
    if (key.startsWith(fromPrefix)) {
      moved[toPrefix + key.slice(fromPrefix.length)] = stored[key];
      changed = true;
    } else {
      next[key] = stored[key];
    }
  });
  if (!changed) return;
  Object.keys(moved).forEach(function (key) {
    if (!recordHasOwn(next, key)) next[key] = moved[key];
  });
  await writeStorageValue(env, storageKey, next);
}

async function moveToggle(fromScope: string, toScope: string, env?: RegistryEnv): Promise<void> {
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  if (!recordHasOwn(stored, fromScope)) return;
  const next = { ...stored };
  if (!recordHasOwn(next, toScope)) next[toScope] = stored[fromScope];
  delete next[fromScope];
  await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, next);
}

export async function moveScopeData(fromScope: string, toScope: string, env?: RegistryEnv): Promise<void> {
  if (!fromScope || !toScope || fromScope === toScope) return;
  await moveScopeRecords(fromScope, toScope, env);
  await moveKeyPrefix(OVERRIDES_STORAGE_KEY, fromScope, toScope, env);
  await moveKeyPrefix(AI_MAPPINGS_STORAGE_KEY, fromScope, toScope, env);
  await moveToggle(fromScope, toScope, env);
}

export async function deleteSystem(id: string, targetScope: string, env?: RegistryEnv): Promise<void> {
  await moveScopeData(buildSystemScope(id), targetScope, env);
  const systems = await readSystems(env);
  await writeSystems(
    systems.filter(function (item) {
      return item.id !== id;
    }),
    env
  );
}

/** Returns the legacy local-host key (`legacy:<hostname>`) for a `host:<local host>[:port]` scope. */
function legacyKeyForFallbackScope(scope: string): string {
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

export async function readScopeEnabled(scope: string, env?: RegistryEnv): Promise<boolean> {
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  if (recordHasOwn(stored, scope)) return stored[scope] === true;
  const legacyKey = legacyKeyForFallbackScope(scope);
  return legacyKey ? stored[legacyKey] === true : false;
}

export async function writeScopeEnabled(scope: string, enabled: boolean, env?: RegistryEnv): Promise<void> {
  const stored = asRecord(await readStorageValue(env, SITE_FEATURE_STORAGE_KEY));
  await writeStorageValue(env, SITE_FEATURE_STORAGE_KEY, { ...stored, [scope]: enabled });
}

function buildEnvironment(info: PageInfo, autoAdded: boolean, env?: RegistryEnv): SystemEnvironment {
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

function withMarker(system: SystemProfile, input: SessionMarker | null): SessionMarker {
  return { id: system.id, name: system.name, manual: !!input && input.manual === true && input.id === system.id };
}

function resolved(system: SystemProfile, fallbackScope: string, marker: SessionMarker | null): ScopeResolution {
  return {
    scope: buildSystemScope(system.id),
    fallbackScope,
    system: { id: system.id, name: system.name },
    marker: withMarker(system, marker)
  };
}

export async function resolvePageScope(
  input: { info: PageInfo; marker: SessionMarker | null },
  env?: RegistryEnv
): Promise<ScopeResolution> {
  const { info, marker } = input;
  const fallbackScope = getFallbackScope(info);
  const fallbackEnabled = await readScopeEnabled(fallbackScope, env);
  const systems = await readSystems(env);
  const decision = decideScope({ systems, info, marker, fallbackEnabled });

  if (decision.action === "fallback") {
    return { scope: fallbackScope, fallbackScope, system: null, marker: null };
  }

  if (decision.action === "use") {
    const target = systems.find(function (item) {
      return item.id === decision.systemId;
    }) as SystemProfile;
    if (decision.anomaly) {
      const hostSystem = systems.find(function (item) {
        return item.id === decision.anomaly!.hostSystemId;
      });
      if (hostSystem) {
        const url = info.origin + info.pathname;
        const titleSystemId = decision.anomaly.titleSystemId;
        const exists = hostSystem.anomalies.some(function (item) {
          return item.url === url && item.titleSystemId === titleSystemId;
        });
        if (!exists) {
          hostSystem.anomalies = hostSystem.anomalies
            .concat([{ titleSystemId, url, at: currentTime(env) }])
            .slice(-MAX_ANOMALIES);
          await writeSystems(systems, env);
        }
      }
    }
    return resolved(target, fallbackScope, marker);
  }

  if (decision.action === "auto-add") {
    const target = systems.find(function (item) {
      return item.id === decision.systemId;
    }) as SystemProfile;
    target.environments = target.environments.concat([buildEnvironment(info, true, env)]);
    target.updatedAt = currentTime(env);
    await writeSystems(systems, env);
    return resolved(target, fallbackScope, marker);
  }

  const title = String(info.title || "").trim();
  const generic = isGenericTitle(title);
  const now = currentTime(env);
  const created: SystemProfile = {
    id: generateId(env),
    name: generic ? fallbackScope.replace(/^host:/, "") : title,
    titles: generic ? [] : [title],
    environments: [buildEnvironment(info, false, env)],
    anomalies: [],
    createdAt: now,
    updatedAt: now
  };
  await writeSystems(systems.concat([created]), env);
  await moveScopeData(fallbackScope, buildSystemScope(created.id), env);
  return resolved(created, fallbackScope, marker);
}

export async function dismissAnomalies(systemId: string, env?: RegistryEnv): Promise<void> {
  const systems = await readSystems(env);
  const target = systems.find(function (item) {
    return item.id === systemId;
  });
  if (!target || !target.anomalies.length) return;
  target.anomalies = [];
  await writeSystems(systems, env);
}
