import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemScope,
  classifyHost,
  decideScope,
  encodeHostname,
  getFallbackScope,
  isGenericTitle,
  isLegacyScopeKey,
  normalizeSessionMarker,
  parseScopeKey,
  readPageInfo,
  stableTitleSegment,
  titleMatchesSystem,
  type PageInfo,
  type SystemEnvironment,
  type SystemProfile
} from "../extension/src-ts/shared/system-scope";

let envCounter = 0;

function env(overrides: Partial<SystemEnvironment> = {}): SystemEnvironment {
  envCounter += 1;
  return {
    id: "env-" + envCounter,
    hostname: "localhost",
    port: "5173",
    query: {},
    lastPath: "",
    autoAdded: false,
    createdAt: 1,
    ...overrides
  };
}

function system(id: string, titles: string[], environments: SystemEnvironment[]): SystemProfile {
  return { id, name: id, titles, environments, anomalies: [], createdAt: 1, updatedAt: 1 };
}

function page(overrides: Partial<PageInfo> = {}): PageInfo {
  return {
    protocol: "http:",
    hostname: "localhost",
    port: "5173",
    query: {},
    lastPath: "",
    title: "",
    origin: "http://localhost:5173",
    pathname: "/",
    ...overrides
  };
}

test("classifyHost distinguishes local, ip, domain and none", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "0.0.0.0", "app.localhost"]) {
    assert.equal(classifyHost(host), "local", host);
  }
  for (const host of ["192.168.1.2", "10.0.0.5", "8.8.8.8", "[2001:db8::1]"]) {
    assert.equal(classifyHost(host), "ip", host);
  }
  assert.equal(classifyHost("test.crm.com"), "domain");
  assert.equal(classifyHost(""), "none");
});

test("encodeHostname lowercases and encodes IPv6", () => {
  assert.equal(encodeHostname("Test.CRM.com"), "test.crm.com");
  assert.equal(encodeHostname("[::1]"), "v6---1");
  assert.equal(encodeHostname("[2001:db8::1]"), "v6-2001-db8--1");
});

test("getFallbackScope follows host kind rules", () => {
  assert.equal(getFallbackScope({ protocol: "http:", hostname: "localhost", port: "5173" }), "host:localhost:5173");
  assert.equal(getFallbackScope({ protocol: "http:", hostname: "localhost", port: "" }), "host:localhost");
  assert.equal(getFallbackScope({ protocol: "http:", hostname: "192.168.1.2", port: "8080" }), "host:192.168.1.2");
  assert.equal(getFallbackScope({ protocol: "https:", hostname: "Test.CRM.com", port: "8443" }), "host:test.crm.com");
  assert.equal(getFallbackScope({ protocol: "file:", hostname: "", port: "" }), "file:local");
  assert.equal(getFallbackScope({ protocol: "http:", hostname: "[::1]", port: "3000" }), "host:v6---1:3000");
});

test("scope key helpers parse and classify keys", () => {
  assert.equal(buildSystemScope("abc"), "system:abc");
  assert.deepEqual(parseScopeKey("system:abc"), { kind: "system", value: "abc" });
  assert.deepEqual(parseScopeKey("host:localhost:5173"), { kind: "host", value: "localhost:5173" });
  assert.deepEqual(parseScopeKey("legacy:example.com"), { kind: "legacy", value: "example.com" });
  assert.deepEqual(parseScopeKey("file:local"), { kind: "file", value: "local" });
  assert.equal(parseScopeKey("file:///Users/x/form.html"), null);
  assert.equal(parseScopeKey("example.com"), null);
  assert.equal(parseScopeKey(""), null);
  assert.equal(isLegacyScopeKey("example.com"), true);
  assert.equal(isLegacyScopeKey("example.com/admin"), true);
  assert.equal(isLegacyScopeKey("host:example.com"), false);
  assert.equal(isLegacyScopeKey("system:abc"), false);
  assert.equal(isLegacyScopeKey("file:local"), false);
  assert.equal(isLegacyScopeKey("file:///Users/x/form.html"), true);
  assert.equal(isLegacyScopeKey(""), false);
});

