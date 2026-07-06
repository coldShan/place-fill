import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const orchestratorScript = readFileSync(join(here, "../extension/src/content-script.js"), "utf8");
const panelScript = readFileSync(join(here, "../extension/src/content-script-panel.js"), "utf8");
const smartfillScript = readFileSync(join(here, "../extension/src/content-script-smartfill.js"), "utf8");
const panelControllerPkg = await import("../extension/src/content-script-panel.js");
const { sampleFavoriteProfiles } = panelControllerPkg.default || panelControllerPkg;

function createFavorite(id, fullName) {
  return {
    id,
    profile: {
      creditCode: "",
      companyName: fullName + "科技",
      fullName,
      idNumber: "",
      bankCard: "",
      account: "",
      mobile: "13300000000",
      email: "",
      landline: "",
      address: ""
    }
  };
}

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

test("floating panel samples up to five common-data cards without mutating favorites", () => {
  const favorites = [
    createFavorite("a", "张一"),
    createFavorite("b", "李二"),
    createFavorite("c", "王三"),
    createFavorite("d", "赵四"),
    createFavorite("e", "钱五"),
    createFavorite("f", "孙六")
  ];
  const samples = sampleFavoriteProfiles(favorites, 5, [0.9, 0, 0.4, 0.7, 0].shift.bind([0.9, 0, 0.4, 0.7, 0]));

  assert.deepEqual(samples.map(function (profile) { return profile && profile.fullName; }), ["孙六", "张一", "王三", "钱五", "李二"]);
  assert.deepEqual(favorites.map(function (entry) { return entry.id; }), ["a", "b", "c", "d", "e", "f"]);
});

test("floating panel renders common-data cards only when favorites exist", () => {
  assert.deepEqual(
    sampleFavoriteProfiles([createFavorite("a", "张一")], 5, function () { return 0; }).map(function (profile) { return profile && profile.fullName; }),
    ["张一"]
  );
  assert.deepEqual(sampleFavoriteProfiles([], 5, function () { return 0; }), []);
});

