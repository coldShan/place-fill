import { useCallback, useEffect, useState } from "preact/hooks";
import type { ProfileFieldKey } from "../page-model";
import {
  COLUMN_PREFERENCES_STORAGE_KEY,
  DEFAULT_COLUMNS,
  normalizeColumnPreferences,
  type ColumnPreferences,
  type ColumnView
} from "../lib/columns";

function getStorageArea(): chrome.storage.LocalStorageArea | null {
  try {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
  } catch (_error) {
    return null;
  }
}

export function useColumnPreferences(): {
  columns: ColumnPreferences;
  setViewColumns: (view: ColumnView, columns: ProfileFieldKey[]) => void;
} {
  const [columns, setColumns] = useState<ColumnPreferences>(normalizeColumnPreferences(DEFAULT_COLUMNS));

  useEffect(function () {
    const storageArea = getStorageArea();
    if (!storageArea) return;
    storageArea.get([COLUMN_PREFERENCES_STORAGE_KEY], function (result) {
      setColumns(normalizeColumnPreferences(result ? result[COLUMN_PREFERENCES_STORAGE_KEY] : undefined));
    });
  }, []);

  const setViewColumns = useCallback(function (view: ColumnView, nextColumns: ProfileFieldKey[]) {
    setColumns(function (current) {
      const next = normalizeColumnPreferences({ ...current, [view]: nextColumns });
      getStorageArea()?.set({ [COLUMN_PREFERENCES_STORAGE_KEY]: next });
      return next;
    });
  }, []);

  return { columns, setViewColumns };
}
