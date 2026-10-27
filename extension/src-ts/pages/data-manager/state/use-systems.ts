import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  deleteSystem,
  dismissAnomalies,
  OVERRIDES_STORAGE_KEY,
  readStorageValue,
  readSystems,
  saveSystem,
  SITE_FEATURE_STORAGE_KEY,
  SYSTEM_PROFILES_STORAGE_KEY
} from "../../../shared/system-registry";
import type { SystemProfile } from "../../../shared/system-scope";
import { FAVORITE_PROFILES_STORAGE_KEY, GENERATED_PROFILES_STORAGE_KEY, listScopeSummaries } from "../page-model";
import { countAnnotationsBySystem } from "../lib/systems";

export type SystemStats = { favorites: number; history: number; annotations: number };

export type SystemsState = {
  systems: SystemProfile[];
  enabledMap: Record<string, boolean>;
  stats: Record<string, SystemStats>;
  loaded: boolean;
};

const WATCHED_KEYS = [
  SYSTEM_PROFILES_STORAGE_KEY,
  SITE_FEATURE_STORAGE_KEY,
  OVERRIDES_STORAGE_KEY,
  FAVORITE_PROFILES_STORAGE_KEY,
  GENERATED_PROFILES_STORAGE_KEY
];

function readEnabledMap(value: unknown): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return map;
  Object.entries(value as Record<string, unknown>).forEach(function ([scope, enabled]) {
    if (typeof enabled === "boolean") map[scope] = enabled;
  });
  return map;
}

export function useSystems(): SystemsState & {
  reload: () => Promise<void>;
  save: (system: SystemProfile) => Promise<{ ok: boolean; message?: string }>;
  remove: (id: string, targetScope: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
} {
  const [state, setState] = useState<SystemsState>({ systems: [], enabledMap: {}, stats: {}, loaded: false });
  const latestRequestRef = useRef(0);

  const reload = useCallback(async function () {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const [systems, enabled, overrides, summaries] = await Promise.all([
      readSystems(),
      readStorageValue(undefined, SITE_FEATURE_STORAGE_KEY),
      readStorageValue(undefined, OVERRIDES_STORAGE_KEY),
      listScopeSummaries()
    ]);
    if (requestId !== latestRequestRef.current) return;
    const annotations = countAnnotationsBySystem(overrides);
    const summaryByScope = new Map(summaries.map(function (summary) {
      return [summary.scope, summary];
    }));
    const stats: Record<string, SystemStats> = {};
    systems.forEach(function (system) {
      const summary = summaryByScope.get("system:" + system.id);
      stats[system.id] = {
        favorites: summary ? summary.favorites : 0,
        history: summary ? summary.history : 0,
        annotations: annotations[system.id] || 0
      };
    });
    setState({ systems, enabledMap: readEnabledMap(enabled), stats, loaded: true });
  }, []);

  useEffect(function () {
    void reload();
  }, [reload]);

  useEffect(function () {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) return;
    function handleChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string): void {
      if (areaName !== "local") return;
      if (!WATCHED_KEYS.some(function (key) { return !!changes[key]; })) return;
      void reload();
    }
    chrome.storage.onChanged.addListener(handleChange);
    return function () {
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, [reload]);

  const save = useCallback(async function (system: SystemProfile) {
    const result = await saveSystem(system);
    if (result.ok) await reload();
    return result;
  }, [reload]);

  const remove = useCallback(async function (id: string, targetScope: string) {
    await deleteSystem(id, targetScope);
    await reload();
  }, [reload]);

  const dismiss = useCallback(async function (id: string) {
    await dismissAnomalies(id);
    await reload();
  }, [reload]);

  return { ...state, reload, save, remove, dismiss };
}
