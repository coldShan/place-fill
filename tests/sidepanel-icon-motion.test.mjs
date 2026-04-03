import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("icon system keeps dock icon static while preserving other motion hooks", () => {
  assert.match(stylesheet, /\.ctdp-icon\s*\{/);
  assert.match(stylesheet, /\.ctdp-dock-icon\s*\{/);
  assert.match(stylesheet, /\.ctdp-smartfill-icon\s*\{/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\]/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\][\s\S]*?background-image:[\s\S]*?linear-gradient\(var\(--ctdp-smartfocus-surface/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\][\s\S]*?background-clip:\s*padding-box,\s*border-box !important/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\][\s\S]*?outline:\s*none !important/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\][\s\S]*?border-color:\s*transparent !important/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\]\[data-ctdp-smartfocus-visible="true"\]\s*\{/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\]\[data-ctdp-smartfocus-visible="true"\][\s\S]*?box-shadow:/);
  assert.match(stylesheet, /\[data-ctdp-smartfocus-target="true"\]\[data-ctdp-smartfocus-visible="true"\][\s\S]*?animation:\s*ctdp-focus-aurora-shift 4s ease infinite/);
  assert.match(stylesheet, /\[data-ctdp-focus-style="bold"\]\s*\[data-ctdp-smartfocus-target="true"\]/);
  assert.match(stylesheet, /\.ctdp-dock-icon\s*\{[\s\S]*?\bwidth:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-dock-icon\s*\{[\s\S]*?\bheight:\s*42px;/);
  assert.match(stylesheet, /\.ctdp-dock-icon\s*\{[\s\S]*?\bfilter:\s*drop-shadow\(/);
  assert.match(stylesheet, /\.ctdp-dock-icon\s*\{[\s\S]*?\btransition:[\s\S]*?\bfilter 180ms ease/);
  assert.match(stylesheet, /\.ctdp-smartfill\s*\{[\s\S]*?z-index:\s*999999/);
  assert.match(stylesheet, /@keyframes ctdp-card-pop/);
  assert.match(stylesheet, /@keyframes ctdp-focus-aurora-shift/);
  assert.doesNotMatch(stylesheet, /\.ctdp-smartfocus\s*\{/);
  assert.doesNotMatch(stylesheet, /\.ctdp-dock-icon\s*\{[\s\S]*?\banimation:/);
  assert.doesNotMatch(stylesheet, /\.ctdp-dock:hover\s+\.ctdp-dock-icon\s*\{[^}]*\btransform:/);
  assert.match(stylesheet, /\.ctdp-dock:hover\s+\.ctdp-dock-icon\s*\{[\s\S]*?\bfilter:\s*drop-shadow\(/);
  assert.doesNotMatch(stylesheet, /@keyframes ctdp-icon-orbit/);
});