test("isGenericTitle ignores case, whitespace and blanks", () => {
  assert.equal(isGenericTitle("  vite app "), true);
  assert.equal(isGenericTitle("React App"), true);
  assert.equal(isGenericTitle("Vue App"), true);
  assert.equal(isGenericTitle("DOCUMENT"), true);
  assert.equal(isGenericTitle("Untitled"), true);
  assert.equal(isGenericTitle(""), true);
  assert.equal(isGenericTitle("   "), true);
  assert.equal(isGenericTitle("客户管理"), false);
});

test("titleMatchesSystem returns the matched keyword and ignores generic keywords", () => {
  const crm = system("crm", ["客户管理"], []);
  assert.equal(titleMatchesSystem(crm, "用户列表 - 客户管理"), "客户管理");
  assert.equal(titleMatchesSystem(crm, "办公平台"), "");
  assert.equal(titleMatchesSystem(crm, ""), "");
  const generic = system("g", ["Vite App", ""], []);
  assert.equal(titleMatchesSystem(generic, "Vite App"), "");
  const mixed = system("m", ["Vite App", "ERP"], []);
  assert.equal(titleMatchesSystem(mixed, "my erp console"), "ERP");
  const multi = system("multi", ["管理", "客户管理"], []);
  assert.equal(titleMatchesSystem(multi, "客户管理"), "客户管理");
});

test("stableTitleSegment keeps the last non-generic segment of a route title", () => {
  assert.equal(stableTitleSegment("用户列表 - 客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单列表 | 客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单列表|客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单_客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单 — 客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单—客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单 – 客户管理"), "客户管理");
  assert.equal(stableTitleSegment("订单–客户管理"), "客户管理");
  assert.equal(stableTitleSegment("客户管理 - Vite App"), "客户管理");
  assert.equal(stableTitleSegment("用户列表 - 客户管理 - "), "客户管理");
  // No separator: the whole (trimmed) title; a plain hyphen is not a separator.
  assert.equal(stableTitleSegment("  e-commerce 后台 "), "e-commerce 后台");
  // Only generic or blank segments: nothing usable.
  assert.equal(stableTitleSegment("Document | Vite App"), "");
  assert.equal(stableTitleSegment("   "), "");
});

test("readPageInfo parses query, last path and passes through origin", () => {
  const info = readPageInfo(
    {
      protocol: "https:",
      hostname: "Test.CRM.com",
      port: "",
      search: "?app=crm&token=x",
      pathname: "/a/b/login",
      origin: "https://test.crm.com"
    },
    "登录"
  );
  assert.deepEqual(info.query, { app: "crm", token: "x" });
  assert.equal(info.lastPath, "login");
  assert.equal(info.title, "登录");
  assert.equal(info.origin, "https://test.crm.com");
  assert.equal(info.pathname, "/a/b/login");
  assert.equal(info.hostname, "test.crm.com");
  const root = readPageInfo(
    { protocol: "http:", hostname: "localhost", port: "5173", search: "", pathname: "/", origin: "http://localhost:5173" },
    ""
  );
  assert.equal(root.lastPath, "");
  assert.deepEqual(root.query, {});
});

test("normalizeSessionMarker validates shape", () => {
  assert.deepEqual(normalizeSessionMarker({ id: "a", name: "A" }), { id: "a", name: "A", manual: false });
  assert.deepEqual(normalizeSessionMarker({ id: "a", name: "A", manual: true }), { id: "a", name: "A", manual: true });
  assert.equal(normalizeSessionMarker(null), null);
  assert.equal(normalizeSessionMarker("x"), null);
  assert.equal(normalizeSessionMarker({ name: "A" }), null);
  assert.equal(normalizeSessionMarker({ id: "", name: "A" }), null);
});

test("decideScope 1: manual marker wins even when another system matches the title", () => {
  const a = system("A", ["客户管理"], [env()]);
  const b = system("B", ["办公平台"], [env()]);
  const decision = decideScope({
    systems: [a, b],
    info: page({ title: "办公平台" }),
    marker: { id: "A", name: "A", manual: true },
    fallbackEnabled: true
  });
  assert.deepEqual(decision, { action: "use", systemId: "A", anomaly: null });
});

