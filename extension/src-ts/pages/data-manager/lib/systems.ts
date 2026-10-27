import { generateId } from "../../../shared/system-registry";
import {
  FILE_SCOPE,
  getFallbackScope,
  isGenericTitle,
  type SystemEnvironment,
  type SystemProfile
} from "../../../shared/system-scope";
import { formatScopeLabel } from "./scope-label";
import { tokenizeQuery } from "./record-search";

export type SystemStatus = "enabled" | "disabled" | "anomaly";

export const SYSTEM_STATUS_LABELS: Record<SystemStatus, string> = {
  enabled: "启用",
  disabled: "已停用",
  anomaly: "异常"
};

export type QueryRow = { key: string; value: string };

export type EnvironmentDraft = {
  /** Empty for rows added in the editor; a real id is assigned when the system is built. */
  id: string;
  hostname: string;
  port: string;
  lastPath: string;
  query: QueryRow[];
  autoAdded: boolean;
  createdAt: number;
};

export type SystemDraft = {
  name: string;
  titles: string[];
  environments: EnvironmentDraft[];
};

export type DeleteTarget = { scope: string; label: string };

const HOSTNAME_PATTERN = /^(?:\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/;
const PORT_PATTERN = /^\d{1,5}$/;

/** Anomalies take precedence; otherwise the status comes from the system scope's site toggle. */
export function getSystemStatus(system: SystemProfile, enabledMap: Record<string, boolean>): SystemStatus {
  if (system.anomalies.length > 0) return "anomaly";
  return enabledMap["system:" + system.id] === true ? "enabled" : "disabled";
}

export function formatEnvironmentHost(environment: Pick<SystemEnvironment, "hostname" | "port">): string {
  return environment.hostname + (environment.port ? ":" + environment.port : "");
}

export function matchesSystemQuery(system: SystemProfile, query: string): boolean {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) return true;
  const haystack = [system.name]
    .concat(system.titles)
    .concat(
      system.environments.map(function (environment) {
        return formatEnvironmentHost(environment);
      })
    )
    .join("\n")
    .toLowerCase();
  return tokens.every(function (token) {
    return haystack.includes(token);
  });
}

