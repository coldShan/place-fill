import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("glassmorphism styles use blur layers instead of gradient-heavy component fills", () => {
  assert.match(stylesheet, /\.ctdp-smartfill\s*\{[\s\S]*?backdrop-filter:\s*blur\(/);
  assert.match(stylesheet, /\.ctdp-dock\s*\{[\s\S]*?backdrop-filter:\s*blur\(/);
  assert.match(stylesheet, /\.ctdp-panel\s*\{[\s\S]*?backdrop-filter:\s*blur\(/);
  assert.match(stylesheet, /\.ctdp-toolbar,\s*[\s\S]*?\.ctdp-card\s*\{[\s\S]*?backdrop-filter:\s*blur\(/);
  assert.match(stylesheet, /\.ctdp-btn-primary,\s*\.ctdp-btn-strong\s*\{[\s\S]*?background:\s*rgba\(/);
});
