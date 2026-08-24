import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const orchestratorScript = readFileSync(join(here, "../extension/src/content-script.js"), "utf8");
const panelScript = readFileSync(join(here, "../extension/src/content-script-panel.js"), "utf8");
const panelStyles = readFileSync(join(here, "../extension/src/sidepanel.css"), "utf8");
const themeStyles = readFileSync(join(here, "../extension/src/theme.css"), "utf8");
const smartfillScript = readFileSync(join(here, "../extension/src/content-script-smartfill.js"), "utf8");
const panelControllerPkg = await import("../extension/src/content-script-panel.js");
const editableTargetPkg = await import("../extension/src/editable-target.js");
const {
  closeOtherSettingsSections,
  collectPageAutoFillTargets,
  collectPageFavoriteProfile,
  sampleFavoriteProfiles
} = panelControllerPkg.default || panelControllerPkg;
const editableTargetApi = editableTargetPkg.default || editableTargetPkg;

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

test("quick favorite capture keeps the first non-empty value for every recognized field", () => {
  const nodes = [
    { nodeType: 1, tagName: "INPUT", type: "text", fieldKey: "mobile", value: "" },
    { nodeType: 1, tagName: "INPUT", type: "text", fieldKey: "mobile", value: "13800138000" },
    { nodeType: 1, tagName: "TEXTAREA", fieldKey: "address", value: "郑州市金水区" },
    { nodeType: 1, tagName: "INPUT", type: "password", fieldKey: "account", value: "secret" }
  ];
  const profile = collectPageFavoriteProfile(
    { querySelectorAll() { return nodes; } },
    editableTargetApi,
    { inferFieldKeyForSmartFill(node) { return node.fieldKey || null; } }
  );

  assert.deepEqual(profile, {
    address: "郑州市金水区",
    mobile: "13800138000"
  });
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
  assert.match(panelScript, /sx \+ "px " \+ sy \+ "px 22px rgba\(15,23,42,0\.14\),"/);
  assert.doesNotMatch(panelScript, /30px rgba\(0,0,0,0\.35\)/);
});

