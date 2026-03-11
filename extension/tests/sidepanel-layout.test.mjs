import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../src/sidepanel.css"), "utf8");

test("collapsed dock is anchored to the viewport edge while panel keeps a right gutter", () => {
  assert.match(stylesheet, /\.ctdp-root\s*\{[\s\S]*?\bright:\s*0;/);
  assert.match(stylesheet, /\.ctdp-panel\s*\{[\s\S]*?\bmargin-right:\s*18px;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bwidth:\s*48px;/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?\bheight:\s*56px;/);
});

test("toolbar actions are compact icon-only buttons aligned to the right edge", () => {
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?justify-content:\s*flex-end;/);
  assert.match(stylesheet, /\.ctdp-toolbar\s*\{[\s\S]*?padding:\s*12px;/);
  assert.match(stylesheet, /\.ctdp-btn-primary,\s*\.ctdp-btn-strong,\s*\.ctdp-btn-ghost\s*\{[\s\S]*?width:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-btn-primary,\s*\.ctdp-btn-strong,\s*\.ctdp-btn-ghost\s*\{[\s\S]*?height:\s*42px;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-btn-text\s*\{/);
});

test("settings entry and back button stay compact within the shared glass panel system", () => {
  assert.match(stylesheet, /\.ctdp-footer\s*\{[\s\S]*?padding:\s*12px 16px 16px;/);
  assert.match(stylesheet, /\.ctdp-footer-actions\s*\{[\s\S]*?justify-content:\s*flex-end;/);
  assert.match(stylesheet, /\.ctdp-footer-btn,\s*\.ctdp-settings-back\s*\{[\s\S]*?width:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-footer-btn,\s*\.ctdp-settings-back\s*\{[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-settings-view\s*\{[\s\S]*?display:\s*grid;/);
});
