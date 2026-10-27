import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import {
  DEFAULT_COLUMNS,
  normalizeColumnPreferences,
  sortColumns,
  toggleColumn
} from "../extension/src-ts/pages/data-manager/lib/columns";
import { getFavoriteTitle, moveId, shiftId } from "../extension/src-ts/pages/data-manager/lib/display";
import { getFieldWarning } from "../extension/src-ts/pages/data-manager/lib/field-validation";
import { generateRandomProfile, type GeneratorsApi } from "../extension/src-ts/pages/data-manager/lib/generators";
import { DISPLAY_FIELD_ORDER, FIELD_GROUPS } from "../extension/src-ts/pages/data-manager/lib/field-groups";
import {
  buildExportFileName,
  buildExportPayload,
  EXPORT_FILE_TYPE,
  parseImportPayload,
  planImport
} from "../extension/src-ts/pages/data-manager/lib/import-export";
import { buildCopyTargets, parseScopeInput, summarizeCopyResults } from "../extension/src-ts/pages/data-manager/lib/scope-input";
import { formatScopeLabel } from "../extension/src-ts/pages/data-manager/lib/scope-label";
import {
  buildSystemFromDraft,
  countAnnotationsBySystem,
  createSystemDraft,
  getDeleteTargets,
  getSystemRouteParam,
  getSystemStatus,
  isSameSystemDraft,
  matchesSystemQuery,
  validateSystemDraft,
  type SystemDraft
} from "../extension/src-ts/pages/data-manager/lib/systems";
import { createSystemCommands } from "../extension/src-ts/pages/data-manager/lib/system-commands";
import type { SystemProfile } from "../extension/src-ts/shared/system-scope";
import { matchesQuery, splitHighlight } from "../extension/src-ts/pages/data-manager/lib/record-search";
import { FIELD_KEYS, normalizeProfile } from "../extension/src-ts/shared/data-records";

test("field groups cover every profile field exactly once", () => {
  assert.equal(DISPLAY_FIELD_ORDER.length, FIELD_KEYS.length);
  assert.deepEqual(DISPLAY_FIELD_ORDER.slice().sort(), FIELD_KEYS.slice().sort());
  assert.ok(FIELD_GROUPS.every(function (group) { return group.fields.length > 0; }));
});

test("default columns follow the display order", () => {
  assert.deepEqual(sortColumns(DEFAULT_COLUMNS.favorites), DEFAULT_COLUMNS.favorites);
  assert.deepEqual(sortColumns(DEFAULT_COLUMNS.history), DEFAULT_COLUMNS.history);
});

test("toggleColumn keeps display order and never removes the last column", () => {
  assert.deepEqual(toggleColumn(["fullName", "companyName"], "mobile"), ["fullName", "mobile", "companyName"]);
  assert.deepEqual(toggleColumn(["fullName", "mobile"], "fullName"), ["mobile"]);
  assert.deepEqual(toggleColumn(["mobile"], "mobile"), ["mobile"]);
});

test("normalizeColumnPreferences drops unknown fields and falls back to defaults", () => {
  assert.deepEqual(normalizeColumnPreferences(undefined), DEFAULT_COLUMNS);
  assert.deepEqual(
    normalizeColumnPreferences({ favorites: ["companyName", "bogus", "fullName"], history: [] }),
    { favorites: ["fullName", "companyName"], history: DEFAULT_COLUMNS.history }
  );
});

test("matchesQuery requires every token to appear across fields and extra texts", () => {
  const profile = normalizeProfile({ fullName: "张三", mobile: "13800138000", companyName: "上海测试科技" });
  assert.equal(matchesQuery(profile, [], ""), true);
  assert.equal(matchesQuery(profile, [], "张三 1380"), true);
  assert.equal(matchesQuery(profile, ["主账号"], "主账号"), true);
  assert.equal(matchesQuery(profile, [], "张三 李四"), false);
  assert.equal(matchesQuery(normalizeProfile({ email: "Test@Example.com" }), [], "test@example"), true);
});

test("splitHighlight marks every case-insensitive token occurrence", () => {
  assert.deepEqual(splitHighlight("abcABC", "bc"), [
    { text: "a", match: false },
    { text: "bc", match: true },
    { text: "A", match: false },
    { text: "BC", match: true }
  ]);
  assert.deepEqual(splitHighlight("张三", ""), [{ text: "张三", match: false }]);
});

