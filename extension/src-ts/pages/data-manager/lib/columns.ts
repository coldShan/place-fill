import type { DataManagerView } from "../../../shared/data-manager-routing";
import { FIELD_KEYS, type ProfileFieldKey } from "../page-model";
import { DISPLAY_FIELD_ORDER } from "./field-groups";

/** Views that render profile field columns; the systems view has fixed columns. */
export type ColumnView = Exclude<DataManagerView, "systems">;

export type ColumnPreferences = Record<ColumnView, ProfileFieldKey[]>;

export const COLUMN_PREFERENCES_STORAGE_KEY = "ctdp.dataManagerColumns.v1";

export const DEFAULT_COLUMNS: ColumnPreferences = {
  favorites: ["fullName", "idNumber", "mobile", "companyName"],
  history: ["fullName", "idNumber", "mobile", "email", "companyName"]
};

const MONOSPACE_FIELDS = new Set<ProfileFieldKey>([
  "creditCode",
  "idNumber",
  "bankCard",
  "account",
  "mobile",
  "landline",
  "postalCode"
]);

export function isMonospaceField(fieldKey: ProfileFieldKey): boolean {
  return MONOSPACE_FIELDS.has(fieldKey);
}

export function sortColumns(columns: readonly string[]): ProfileFieldKey[] {
  return DISPLAY_FIELD_ORDER.filter(function (fieldKey) {
    return columns.includes(fieldKey);
  });
}

export function toggleColumn(columns: ProfileFieldKey[], fieldKey: ProfileFieldKey): ProfileFieldKey[] {
  if (columns.includes(fieldKey)) {
    return columns.length > 1
      ? columns.filter(function (item) { return item !== fieldKey; })
      : columns;
  }
  return sortColumns(columns.concat(fieldKey));
}

export function normalizeColumnPreferences(rawValue: unknown): ColumnPreferences {
  const source = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
    ? rawValue as Record<string, unknown>
    : {};
  function readColumns(view: ColumnView): ProfileFieldKey[] {
    const value = source[view];
    if (!Array.isArray(value)) return DEFAULT_COLUMNS[view].slice();
    const columns = sortColumns(value.filter(function (item): item is string {
      return typeof item === "string" && (FIELD_KEYS as readonly string[]).includes(item);
    }));
    return columns.length ? columns : DEFAULT_COLUMNS[view].slice();
  }
  return { favorites: readColumns("favorites"), history: readColumns("history") };
}
