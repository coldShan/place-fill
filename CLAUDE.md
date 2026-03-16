# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Manifest V3 browser extension for generating Chinese-standard test data (统一社会信用代码, 身份证号, 银行卡号, etc.) to fill forms during QA, regression testing, and demo recording. Extension name: `place-fill`.

## Commands

```bash
# Syntax check all source files
node --check extension/src/*.js

# Run all tests (88 cases, uses native node:test)
node --test tests/*.test.mjs

# Sync Lucide icons (download missing, remove unused)
node extension/scripts/localize-icons.mjs

# Force refresh all local icons from official source
node extension/scripts/localize-icons.mjs --force

# Package release zip (reads version from manifest.json)
node extension/scripts/package-release.mjs
```

## Architecture

**Zero build tooling** — no npm, no bundler. All source is plain JS loaded directly by Chrome via `manifest.json` content_scripts declaration.

### Module Pattern

Every module uses the same IIFE wrapper for browser + Node.js dual compatibility:

```javascript
(function (rootScope) {
  "use strict";
  // ...
  rootScope.ChromeTestData{ModuleName} = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### Content Script Load Order (manifest.json)

Scripts are loaded sequentially; later scripts depend on earlier ones:

1. `field-meta.js` — field definitions (key, label, iconName)
2. `field-visibility.js` — per-site field show/hide (depends on field-meta)
3. `site-feature-toggle.js` — per-site smart-fill on/off
4. `generators.js` — test data generators with checksum validation
5. `panel-state.js` — panel expand/collapse state
6. `editable-target.js` — detects fillable input elements
7. `icon-assets.js` — icon path mapping
8. `smart-fill.js` — field recognition via exact match, regex, autocomplete attribute, and manual annotations; annotation storage is scoped by domain + first-level subpath
9. `content-script-panel.js` — side panel UI controller (898 lines, the largest module)
10. `content-script-smartfill.js` — floating button and fill menu near focused inputs
11. `content-script.js` — orchestrator that mounts controllers and bridges events

`background.js` runs as the service worker (context menus, icon click, GitHub update check).

### Storage Isolation

- Manual field annotations: keyed by `domain + first-level subpath` (same business area shares, cross-area isolates)
- Field visibility config: keyed by domain
- Site feature toggles: keyed by domain

All use `chrome.storage.local`.

### Controller Dependency Injection

Controllers receive dependencies through an `options` object rather than direct imports, enabling testability:

```javascript
function createSmartFillController(options) {
  const { generators, fieldMeta, editableTarget, ... } = options;
}
```

## Icon Workflow

- All Lucide icons must be local SVG files under `extension/assets/icons/lucide/`
- Never inline SVG markup in source files; reference through `icon-assets.js`
- After any icon addition/removal/change, run `node extension/scripts/localize-icons.mjs`
- Include resulting file changes in the same commit

## Development

- Load `extension/` directory as unpacked extension in `chrome://extensions` (developer mode)
- Use `mock-form/index.html` as a local test page with all 9 field types
- CSS uses native nesting (max 3 levels) and custom properties for theming
