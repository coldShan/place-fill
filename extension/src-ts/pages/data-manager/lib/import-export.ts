import {
  FIELD_KEYS,
  isSameProfile,
  normalizeProfile,
  normalizeScopeKey,
  type FavoriteEntry,
  type ProfileFieldMap
} from "../page-model";

export const EXPORT_FILE_TYPE = "place-fill-data-records";
export const EXPORT_FILE_VERSION = 1;

export type ImportedFavorite = { name: string; note: string; profile: ProfileFieldMap };

export type ImportParseResult =
  | { ok: true; sourceScope: string; favorites: ImportedFavorite[] }
  | { ok: false; error: string };

export function buildExportPayload(scope: string, favorites: FavoriteEntry[], now: Date) {
  return {
    type: EXPORT_FILE_TYPE,
    version: EXPORT_FILE_VERSION,
    scope,
    exportedAt: now.toISOString(),
    favorites: favorites.map(function (entry) {
      return { name: entry.name, note: entry.note, profile: normalizeProfile(entry.profile) };
    })
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function buildExportFileName(scope: string, now: Date): string {
  const stamp = String(now.getFullYear()) + pad2(now.getMonth() + 1) + pad2(now.getDate());
  return "place-fill-" + (scope || "data") + "-favorites-" + stamp + ".json";
}

export function parseImportPayload(text: string): ImportParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(String(text || "").replace(/^﻿/, ""));
  } catch (_error) {
    return { ok: false, error: "文件不是有效的 JSON" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "文件格式不正确，请选择数据管理页导出的文件" };
  }
  const payload = raw as Record<string, unknown>;
  if (payload.type !== EXPORT_FILE_TYPE || !Array.isArray(payload.favorites)) {
    return { ok: false, error: "文件格式不正确，请选择数据管理页导出的文件" };
  }
  const favorites = payload.favorites
    .filter(function (item): item is Record<string, unknown> {
      return !!item && typeof item === "object" && !Array.isArray(item);
    })
    .map(function (item) {
      return {
        name: String(item.name || "").trim(),
        note: String(item.note || "").trim(),
        profile: normalizeProfile(item.profile as Partial<Record<string, unknown>>)
      };
    })
    .filter(function (item) {
      return FIELD_KEYS.some(function (fieldKey) { return item.profile[fieldKey] !== ""; });
    });
  if (!favorites.length) return { ok: false, error: "文件中没有可导入的常用数据" };
  return { ok: true, sourceScope: normalizeScopeKey(String(payload.scope || "")), favorites };
}

export function planImport(existing: FavoriteEntry[], incoming: ImportedFavorite[]): {
  toCreate: ImportedFavorite[];
  duplicates: number;
} {
  const toCreate: ImportedFavorite[] = [];
  let duplicates = 0;
  incoming.forEach(function (item) {
    const seen = existing.some(function (entry) { return isSameProfile(entry.profile, item.profile); })
      || toCreate.some(function (entry) { return isSameProfile(entry.profile, item.profile); });
    if (seen) {
      duplicates += 1;
    } else {
      toCreate.push(item);
    }
  });
  return { toCreate, duplicates };
}
