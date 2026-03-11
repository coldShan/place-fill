import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../src/sidepanel.css"), "utf8");

test("smart fill keeps a single circular trigger and expands icon-only items below it", () => {
  assert.match(stylesheet, /\.ctdp-smartfill\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(stylesheet, /\.ctdp-smartfill-trigger\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-menu\s*\{[\s\S]*?margin-top:\s*8px;[\s\S]*?gap:\s*8px;/);
  assert.match(stylesheet, /\.ctdp-smartfill-item\s*\{[\s\S]*?width:\s*42px;[\s\S]*?height:\s*42px;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-label/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfill-item-hint/);
});
