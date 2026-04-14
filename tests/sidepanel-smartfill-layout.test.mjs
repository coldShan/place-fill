import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("smart fill keeps a single circular trigger, adds a recommendation entry, and uses an internal-scroll recommendation panel", () => {
  assert.match(stylesheet, /\.ctdp-smartfill\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(stylesheet, /\.ctdp-smartfill-trigger\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-menu\s*\{[\s\S]*?margin-top:\s*8px;[\s\S]*?gap:\s*8px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-trigger\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-panel\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-list\s*\{[\s\S]*?max-height:\s*184px;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-icon\s*\{/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item\s*\{/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-recommend-trigger-text/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-label/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-hint/);
});

test("recommendation cards keep hover feedback without vertical jump inside the floating panel", () => {
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-item:hover,\s*\.ctdp-smartfill-recommend-item:focus-visible\s*\{[\s\S]*?border-color:\s*rgba\(74,\s*111,\s*165,\s*0\.34\);[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.98\);/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-recommend-item:hover,\s*\.ctdp-smartfill-recommend-item:focus-visible\s*\{[^}]*transform:/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-recommend-item:hover,\s*\.ctdp-smartfill-recommend-item:focus-visible\s*\{[^}]*box-shadow:/);
});
