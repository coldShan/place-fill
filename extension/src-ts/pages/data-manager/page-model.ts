export {
  copyFavoriteToScopes,
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  FAVORITE_PROFILES_STORAGE_KEY,
  FIELD_KEYS,
  GENERATED_PROFILES_STORAGE_KEY,
  importFavoriteProfiles,
  isSameProfile,
  formatProfileForCopy,
  listKnownScopes,
  listScopeSummaries,
  MAX_GENERATED_RECORDS,
  normalizeProfile,
  normalizeScopeKey,
  readFavoriteProfiles,
  readGeneratedProfiles,
  reorderFavoriteProfiles,
  updateFavoriteProfile,
  type FavoriteEntry,
  type HistoryEntry,
  type ScopeSummary,
  type ProfileFieldMap
} from "../../shared/data-records";

export { FIELD_DEFINITIONS, getFieldLabel, type ProfileFieldKey } from "../../shared/field-meta";
