import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(join(here, "../src/background.js"), "utf8");

test("background handles toolbar toggle and editable context menus", () => {
  assert.match(script, /chrome\.action\.onClicked\.addListener/);
  assert.match(script, /importScripts\("smart-fill\.js"\)/);
  assert.match(script, /chrome\.contextMenus\.create/);
  assert.match(script, /contexts:\s*\["editable"\]/);
  assert.match(script, /chrome\.contextMenus\.onClicked\.addListener/);
  assert.match(script, /frameId:\s*info\.frameId/);
  assert.match(script, /apply-smart-fill-override/);
  assert.match(script, /clear-smart-fill-override/);
});
