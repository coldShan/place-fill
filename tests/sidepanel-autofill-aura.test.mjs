import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("auto fill aura frames the full viewport without blocking the page", () => {
  assert.match(stylesheet, /\.ctdp-autofill-aura\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(stylesheet, /\.ctdp-autofill-aura\s*\{[\s\S]*?inset:\s*0;/);
  assert.match(stylesheet, /\.ctdp-autofill-aura\s*\{[\s\S]*?pointer-events:\s*none;/);
  assert.match(stylesheet, /\.ctdp-root\[data-autofill-running="true"\]\s+\.ctdp-autofill-aura/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::before\s*\{[\s\S]*?linear-gradient\(90deg/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::after\s*\{[\s\S]*?box-shadow:/);
});

test("auto fill aura paints only the frame and keeps the page center transparent", () => {
  assert.match(stylesheet, /\.ctdp-autofill-aura::before\s*\{[^}]*-webkit-mask:/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::before\s*\{[^}]*mask-composite:\s*exclude;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-autofill-aura::before\s*\{[^}]*padding-box/);
});

test("auto fill aura clips glow inside the viewport without creating scroll overflow", () => {
  assert.match(stylesheet, /\.ctdp-autofill-aura\s*\{[^}]*overflow:\s*hidden;/);
  assert.match(stylesheet, /\.ctdp-autofill-aura\s*\{[^}]*contain:\s*paint;/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::after\s*\{[^}]*inset:\s*6px;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-autofill-aura::after\s*\{[^}]*inset:\s*0;/);
});

test("auto fill aura uses a page-agent strength edge glow", () => {
  assert.match(stylesheet, /\.ctdp-autofill-aura::before\s*\{[^}]*padding:\s*3px;/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::before\s*\{[^}]*rgba\(255,\s*113,\s*113,\s*0\.98\)/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::after\s*\{[^}]*inset 28px 0 72px rgba\(236,\s*72,\s*153,\s*0\.26\)/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::after\s*\{[^}]*inset -28px 0 78px rgba\(56,\s*189,\s*248,\s*0\.30\)/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::after\s*\{[^}]*inset 0 24px 64px rgba\(248,\s*113,\s*113,\s*0\.18\)/);
  assert.match(stylesheet, /\.ctdp-autofill-aura::after\s*\{[^}]*inset 0 -26px 72px rgba\(168,\s*85,\s*247,\s*0\.22\)/);
});

test("auto fill aura includes a restrained thinking status strip", () => {
  assert.match(stylesheet, /\.ctdp-autofill-status\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(stylesheet, /\.ctdp-autofill-status\s*\{[\s\S]*?bottom:\s*clamp/);
  assert.match(stylesheet, /\.ctdp-autofill-dot\s*\{[\s\S]*?animation:\s*ctdp-autofill-dot-pulse/);
  assert.match(stylesheet, /@keyframes ctdp-autofill-aura-sweep/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?ctdp-autofill-aura/);
});
