# AGENTS.md

## Scope

- This file applies to the current repository root.
- Keep changes limited to this directory unless the task explicitly requires otherwise.

## Project Overview

- `place-fill` is a Chrome Manifest V3 extension for generating Chinese-standard test data for QA, regression testing, and demo recording.
- Current manifest version: `0.9.8` (source: `extension/manifest.json`).
- The runtime combines plain JavaScript under `extension/src/` with committed bundles generated from `extension/src-ts/`.
- Chrome loads content scripts from `extension/manifest.json`; the data manager page is `extension/data-manager.html`, which loads generated assets through a versioned loader.
- There is no build step for plain JS: Chrome executes committed files directly, so `extension/generated/` must always be committed in sync with `extension/src-ts/`.

## Repo Layout

- `extension/`: Chrome Manifest V3 extension source (the only directory shipped in release zips)
- `extension/background.js`: service worker; must stay at the extension root
- `extension/src/`: plain-JS extension modules, content-script CSS (`theme.css`, `sidepanel.css`), and extension-page scripts
- `extension/generated/`: committed Vite output (`data-manager.js`, `data-manager.css`, `data-manager-bridge.js`, `data-records-api.js`, `offline-form-snapshot-api.js`)
- `extension/src-ts/shared/`: shared TypeScript logic (data records, data-manager routing, field meta, offline form snapshots)
- `extension/src-ts/bridges/`: IIFE entry points that expose shared TypeScript logic as globals
- `extension/src-ts/pages/data-manager/`: data manager page (Preact + TSX) — `main.tsx` entry, `app.tsx` page state, `components/`, `state/` hooks, `lib/` pure helpers, and `style.css`
- `extension/*.html`: extension pages — `data-manager.html`, `ai-permission.html` (AI host permission grant), `local-annotation-permission.html` (local directory backup grant)
- `extension/assets/`: Lucide icons (`icons/lucide/`) and app icons (`app-icons/`)
- `extension/scripts/`: icon, version-sync, packaging, and release scripts
- `scripts/build-extension.mjs`: Vite build driver for all `extension/generated/` outputs
- `assets/`: README images and logo sources (not shipped)
- `mock-form/`: local manual verification pages (`index.html`, `element-ui-demo.html`, `element-plus-demo.html`)
- `tests/`: `*.test.mjs` (node:test) and `*.test.ts` (tsx) tests
- `releases/`: local release artifacts output directory
- `nodata.png`: PNG carrier prepended to each release zip to create `releases/place-fill.png`
- `*.zip`: exported delivery artifacts, kept local and ignored by Git
- `task_plan.md`, `findings.md`, `progress.md`: planning artifacts, kept local and ignored by Git

## Commands

```bash
# Build all committed assets under extension/generated/
pnpm build

# Rebuild generated assets while watching TypeScript sources
pnpm build:watch

# Check background and extension/src JavaScript syntax
pnpm check

# Type-check TypeScript sources and tests
pnpm typecheck

# Run all tests (JS + TS)
pnpm test

# Run only plain-JS tests (node --test tests/*.test.mjs)
pnpm run test:js

# Run only TypeScript tests (tsx --test tests/*.test.ts)
pnpm run test:ts

# Run a single test file
node --test tests/smart-fill.test.mjs

# Sync Lucide icons
node extension/scripts/localize-icons.mjs

# Force refresh Lucide icons
node extension/scripts/localize-icons.mjs --force

# Sync README and AGENTS.md version references to manifest.json
node extension/scripts/sync-readme-version.mjs

# Package release zip
node extension/scripts/package-release.mjs

# Publish with manually authored notes; this commits, tags, pushes, and creates a GitHub Release
pnpm release <version> --notes-file /tmp/place-fill-release-notes.md

# Verify the current manifest version and its release artifacts
pnpm release:verify
```

## Working Rules

- Update `README.md` when paths, commands, or feature descriptions change.
- Do not reintroduce references to the removed `plugin-extension/` folder; use `extension/`.
- Prefer small, direct edits and keep documentation aligned with the current directory structure.
- Keep changes consistent with the repository's mixed plain-JS/TypeScript MV3 architecture and existing module patterns.
- Run `pnpm build` after changing `extension/src-ts/`, and include the matching `extension/generated/` changes.
- Do not edit `extension/generated/` by hand.
- Do not install or download dependencies or assets without explicit user approval.

## Architecture

