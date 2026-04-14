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
  assert.match(stylesheet, /\.ctdp-smartfill-item\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-trigger\s*\{[\s\S]*?min-width:\s*72px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-panel\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(stylesheet, /\.ctdp-smartfill-recommend-list\s*\{[\s\S]*?max-height:\s*184px;[\s\S]*?overflow-y:\s*auto;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-label/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-hint/);
});
