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
