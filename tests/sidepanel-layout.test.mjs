import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("collapsed dock is anchored to the viewport edge while panel keeps a right gutter", () => {
  assert.match(stylesheet, /\.ctdp-root\s*\{[\s\S]*?\bright:\s*0;/);
  assert.match(stylesheet, /\.ctdp-panel\s*\{[\s\S]*?\bmargin-right:\s*18px;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bwidth:\s*72px;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bheight:\s*72px;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bborder:\s*none;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bbackground:\s*transparent;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bbox-shadow:\s*none;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bbackdrop-filter:\s*none;/);
});

test("toolbar keeps a left settings slot and a right-aligned action cluster", () => {
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?justify-content:\s*space-between;/);
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?padding:\s*12px;/);
  assert.match(stylesheet, /\.ctdp-toolbar-group-right\s*\{[\s\S]*?gap:\s*10px;/);
  assert.match(stylesheet, /\.ctdp-btn-primary,\s*\.ctdp-btn-strong,\s*\.ctdp-btn-ghost\s*\{[\s\S]*?width:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-btn-primary,\s*\.ctdp-btn-strong,\s*\.ctdp-btn-ghost\s*\{[\s\S]*?height:\s*42px;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-btn-text\s*\{/);
});

test("settings entry and back button stay compact within the shared glass panel system", () => {
  assert.match(stylesheet, /\.ctdp-footer\s*\{[\s\S]*?padding:\s*12px 16px 16px;/);
  assert.match(stylesheet, /\.ctdp-footer\[hidden\]\s*\{[\s\S]*?display:\s*none;/);
  assert.match(stylesheet, /\.ctdp-footer-btn,\s*\.ctdp-settings-back\s*\{[\s\S]*?width:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-footer-btn,\s*\.ctdp-settings-back\s*\{[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-settings-view\s*\{[\s\S]*?display:\s*grid;/);
});

test("panel keeps a fixed viewport-bounded height and makes settings content scroll with styled scrollbars", () => {
  assert.match(stylesheet, /\.ctdp-panel\s*\{[\s\S]*?\bheight:\s*min\(720px,\s*calc\(100vh - 36px\)\);/);
  assert.match(stylesheet, /\.ctdp-panel\s*\{[\s\S]*?\bgrid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto\s+auto;/);
  assert.match(stylesheet, /\.ctdp-main-view\s*\{[\s\S]*?\bgrid-template-rows:\s*auto\s+minmax\(0,\s*1fr\);/);
  assert.match(stylesheet, /\.ctdp-settings-view\s*\{[\s\S]*?\bgrid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto;/);
  assert.match(stylesheet, /\.ctdp-settings-list\s*\{[\s\S]*?\boverflow-y:\s*auto;/);
  assert.match(stylesheet, /\.ctdp-settings-list,\s*\.ctdp-grid\s*\{[\s\S]*?\bscrollbar-width:\s*thin;/);
  assert.match(stylesheet, /\.ctdp-settings-list::\-webkit-scrollbar,\s*\.ctdp-grid::\-webkit-scrollbar\s*\{/);
  assert.match(stylesheet, /\.ctdp-settings-list::\-webkit-scrollbar-thumb,\s*\.ctdp-grid::\-webkit-scrollbar-thumb\s*\{/);
});