test("favorite titles prefer a custom name and fall back to the person name", () => {
  const profile = normalizeProfile({ fullName: "张三" });
  assert.equal(getFavoriteTitle({ name: "主账号", profile }), "主账号");
  assert.equal(getFavoriteTitle({ name: "常用数据", profile }), "张三");
  assert.equal(getFavoriteTitle({ name: "常用数据", profile: normalizeProfile({}) }), "未命名数据");
});

test("moveId and shiftId reorder ids for drag and keyboard sorting", () => {
  assert.deepEqual(moveId(["a", "b", "c"], "a", "c", false), ["b", "c", "a"]);
  assert.deepEqual(moveId(["a", "b", "c"], "c", "a", true), ["c", "a", "b"]);
  assert.deepEqual(shiftId(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
  assert.equal(shiftId(["a", "b", "c"], "a", -1), null);
});

test("field warnings use the shared generators validators and stay advisory", () => {
  const generators = createRequire(import.meta.url)("../extension/src/generators.js") as GeneratorsApi;
  const validId = generators.generateFieldValue?.("idNumber") || "";
  const validCredit = generators.generateFieldValue?.("creditCode") || "";
  const validCard = generators.generateFieldValue?.("bankCard") || "";
  assert.equal(getFieldWarning("idNumber", validId, generators), "");
  assert.equal(getFieldWarning("creditCode", validCredit, generators), "");
  assert.equal(getFieldWarning("bankCard", validCard, generators), "");
  assert.notEqual(getFieldWarning("idNumber", "110101199003071000", generators), "");
  assert.notEqual(getFieldWarning("mobile", "2380013", generators), "");
  assert.equal(getFieldWarning("mobile", "13912345678", generators), "");
  assert.notEqual(getFieldWarning("email", "foo@bar", generators), "");
  assert.notEqual(getFieldWarning("postalCode", "20003", generators), "");
  assert.equal(getFieldWarning("landline", "021-68881234", generators), "");
  assert.equal(getFieldWarning("fullName", "任意", generators), "");
  assert.equal(getFieldWarning("idNumber", "", generators), "");
  assert.equal(getFieldWarning("idNumber", "bad", {}), "");
});

test("generateRandomProfile fills every field through the generators api", () => {
  const generators = createRequire(import.meta.url)("../extension/src/generators.js") as GeneratorsApi;
  const profile = generateRandomProfile(generators);
  assert.ok(FIELD_KEYS.every(function (fieldKey) { return profile[fieldKey] !== ""; }));
  for (let round = 0; round < 50; round += 1) {
    const sample = generateRandomProfile(generators);
    FIELD_KEYS.forEach(function (fieldKey) {
      assert.equal(getFieldWarning(fieldKey, sample[fieldKey], generators), "", fieldKey + ": " + sample[fieldKey]);
    });
  }
  assert.deepEqual(generateRandomProfile({}), normalizeProfile({}));
});

test("parseScopeInput turns hostnames or full urls into host scopes and rejects the current site", () => {
  assert.deepEqual(parseScopeInput(" Test.Example.com ", "host:example.com"), { scope: "host:test.example.com", error: "" });
  assert.deepEqual(parseScopeInput("https://staging.example.com:8443/login?x=1", "host:example.com"), { scope: "host:staging.example.com", error: "" });
  assert.deepEqual(parseScopeInput("uat.example.com/path", "host:example.com"), { scope: "host:uat.example.com", error: "" });
  assert.equal(parseScopeInput("example.com", "host:example.com").error, "不能复制到当前站点");
  assert.notEqual(parseScopeInput("", "host:example.com").error, "");
  assert.notEqual(parseScopeInput("不是域名 ", "host:example.com").error, "");
  assert.deepEqual(parseScopeInput("http://localhost:5173/form", "host:example.com"), { scope: "host:localhost:5173", error: "" });
  assert.deepEqual(parseScopeInput("localhost", "host:example.com"), { scope: "host:localhost", error: "" });
});

test("summarizeCopyResults reports created and skipped target sites", () => {
  assert.deepEqual(summarizeCopyResults([{ scope: "a.com", status: "created" }]), { message: "已复制到 1 个站点", tone: "success" });
  assert.deepEqual(
    summarizeCopyResults([{ scope: "a.com", status: "created" }, { scope: "b.com", status: "duplicate" }]),
    { message: "已复制到 1 个站点；b.com 已存在相同数据，已跳过", tone: "success" }
  );
  assert.deepEqual(
    summarizeCopyResults([
      { scope: "a.com", status: "duplicate" },
      { scope: "b.com", status: "duplicate" },
      { scope: "c.com", status: "duplicate" }
    ]),
    { message: "a.com、b.com 等 3 个站点 已存在相同数据，未重复复制", tone: "warning" }
  );
});

function ownerSystem(id: string, name: string, hostname: string, port: string): SystemProfile {
  return {
    id,
    name,
    titles: [],
    environments: [{ id: id + "-e", hostname, port, query: {}, lastPath: "", autoAdded: false, createdAt: 1 }],
    anomalies: [],
    createdAt: 1,
    updatedAt: 1
  };
}

test("parseScopeInput maps a host owned by a system to that system's scope", () => {
  const crm = ownerSystem("crm", "客户管理", "crm.example.com", "");
  const dev = ownerSystem("dev", "开发", "localhost", "5173");
  const systems = [crm, dev];
  assert.deepEqual(parseScopeInput("https://crm.example.com/login", "host:example.com", systems), { scope: "system:crm", error: "" });
  assert.deepEqual(parseScopeInput("CRM.example.com:8443", "host:example.com", systems), { scope: "system:crm", error: "" });
  assert.deepEqual(parseScopeInput("localhost:5173", "host:example.com", systems), { scope: "system:dev", error: "" });
  assert.deepEqual(parseScopeInput("localhost:5174", "host:example.com", systems), { scope: "host:localhost:5174", error: "" });
  assert.deepEqual(parseScopeInput("other.example.com", "host:example.com", systems), { scope: "host:other.example.com", error: "" });
  const twin = ownerSystem("dev2", "开发二", "localhost", "5173");
  assert.deepEqual(parseScopeInput("localhost:5173", "host:example.com", systems.concat([twin])), { scope: "host:localhost:5173", error: "" });
  assert.equal(parseScopeInput("crm.example.com", "system:crm", systems).error, "不能复制到当前站点");
});

test("buildCopyTargets merges systems without data and drops the current and legacy scopes", () => {
  const systems = [ownerSystem("crm", "客户管理", "crm.example.com", ""), ownerSystem("empty", "空系统", "a.example.com", "")];
  const summaries = [
    { scope: "host:b.example.com", favorites: 1, history: 0 },
    { scope: "legacy:localhost", favorites: 2, history: 1 },
    { scope: "system:crm", favorites: 3, history: 4 },
    { scope: "system:cur", favorites: 1, history: 1 }
  ];
  assert.deepEqual(buildCopyTargets(summaries, systems, "system:cur"), [
    { scope: "system:crm", favorites: 3, history: 4 },
    { scope: "system:empty", favorites: 0, history: 0 },
    { scope: "host:b.example.com", favorites: 1, history: 0 }
  ]);
  assert.deepEqual(buildCopyTargets([], systems, "system:crm").map(function (item) { return item.scope; }), ["system:empty"]);
});

test("summarizeCopyResults names target scopes through an optional label formatter", () => {
  const label = function (scope: string) { return scope === "system:a" ? "客户管理" : scope; };
  assert.deepEqual(
    summarizeCopyResults([{ scope: "host:b.com", status: "created" }, { scope: "system:a", status: "duplicate" }], label).message,
    "已复制到 1 个站点；客户管理 已存在相同数据，已跳过"
  );
});

test("export payload only carries favorites and round-trips through import parsing", () => {
  const favorites = [
    { id: "a", name: "主账号", note: "备注", createdAt: "1", updatedAt: "1", profile: normalizeProfile({ fullName: "张三", mobile: "13800138000" }) }
  ];
  const now = new Date(2026, 9, 16, 9, 30);
  const payload = buildExportPayload("example.com", favorites, now);
  assert.equal(payload.type, EXPORT_FILE_TYPE);
  assert.equal(payload.version, 1);
  assert.deepEqual(Object.keys(payload).sort(), ["exportedAt", "favorites", "scope", "type", "version"]);
  assert.deepEqual(payload.favorites, [{ name: "主账号", note: "备注", profile: favorites[0]?.profile }]);
  assert.equal(buildExportFileName("example.com", now), "place-fill-example.com-favorites-20261016.json");
  assert.equal(buildExportFileName("system:ab-1", now), "place-fill-system-ab-1-favorites-20261016.json");

  const parsed = parseImportPayload("\uFEFF" + JSON.stringify({ ...payload, history: [{ profile: { fullName: "忽略" } }] }));
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.equal(parsed.sourceScope, "example.com");
    assert.deepEqual(parsed.favorites, payload.favorites);
  }
});

test("parseImportPayload rejects invalid files and empty records", () => {
  assert.deepEqual(parseImportPayload("{oops"), { ok: false, error: "文件不是有效的 JSON" });
  assert.equal(parseImportPayload("[]").ok, false);
  assert.equal(parseImportPayload(JSON.stringify({ type: "other", favorites: [] })).ok, false);
  assert.deepEqual(
    parseImportPayload(JSON.stringify({ type: EXPORT_FILE_TYPE, favorites: [{ profile: {} }, null, "x"] })),
    { ok: false, error: "文件中没有可导入的常用数据" }
  );
});

test("planImport skips records that already exist or repeat inside the file", () => {
  const existing = [
    { id: "a", name: "常用数据", note: "", createdAt: "1", updatedAt: "1", profile: normalizeProfile({ fullName: "张三" }) }
  ];
  const plan = planImport(existing, [
    { name: "", note: "", profile: normalizeProfile({ fullName: "张三" }) },
    { name: "", note: "", profile: normalizeProfile({ fullName: "李四" }) },
    { name: "重复", note: "", profile: normalizeProfile({ fullName: "李四" }) }
  ]);
  assert.equal(plan.duplicates, 2);
  assert.deepEqual(plan.toCreate.map(function (item) { return item.profile.fullName; }), ["李四"]);
});

function makeSystem(patch: Partial<SystemProfile> = {}): SystemProfile {
  return {
    id: "sys-1",
    name: "客户管理",
    titles: ["客户管理"],
    environments: [
      { id: "e1", hostname: "localhost", port: "5173", query: { tenant: "a" }, lastPath: "", autoAdded: false, createdAt: 1 },
      { id: "e2", hostname: "crm.example.com", port: "", query: {}, lastPath: "login", autoAdded: true, createdAt: 2 }
    ],
    anomalies: [],
    createdAt: 1,
    updatedAt: 2,
    ...patch
  };
}

test("formatScopeLabel renders system names, hosts, legacy groups and local files", () => {
  const systems = [makeSystem()];
  assert.equal(formatScopeLabel("system:sys-1", systems), "客户管理");
  assert.equal(formatScopeLabel("system:gone", systems), "已删除的系统");
  assert.equal(formatScopeLabel("host:example.com", systems), "example.com");
  assert.equal(formatScopeLabel("host:localhost:5173", systems), "localhost:5173");
  assert.equal(formatScopeLabel("legacy:localhost", systems), "localhost（旧数据）");
  assert.equal(formatScopeLabel("file:local", systems), "本地文件");
  assert.equal(formatScopeLabel("example.com", systems), "example.com");
});

test("getSystemStatus prefers anomaly, then the stored scope toggle", () => {
  const system = makeSystem();
  assert.equal(getSystemStatus(system, { "system:sys-1": true }), "enabled");
  assert.equal(getSystemStatus(system, { "system:sys-1": false }), "disabled");
  assert.equal(getSystemStatus(system, {}), "disabled");
  const flagged = makeSystem({ anomalies: [{ titleSystemId: "x", url: "https://a.com/p", at: 1 }] });
  assert.equal(getSystemStatus(flagged, { "system:sys-1": true }), "anomaly");
});

test("matchesSystemQuery searches names, title keywords and hostnames", () => {
  const system = makeSystem({ name: "客户管理系统", titles: ["CRM 控制台"] });
  assert.equal(matchesSystemQuery(system, ""), true);
  assert.equal(matchesSystemQuery(system, "客户"), true);
  assert.equal(matchesSystemQuery(system, "crm 控制"), true);
  assert.equal(matchesSystemQuery(system, "CRM.EXAMPLE"), true);
  assert.equal(matchesSystemQuery(system, "localhost 客户"), true);
  assert.equal(matchesSystemQuery(system, "订单"), false);
});

test("countAnnotationsBySystem counts override keys under each system scope", () => {
  assert.deepEqual(
    countAnnotationsBySystem({
      "system:a::top::fp1": {},
      "system:a::frame-2::fp2": {},
      "system:b::top::fp1": {},
      "host:example.com::top::fp1": {},
      "system:a-b::top::fp1": {}
    }),
    { a: 2, b: 1, "a-b": 1 }
  );
  assert.deepEqual(countAnnotationsBySystem(null), {});
  assert.deepEqual(countAnnotationsBySystem([]), {});
});

test("getDeleteTargets lists de-duplicated fallback scopes per environment", () => {
  const system = makeSystem({
    environments: [
      { id: "e1", hostname: "localhost", port: "5173", query: {}, lastPath: "", autoAdded: false, createdAt: 1 },
      { id: "e2", hostname: "localhost", port: "5173", query: { a: "1" }, lastPath: "", autoAdded: false, createdAt: 1 },
      { id: "e3", hostname: "crm.example.com", port: "8443", query: {}, lastPath: "", autoAdded: true, createdAt: 1 },
      { id: "e4", hostname: "localhost", port: "5174", query: {}, lastPath: "", autoAdded: false, createdAt: 1 }
    ]
  });
  assert.deepEqual(getDeleteTargets(system), [
    { scope: "host:localhost:5173", label: "localhost:5173" },
    { scope: "host:crm.example.com", label: "crm.example.com" },
    { scope: "host:localhost:5174", label: "localhost:5174" }
  ]);
  assert.deepEqual(getDeleteTargets(makeSystem({ environments: [] })), [{ scope: "file:local", label: "本地文件" }]);
});

function draftOf(patch: Partial<SystemDraft> = {}): SystemDraft {
  return { ...createSystemDraft(makeSystem()), ...patch };
}

test("createSystemDraft expands environments into editable rows", () => {
  const draft = createSystemDraft(makeSystem());
  assert.equal(draft.name, "客户管理");
  assert.deepEqual(draft.titles, ["客户管理"]);
  assert.deepEqual(draft.environments[0]?.query, [{ key: "tenant", value: "a" }]);
  assert.equal(draft.environments[1]?.autoAdded, true);
  assert.equal(draft.environments[1]?.lastPath, "login");
  const blank = createSystemDraft(null);
  assert.equal(blank.name, "");
  assert.equal(blank.environments.length, 1);
  assert.equal(blank.environments[0]?.hostname, "");
});

test("validateSystemDraft requires a name and well-formed environments", () => {
  assert.equal(validateSystemDraft(draftOf()), "");
  assert.equal(validateSystemDraft(draftOf({ name: "  " })), "请填写系统名称");
  assert.equal(validateSystemDraft(draftOf({ environments: [] })), "至少需要一条环境记录");
  const base = createSystemDraft(makeSystem()).environments[0]!;
  assert.match(validateSystemDraft(draftOf({ environments: [{ ...base, hostname: " " }] })), /hostname/);
  assert.match(validateSystemDraft(draftOf({ environments: [{ ...base, hostname: "a b.com" }] })), /hostname/);
  assert.match(validateSystemDraft(draftOf({ environments: [{ ...base, port: "80a" }] })), /端口/);
  assert.match(validateSystemDraft(draftOf({ environments: [{ ...base, query: [{ key: "", value: "x" }] }] })), /参数名/);
  assert.match(
    validateSystemDraft(draftOf({ environments: [{ ...base, query: [{ key: "a", value: "1" }, { key: "a", value: "2" }] }] })),
    /重复/
  );
  assert.match(validateSystemDraft(draftOf({ titles: ["Vite App"] })), /通用标题/);
  assert.equal(validateSystemDraft(draftOf({ titles: ["", " "], environments: [{ ...base, query: [{ key: "", value: "" }] }] })), "");
});

test("buildSystemFromDraft normalizes the draft and preserves identity of an existing system", () => {
  const existing = makeSystem({ anomalies: [{ titleSystemId: "x", url: "https://a.com/p", at: 5 }] });
  const draft = createSystemDraft(existing);
  draft.name = "  新名称 ";
  draft.titles = [" 客户 ", "", "客户"];
  draft.environments[0] = { ...draft.environments[0]!, hostname: " LocalHost ", port: " 5174 ", query: [{ key: " tenant ", value: "b" }, { key: "", value: "" }] };
  draft.environments.push({ id: "", hostname: "new.example.com", port: "", lastPath: " /form ", query: [], autoAdded: false, createdAt: 0 });
  let counter = 0;
  const built = buildSystemFromDraft(draft, existing, { createId: function () { counter += 1; return "id-" + counter; }, now: function () { return 99; } });
  assert.equal(built.id, "sys-1");
  assert.equal(built.name, "新名称");
  assert.deepEqual(built.titles, ["客户"]);
  assert.deepEqual(built.anomalies, existing.anomalies);
  assert.equal(built.createdAt, 1);
  assert.deepEqual(built.environments[0], { id: "e1", hostname: "localhost", port: "5174", query: { tenant: "b" }, lastPath: "", autoAdded: false, createdAt: 1 });
  assert.equal(built.environments[1]?.autoAdded, true);
  assert.deepEqual(built.environments[2], { id: "id-1", hostname: "new.example.com", port: "", query: {}, lastPath: "form", autoAdded: false, createdAt: 99 });

  const created = buildSystemFromDraft(createSystemDraft(null), null, { createId: function () { return "fresh"; }, now: function () { return 7; } });
  assert.equal(created.id, "fresh");
  assert.equal(created.createdAt, 7);
  assert.deepEqual(created.anomalies, []);
});

test("isSameSystemDraft ignores blank rows and surrounding whitespace", () => {
  const draft = createSystemDraft(makeSystem());
  assert.equal(isSameSystemDraft(draft, createSystemDraft(makeSystem())), true);
  const padded = createSystemDraft(makeSystem());
  padded.name = " 客户管理 ";
  padded.titles = ["客户管理", " "];
  assert.equal(isSameSystemDraft(draft, padded), true);
  padded.titles = ["客户管理", "另一个"];
  assert.equal(isSameSystemDraft(draft, padded), false);
});

test("getSystemRouteParam keeps the system param while a system drawer is open or the route is pending", () => {
  assert.equal(getSystemRouteParam("systems", "a", ""), "a");
  // Before the systems load, the drawer is not open yet: keep the incoming ?system= value.
  assert.equal(getSystemRouteParam("systems", null, "b"), "b");
  assert.equal(getSystemRouteParam("systems", "a", "b"), "a");
  assert.equal(getSystemRouteParam("systems", null, ""), "");
  assert.equal(getSystemRouteParam("favorites", "a", "b"), "");
});

test("createSystemCommands sends registry edits as background messages and normalizes replies", async () => {
  const sent: Record<string, unknown>[] = [];
  const replies: unknown[] = [{ ok: true }, { ok: false, message: "a.com 已属于系统「A」" }, null, { ok: true }];
  const commands = createSystemCommands(function (message) {
    sent.push(message);
    return Promise.resolve(replies.shift());
  });
  const target: SystemProfile = { id: "s1", name: "A", titles: [], environments: [], anomalies: [], createdAt: 1, updatedAt: 1 };

  assert.deepEqual(await commands.save(target), { ok: true });
  assert.deepEqual(await commands.save(target), { ok: false, message: "a.com 已属于系统「A」" });
  assert.deepEqual(await commands.remove("s1", "host:a.com"), { ok: false, message: "删除失败，请重试" });
  assert.deepEqual(await commands.dismiss("s1"), { ok: true });
  assert.deepEqual(sent, [
    { type: "save-system", system: target },
    { type: "save-system", system: target },
    { type: "delete-system", id: "s1", targetScope: "host:a.com" },
    { type: "dismiss-anomalies", systemId: "s1" }
  ]);

  const failing = createSystemCommands(function () {
    return Promise.reject(new Error("offline"));
  });
  assert.deepEqual(await failing.dismiss("s1"), { ok: false, message: "操作失败，请重试" });
});
