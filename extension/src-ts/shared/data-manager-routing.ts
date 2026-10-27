import { normalizeScopeKey } from "./data-records";

export const DATA_MANAGER_PAGE_PATH = "data-manager.html";
export const DATA_MANAGER_VIEWS = ["favorites", "history", "systems"] as const;

export type DataManagerView = (typeof DATA_MANAGER_VIEWS)[number];

export function normalizeDataManagerView(value: string | null | undefined): DataManagerView {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "history" || normalized === "systems") return normalized;
  return "favorites";
}

function normalizeSystemId(value: string | null | undefined): string {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-z0-9-]+$/.test(normalized) ? normalized : "";
}

export function parseDataManagerPageLocation(
  search: string | URLSearchParams
): { scope: string; view: DataManagerView; systemId: string } {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    scope: normalizeScopeKey(params.get("scope") || ""),
    view: normalizeDataManagerView(params.get("view")),
    systemId: normalizeSystemId(params.get("system"))
  };
}

export function buildDataManagerPageUrl(baseUrl: string, scope: string, view?: string, systemId?: string): string {
  const url = new URL(DATA_MANAGER_PAGE_PATH, baseUrl);
  const normalizedScope = normalizeScopeKey(scope);
  const normalizedView = normalizeDataManagerView(view);
  const normalizedSystemId = normalizeSystemId(systemId);
  if (normalizedScope) {
    url.searchParams.set("scope", normalizedScope);
  } else {
    url.searchParams.delete("scope");
  }
  url.searchParams.set("view", normalizedView);
  if (normalizedSystemId) url.searchParams.set("system", normalizedSystemId);
  return url.toString();
}
