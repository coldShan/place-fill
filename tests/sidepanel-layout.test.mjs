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
  assert.doesNotMatch(stylesheet, /\.ctdp-root\[data-site-feature-enabled="false"\]\s+\.ctdp-dock/);
});

test("toolbar lays out every action with even spacing and stable button sizes", () => {
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?justify-content:\s*center;/);
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?gap:\s*8px;/);
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?padding:\s*12px;/);
  assert.match(stylesheet, /\.ctdp-toolbar-group\s*\{[\s\S]*?display:\s*contents;/);
  assert.match(stylesheet, /\.ctdp-toolbar \.ctdp-btn\s*\{[\s\S]*?width:\s*38px;[\s\S]*?height:\s*38px;[\s\S]*?flex:\s*0 0 38px;[\s\S]*?box-sizing:\s*border-box;/);
  assert.match(stylesheet, /\.ctdp-toolbar \.ctdp-btn-action\s*\{[\s\S]*?width:\s*104px;[\s\S]*?flex-basis:\s*104px;/);
});

test("settings entry and back button stay compact within the shared glass panel system", () => {
  assert.match(stylesheet, /\.ctdp-footer\s*\{[\s\S]*?padding:\s*12px 16px 16px;/);
  assert.match(stylesheet, /\.ctdp-btn\.is-hidden,\s*\.ctdp-footer-status\.is-hidden\s*\{[\s\S]*?display:\s*none;/);
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
  assert.match(stylesheet, /\.ctdp-settings-list\s*\{[\s\S]*?\bgrid-auto-rows:\s*max-content;[\s\S]*?\balign-content:\s*start;[\s\S]*?\boverflow-y:\s*auto;[\s\S]*?\boverscroll-behavior:\s*contain;/);
  assert.match(stylesheet, /\.ctdp-settings-list,\s*\.ctdp-grid\s*\{[\s\S]*?\bscrollbar-width:\s*thin;/);
  assert.match(stylesheet, /\.ctdp-settings-list::\-webkit-scrollbar,\s*\.ctdp-grid::\-webkit-scrollbar\s*\{/);
  assert.match(stylesheet, /\.ctdp-settings-list::\-webkit-scrollbar-thumb,\s*\.ctdp-grid::\-webkit-scrollbar-thumb\s*\{/);
});

test("settings accordion uses flat rows, visible focus states and reduced-motion fallback", () => {
  assert.match(stylesheet, /\.ctdp-settings-section\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?border-radius:\s*18px;/);
  assert.match(stylesheet, /\.ctdp-settings-section-summary\s*\{[\s\S]*?min-height:\s*64px;[\s\S]*?cursor:\s*pointer;/);
  assert.match(stylesheet, /\.ctdp-settings-section-summary:focus-visible\s*\{[\s\S]*?box-shadow:/);
  assert.match(stylesheet, /\.ctdp-settings-row\s*\{[\s\S]*?background:\s*transparent;/);
  assert.match(stylesheet, /\.ctdp-ai-settings\[hidden\]\s*\{[\s\S]*?display:\s*none;/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.ctdp-settings-section-content[\s\S]*?animation:\s*none;/);
});
