import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import {
  FAVORITE_PROFILES_STORAGE_KEY,
  GENERATED_PROFILES_STORAGE_KEY,
  readFavoriteProfiles,
  readGeneratedProfiles,
  type FavoriteEntry,
  type HistoryEntry
} from "../page-model";

export type RecordsState = {
  favorites: FavoriteEntry[];
  history: HistoryEntry[];
  loaded: boolean;
};

const FRESH_HIGHLIGHT_MS = 2400;

export function useRecords(scope: string): RecordsState & {
  freshHistoryIds: Set<string>;
  reload: () => Promise<void>;
  setFavorites: (entries: FavoriteEntry[]) => void;
} {
  const [records, setRecords] = useState<RecordsState>({ favorites: [], history: [], loaded: false });
  const [freshHistoryIds, setFreshHistoryIds] = useState<Set<string>>(new Set());
  const knownHistoryIdsRef = useRef<Set<string> | null>(null);
  const freshTimerRef = useRef<number | null>(null);
  const latestRequestRef = useRef(0);

  const reload = useCallback(async function () {
    if (!scope) {
      setRecords({ favorites: [], history: [], loaded: true });
      return;
    }
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const [favorites, history] = await Promise.all([readFavoriteProfiles(scope), readGeneratedProfiles(scope)]);
    if (requestId !== latestRequestRef.current) return;
    const knownIds = knownHistoryIdsRef.current;
    const freshIds = knownIds
      ? history.filter(function (entry) { return !knownIds.has(entry.id); }).map(function (entry) { return entry.id; })
      : [];
    knownHistoryIdsRef.current = new Set(history.map(function (entry) { return entry.id; }));
    setRecords({ favorites, history, loaded: true });
    if (freshIds.length) {
      setFreshHistoryIds(new Set(freshIds));
      if (freshTimerRef.current) window.clearTimeout(freshTimerRef.current);
      freshTimerRef.current = window.setTimeout(function () {
        setFreshHistoryIds(new Set());
        freshTimerRef.current = null;
      }, FRESH_HIGHLIGHT_MS);
    }
  }, [scope]);

  const setFavorites = useCallback(function (entries: FavoriteEntry[]) {
    setRecords(function (current) {
      return { ...current, favorites: entries };
    });
  }, []);

  useEffect(function () {
    void reload();
  }, [reload]);

  useEffect(function () {
    if (!scope || typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) return;
    function handleChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string): void {
      if (areaName !== "local") return;
      if (!changes[FAVORITE_PROFILES_STORAGE_KEY] && !changes[GENERATED_PROFILES_STORAGE_KEY]) return;
      void reload();
    }
    chrome.storage.onChanged.addListener(handleChange);
    return function () {
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, [scope, reload]);

  useEffect(function () {
    return function () {
      if (freshTimerRef.current) window.clearTimeout(freshTimerRef.current);
    };
  }, []);

  return { ...records, freshHistoryIds, reload, setFavorites };
}
