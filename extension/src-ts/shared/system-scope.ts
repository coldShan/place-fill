export type HostKind = "local" | "ip" | "domain" | "none";
export type ScopeKind = "system" | "host" | "legacy" | "file";

export interface SystemEnvironment {
  id: string;
  hostname: string;
  port: string;
  query: Record<string, string>;
  lastPath: string;
  autoAdded: boolean;
  createdAt: number;
}

export interface SystemAnomaly {
  titleSystemId: string;
  /** origin + pathname only; never a full query string. */
  url: string;
  at: number;
}

export interface SystemProfile {
  id: string;
  name: string;
  titles: string[];
  environments: SystemEnvironment[];
  anomalies: SystemAnomaly[];
  createdAt: number;
  updatedAt: number;
}

export interface PageInfo {
  protocol: string;
  hostname: string;
  port: string;
  query: Record<string, string>;
  lastPath: string;
  title: string;
  origin: string;
  pathname: string;
}

export interface SessionMarker {
  id: string;
  name: string;
  manual: boolean;
}

export type ScopeDecision =
  | { action: "use"; systemId: string; anomaly: null | { hostSystemId: string; titleSystemId: string } }
  | { action: "auto-add"; systemId: string }
  | { action: "create" }
  | { action: "fallback" };

export const GENERIC_TITLES: readonly string[] = ["vite app", "react app", "vue app", "document", "untitled"];

const SCOPE_PREFIXES = ["system:", "host:", "legacy:", "file:"] as const;
const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"];

function normalizeHostname(hostname: string): string {
  return String(hostname || "").trim().toLowerCase();
}

export function classifyHost(hostname: string): HostKind {
  const host = normalizeHostname(hostname);
  if (!host) {
    return "none";
  }
  if (LOCAL_HOSTNAMES.indexOf(host) !== -1 || host.endsWith(".localhost")) {
    return "local";
  }
  if (IPV4_PATTERN.test(host) || host.indexOf(":") !== -1) {
    return "ip";
  }
  return "domain";
}

export function encodeHostname(hostname: string): string {
  const host = normalizeHostname(hostname);
  if (host.indexOf(":") === -1 && host.charAt(0) !== "[") {
    return host;
  }
  const bare = host.replace(/^\[/, "").replace(/\]$/, "");
  return "v6-" + bare.replace(/:/g, "-");
}

export function getFallbackScope(info: Pick<PageInfo, "protocol" | "hostname" | "port">): string {
  const kind = classifyHost(info.hostname);
  if (kind === "none") {
    return "file:";
  }
  const encoded = encodeHostname(info.hostname);
  if (kind === "local" && info.port) {
    return "host:" + encoded + ":" + info.port;
  }
  return "host:" + encoded;
}

export function buildSystemScope(id: string): string {
  return "system:" + id;
}

export function parseScopeKey(scope: string): { kind: ScopeKind; value: string } | null {
  const text = String(scope || "");
  for (const prefix of SCOPE_PREFIXES) {
    if (text.startsWith(prefix)) {
      return { kind: prefix.slice(0, -1) as ScopeKind, value: text.slice(prefix.length) };
    }
  }
  return null;
}

export function isLegacyScopeKey(scope: string): boolean {
  const text = String(scope || "");
  return text !== "" && parseScopeKey(text) === null;
}

export function isGenericTitle(title: string): boolean {
  const normalized = String(title || "").trim().toLowerCase();
  return normalized === "" || GENERIC_TITLES.indexOf(normalized) !== -1;
}

function usableKeywords(system: SystemProfile): string[] {
  return (system.titles || [])
    .map(function (item) {
      return String(item || "").trim();
    })
    .filter(function (item) {
      return !isGenericTitle(item);
    });
}

export function titleMatchesSystem(system: SystemProfile, title: string): string {
  if (isGenericTitle(title)) {
    return "";
  }
  const normalizedTitle = String(title).trim().toLowerCase();
  let best = "";
  for (const keyword of usableKeywords(system)) {
    if (normalizedTitle.indexOf(keyword.toLowerCase()) !== -1 && keyword.length > best.length) {
      best = keyword;
    }
  }
  return best;
}

export function readPageInfo(
  loc: { protocol: string; hostname: string; port: string; search: string; pathname: string; origin: string },
  title: string
): PageInfo {
  const query: Record<string, string> = {};
  new URLSearchParams(loc.search || "").forEach(function (value, key) {
    query[key] = value;
  });
  const segments = String(loc.pathname || "")
    .split("/")
    .filter(Boolean);
  return {
    protocol: loc.protocol,
    hostname: normalizeHostname(loc.hostname),
    port: loc.port || "",
    query,
    lastPath: segments.length ? (segments[segments.length - 1] as string) : "",
    title: String(title || ""),
    origin: loc.origin,
    pathname: loc.pathname
  };
}