- Content scripts are loaded sequentially by Chrome from `extension/manifest.json`.
- Plain-JS modules under `extension/src/` use IIFE wrappers; shared modules expose `ChromeTestData*` globals for browser use and CommonJS exports for Node.js tests.
- TypeScript is bundled by `scripts/build-extension.mjs` (Vite library mode) into `extension/generated/`, targeting `chrome109` without minification or source maps. The build clears `extension/generated/` first.
- The data manager page is written in Preact TSX (`jsxImportSource: "preact"` in both the Vite build and `tsconfig.json`). `preact` is the only runtime dependency and is bundled into `generated/data-manager.js`; the IIFE bridges stay framework-free.
- `extension/data-manager.html` loads `src/theme.css`, `generated/data-manager.css`, `src/icon-assets.js`, `src/generators.js` (field generators and validators), and `src/data-manager-page.js`, which dynamically imports `generated/data-manager.js?v=<manifest version>` to bust caches after updates. The app mounts into `#app`.
- Keep data manager logic that does not touch the DOM in `pages/data-manager/lib/` so it stays testable with `tsx --test` (see `tests/data-manager-lib.test.ts`); `tests/data-manager-page-ui.test.mjs` guards page structure and styling conventions.
- Generated IIFE bridges expose shared TypeScript logic to content scripts and the background worker.
- `background.js` runs as the extension service worker (context menus, action click, backup reminder alarms, GitHub update check, data-manager bridge, opening permission pages).
- Content scripts run in all frames (`all_frames: true`) at `document_idle` on `<all_urls>`.
- Permissions: `alarms`, `clipboardWrite`, `contextMenus`, `storage`; host access is limited to `https://api.github.com/*`, and AI endpoints are requested at runtime through `optional_host_permissions` from `ai-permission.html`.

### Module Pattern

