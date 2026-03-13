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
  // 使用 CSS 嵌套语法，copied 状态在 &[data-copied] 嵌套块中，触发 pop 弹跳动画
  assert.match(stylesheet, /&\[data-copied="true"\]\s*\{[^}]*animation:\s*ctdp-card-pop/);
});
