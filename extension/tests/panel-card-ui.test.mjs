import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../src/content-script.js"), "utf8");

test("panel cards are whole-card copy targets with a single copied-state marker", () => {
  assert.match(script, /copiedFieldKey:\s*null/);
  assert.match(script, /data-role="copy-card"/);
  assert.match(script, /data-copied="/);
  assert.match(script, /ctdp-card-icon/);
  assert.match(script, /ctdp-card-body/);
  assert.match(script, /ctdp-card-text/);
  assert.doesNotMatch(script, /data-role="copy-field"/);
  assert.doesNotMatch(script, /ctdp-card-index/);
});

test("dock and smart-fill buttons use icon markup instead of visible text labels", () => {
  assert.match(script, /renderIconMarkup\(iconAssetsApi\.PRIMARY_LOGO_ICON/);
  assert.match(script, /data-role="smart-fill-trigger"/);
  assert.match(script, /data-role="smart-fill-item"/);
  assert.doesNotMatch(script, /ctdp-smartfill-item-label/);
  assert.doesNotMatch(script, /ctdp-smartfill-item-hint/);
  assert.doesNotMatch(script, /展开测试数据面板">测试数据<\/button>/);
});

test("panel toolbar keeps three icon-only action buttons aligned to the top right", () => {
  assert.match(script, /<header class="ctdp-toolbar">[\s\S]*?data-role="regen"[\s\S]*?data-role="copy-all"[\s\S]*?data-role="collapse"/);
  assert.match(script, /data-role="regen" aria-label="重新生成全部" title="重新生成全部"/);
  assert.match(script, /data-role="copy-all" aria-label="复制整组数据" title="复制整组数据"/);
  assert.match(script, /data-role="collapse" aria-label="收起面板" title="收起面板"/);
  assert.doesNotMatch(script, /ctdp-btn-text/);
});

test("single-card copy does not trigger panel-wide flash feedback", () => {
  assert.match(script, /copyText\(state\.profile\[key\],\s*\{\s*flashTone:\s*null,\s*manualFlashTone:\s*null\s*\}\)/);
  assert.match(script, /copyText\(generators\.formatProfileForCopy\(state\.profile\)\)/);
});

test("single-card copy only syncs copied state instead of rerendering the full grid", () => {
  assert.match(script, /function syncCopiedCardState\(\)/);
  assert.match(script, /async function copyField\(key\)\s*\{[\s\S]*?syncCopiedCardState\(\);[\s\S]*?\n  }\n\n  async function copyAll/);
  assert.doesNotMatch(script, /async function copyField\(key\)\s*\{[\s\S]*?render\(\);[\s\S]*?\n  }\n\n  async function copyAll/);
});

test("panel footer no longer renders status text or refresh timestamp", () => {
  assert.doesNotMatch(script, /ctdp-status-text/);
  assert.doesNotMatch(script, /ctdp-status-time/);
  assert.doesNotMatch(script, /data-role="status"/);
  assert.doesNotMatch(script, /data-role="status-time"/);
  assert.doesNotMatch(script, /<footer class="ctdp-footer">[\s\S]*?data-role="copy-all"/);
});

test("panel footer adds a settings entry and the panel includes a dedicated settings view", () => {
  assert.match(script, /<footer class="ctdp-footer"[\s\S]*?data-role="open-settings"/);
  assert.match(script, /data-role="open-settings" aria-label="打开设置" title="打开设置"/);
  assert.match(script, /data-role="settings-view"/);
  assert.match(script, /data-role="settings-back" aria-label="返回主面板" title="返回主面板"/);
  assert.match(script, /data-role="export-overrides"/);
  assert.match(script, /data-role="import-overrides"/);
  assert.match(script, /data-role="export-sanitized-overrides"/);
  assert.match(script, /data-role="import-file"/);
});

test("manual copy fallback uses accurate failure wording instead of browser support wording", () => {
  assert.match(script, /自动复制失败时，按 <strong>Ctrl\/Cmd \+ C<\/strong> 手动复制/);
  assert.doesNotMatch(script, /自动复制被阻止时/);
});

test("smart fill menu supports right-click manual annotation and regenerates only the used field", () => {
  assert.match(script, /function regenerateFieldValue\(fieldKey\)/);
  assert.match(script, /function renderSmartFillMenuMarkup\(primaryFieldKey\)/);
  assert.match(script, /getSmartFillMenuFieldKeys\(primaryFieldKey\)/);
  assert.match(script, /fillCurrentTarget\(fieldKey\)[\s\S]*?regenerateFieldValue\(fieldKey\)/);
  assert.match(script, /if \(!fieldKey\) \{\s*hideSmartButton\(\);\s*return;\s*\}/);
  assert.match(script, /if \(role === "smart-fill-trigger"\) \{[\s\S]*?fillCurrentTarget\(activeSmartFieldKey\)/);
  assert.match(script, /smartButton\.addEventListener\("mouseenter", function \(\) \{\s*setSmartButtonExpanded\(true\);/);
  assert.match(script, /smartButton\.addEventListener\("mouseleave", function \(\) \{\s*setSmartButtonExpanded\(false\);/);
  assert.match(script, /smartButton\.addEventListener\("focusin", function \(\) \{\s*setSmartButtonExpanded\(true\);/);
  assert.match(script, /smartButton\.addEventListener\("focusout", function \(\) \{\s*setSmartButtonExpanded\(false\);/);
  assert.match(script, /document\.addEventListener\(\s*"contextmenu"/);
  assert.match(script, /message\.type === "apply-smart-fill-override"/);
  assert.match(script, /message\.type === "clear-smart-fill-override"/);
  assert.match(script, /setManualFieldOverride/);
  assert.match(script, /clearManualFieldOverride/);
  assert.match(script, /syncSmartButtonForTarget/);
  assert.doesNotMatch(script, /let smartCollapseTimer = null/);
  assert.doesNotMatch(script, /function scheduleSmartButtonCollapse\(\)/);
  assert.doesNotMatch(script, /function cancelSmartButtonCollapse\(\)/);
});