```javascript
(function (rootScope) {
  "use strict";
  // ...
  rootScope.ChromeTestData{ModuleName} = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

### Content Script Load Order

1. `field-meta.js`: field definitions
2. `site-feature-toggle.js`: per-site smart-fill toggle
3. `ai-recognition.js`: AI recognition configuration and request helpers
4. `generators.js`: test data generators
5. `panel-state.js`: panel expand/collapse state
6. `editable-target.js`: editable target detection
7. `element-form-control.js`: Element UI and Element Plus form adapters
8. `icon-assets.js`: icon path mapping
9. `generated/offline-form-snapshot-api.js`: shared offline snapshot helpers
10. `smart-fill.js`: field recognition and manual annotation storage
11. `ai-form-snapshot.js`: sanitized form snapshot orchestration
12. `storage-mirror.js`: shared full-backup data shape and IndexedDB mirror helpers
13. `generated/data-records-api.js`: shared data-record helpers
14. `content-script-panel.js`: side panel controller
15. `content-script-smartfill.js`: floating fill UI near inputs
16. `content-script.js`: top-level orchestrator

### Background Worker Load Order

`extension/background.js` imports these scripts in order through `importScripts` (paths resolve relative to the worker file):

1. `src/field-meta.js`
2. `src/site-feature-toggle.js`
3. `src/ai-recognition.js`
4. `src/smart-fill.js`
5. `src/storage-mirror.js`
6. `src/local-annotation-file.js` (only on Chrome `122+`)
7. `generated/data-manager-bridge.js`

When adding a background dependency, keep this list, `tests/background-runtime.test.mjs`, and Chrome 109 compatibility in mind.

### Extension Pages

- `data-manager.html`: per-site favorites and generated-history management (Preact TSX, `generated/data-manager.js`): search, per-field copy, detail drawer editing, copying favorites to other sites, favorites JSON import/export, and live refresh through `chrome.storage.onChanged`.
- `ai-permission.html` + `src/ai-permission-page.js`: requests optional host permission for the configured AI endpoint origin.
- `local-annotation-permission.html` + `src/local-annotation-permission-page.js`: picks and grants the persistent backup directory (Chrome `122+`), using `storage-mirror.js` and `local-annotation-file.js`.

### Storage Isolation

- All persistent state lives in `chrome.storage.local` under versioned `ctdp.*.v1` keys.
- Manual field annotations (`ctdp.smartFillOverrides.v1`) are keyed by `domain + first-level subpath`: the same business area shares annotations, different areas stay isolated.
- Site feature toggles (`ctdp.siteFeatureEnabled.v1`) are keyed by domain and default to disabled until the user enables smart-fill and right-click annotation for that site.
- AI recognition config (`ctdp.aiRecognitionConfig.v1`) and AI field mappings (`ctdp.aiFieldMappings.v1`) are managed by `ai-recognition.js`; never log or export the API key.
- Global preferences (floating icon, focus style, dock position, etc.) use flat keys read and written directly with `chrome.storage.local.get/set`; no dedicated API module is needed.
- Data manager column choices (`ctdp.dataManagerColumns.v1`) are a per-browser UI preference and are intentionally not part of full backup.
- Full backup/restore covers the `STORAGE_KEYS` list in `storage-mirror.js`. When adding a user-data key that should survive backup, add it there and update `tests/storage-mirror.test.mjs`.
- Persistent local-directory backup stores its directory handle in IndexedDB (`local-annotation-file.js`) and the JSON file `place-fill-data/place-fill-user-data.json`.

### DOM Structure Note

- `.ctdp-smartfocus` and `.ctdp-root` are siblings mounted under `<html>`.
- When styling state that affects `.ctdp-smartfocus`, target it through `html[data-attr] .ctdp-smartfocus`, not `.ctdp-root .ctdp-smartfocus`.

### Controller Dependency Injection

- Controllers receive dependencies through an `options` object instead of direct imports to keep modules testable.

## Icon Workflow

- All Lucide icons must be stored as standalone files under `extension/assets/icons/lucide/`.
- Do not inline Lucide SVG markup into source files; reference local icon files through the icon asset map instead.
- When adding a new icon, download it from the official Lucide source and keep the local filename aligned with the Lucide icon name.
- When removing an icon or changing icon mappings, keep `extension/src/icon-assets.js` and the local icon directory in sync.
- Whenever Lucide icon files or icon mappings are added, removed, or changed, run `node extension/scripts/localize-icons.mjs` before finishing.
- Use `node extension/scripts/localize-icons.mjs --force` when existing local Lucide files need to be refreshed from the official source.
- Treat the localization script as the required final sync step for every icon change, and include any resulting file additions or removals in the same change set.

## Browser Compatibility

- Minimum supported Chrome is `109`.
- Persistent local-directory backup requires Chrome `122`; Chrome `109`–`121` keep manual full-data backup and restore.
- Do not use native CSS nesting in this repository; Chrome 109 does not support it reliably. Write flat selectors.
- Keep `background.js` at the extension root rather than moving it under `src/`; Chrome 109 resolves `importScripts` paths relative to the worker file.
- Gate newer APIs (for example `showDirectoryPicker` persistent permissions) by Chrome major version or feature detection, and keep a working fallback for Chrome 109.

## Release Workflow

- Treat `extension/manifest.json` as the version source of truth. Keep the current-version line in `Project Overview` machine-readable for the release script.
- Before releasing, review this file against current commands, paths, architecture, compatibility, and verification requirements; include necessary updates in the same release change set.
- Before releasing, analyze the relevant Git commits in `<current-version-tag>..HEAD`; do not analyze the code diff. Write user-facing Markdown notes to a temporary file outside the repository so the clean-worktree check still passes. Consolidate internal refactors and intermediate implementation commits into their related user-facing change instead of listing them separately.
- Use `pnpm release <version> --notes-file /tmp/place-fill-release-notes.md` only when the user explicitly requests a release. The notes file must be written from that commit analysis; the release script uploads it verbatim and never generates notes from commit subjects. The command updates the manifest, README, and AGENTS.md, runs checks and tests, packages the zip, creates local-only `releases/place-fill.png`, commits, tags, pushes, and uploads only the zip to the GitHub Release.
- Use `pnpm release:verify` to verify the README, AGENTS.md, local zip, disguised PNG, local and remote tag, and GitHub Release for the current manifest version.
- Release zip archives must contain only the contents of `extension/`, not the parent project directory.
- Create release archives from inside `extension/` so the zip root is the extension files themselves.
- Place release zip files under `releases/`.
- Name the release zip `place-fill-v<version>.zip`, where `<version>` comes from `extension/manifest.json`.
- Use `node extension/scripts/package-release.mjs` to create the release zip and `releases/place-fill.png`.
- Build `releases/place-fill.png` by concatenating the unchanged root `nodata.png` bytes with the current release zip bytes, equivalent to `cat nodata.png place-fill-v<version>.zip > place-fill.png`.
- Keep generated release zip and disguised PNG files local only and do not commit or upload `releases/place-fill.png`.

## Development

- Load `extension/` as an unpacked extension in `chrome://extensions`.
- After code changes, click reload on the extension card and refresh the target page; content scripts are not re-injected into already-open tabs.
- Use `mock-form/index.html` for local manual verification of the supported field types, and `mock-form/element-ui-demo.html` / `mock-form/element-plus-demo.html` for Element UI / Element Plus adapters.
- Smart-fill and right-click annotation are off by default per site; enable them for the mock-form origin before testing.
- Prefer the existing CSS custom-property approach and flat selectors to stay compatible with Chrome 109.

## Verification

- For documentation-only changes:

```bash
git diff --check
```

- For JavaScript-only changes:

```bash
pnpm check
pnpm run test:js
```

- For TypeScript or generated-runtime changes:

```bash
pnpm build
pnpm typecheck
pnpm test
git status --short extension/generated
```

- For release-script or version-sync changes, also run `node --test tests/release-workflow.test.mjs tests/sync-readme-version.test.mjs tests/package-release.test.mjs`.

## Git Notes

- Ignore packaged zip files and planning files through `.gitignore`.
- Commit messages follow Conventional Commit prefixes with Chinese summaries, for example `feat: 添加邮政编码智能识别`, `fix: 约束数字字段兜底填充`; release commits use `chore: 发布 <version> 版本` and are created by `pnpm release`.
- Do not commit `.DS_Store` or other local system artifacts.