/** Counts annotation keys (`system:<id>::<frame>::<fingerprint>`) per system id. */
export function countAnnotationsBySystem(overrides: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return counts;
  const prefix = "system:";
  Object.keys(overrides).forEach(function (key) {
    if (!key.startsWith(prefix)) return;
    const end = key.indexOf("::");
    if (end <= prefix.length) return;
    const id = key.slice(prefix.length, end);
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

/** Scopes a deleted system's data can fall back to: one per distinct environment, in order. */
export function getDeleteTargets(system: SystemProfile): DeleteTarget[] {
  const scopes: string[] = [];
  system.environments.forEach(function (environment) {
    const scope = getFallbackScope({ protocol: "https:", hostname: environment.hostname, port: environment.port });
    if (!scopes.includes(scope)) scopes.push(scope);
  });
  if (!scopes.length) scopes.push(FILE_SCOPE);
  return scopes.map(function (scope) {
    return { scope, label: formatScopeLabel(scope, []) };
  });
}

function createEnvironmentDraft(environment: SystemEnvironment | null): EnvironmentDraft {
  return {
    id: environment ? environment.id : "",
    hostname: environment ? environment.hostname : "",
    port: environment ? environment.port : "",
    lastPath: environment ? environment.lastPath : "",
    query: environment
      ? Object.keys(environment.query).map(function (key) {
          return { key, value: environment.query[key] || "" };
        })
      : [],
    autoAdded: environment ? environment.autoAdded : false,
    createdAt: environment ? environment.createdAt : 0
  };
}

export function createBlankEnvironmentDraft(): EnvironmentDraft {
  return createEnvironmentDraft(null);
}

export function createSystemDraft(system: SystemProfile | null): SystemDraft {
  if (!system) return { name: "", titles: [], environments: [createEnvironmentDraft(null)] };
  return {
    name: system.name,
    titles: system.titles.slice(),
    environments: system.environments.map(createEnvironmentDraft)
  };
}

function cleanTitles(titles: string[]): string[] {
  const result: string[] = [];
  titles.forEach(function (title) {
    const value = title.trim();
    if (value && !result.includes(value)) result.push(value);
  });
  return result;
}

function cleanLastPath(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function cleanQuery(rows: QueryRow[]): QueryRow[] {
  return rows
    .map(function (row) {
      return { key: row.key.trim(), value: row.value.trim() };
    })
    .filter(function (row) {
      return row.key !== "" || row.value !== "";
    });
}

/** Returns an error message for the first problem found, or an empty string when the draft is valid. */
export function validateSystemDraft(draft: SystemDraft): string {
  if (!draft.name.trim()) return "请填写系统名称";
  const generic = cleanTitles(draft.titles).find(isGenericTitle);
  if (generic) return "「" + generic + "」属于通用标题，不能作为标题关键词";
  if (!draft.environments.length) return "至少需要一条环境记录";
  for (let index = 0; index < draft.environments.length; index += 1) {
    const environment = draft.environments[index] as EnvironmentDraft;
    const label = "环境 " + (index + 1);
    const hostname = environment.hostname.trim().toLowerCase();
    if (!hostname) return label + " 的 hostname 不能为空";
    if (!HOSTNAME_PATTERN.test(hostname)) return label + " 的 hostname 无效，请只填写主机名，例如 test.example.com";
    const port = environment.port.trim();
    if (port && !PORT_PATTERN.test(port)) return label + " 的端口必须是数字";
    if (cleanLastPath(environment.lastPath).includes("/")) return label + " 的末端 path 只需填写最后一段";
    const seen = new Set<string>();
    for (const row of cleanQuery(environment.query)) {
      if (!row.key) return label + " 的标识参数缺少参数名";
      if (seen.has(row.key)) return label + " 的参数名「" + row.key + "」重复";
      seen.add(row.key);
    }
  }
  return "";
}

type BuildOptions = { createId?: () => string; now?: () => number };

/** Turns a validated draft into a profile; identity fields come from `existing` when editing. */
export function buildSystemFromDraft(
  draft: SystemDraft,
  existing: SystemProfile | null,
  options: BuildOptions = {}
): SystemProfile {
  const createId = options.createId || generateId;
  const now = (options.now || Date.now)();
  return {
    id: existing ? existing.id : createId(),
    name: draft.name.trim(),
    titles: cleanTitles(draft.titles),
    environments: draft.environments.map(function (environment) {
      const query: Record<string, string> = {};
      cleanQuery(environment.query).forEach(function (row) {
        query[row.key] = row.value;
      });
      const isNew = !environment.id;
      return {
        id: isNew ? createId() : environment.id,
        hostname: environment.hostname.trim().toLowerCase(),
        port: environment.port.trim(),
        query,
        lastPath: cleanLastPath(environment.lastPath),
        autoAdded: isNew ? false : environment.autoAdded,
        createdAt: isNew ? now : environment.createdAt
      };
    }),
    anomalies: existing ? existing.anomalies : [],
    createdAt: existing ? existing.createdAt : now,
    updatedAt: existing ? existing.updatedAt : now
  };
}

function canonicalDraft(draft: SystemDraft): string {
  return JSON.stringify({
    name: draft.name.trim(),
    titles: cleanTitles(draft.titles),
    environments: draft.environments.map(function (environment) {
      return {
        id: environment.id,
        hostname: environment.hostname.trim().toLowerCase(),
        port: environment.port.trim(),
        lastPath: cleanLastPath(environment.lastPath),
        query: cleanQuery(environment.query)
      };
    })
  });
}

export function isSameSystemDraft(left: SystemDraft, right: SystemDraft): boolean {
  return canonicalDraft(left) === canonicalDraft(right);
}