export function normalizeSessionMarker(raw: unknown): SessionMarker | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return null;
  }
  return {
    id,
    name: typeof record.name === "string" ? record.name : "",
    manual: record.manual === true
  };
}

function environmentMatches(environment: SystemEnvironment, info: PageInfo): boolean {
  if (encodeHostname(environment.hostname) !== encodeHostname(info.hostname)) {
    return false;
  }
  if ((environment.port || "") !== (info.port || "")) {
    return false;
  }
  const required = environment.query || {};
  for (const key of Object.keys(required)) {
    if (info.query[key] !== required[key]) {
      return false;
    }
  }
  return !environment.lastPath || environment.lastPath === info.lastPath;
}

function environmentConditionCount(environment: SystemEnvironment): number {
  return 1 + Object.keys(environment.query || {}).length + (environment.lastPath ? 1 : 0);
}

function hasHostPort(system: SystemProfile, info: PageInfo): boolean {
  return system.environments.some(function (environment) {
    return (
      encodeHostname(environment.hostname) === encodeHostname(info.hostname) &&
      (environment.port || "") === (info.port || "")
    );
  });
}

function findBestTitleMatch(systems: SystemProfile[], title: string): SystemProfile | null {
  let best: SystemProfile | null = null;
  let bestLength = 0;
  for (const candidate of systems) {
    const keyword = titleMatchesSystem(candidate, title);
    if (keyword.length > bestLength) {
      best = candidate;
      bestLength = keyword.length;
    }
  }
  return best;
}

function findLocalEnvironmentMatch(systems: SystemProfile[], info: PageInfo): SystemProfile | null {
  let best: SystemProfile | null = null;
  let bestScore = -1;
  let bestKeywordLength = -1;
  for (const candidate of systems) {
    const keyword = titleMatchesSystem(candidate, info.title);
    if (usableKeywords(candidate).length > 0 && !keyword) {
      continue;
    }
    for (const environment of candidate.environments) {
      if (!environmentMatches(environment, info)) {
        continue;
      }
      const score = environmentConditionCount(environment) + (keyword ? 1 : 0);
      if (score > bestScore || (score === bestScore && keyword.length > bestKeywordLength)) {
        best = candidate;
        bestScore = score;
        bestKeywordLength = keyword.length;
      }
    }
  }
  return best;
}

function isMarkerStillValid(system: SystemProfile, info: PageInfo): boolean {
  if (isGenericTitle(info.title)) {
    return true;
  }
  if (usableKeywords(system).length > 0) {
    return titleMatchesSystem(system, info.title) !== "";
  }
  return hasHostPort(system, info);
}

export function decideScope(input: {
  systems: SystemProfile[];
  info: PageInfo;
  marker: SessionMarker | null;
  fallbackEnabled: boolean;
}): ScopeDecision {
  const { systems, info, marker, fallbackEnabled } = input;
  const hostKind = classifyHost(info.hostname);
  if (hostKind === "none") {
    return { action: "fallback" };
  }
  const isLocal = hostKind === "local";

  if (marker) {
    const markerSystem = systems.find(function (item) {
      return item.id === marker.id;
    });
    if (markerSystem && (marker.manual || !isLocal || isMarkerStillValid(markerSystem, info))) {
      return { action: "use", systemId: markerSystem.id, anomaly: null };
    }
  }

  if (!isLocal) {
    const encodedHost = encodeHostname(info.hostname);
    const hostSystem = systems.find(function (item) {
      return item.environments.some(function (environment) {
        return encodeHostname(environment.hostname) === encodedHost;
      });
    });
    const titleSystem = findBestTitleMatch(systems, info.title);
    if (hostSystem) {
      const anomaly =
        titleSystem && titleSystem.id !== hostSystem.id && !titleMatchesSystem(hostSystem, info.title)
          ? { hostSystemId: hostSystem.id, titleSystemId: titleSystem.id }
          : null;
      return { action: "use", systemId: hostSystem.id, anomaly };
    }
    if (titleSystem) {
      return fallbackEnabled ? { action: "auto-add", systemId: titleSystem.id } : { action: "fallback" };
    }
    return fallbackEnabled ? { action: "create" } : { action: "fallback" };
  }

  const matched = findLocalEnvironmentMatch(systems, info);
  if (matched) {
    return { action: "use", systemId: matched.id, anomaly: null };
  }
  const titleSystem = findBestTitleMatch(systems, info.title);
  if (titleSystem) {
    return fallbackEnabled ? { action: "auto-add", systemId: titleSystem.id } : { action: "fallback" };
  }
  if (!String(info.title || "").trim()) {
    return { action: "fallback" };
  }
  return fallbackEnabled ? { action: "create" } : { action: "fallback" };
}
