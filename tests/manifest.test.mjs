import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, "../extension/manifest.json"), "utf8"));

test("manifest uses place-fill as the extension name and action title", () => {
  assert.equal(manifest.name, "place-fill");
  assert.equal(manifest.action.default_title, "place-fill");
});

test("manifest enables all-sites editable injection with context menu permission", () => {
  assert.equal(manifest.side_panel, undefined);
  assert.equal(manifest.action.default_popup, undefined);
  assert.equal(typeof manifest.background.service_worker, "string");
  assert.equal(manifest.permissions.includes("contextMenus"), true);
  assert.equal(manifest.permissions.includes("clipboardWrite"), true);
  assert.equal(manifest.permissions.includes("storage"), true);
  assert.equal(Array.isArray(manifest.content_scripts), true);
  assert.equal(manifest.content_scripts[0].matches.includes("<all_urls>"), true);
  assert.equal(manifest.content_scripts[0].all_frames, true);
  assert.deepEqual(manifest.content_scripts[0].js, [
    "src/field-meta.js",
    "src/field-visibility.js",
    "src/site-feature-toggle.js",
    "src/generators.js",
    "src/panel-state.js",
    "src/editable-target.js",
    "src/icon-assets.js",
    "src/smart-fill.js",
    "src/content-script-panel.js",
    "src/content-script-smartfill.js",
    "src/content-script.js"
  ]);
  assert.equal(Array.isArray(manifest.host_permissions), true);
  assert.equal(manifest.host_permissions.includes("https://api.github.com/repos/coldShan/place-fill/*"), true);
});

test("manifest declares local extension icons for toolbar and management pages", () => {
  assert.deepEqual(manifest.icons, {
    16: "assets/app-icons/icon-16.png",
    32: "assets/app-icons/icon-32.png",
    48: "assets/app-icons/icon-48.png",
    128: "assets/app-icons/icon-128.png"
  });
  assert.deepEqual(manifest.action.default_icon, manifest.icons);

  for (const file of Object.values(manifest.icons)) {
    assert.equal(existsSync(join(here, "..", "extension", file)), true);
  }
});

test("manifest exposes lucide svg assets and app logo png assets to injected page ui", () => {
  assert.deepEqual(manifest.web_accessible_resources, [
    {
      resources: ["assets/icons/lucide/*.svg"],
      matches: ["<all_urls>"]
    },
    {
      resources: ["assets/app-icons/*.png"],
      matches: ["<all_urls>"]
    }
  ]);
});