test("decideScope 2: an existing marker wins whatever the title says", () => {
  const a = system("A", ["客户管理"], [env()]);
  const b = system("B", ["办公平台"], [env()]);
  const marker = { id: "A", name: "A", manual: false };
  const use = { action: "use", systemId: "A", anomaly: null };
  // Blank, matching, route-only and generic titles.
  for (const title of ["", "列表 - 客户管理", "登录", "Vite App"]) {
    assert.deepEqual(decideScope({ systems: [a, b], info: page({ title }), marker, fallbackEnabled: false }), use);
  }
  // A title that matches another system does not switch away from the marker.
  assert.deepEqual(decideScope({ systems: [a, b], info: page({ title: "办公平台" }), marker, fallbackEnabled: true }), use);
  // Nor does a port the marker system does not list, or a keyword-less marker system.
  assert.deepEqual(
    decideScope({ systems: [a], info: page({ title: "别的东西", port: "8080" }), marker, fallbackEnabled: false }),
    use
  );
  const bare = system("BARE", [], [env({ port: "5173" })]);
  assert.deepEqual(
    decideScope({
      systems: [bare],
      info: page({ title: "Whatever Page" }),
      marker: { id: "BARE", name: "BARE", manual: false },
      fallbackEnabled: false
    }),
    { action: "use", systemId: "BARE", anomaly: null }
  );
});

test("decideScope 6: marker pointing to a removed system is ignored", () => {
  const b = system("B", ["办公平台"], [env()]);
  const marker = { id: "GONE", name: "x", manual: true };
  assert.deepEqual(decideScope({ systems: [b], info: page({ title: "办公平台" }), marker, fallbackEnabled: true }), {
    action: "use",
    systemId: "B",
    anomaly: null
  });
});

test("decideScope 7: local environments require the title to hit when the system has keywords", () => {
  const a = system("A", ["客户管理"], [env()]);
  const b = system("B", ["办公平台"], [env()]);
  assert.deepEqual(decideScope({ systems: [a, b], info: page({ title: "办公平台" }), marker: null, fallbackEnabled: true }), {
    action: "use",
    systemId: "B",
    anomaly: null
  });
});

test("decideScope 8: local identifying query params select the system", () => {
  const a = system("A", ["Vite App"], [env({ query: { app: "crm" } })]);
  const b = system("B", [], [env({ query: { app: "oa" } })]);
  assert.deepEqual(
    decideScope({
      systems: [a, b],
      info: page({ title: "Vite App", query: { app: "oa", x: "1" } }),
      marker: null,
      fallbackEnabled: true
    }),
    { action: "use", systemId: "B", anomaly: null }
  );
  assert.deepEqual(
    decideScope({ systems: [a, b], info: page({ title: "Vite App", query: {} }), marker: null, fallbackEnabled: false }),
    { action: "fallback" }
  );
  assert.deepEqual(
    decideScope({ systems: [a, b], info: page({ title: "Vite App", query: {} }), marker: null, fallbackEnabled: true }),
    { action: "create" }
  );
});

test("decideScope 9: more conditions win, then longer keyword", () => {
  const moreConditions = system("MORE", [], [env({ query: { app: "crm" }, lastPath: "login" })]);
  const fewer = system("FEWER", [], [env()]);
  assert.deepEqual(
    decideScope({
      systems: [fewer, moreConditions],
      info: page({ title: "Vite App", query: { app: "crm" }, lastPath: "login" }),
      marker: null,
      fallbackEnabled: true
    }),
    { action: "use", systemId: "MORE", anomaly: null }
  );
  const short = system("SHORT", ["管理"], [env()]);
  const long = system("LONG", ["客户管理"], [env()]);
  assert.deepEqual(decideScope({ systems: [short, long], info: page({ title: "客户管理" }), marker: null, fallbackEnabled: true }), {
    action: "use",
    systemId: "LONG",
    anomaly: null
  });
  assert.deepEqual(
    decideScope({
      systems: [moreConditions],
      info: page({ title: "x", query: { app: "crm" }, lastPath: "home" }),
      marker: null,
      fallbackEnabled: false
    }),
    { action: "fallback" }
  );
});

