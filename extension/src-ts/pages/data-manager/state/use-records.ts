import { useCallback, useEffect, useState } from "preact/hooks";
import { readFavoriteProfiles, readGeneratedProfiles, type FavoriteEntry, type HistoryEntry } from "../page-model";

export type RecordsState = {
  favorites: FavoriteEntry[];
  history: HistoryEntry[];
  loaded: boolean;
};

export function useRecords(scope: string): RecordsState & {
  reload: () => Promise<void>;
  setFavorites: (entries: FavoriteEntry[]) => void;
} {
  const [records, setRecords] = useState<RecordsState>({ favorites: [], history: [], loaded: false });

  const reload = useCallback(async function () {
    if (!scope) {
      setRecords({ favorites: [], history: [], loaded: true });
      return;
    }
    const [favorites, history] = await Promise.all([readFavoriteProfiles(scope), readGeneratedProfiles(scope)]);
    setRecords({ favorites, history, loaded: true });
  }, [scope]);

  const setFavorites = useCallback(function (entries: FavoriteEntry[]) {
    setRecords(function (current) {
      return { ...current, favorites: entries };
    });
  }, []);

  useEffect(function () {
    void reload();
  }, [reload]);

  return { ...records, reload, setFavorites };
}
