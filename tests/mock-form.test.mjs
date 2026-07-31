import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const mockFormSource = readFileSync(join(here, "../mock-form/index.html"), "utf8");
const elementUiSource = readFileSync(join(here, "../mock-form/element-ui-demo.html"), "utf8");
const elementPlusSource = readFileSync(join(here, "../mock-form/element-plus-demo.html"), "utf8");

test("mock form includes an account input for manual verification", () => {
  assert.match(mockFormSource, /<label for="account">账号<\/label>/);
  assert.match(mockFormSource, /<input id="account" placeholder="粘贴这里" \/>/);
});

test("mock form covers native select, choice and temporal controls", () => {
  assert.match(mockFormSource, /<select id="contactType" name="contactType">/);
  assert.match(mockFormSource, /<select id="businessScopes" name="businessScopes" multiple>/);
  assert.match(mockFormSource, /type="radio" name="contactRole"/);
  assert.match(mockFormSource, /type="checkbox" name="businessTags"/);
  assert.match(mockFormSource, /id="accepted" type="checkbox"/);
  ["date", "month", "time", "datetime-local", "week"].forEach(function (type) {
    assert.match(mockFormSource, new RegExp('type="' + type + '"'));
  });
});

test("mock form includes controls that one-click fill must skip", () => {
  assert.match(mockFormSource, /id="readonlyField"[^>]*readonly/);
  assert.match(mockFormSource, /id="disabledField"[^>]*disabled/);
});

test("Element UI and Element Plus demos cover common framework controls", () => {
  [elementUiSource, elementPlusSource].forEach(function (source) {
    assert.match(source, /<el-select[^>]*placeholder="请选择城市"/);
    assert.match(source, /<el-select[^>]*multiple[^>]*placeholder="请选择业务范围"/);
    assert.match(source, /<el-radio-group/);
    assert.match(source, /<el-checkbox-group/);
    assert.match(source, /<el-switch/);
    assert.match(source, /<el-date-picker[^>]*type="date"/);
    assert.match(source, /<el-date-picker[^>]*type="datetime"/);
    assert.match(source, /<el-time-picker/);
  });
  assert.match(elementUiSource, /id="elementUiState"/);
  assert.match(elementPlusSource, /id="elementPlusState"/);
});
