import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("smart fill keeps a circular add-favorite action without recommendation panel styles", () => {
  assert.match(stylesheet, /\.ctdp-smartfill\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(stylesheet, /\.ctdp-smartfill-trigger\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-menu\s*\{[\s\S]*?margin-top:\s*8px;[\s\S]*?gap:\s*8px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-favorite-trigger\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-favorite-icon\s*\{/);
  assert.match(stylesheet, /\.ctdp-smartfill-favorite-trigger\[data-favorite="true"\]\s*\{[\s\S]*?color:\s*#e5a900;[\s\S]*?background:\s*rgba\(255,\s*214,\s*92,\s*0\.22\);/);
  assert.match(stylesheet, /\.ctdp-smartfill-favorite-trigger\[data-favorite="true"\] \.ctdp-smartfill-favorite-icon::before\s*\{[\s\S]*?clip-path:\s*polygon\(/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-recommend-/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item\s*\{/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-label/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-hint/);
});
