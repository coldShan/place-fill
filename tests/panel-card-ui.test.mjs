import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const orchestratorScript = readFileSync(join(here, "../extension/src/content-script.js"), "utf8");
const panelScript = readFileSync(join(here, "../extension/src/content-script-panel.js"), "utf8");
const smartfillScript = readFileSync(join(here, "../extension/src/content-script-smartfill.js"), "utf8");

test("panel cards are whole-card copy targets with a single copied-state marker", () => {
  assert.match(panelScript, /copiedFieldKey:\s*null/);
  assert.match(panelScript, /data-role="copy-card"/);
  assert.match(panelScript, /data-copied="/);
  assert.match(panelScript, /ctdp-card-icon/);
  assert.match(panelScript, /ctdp-card-body/);
  assert.match(panelScript, /ctdp-card-text/);
  assert.doesNotMatch(panelScript, /data-role="copy-field"/);
  assert.doesNotMatch(panelScript, /ctdp-card-index/);
});

test("dock and smart-fill buttons use icon markup instead of visible text labels", () => {
  assert.match(panelScript, /renderIconMarkup\(iconAssetsApi\.PRIMARY_LOGO_ICON/);
  assert.match(smartfillScript, /data-role="smart-fill-trigger"/);
  assert.match(smartfillScript, /data-role="smart-fill-item"/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-item-label/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-item-hint/);
  assert.doesNotMatch(panelScript, /展开测试数据面板">测试数据<\/button>/);
});

test("panel toolbar keeps settings on the left and github plus two actions on the right", () => {
  assert.match(panelScript, /<header class="ctdp-toolbar">[\s\S]*?ctdp-toolbar-group-left[\s\S]*?data-role="open-settings"[\s\S]*?ctdp-toolbar-group-right[\s\S]*?data-role="regen"[\s\S]*?data-role="copy-all"[\s\S]*?data-role="open-repository"/);
  assert.match(panelScript, /data-role="open-settings" aria-label="打开设置" title="打开设置"/);
  assert.match(panelScript, /data-role="open-repository" aria-label="打开 GitHub 仓库" title="打开 GitHub 仓库"/);
  assert.match(panelScript, /data-role="regen" aria-label="重新生成全部" title="重新生成全部"/);
  assert.match(panelScript, /data-role="copy-all" aria-label="复制整组数据" title="复制整组数据"/);
  assert.doesNotMatch(panelScript, /data-role="collapse" aria-label="收起面板" title="收起面板"/);
  assert.doesNotMatch(panelScript, /ctdp-btn-text/);
});

test("single-card copy does not trigger panel-wide flash feedback", () => {
  assert.match(panelScript, /copyText\(state\.profile\[key\],\s*\{\s*flashTone:\s*null,\s*manualFlashTone:\s*null\s*\}\)/);
  assert.match(panelScript, /copyText\(generators\.formatProfileForCopy\(state\.profile,\s*state\.visibleFieldKeys\)\)/);
});

test("single-card copy only syncs copied state instead of rerendering the full grid", () => {
  assert.match(panelScript, /function syncCopiedCardState\(\)/);
  assert.match(panelScript, /async function copyField\(key\)\s*\{[\s\S]*?syncCopiedCardState\(\);[\s\S]*?\}/);
});

test("panel footer renders version info and update trigger while keeping fallback copy hidden by default", () => {
  assert.doesNotMatch(panelScript, /ctdp-status-text/);
  assert.doesNotMatch(panelScript, /ctdp-status-time/);
  assert.doesNotMatch(panelScript, /data-role="status"/);
  assert.doesNotMatch(panelScript, /data-role="status-time"/);
  assert.doesNotMatch(panelScript, /<footer class="ctdp-footer">[\s\S]*?data-role="copy-all"/);
  assert.match(panelScript, /<footer class="ctdp-footer" data-role="footer">/);
  assert.match(panelScript, /data-role="panel-version"/);
  assert.match(panelScript, /data-role="version-status"/);
  assert.match(panelScript, /data-role="check-update" aria-label="检查更新" title="检查更新"/);
  assert.doesNotMatch(panelScript, /data-role="footer" hidden/);
});

test("panel footer adds a settings entry and the panel includes a dedicated settings view", () => {
  assert.match(panelScript, /<header class="ctdp-toolbar"[\s\S]*?data-role="open-settings"/);
  assert.doesNotMatch(panelScript, /<footer class="ctdp-footer"[\s\S]*?data-role="open-settings"/);
  assert.match(panelScript, /data-role="settings-view"/);
  assert.match(panelScript, /data-role="settings-back" aria-label="返回主面板" title="返回主面板"/);
  assert.match(panelScript, /data-role="site-feature-toggle"/);
  assert.match(panelScript, /data-role="site-feature-status"/);
  assert.match(panelScript, /当前站点已启用智能识别和右键标注/);
  assert.match(panelScript, /当前站点已停用智能识别和右键标注/);
  assert.doesNotMatch(panelScript, /关闭后，当前站点不启用智能识别和右键标注，其余功能不受影响/);
  assert.match(panelScript, /data-role="field-visibility-list"/);
  assert.match(panelScript, /data-role="field-visibility-toggle"/);
  assert.match(panelScript, /data-role="export-overrides"/);
  assert.match(panelScript, /data-role="import-overrides"/);
  assert.match(panelScript, /data-role="export-sanitized-overrides"/);
  assert.match(panelScript, /data-role="import-file"/);
});

test("panel renders and copies only the currently visible field keys", () => {
  assert.match(panelScript, /visibleFieldKeys:\s*fieldVisibilityApi\.getDefaultVisibleFieldKeys\(\)/);
  assert.match(panelScript, /state\.visibleFieldKeys\s*\.map\(function \(key\)/);
  assert.match(panelScript, /fieldVisibilityApi\.writeVisibleFieldKeys/);
  assert.match(panelScript, /loadVisibleFieldKeys/);
  assert.match(panelScript, /onVisibleFieldKeysChanged\(state\.visibleFieldKeys\)/);
});

test("manual copy fallback uses accurate failure wording instead of browser support wording", () => {
  assert.match(panelScript, /自动复制失败时，按 <strong>Ctrl\/Cmd \+ C<\/strong> 手动复制/);
  assert.doesNotMatch(panelScript, /自动复制被阻止时/);
});

test("smart fill menu supports right-click manual annotation and regenerates only the used field", () => {
  assert.match(panelScript, /function regenerateFieldValue\(fieldKey\)/);
  assert.match(panelScript, /siteFeatureEnabled:\s*siteFeatureToggleApi\.getDefaultSiteFeatureEnabled\(\)/);
  assert.match(panelScript, /readSiteFeatureEnabled/);
  assert.match(panelScript, /writeSiteFeatureEnabled/);
  assert.match(smartfillScript, /function renderSmartFillMenuMarkup\(primaryFieldKey\)/);
  assert.match(smartfillScript, /const isEnabled = typeof opts\.isEnabled === "function"/);
  assert.match(smartfillScript, /if \(!isEnabled\(\)\) \{\s*hideSmartButton\(\);\s*return;\s*\}/);
  assert.match(smartfillScript, /getSmartFillMenuFieldKeys\(primaryFieldKey,\s*visibleFieldKeys\)/);
  assert.match(smartfillScript, /fillCurrentTarget\(fieldKey\)[\s\S]*?onFieldFilled\(fieldKey\)/);
  assert.match(smartfillScript, /function fillTarget\(target,\s*fieldKey\)/);
  assert.match(smartfillScript, /if \(!fieldKey\) \{\s*hideSmartButton\(\);\s*return;\s*\}/);
  assert.match(smartfillScript, /if \(role === "smart-fill-trigger"\) \{[\s\S]*?fillCurrentTarget\(activeSmartFieldKey\)/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("mouseenter", function \(\) \{\s*setSmartButtonExpanded\(true\);/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("mouseleave", function \(\) \{\s*setSmartButtonExpanded\(false\);/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("focusin", function \(\) \{\s*setSmartButtonExpanded\(true\);/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("focusout", function \(\) \{\s*setSmartButtonExpanded\(false\);/);
  assert.match(orchestratorScript, /document\.addEventListener\(\s*"contextmenu"/);
  assert.match(orchestratorScript, /sync-site-feature-context-menu/);
  assert.match(orchestratorScript, /message\.type === "apply-smart-fill-override"/);
  assert.match(orchestratorScript, /message\.type === "clear-smart-fill-override"/);
  assert.match(orchestratorScript, /onSiteFeatureEnabledChanged/);
  assert.match(orchestratorScript, /isEnabled:\s*panelController\.isSiteFeatureEnabled/);
  assert.match(orchestratorScript, /setManualFieldOverride/);
  assert.match(orchestratorScript, /panelController\.loadVisibleFieldKeys\(\)\.then/);
  assert.match(orchestratorScript, /smartFillController\.fillTarget\(target,\s*message\.fieldKey\)/);
  assert.match(orchestratorScript, /clearManualFieldOverride/);
  assert.match(orchestratorScript, /syncTarget/);
  assert.doesNotMatch(smartfillScript, /let smartCollapseTimer = null/);
  assert.doesNotMatch(smartfillScript, /function scheduleSmartButtonCollapse\(\)/);
  assert.doesNotMatch(smartfillScript, /function cancelSmartButtonCollapse\(\)/);
});

test("content script is reduced to orchestration across dedicated controllers", () => {
  assert.match(orchestratorScript, /createContentScriptPanelController/);
  assert.match(orchestratorScript, /createContentScriptSmartFillController/);
  assert.match(orchestratorScript, /panelController\.mount\(\)/);
  assert.match(orchestratorScript, /smartFillController\.mount\(\)/);
  assert.match(orchestratorScript, /panelController\.toggleVisible\(\)/);
  assert.match(orchestratorScript, /document\.addEventListener\(\s*"focusin",[\s\S]*?panelController\.handleDocumentFocusIn\(event\.target\)/);
  assert.match(orchestratorScript, /document\.addEventListener\(\s*"pointerdown",[\s\S]*?panelController\.handleDocumentPointerDown\(event\.target\)/);
  assert.match(orchestratorScript, /smartFillController\.resolveManualOverrideTarget\(\)/);
});