test("dock and smart-fill buttons use icon markup instead of visible text labels", () => {
  assert.match(panelScript, /renderIconMarkup\(iconAssetsApi\.PRIMARY_LOGO_ICON/);
  assert.match(smartfillScript, /data-role="smart-fill-trigger"/);
  assert.match(smartfillScript, /data-role="smart-fill-add-favorite"/);
  assert.match(smartfillScript, /renderIconMarkup\("star",\s*"ctdp-smartfill-favorite-icon",\s*label\)/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-panel"/);
  assert.match(smartfillScript, /data-role="smart-fill-recommend-item"/);
  assert.doesNotMatch(smartfillScript, /data-role="smart-fill-recommend-trigger"/);
  assert.doesNotMatch(smartfillScript, /data-role="smart-fill-item"/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-item-label/);
  assert.doesNotMatch(smartfillScript, /ctdp-smartfill-item-hint/);
  assert.doesNotMatch(panelScript, /展开测试数据面板">测试数据<\/button>/);
});

test("dock hover menu exposes one-click fill, full export and full import shortcuts", () => {
  assert.match(panelScript, /class="ctdp-dock-launcher"[\s\S]*?class="ctdp-dock-actions" aria-label="快捷操作"[\s\S]*?data-role="quick-auto-fill"[\s\S]*?data-role="quick-export"[\s\S]*?data-role="quick-import"/);
  assert.match(panelScript, /role === "auto-fill" \|\| role === "quick-auto-fill"[\s\S]*?autoFillPage\(\)/);
  assert.match(panelScript, /role === "quick-export"[\s\S]*?exportFullBackup\(\)/);
  assert.match(panelScript, /role === "quick-import"[\s\S]*?importMode = "quick-full-backup"[\s\S]*?importInput\.click\(\)/);
  assert.match(panelScript, /importMode === "full-backup" \|\| isQuickImport[\s\S]*?importFullBackupFile\(file\)/);
  assert.match(panelStyles, /\.ctdp-dock-actions\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*7px;[\s\S]*?visibility:\s*hidden;/);
  assert.match(panelStyles, /\.ctdp-dock-action\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?border-radius:\s*50%;/);
  assert.match(panelStyles, /\.ctdp-dock-action\[data-role="quick-auto-fill"\]\s*\{[\s\S]*?background:\s*rgb\(var\(--place-fill-accent-rgb\)\);/);
  assert.match(panelStyles, /\.ctdp-dock-launcher:hover \.ctdp-dock-actions,\s*\.ctdp-dock-launcher:focus-within \.ctdp-dock-actions\s*\{[\s\S]*?visibility:\s*visible;[\s\S]*?pointer-events:\s*auto;/);
});

test("panel toolbar emphasizes one-click fill and keeps utility actions secondary", () => {
  assert.match(panelScript, /<header class="ctdp-toolbar">[\s\S]*?ctdp-toolbar-group-left[\s\S]*?data-role="open-settings"[\s\S]*?data-role="open-data-manager"[\s\S]*?ctdp-toolbar-group-right[\s\S]*?data-role="auto-fill"[\s\S]*?data-role="regen"[\s\S]*?data-role="copy-all"/);
  assert.match(panelScript, /data-role="open-settings" aria-label="打开设置" title="打开设置"/);
  assert.match(panelScript, /data-role="open-data-manager" aria-label="打开数据管理" title="打开数据管理"/);
  assert.match(panelScript, /class="ctdp-btn ctdp-btn-action" type="button" data-role="auto-fill" aria-label="一键填充页面" title="一键填充页面"/);
  assert.match(panelScript, /class="ctdp-action-label">一键填充/);
  assert.match(panelScript, /class="ctdp-btn ctdp-btn-primary is-hidden" type="button" data-role="open-repository" aria-label="打开 GitHub 仓库" title="打开 GitHub 仓库"/);
  assert.match(panelScript, /data-role="regen" aria-label="重新生成全部" title="重新生成全部"/);
  assert.match(panelScript, /data-role="copy-all" aria-label="复制整组数据" title="复制整组数据"/);
  assert.doesNotMatch(panelScript, /data-role="collapse" aria-label="收起面板" title="收起面板"/);
  assert.doesNotMatch(panelScript, /ctdp-btn-text/);
});

test("blue action buttons and text use the shared brand blue", () => {
  assert.match(themeStyles, /--place-fill-accent-rgb:\s*43 127 216;/);
  assert.match(panelStyles, /\.ctdp-btn-action\s*\{[\s\S]*?background:\s*rgb\(var\(--place-fill-accent-rgb\)\);/);
  assert.match(panelStyles, /\.ctdp-switch-input:checked \+ \.ctdp-switch-track\s*\{[\s\S]*?background:\s*rgb\(var\(--place-fill-accent-rgb\)\);/);
  assert.match(panelStyles, /\.ctdp-field-visibility-checkbox\s*\{[\s\S]*?accent-color:\s*rgb\(var\(--place-fill-accent-rgb\)\);/);
  assert.match(panelStyles, /\.ctdp-dock-action\s*\{[\s\S]*?color:\s*#314566;/);
  assert.doesNotMatch(panelStyles, /rgba\(74,\s*111,\s*165,/);
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
  assert.match(panelScript, /data-role="autofill-status-text">填写中…/);
  assert.match(panelScript, /function setAutoFillPageAuraState\(running\)/);
  assert.match(panelScript, /root\.setAttribute\("data-autofill-running",\s*String\(running\)\)/);
  assert.match(panelScript, /setAutoFillPageAuraState\(true\)[\s\S]*?try\s*\{/);
  assert.match(panelScript, /finally\s*\{[\s\S]*?setAutoFillPageAuraState\(false\)/);
});

test("one-click fill collects native controls without requiring semantic matches", () => {
  const form = {};
  const rootNode = {};
  const textInput = {
    nodeType: 1,
    tagName: "INPUT",
    type: "text",
    disabled: false,
    readOnly: false
  };
  const select = {
    nodeType: 1,
    tagName: "SELECT",
    disabled: false,
    options: []
  };
  const radioA = {
    nodeType: 1,
    tagName: "INPUT",
    type: "radio",
    name: "gender",
    form,
    getRootNode() {
      return rootNode;
    }
  };
  const radioB = {
    ...radioA,
    getRootNode() {
      return rootNode;
    }
  };
  const checkbox = {
    nodeType: 1,
    tagName: "INPUT",
    type: "checkbox",
    name: "",
    form
  };
  const document = {
    querySelectorAll() {
      return [textInput, select, radioA, radioB, checkbox];
    }
  };

  const targets = collectPageAutoFillTargets(
    document,
    editableTargetApi,
    {
      inferFieldKeyForSmartFill(node) {
        return node === textInput ? "fullName" : null;
      }
    },
    {
      isFieldVisible() {
        return true;
      }
    },
    ["fullName"]
  );

  assert.equal(targets.length, 4);
  assert.equal(targets.find((entry) => entry.fieldKey === "fullName")?.target, textInput);
  assert.equal(targets.find((entry) => entry.kind === "select")?.target, select);
  assert.equal(targets.find((entry) => entry.kind === "radio")?.targets.length, 2);
  assert.equal(targets.find((entry) => entry.kind === "checkbox")?.targets.length, 1);
});

test("one-click fill deduplicates Element component internals into one adapter target", () => {
  const selectRoot = {};
  const selectInput = { id: "select-input" };
  const selectSearchInput = { id: "select-search-input" };
  const elementEntry = {
    adapter: "element",
    kind: "select",
    root: selectRoot,
    target: selectInput,
    targets: [selectRoot]
  };
  const targets = collectPageAutoFillTargets(
    {
      querySelectorAll() {
        return [selectInput, selectSearchInput];
      }
    },
    editableTargetApi,
    {
      inferFieldKeyForSmartFill() {
        return null;
      }
    },
    null,
    [],
    {
      describeElementControl(node) {
        return node === selectInput || node === selectSearchInput ? elementEntry : null;
      }
    }
  );

  assert.deepEqual(targets, [elementEntry]);
});

test("dock reuses one text bubble and keeps backup reminders until dismissed", () => {
  assert.match(panelScript, /data-role="dock-message"[^>]*hidden/);
  assert.match(panelScript, /data-role="run-dock-message-action" aria-live="polite" disabled/);
  assert.match(panelScript, /data-role="dismiss-dock-message" aria-label="关闭提醒"/);
  assert.match(panelScript, /function showDockMessage\(message,\s*ensureVisible,\s*dismissible,\s*onDismiss,\s*onAction\)/);
  assert.match(panelScript, /showDockMessage\("填完啦！"\)/);
  assert.match(panelScript, /if \(!snap\.visible\) panelState\.toggleCollapsed\(\)/);
  assert.match(panelScript, /if \(!dismissible\) dockMessageTimer = win\.setTimeout\(hideDockMessage,\s*4000\)/);
  assert.match(panelScript, /const actionTrigger = event\.target\.closest\('\[data-role="run-dock-message-action"\]'\)[\s\S]*?if \(actionTrigger && dockMessageAction\)[\s\S]*?Promise\.resolve\(\)\.then\(dockMessageAction\)[\s\S]*?const trigger = event\.target\.closest\("\[data-role\]"\)/);
  assert.match(panelScript, /role === "dismiss-dock-message"[\s\S]*?const onDismiss = dockMessageDismiss;[\s\S]*?hideDockMessage\(\);[\s\S]*?if \(onDismiss\) onDismiss\(\)/);
  assert.match(orchestratorScript, /type:\s*"read-backup-reminder-state"/);
  assert.match(orchestratorScript, /showDockMessage\([\s\S]*?message \|\| "该备份数据啦！"[\s\S]*?panelController\.exportFullBackup\(\)\.then\(dismissBackupReminder\)/);
  assert.match(panelScript, /function hideDismissibleDockMessage\(\)\s*\{[\s\S]*?if \(dockMessageDismiss\) hideDockMessage\(\)/);
  assert.match(orchestratorScript, /message\.type === "hide-backup-reminder"[\s\S]*?panelController\.hideDismissibleDockMessage\(\)/);
  assert.match(panelStyles, /\.ctdp-dock-message-action:not\(:disabled\)\s*\{[\s\S]*?cursor:\s*pointer;/);
  assert.match(panelStyles, /\.ctdp-dock-message-action:focus-visible/);
  assert.match(panelStyles, /\.ctdp-dock-message\s*\{[\s\S]*?right:\s*64px;/);
  assert.match(panelStyles, /\.ctdp-dock-message-close\s*\{[\s\S]*?top:\s*-8px;[\s\S]*?left:\s*-8px;/);
  assert.match(panelStyles, /\.ctdp-dock-message-close:focus-visible/);
});

test("collapsing keeps the dock available when site features are disabled", () => {
  assert.match(panelScript, /function collapse\(\)\s*\{[\s\S]*?panelState\.collapse\(\);[\s\S]*?updatePanelState\(\);[\s\S]*?\}/);
  assert.doesNotMatch(panelScript, /function collapse\(\)\s*\{[\s\S]*?siteFeatureEnabled[\s\S]*?panelState\.toggleVisible\(\)/);
  assert.doesNotMatch(panelStyles, /\.ctdp-root\[data-site-feature-enabled="false"\]\s+\.ctdp-dock/);
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
  assert.doesNotMatch(panelScript, /按类型展开设置，一次专注一组|ctdp-settings-subtitle/);
  assert.match(panelScript, /data-role="site-feature-toggle"/);
  assert.match(panelScript, /data-role="site-feature-status"/);
  assert.match(panelScript, /data-site-feature-enabled/);
  assert.match(panelScript, /root\.setAttribute\("data-site-feature-enabled",\s*String\(state\.siteFeatureEnabled\)\)/);
  assert.match(panelScript, /当前站点已启用智能识别和右键标注/);
  assert.match(panelScript, /当前站点已停用智能识别和右键标注/);
  assert.doesNotMatch(panelScript, /关闭后，当前站点不启用智能识别和右键标注，其余功能不受影响/);
  assert.match(panelScript, /data-role="field-visibility-list"/);
  assert.match(panelScript, /data-role="field-visibility-toggle"/);
  assert.match(panelScript, /renderSettingsActionMarkup\("export-overrides"/);
  assert.match(panelScript, /renderSettingsActionMarkup\("import-overrides"/);
  assert.match(panelScript, /renderSettingsActionMarkup\("export-sanitized-overrides"/);
  assert.match(panelScript, /renderSettingsActionMarkup\("export-full-backup"/);
  assert.match(panelScript, /renderSettingsActionMarkup\("import-full-backup"/);
  assert.match(panelScript, /data-role="import-file"/);
});

test("settings groups use an exclusive accordion with current-site settings open by default", () => {
  assert.match(panelScript, /data-settings-section="' \+ key \+ '"'/);
  assert.match(panelScript, /renderSettingsSectionMarkup\(\s*"site"[\s\S]*?true,\s*"site-feature-status"/);
  assert.match(panelScript, /renderSettingsSectionMarkup\(\s*"experience"[\s\S]*?false,\s*"focus-style-note"/);
  assert.match(panelScript, /renderSettingsSectionMarkup\(\s*"ai"[\s\S]*?false,\s*"ai-recognition-status"/);
  assert.match(panelScript, /renderSettingsSectionMarkup\(\s*"data"[\s\S]*?false\s*\)/);
  assert.match(panelScript, /function setupSettingsAccordion\(\)/);

  const sections = [{ open: true }, { open: true }, { open: false }];
  closeOtherSettingsSections(sections, sections[1]);
  assert.deepEqual(sections.map(function (section) { return section.open; }), [false, true, false]);
});

test("AI switch is off by default and only reveals its configuration while enabled", () => {
  assert.match(panelScript, /aiRecognitionConfig:\s*\{[\s\S]*?enabled:\s*false/);
  assert.match(panelScript, /data-role="ai-recognition-config"' \+ \(config\.enabled \? "" : " hidden"\)/);
  assert.match(panelScript, /aiRecognitionConfigPanel\.hidden = !state\.aiRecognitionConfig\.enabled/);
  assert.match(panelScript, /role="ai-recognition-toggle"/);
  assert.match(panelScript, /toggleAiRecognitionEnabled\(aiRecognitionTrigger\.checked\)/);
});

test("data settings keep backup and restore visible while nesting annotation tools", () => {
  assert.match(panelScript, /renderSettingsActionMarkup\("export-full-backup"[\s\S]*?renderSettingsActionMarkup\("import-full-backup"/);
  assert.match(panelScript, /<details class="ctdp-settings-more">/);
  assert.match(panelScript, /ctdp-settings-more-summary">更多数据工具/);
  assert.match(panelScript, /renderSettingsActionMarkup\("export-overrides"[\s\S]*?renderSettingsActionMarkup\("import-overrides"[\s\S]*?renderSettingsActionMarkup\("export-sanitized-overrides"/);
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
  assert.match(smartfillScript, /function renderAddFavoriteTriggerMarkup\(\)/);
  assert.match(smartfillScript, /data-role="smart-fill-add-favorite"/);
  assert.match(smartfillScript, /if \(role === "smart-fill-add-favorite"\) \{\s*if \(currentFavoriteId\)/);
  assert.match(smartfillScript, /win\.confirm\("确认从常用中移除这组数据？"\)/);
  assert.match(smartfillScript, /Promise\.resolve\(onRemoveFavorite\(favoriteId\)\)/);
  assert.match(smartfillScript, /Promise\.resolve\(onAddCurrentPageToFavorites\(\)\)/);
  assert.match(smartfillScript, /function buildRecommendationItems\(fieldKey,\s*favoriteProfiles\)/);
  assert.match(smartfillScript, /function refreshRecommendationItems\(target,\s*fieldKey\)/);
  assert.match(smartfillScript, /if \(showRecommendations !== false\) refreshRecommendationItems\(target,\s*fieldKey\);/);
  assert.doesNotMatch(smartfillScript, /smart-fill-recommend-trigger/);
  assert.match(smartfillScript, /if \(!fieldKey\) \{\s*hideSmartButton\(\);\s*return;\s*\}/);
  assert.match(smartfillScript, /if \(role === "smart-fill-trigger"\) \{[\s\S]*?fillCurrentTarget\(activeSmartFieldKey\)/);
  assert.doesNotMatch(smartfillScript, /if \(role === "smart-fill-item"\)/);
  assert.doesNotMatch(smartfillScript, /已填充推荐数据/);
  assert.doesNotMatch(smartfillScript, /data-role="smart-fill-status"/);
  assert.doesNotMatch(smartfillScript, /function showStatusMessage\(/);
  assert.doesNotMatch(smartfillScript, /setSmartButtonExpanded|data-expanded|addEventListener\("mouseenter"|addEventListener\("mouseleave"/);
  assert.match(orchestratorScript, /document\.addEventListener\(\s*"contextmenu"/);
  assert.match(orchestratorScript, /sync-site-feature-context-menu/);
  assert.match(orchestratorScript, /onAddCurrentPageToFavorites:\s*panelController\.addCurrentPageToFavorites/);
  assert.match(orchestratorScript, /getCurrentPageFavorite:\s*panelController\.getCurrentPageFavorite/);
  assert.match(orchestratorScript, /onRemoveFavorite:\s*panelController\.removeFavoriteProfile/);
  assert.match(orchestratorScript, /listRecommendedProfiles:/);
  assert.match(orchestratorScript, /getCurrentScope,/);
  assert.match(orchestratorScript, /message\.type === "apply-smart-fill-override"/);
  assert.match(orchestratorScript, /message\.type === "clear-smart-fill-override"/);
  assert.match(orchestratorScript, /message\.type === "add-current-page-to-favorites"/);
  assert.match(orchestratorScript, /panelController\.addCurrentPageToFavorites\(\)/);
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
  assert.match(orchestratorScript, /document\.addEventListener\(\s*"pointerdown",[\s\S]*?panelController\.handleDocumentPointerDown\(event\.target\);[\s\S]*?smartFillController\.handleDocumentPointerDown\(event\.target\)/);
  assert.match(smartfillScript, /function handleDocumentPointerDown\(target\)[\s\S]*?if \(!smartButton \|\| smartButton\.hidden \|\| isInteractionTarget\(target\)\) return;[\s\S]*?if \(editableTarget === activeSmartTarget\) return;[\s\S]*?hideSmartButton\(\);[\s\S]*?focusedTarget\.blur\(\)/);
  assert.match(orchestratorScript, /smartFillController\.resolveManualOverrideTarget\(\)/);
});