test("decideScope 9b: a keyword-less system only matches pages whose own title is generic or blank", () => {
  const hostOnly = system("HOST", [], [env()]);
  assert.deepEqual(
    decideScope({ systems: [hostOnly], info: page({ title: "客户管理" }), marker: null, fallbackEnabled: true }),
    { action: "create" }
  );
  assert.deepEqual(
    decideScope({ systems: [hostOnly], info: page({ title: "客户管理" }), marker: null, fallbackEnabled: false }),
    { action: "fallback" }
  );
  for (const title of ["Vite App", "", "  "]) {
    assert.deepEqual(decideScope({ systems: [hostOnly], info: page({ title }), marker: null, fallbackEnabled: true }), {
      action: "use",
      systemId: "HOST",
      anomaly: null
    });
  }
});

test("decideScope 10: non-local host keeps its own system and reports an anomaly", () => {
  const a = system("A", ["客户管理"], [env({ hostname: "test.crm.com", port: "" })]);
  const b = system("B", ["办公平台"], [env({ hostname: "test.oa.com", port: "" })]);
  assert.deepEqual(
    decideScope({
      systems: [a, b],
      info: page({ hostname: "test.crm.com", port: "", title: "办公平台" }),
      marker: null,
      fallbackEnabled: true
    }),
    { action: "use", systemId: "A", anomaly: { hostSystemId: "A", titleSystemId: "B" } }
  );
  assert.deepEqual(
    decideScope({
      systems: [a, b],
      info: page({ hostname: "test.crm.com", port: "8443", title: "客户管理" }),
      marker: null,
      fallbackEnabled: true
    }),
    { action: "use", systemId: "A", anomaly: null }
  );
});

test("decideScope 11: new host with a title hit auto-adds only when fallback is enabled", () => {
  const a = system("A", ["客户管理"], [env({ hostname: "test.crm.com", port: "" })]);
  const info = page({ hostname: "prod.crm.com", port: "", title: "客户管理" });
  assert.deepEqual(decideScope({ systems: [a], info, marker: null, fallbackEnabled: true }), {
    action: "auto-add",
    systemId: "A"
  });
  assert.deepEqual(decideScope({ systems: [a], info, marker: null, fallbackEnabled: false }), { action: "fallback" });
});

test("decideScope 12: no match creates or falls back", () => {
  const a = system("A", ["客户管理"], [env({ hostname: "test.crm.com", port: "" })]);
  const info = page({ hostname: "other.com", port: "", title: "完全无关" });
  assert.deepEqual(decideScope({ systems: [a], info, marker: null, fallbackEnabled: true }), { action: "create" });
  assert.deepEqual(decideScope({ systems: [a], info, marker: null, fallbackEnabled: false }), { action: "fallback" });
  assert.deepEqual(decideScope({ systems: [], info, marker: null, fallbackEnabled: true }), { action: "create" });
});

test("decideScope 13: local host with blank title and no marker never creates", () => {
  const withKeywords = system("K", ["客户管理"], [env()]);
  const envOnly = system("E", [], [env({ port: "5174" })]);
  assert.deepEqual(decideScope({ systems: [withKeywords], info: page({ title: "" }), marker: null, fallbackEnabled: true }), {
    action: "fallback"
  });
  assert.deepEqual(decideScope({ systems: [], info: page({ title: "  " }), marker: null, fallbackEnabled: true }), {
    action: "fallback"
  });
  assert.deepEqual(
    decideScope({ systems: [withKeywords, envOnly], info: page({ title: "", port: "5174" }), marker: null, fallbackEnabled: true }),
    { action: "use", systemId: "E", anomaly: null }
  );
});

test("decideScope: hostless pages (file:) always fall back, even with a title hit or a marker", () => {
  const a = system("A", ["客户管理"], [env()]);
  const info = page({ protocol: "file:", hostname: "", port: "", origin: "null", pathname: "/tmp/form.html", title: "客户管理" });
  assert.deepEqual(decideScope({ systems: [a], info, marker: null, fallbackEnabled: true }), { action: "fallback" });
  assert.deepEqual(decideScope({ systems: [], info: { ...info, title: "无关" }, marker: null, fallbackEnabled: true }), {
    action: "fallback"
  });
  assert.deepEqual(
    decideScope({ systems: [a], info, marker: { id: "A", name: "A", manual: true }, fallbackEnabled: true }),
    { action: "fallback" }
  );
});
