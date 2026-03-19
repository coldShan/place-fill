import { normalizeScopeKey } from "./data-records";

export const DATA_MANAGER_PAGE_PATH = "data-manager.html";
export const DATA_MANAGER_VIEWS = ["favorites", "history"] as const;

export type DataManagerView = (typeof DATA_MANAGER_VIEWS)[number];

export function normalizeDataManagerView(value: string | null | undefined): DataManagerView {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "history" ? "history" : "favorites";
}

export function parseDataManagerPageLocation(search: string | URLSearchParams): { scope: string; view: DataManagerView } {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    scope: normalizeScopeKey(params.get("scope") || ""),
    view: normalizeDataManagerView(params.get("view"))
  };
}

export function buildDataManagerPageUrl(baseUrl: string, scope: string, view?: string): string {
  const url = new URL(DATA_MANAGER_PAGE_PATH, baseUrl);
  const normalizedScope = normalizeScopeKey(scope);
  const normalizedView = normalizeDataManagerView(view);
  if (normalizedScope) {
    url.searchParams.set("scope", normalizedScope);
  } else {
    url.searchParams.delete("scope");
  }
  url.searchParams.set("view", normalizedView);
  return url.toString();
}
