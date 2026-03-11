import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../src/sidepanel.css"), "utf8");

test("icon system keeps dock icon static while preserving other motion hooks", () => {
  assert.match(stylesheet, /\.ctdp-icon\s*\{/);
  assert.match(stylesheet, /\.ctdp-dock-icon\s*\{/);
  assert.match(stylesheet, /\.ctdp-smartfill-icon\s*\{/);
  assert.match(stylesheet, /@keyframes ctdp-copied-pulse/);
  assert.doesNotMatch(stylesheet, /\.ctdp-dock-icon\s*\{[\s\S]*?\banimation:/);
  assert.doesNotMatch(stylesheet, /\.ctdp-dock:hover\s+\.ctdp-dock-icon\s*\{[\s\S]*?\btransform:/);
  assert.doesNotMatch(stylesheet, /@keyframes ctdp-icon-orbit/);
});
