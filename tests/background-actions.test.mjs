import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../extension/src/background.js"), "utf8");

test("background handles toolbar toggle and editable context menus", () => {
  assert.match(script, /chrome\.action\.onClicked\.addListener/);
  assert.match(script, /importScripts\("field-meta\.js",\s*"field-visibility\.js",\s*"site-feature-toggle\.js",\s*"smart-fill\.js"\)/);
  assert.match(script, /chrome\.contextMenus\.create/);
  assert.match(script, /contexts:\s*\["editable"\]/);
  assert.match(script, /chrome\.contextMenus\.onClicked\.addListener/);
  assert.match(script, /new URL\(tab\.url\)\.hostname/);
  assert.match(script, /frameId:\s*info\.frameId/);
  assert.match(script, /readVisibleFieldKeys/);
  assert.match(script, /writeVisibleFieldKeys/);
  assert.match(script, /readSiteFeatureEnabledMap/);
  assert.match(script, /siteFeatureToggleApi\.isSiteFeatureEnabled/);
  assert.match(script, /sync-site-feature-context-menu/);
  assert.match(script, /getSupportedFieldKeys\(\)/);
  assert.match(script, /if \(chrome\.storage && chrome\.storage\.onChanged\)/);
  assert.match(script, /apply-smart-fill-override/);
  assert.match(script, /clear-smart-fill-override/);
  assert.match(script, /check-extension-update/);
  assert.match(script, /open-extension-release-page/);
  assert.match(script, /open-extension-repository-page/);
  assert.match(script, /https:\/\/api\.github\.com\/repos\/coldShan\/place-fill\/releases\/latest/);
  assert.match(script, /chrome\.tabs\.create\(\{\s*url:/);
});
