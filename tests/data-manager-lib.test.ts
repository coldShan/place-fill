import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_COLUMNS,
  normalizeColumnPreferences,
  sortColumns,
  toggleColumn
} from "../extension/src-ts/pages/data-manager/lib/columns";
import { getFavoriteTitle, moveId, shiftId } from "../extension/src-ts/pages/data-manager/lib/display";
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
