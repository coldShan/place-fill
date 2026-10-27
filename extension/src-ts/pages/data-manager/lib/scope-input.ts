import {
  buildSystemScope,
  classifyHost,
  encodeHostname,
  getFallbackScope,
  parseScopeKey,
  type SystemProfile
} from "../../../shared/system-scope";
import { normalizeScopeKey, type ScopeSummary } from "../page-model";

/**
 * System owning a typed host: non-local hosts by hostname (unique across systems), local hosts by
 * hostname + port. Only an unambiguous owner is used; otherwise the host's fallback scope applies.
 */
function findOwningSystem(systems: SystemProfile[], hostname: string, port: string): SystemProfile | null {
  const local = classifyHost(hostname) === "local";
  const encoded = encodeHostname(hostname);
  const owners = systems.filter(function (system) {
    return system.environments.some(function (environment) {
      return encodeHostname(environment.hostname) === encoded && (!local || (environment.port || "") === port);
    });
  });
  return owners.length === 1 ? (owners[0] as SystemProfile) : null;
}

/**
 * Turns a typed hostname or pasted url into the scope pages on that host resolve to: the owning
 * `system:<id>` when a system covers the host, otherwise the fallback `host:` scope.
 */
export function parseScopeInput(
  input: string,
  currentScope: string,
  systems: SystemProfile[] = []
): { scope: string; error: string } {
  const raw = String(input || "").trim();
  if (!raw) return { scope: "", error: "请输入域名或网址" };
  let url: URL | null = null;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : "http://" + raw);
  } catch (_error) {
    url = null;
  }
  const hostname = url ? normalizeScopeKey(url.hostname) : "";
  if (!url || !hostname || (!hostname.includes(".") && classifyHost(hostname) !== "local")) {
    return { scope: "", error: "请输入有效的域名，例如 test.example.com" };
  }
  const owner = findOwningSystem(systems, hostname, url.port);
  const scope = owner ? buildSystemScope(owner.id) : getFallbackScope({ protocol: url.protocol, hostname, port: url.port });
  if (scope === normalizeScopeKey(currentScope)) return { scope: "", error: "不能复制到当前站点" };
  return { scope, error: "" };
}

const TARGET_KIND_ORDER = ["system", "host", "file"];

function targetKindRank(scope: string): number {
  const rank = TARGET_KIND_ORDER.indexOf(parseScopeKey(scope)?.kind || "host");
  return rank === -1 ? TARGET_KIND_ORDER.length : rank;
}

/**
 * Copy targets: every scope holding data plus every system (even with no data yet), minus the current
 * scope. Legacy groups only hold un-migrated data, so they are sources, never targets.
 */
export function buildCopyTargets(summaries: ScopeSummary[], systems: SystemProfile[], currentScope: string): ScopeSummary[] {
  const byScope = new Map<string, ScopeSummary>();
  summaries.forEach(function (summary) {
    byScope.set(summary.scope, summary);
  });
  systems.forEach(function (system) {
    const scope = buildSystemScope(system.id);
    if (!byScope.has(scope)) byScope.set(scope, { scope, favorites: 0, history: 0 });
  });
  return Array.from(byScope.values())
    .filter(function (summary) {
      return summary.scope !== currentScope && parseScopeKey(summary.scope)?.kind !== "legacy";
    })
    .sort(function (left, right) {
      return targetKindRank(left.scope) - targetKindRank(right.scope);
    });
}

export function summarizeCopyResults(
  results: { scope: string; status: "created" | "duplicate" }[],
  formatLabel: (scope: string) => string = function (scope) { return scope; }
): {
  message: string;
  tone: "success" | "warning";
} {
  const created = results.filter(function (result) { return result.status === "created"; });
  const skipped = results.filter(function (result) { return result.status === "duplicate"; });
  const skippedNames = skipped.length > 2
    ? skipped.slice(0, 2).map(function (result) { return formatLabel(result.scope); }).join("、") + " 等 " + skipped.length + " 个站点"
    : skipped.map(function (result) { return formatLabel(result.scope); }).join("、");
  if (!created.length) {
    return { message: skippedNames + " 已存在相同数据，未重复复制", tone: "warning" };
  }
  const base = "已复制到 " + created.length + " 个站点";
  return skipped.length
    ? { message: base + "；" + skippedNames + " 已存在相同数据，已跳过", tone: "success" }
    : { message: base, tone: "success" };
}