test("floating panel renders one generated card and up to five common-data style cards", () => {
  assert.match(panelScript, /favoriteCardProfiles:\s*\[\]/);
  assert.match(panelScript, /function refreshFavoriteCardProfiles\(\)/);
  assert.match(panelScript, /function loadFavoriteProfiles\(\)/);
  assert.match(panelScript, /renderProfileCard\(state\.profile,\s*0,\s*"generated",\s*"暂无随机数据"/);
  assert.match(panelScript, /state\.favoriteCardProfiles\.forEach\(function \(profile,\s*index\)/);
  assert.match(panelScript, /renderProfileCard\(profile,\s*index \+ 1,\s*index === 0 \? "favorite-a" : "favorite-b",\s*""\)/);
  assert.match(panelScript, /sampleFavoriteProfiles\(state\.favoriteProfiles,\s*5\)/);
  assert.doesNotMatch(panelScript, /暂无常用数据/);
  assert.doesNotMatch(panelScript, /ctdp-bizcard-badge/);
  assert.match(panelScript, /function regenerateProfile\(\) \{[\s\S]*?refreshFavoriteCardProfiles\(\);[\s\S]*?loadFavoriteProfiles\(\);[\s\S]*?\}/);
  assert.match(panelScript, /if \(role === "regen"\) \{[\s\S]*?regenerateProfile\(\);/);
});

test("common-data cards keep light hover shadow instead of generated-card dark shadow", () => {
  assert.match(panelScript, /const cardKind = card && card\.getAttribute\("data-card-kind"\);/);
  assert.match(panelScript, /if \(cardKind !== "generated"\) \{[\s\S]*?0 8px 18px rgba\(31,41,55,0\.08\)[\s\S]*?return;/);
});

test("dock and smart-fill buttons use icon markup instead of visible text labels", () => {
  assert.match(panelScript, /renderIconMarkup\(iconAssetsApi\.PRIMARY_LOGO_ICON/);
  assert.match(smartfillScript, /data-role="smart-fill-trigger"/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-trigger"/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-panel"/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-item"/);
  assert.match(smartfillScript, /renderIconMarkup\("star",\s*"ctdp-smartfill-recommend-icon",\s*"推荐数据"\)/);
  assert.doesNotMatch(smartfillScript, /data-role="smart-fill-item"/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-recommend-trigger-text/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-item-label/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-item-hint/);
  assert.doesNotMatch(panelScript, /展开测试数据面板">测试数据<\/button>/);
});

test("panel toolbar keeps settings on the left and github plus two actions on the right", () => {
  assert.match(panelScript, /<header class="ctdp-toolbar">[\s\S]*?ctdp-toolbar-group-left[\s\S]*?data-role="open-settings"[\s\S]*?data-role="open-data-manager"[\s\S]*?ctdp-toolbar-group-right[\s\S]*?data-role="regen"[\s\S]*?data-role="copy-all"[\s\S]*?data-role="open-repository"/);
  assert.match(panelScript, /data-role="open-settings" aria-label="打开设置" title="打开设置"/);
  assert.match(panelScript, /data-role="open-data-manager" aria-label="打开数据管理" title="打开数据管理"/);
  assert.match(panelScript, /class="ctdp-btn ctdp-btn-primary is-hidden" type="button" data-role="open-repository" aria-label="打开 GitHub 仓库" title="打开 GitHub 仓库"/);
  assert.match(panelScript, /data-role="regen" aria-label="重新生成全部" title="重新生成全部"/);
  assert.match(panelScript, /data-role="copy-all" aria-label="复制整组数据" title="复制整组数据"/);
  assert.doesNotMatch(panelScript, /data-role="collapse" aria-label="收起面板" title="收起面板"/);
  assert.doesNotMatch(panelScript, /ctdp-btn-text/);
});

test("single-card copy does not trigger panel-wide flash feedback", () => {
  assert.match(panelScript, /copyText\(profile\[key\],\s*\{\s*flashTone:\s*null,\s*manualFlashTone:\s*null\s*\}\)/);
  assert.match(panelScript, /copyText\(generators\.formatProfileForCopy\(state\.profile,\s*state\.visibleFieldKeys\)\)/);
});

test("single-card copy only syncs copied state instead of rerendering the full grid", () => {
  assert.match(panelScript, /function syncCopiedCardState\(\)/);
  assert.match(panelScript, /async function copyField\(key,\s*profileIndex\)\s*\{[\s\S]*?syncCopiedCardState\(\);[\s\S]*?\}/);
});

test("auto fill toggles a page aura overlay while filling targets", () => {
  assert.match(panelScript, /class="ctdp-autofill-aura" data-role="autofill-aura"/);
  assert.match(panelScript, /class="ctdp-autofill-status"/);
  assert.match(panelScript, /data-role="autofill-status-text">Thinking\.\.\./);
  assert.match(panelScript, /function setAutoFillPageAuraState\(running\)/);
  assert.match(panelScript, /root\.setAttribute\("data-autofill-running",\s*String\(running\)\)/);
  assert.match(panelScript, /setAutoFillPageAuraState\(true\)[\s\S]*?try\s*\{/);
  assert.match(panelScript, /finally\s*\{[\s\S]*?setAutoFillPageAuraState\(false\)/);
});

test("panel footer renders version info and update trigger while keeping fallback copy hidden by default", () => {
  assert.doesNotMatch(panelScript, /ctdp-status-text/);
  assert.doesNotMatch(panelScript, /ctdp-status-time/);
  assert.doesNotMatch(panelScript, /data-role="status"/);
  assert.doesNotMatch(panelScript, /data-role="status-time"/);
  assert.doesNotMatch(panelScript, /<footer class="ctdp-footer">[\s\S]*?data-role="copy-all"/);
  assert.match(panelScript, /<footer class="ctdp-footer" data-role="footer">/);
  assert.match(panelScript, /data-role="panel-version"/);
  assert.match(panelScript, /class="ctdp-footer-status is-hidden" data-role="version-status" data-tone="muted"/);
  assert.match(panelScript, /class="ctdp-btn ctdp-footer-btn is-hidden" type="button" data-role="check-update" aria-label="检查更新" title="检查更新"/);
  assert.doesNotMatch(panelScript, /data-role="footer" hidden/);
});

test("github button, check-update button and version-status are hidden by default and controlled by runtime probe", () => {
  assert.match(panelScript, /class="[^"]*\bis-hidden\b[^"]*"[^>]*data-role="open-repository"/);
  assert.match(panelScript, /class="[^"]*\bis-hidden\b[^"]*"[^>]*data-role="check-update"/);
  assert.match(panelScript, /class="[^"]*\bis-hidden\b[^"]*"[^>]*data-role="version-status"/);
  assert.doesNotMatch(panelScript, /navigator\.onLine/);
  assert.doesNotMatch(panelScript, /addEventListener\("online"/);
  assert.doesNotMatch(panelScript, /addEventListener\("offline"/);
  assert.doesNotMatch(panelScript, /requestGithubControlsRefresh/);
  assert.doesNotMatch(panelScript, /refreshGithubControls/);
  assert.doesNotMatch(panelScript, /shouldRevealGithubControls/);
  assert.match(panelScript, /async function checkForUpdates\(\)/);
});

test("panel footer adds a settings entry and the panel includes a dedicated settings view", () => {
  assert.match(panelScript, /<header class="ctdp-toolbar"[\s\S]*?data-role="open-settings"/);
  assert.doesNotMatch(panelScript, /<footer class="ctdp-footer"[\s\S]*?data-role="open-settings"/);
  assert.match(panelScript, /data-role="settings-view"/);
  assert.match(panelScript, /data-role="settings-back" aria-label="返回主面板" title="返回主面板"/);
  assert.match(panelScript, /data-role="site-feature-toggle"/);
  assert.match(panelScript, /data-role="site-feature-status"/);
  assert.match(panelScript, /data-site-feature-enabled/);
  assert.match(panelScript, /root\.setAttribute\("data-site-feature-enabled",\s*String\(state\.siteFeatureEnabled\)\)/);
  assert.match(panelScript, /当前站点已启用智能识别和右键标注/);
  assert.match(panelScript, /当前站点已停用智能识别和右键标注/);
  assert.doesNotMatch(panelScript, /关闭后，当前站点不启用智能识别和右键标注，其余功能不受影响/);
  assert.match(panelScript, /data-role="field-visibility-list"/);
  assert.match(panelScript, /data-role="field-visibility-toggle"/);
  assert.match(panelScript, /data-role="export-overrides"/);
  assert.match(panelScript, /data-role="import-overrides"/);
  assert.match(panelScript, /data-role="export-sanitized-overrides"/);
  assert.match(panelScript, /data-role="export-full-backup"/);
  assert.match(panelScript, /data-role="import-full-backup"/);
  assert.match(panelScript, /data-role="import-file"/);
});

test("settings view supports full data backup and restore", () => {
  assert.match(panelScript, /FULL_BACKUP_FORMAT\s*=\s*"place-fill-full-backup"/);
  assert.match(panelScript, /"ctdp\.favoriteProfiles\.v1"/);
  assert.match(panelScript, /"ctdp\.generatedProfiles\.v1"/);
  assert.match(panelScript, /"ctdp\.smartFillOverrides\.v1"/);
  assert.match(panelScript, /"ctdp\.visibleFieldKeys\.v1"/);
  assert.match(panelScript, /"ctdp\.siteFeatureEnabled\.v1"/);
  assert.match(panelScript, /function exportFullBackup\(\)/);
  assert.match(panelScript, /function importFullBackupFile\(file\)/);
  assert.match(panelScript, /place-fill-full-backup\.json/);
});

test("panel renders and copies only the currently visible field keys", () => {
  assert.match(panelScript, /visibleFieldKeys:\s*fieldVisibilityApi\.getDefaultVisibleFieldKeys\(\)/);
  assert.match(panelScript, /state\.visibleFieldKeys\.filter/);
  assert.match(panelScript, /HIDDEN_BIZCARD_FIELD_KEYS\s*=\s*\["account"\]/);
  assert.match(panelScript, /fieldVisibilityApi\.writeVisibleFieldKeys/);
  assert.match(panelScript, /loadVisibleFieldKeys/);
  assert.match(panelScript, /onVisibleFieldKeysChanged\(state\.visibleFieldKeys\)/);
});

test("manual copy fallback uses accurate failure wording instead of browser support wording", () => {
  assert.match(panelScript, /自动复制失败时，按 <strong>Ctrl\/Cmd \+ C<\/strong> 手动复制/);
  assert.doesNotMatch(panelScript, /自动复制被阻止时/);
});

test("smart fill menu supports right-click manual annotation and regenerates only the used field", () => {
  assert.match(panelScript, /ChromeTestDataDataRecords/);
  assert.match(panelScript, /recordGeneratedProfile/);
  assert.match(panelScript, /function regenerateFieldValue\(fieldKey\)/);
  assert.match(panelScript, /siteFeatureEnabled:\s*siteFeatureToggleApi\.getDefaultSiteFeatureEnabled\(\)/);
  assert.match(panelScript, /readSiteFeatureEnabled/);
  assert.match(panelScript, /writeSiteFeatureEnabled/);
  assert.match(smartfillScript, /function renderSmartFillMenuMarkup\(primaryFieldKey\)/);
  assert.match(smartfillScript, /function resolveFocusTargetSurfaceColor\(target\)/);
  assert.match(smartfillScript, /--ctdp-smartfocus-surface/);
  assert.match(smartfillScript, /const FOCUS_RING_FADE_OUT_MS = 120/);
  assert.match(smartfillScript, /function scheduleFocusTargetMarkerClear\(target\)/);
  assert.match(smartfillScript, /target\.setAttribute\("data-ctdp-smartfocus-visible", "true"\)/);
  assert.match(smartfillScript, /target\.removeAttribute\("data-ctdp-smartfocus-visible"\)/);
  assert.match(smartfillScript, /const isEnabled = typeof opts\.isEnabled === "function"/);
  assert.match(smartfillScript, /if \(!isEnabled\(\)\) \{\s*hideSmartButton\(\);\s*return;\s*\}/);
  assert.match(smartfillScript, /fillCurrentTarget\(fieldKey\)[\s\S]*?onFieldFilled\(fieldKey\)/);
  assert.match(smartfillScript, /function fillTarget\(target,\s*fieldKey\)/);
  assert.match(smartfillScript, /function buildRecommendationItems\(fieldKey,\s*favoriteProfiles\)/);
  assert.match(smartfillScript, /const MAX_RECOMMENDATION_ITEMS = 10/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-trigger"/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-item"/);
  assert.match(smartfillScript, /if \(!fieldKey\) \{\s*hideSmartButton\(\);\s*return;\s*\}/);
  assert.match(smartfillScript, /if \(role === "smart-fill-trigger"\) \{[\s\S]*?fillCurrentTarget\(activeSmartFieldKey\)/);
  assert.match(smartfillScript, /if \(role === "smart-fill-recommend-trigger"\)/);
  assert.match(smartfillScript, /if \(role === "smart-fill-recommend-item"\)/);
  assert.doesNotMatch(smartfillScript, /if \(role === "smart-fill-item"\)/);
  assert.doesNotMatch(smartfillScript, /已填充推荐数据/);
  assert.doesNotMatch(smartfillScript, /data-role="smart-fill-status"/);
  assert.doesNotMatch(smartfillScript, /function showStatusMessage\(/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("mouseenter", function \(\) \{\s*setSmartButtonExpanded\(true\);/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("mouseleave", function \(\) \{\s*setSmartButtonExpanded\(false\);/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("focusin", function \(\) \{\s*setSmartButtonExpanded\(true\);/);
  assert.match(smartfillScript, /smartButton\.addEventListener\("focusout", function \(\) \{\s*setSmartButtonExpanded\(false\);/);
  assert.match(orchestratorScript, /document\.addEventListener\(\s*"contextmenu"/);
  assert.match(orchestratorScript, /sync-site-feature-context-menu/);
  assert.match(orchestratorScript, /listRecommendedProfiles:/);
  assert.match(orchestratorScript, /getCurrentScope:/);
  assert.match(orchestratorScript, /message\.type === "apply-smart-fill-override"/);
  assert.match(orchestratorScript, /message\.type === "clear-smart-fill-override"/);
  assert.match(orchestratorScript, /onSiteFeatureEnabledChanged/);
  assert.match(orchestratorScript, /isEnabled:\s*panelController\.isSiteFeatureEnabled/);
  assert.match(orchestratorScript, /setManualFieldOverride/);
  assert.match(orchestratorScript, /panelController\.loadVisibleFieldKeys\(\)\.then/);
  assert.match(orchestratorScript, /smartFillController\.fillTarget\(target,\s*message\.fieldKey\)/);
  assert.match(orchestratorScript, /clearManualFieldOverride/);
  assert.match(orchestratorScript, /syncTarget/);
  assert.doesNotMatch(smartfillScript, /focusRing\.className\s*=\s*"ctdp-smartfocus"/);
  assert.doesNotMatch(smartfillScript, /function setFocusRingPosition/);
  assert.doesNotMatch(smartfillScript, /function showFocusRing/);
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
