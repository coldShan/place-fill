import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const stylesheet = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");

test("card copied feedback only animates activation, not deactivation transitions", () => {
  // 行式卡片设计：hover 用 background-color 过渡，不用 transform（行不会浮起）
  assert.match(stylesheet, /\.ctdp-card\s*\{[^}]*transition:\s*background-color 140ms ease;/);
  assert.doesNotMatch(stylesheet, /\.ctdp-card\s*\{[^}]*transform 160ms ease/);
  assert.doesNotMatch(stylesheet, /\.ctdp-card\s*\{[^}]*box-shadow 160ms ease/);
  // copied 状态选择器触发 pop 弹跳动画
  assert.match(stylesheet, /\.ctdp-card\[data-copied="true"\]\s*\{[^}]*animation:\s*ctdp-card-pop/);
});

test("favorite data cards use white surfaces instead of dark colored card backgrounds", () => {
  assert.match(stylesheet, /\.ctdp-bizcard\[data-card-kind="favorite-a"\],\s*\.ctdp-bizcard\[data-card-kind="favorite-b"\]\s*\{[\s\S]*?--ctdp-bizcard-background:\s*#fff;/);
  assert.match(stylesheet, /\.ctdp-bizcard\[data-card-kind="favorite-a"\],\s*\.ctdp-bizcard\[data-card-kind="favorite-b"\]\s*\{[\s\S]*?--ctdp-bizcard-value:\s*rgba\(31,\s*41,\s*55,\s*0\.92\);/);
  assert.match(stylesheet, /\.ctdp-bizcard\[data-card-kind="favorite-a"\]\s+\.ctdp-bizcard-paper,\s*\.ctdp-bizcard\[data-card-kind="favorite-b"\]\s+\.ctdp-bizcard-paper\s*\{[\s\S]*?box-shadow:\s*[\s\S]*?0 8px 18px rgba\(31,\s*41,\s*55,\s*0\.08\);/);
  assert.doesNotMatch(stylesheet, /\.ctdp-bizcard\[data-card-kind="favorite-a"\]\s+\.ctdp-bizcard-paper,\s*\.ctdp-bizcard\[data-card-kind="favorite-b"\]\s+\.ctdp-bizcard-paper\s*\{[\s\S]*?rgba\(0,\s*0,\s*0,/);
  assert.doesNotMatch(stylesheet, /\.ctdp-bizcard-badge/);
  assert.doesNotMatch(stylesheet, /--ctdp-bizcard-accent/);
});

test("generated card keeps its shadow close and softly diffused", () => {
  assert.match(stylesheet, /\.ctdp-bizcard-paper\s*\{[\s\S]*?0 2px 4px rgba\(15,\s*23,\s*42,\s*0\.14\),[\s\S]*?0 10px 24px rgba\(15,\s*23,\s*42,\s*0\.12\);/);
  assert.doesNotMatch(stylesheet, /0 12px 28px rgba\(0,\s*0,\s*0,\s*0\.30\)/);
  assert.doesNotMatch(stylesheet, /0 24px 50px rgba\(0,\s*0,\s*0,\s*0\.18\)/);
});

test("generated card uses a yellow gradient with layered blue typography", () => {
  assert.match(stylesheet, /--ctdp-bizcard-background:\s*linear-gradient\(145deg,\s*#F8E07A 0%,\s*#F4D758 100%\);/);
  assert.match(stylesheet, /--ctdp-bizcard-name:\s*linear-gradient\(135deg,\s*#123F73,\s*#1C5B99\);/);
  assert.match(stylesheet, /--ctdp-bizcard-muted:\s*#255887;/);
  assert.match(stylesheet, /--ctdp-bizcard-subtle:\s*#2A6094;/);
  assert.match(stylesheet, /--ctdp-bizcard-icon:\s*#356A9E;/);
  assert.match(stylesheet, /--ctdp-bizcard-value:\s*#174F88;/);
  assert.match(stylesheet, /\.ctdp-bizcard\[data-card-kind="generated"\] \.ctdp-bizcard-paper::before\s*\{[\s\S]*?opacity:\s*0\.06;[\s\S]*?mix-blend-mode:\s*soft-light;/);
});
