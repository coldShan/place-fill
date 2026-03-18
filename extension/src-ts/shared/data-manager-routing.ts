import { normalizeScopeKey } from "./data-records";

export const DATA_MANAGER_PAGE_PATH = "data-manager.html";

export function buildDataManagerPageUrl(baseUrl: string, scope: string): string {
  const url = new URL(DATA_MANAGER_PAGE_PATH, baseUrl);
  const normalizedScope = normalizeScopeKey(scope);
  if (normalizedScope) {
    url.searchParams.set("scope", normalizedScope);
  }
  return url.toString();
}
