# AGENTS.md

## Scope

- This file applies to the current repository root.
- Keep changes limited to this directory unless the task explicitly requires otherwise.

## Project Overview

- `place-fill` is a Chrome Manifest V3 extension for generating Chinese-standard test data for QA, regression testing, and demo recording.
- Current manifest version: `0.9.5` (source: `extension/manifest.json`).
- The runtime combines plain JavaScript under `extension/src/` with committed bundles generated from `extension/src-ts/`.
- Chrome loads content scripts from `extension/manifest.json`; the data manager loads generated assets from `extension/data-manager.html`.

## Repo Layout

- `extension/`: Chrome Manifest V3 extension source
- `extension/src/`: plain-JS extension modules
- `extension/generated/`: committed runtime assets loaded by the extension UI
- `extension/src-ts/`: TypeScript sources for the data manager, shared data logic, offline form snapshots, and runtime bridges
- `scripts/`: repository-level build scripts
- `mock-form/`: local manual verification page
- `tests/`: JavaScript and TypeScript tests
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

# Run all tests
pnpm test

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
- Plain-JS modules under `extension/src/` use IIFE wrappers; shared modules expose globals for browser use and CommonJS exports for Node.js tests.
- TypeScript is bundled by Vite into `extension/generated/`, targeting Chrome 109 without minification or source maps.
- `extension/data-manager.html` loads `generated/data-manager.css` and the `generated/data-manager.js` ES module.
- Generated IIFE bridges expose shared TypeScript logic to content scripts and the background worker.
- `background.js` runs as the extension service worker.

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
2. `field-visibility.js`: per-site field visibility
3. `site-feature-toggle.js`: per-site smart-fill toggle
4. `ai-recognition.js`: AI recognition configuration and request helpers
5. `generators.js`: test data generators
6. `panel-state.js`: panel expand/collapse state
7. `editable-target.js`: editable target detection
8. `element-form-control.js`: Element UI and Element Plus form adapters
9. `icon-assets.js`: icon path mapping
10. `generated/offline-form-snapshot-api.js`: shared offline snapshot helpers
11. `smart-fill.js`: field recognition and manual annotation storage
12. `ai-form-snapshot.js`: sanitized form snapshot orchestration
13. `storage-mirror.js`: shared full-backup data shape and IndexedDB mirror helpers
14. `generated/data-records-api.js`: shared data-record helpers
15. `content-script-panel.js`: side panel controller
16. `content-script-smartfill.js`: floating fill UI near inputs
17. `content-script.js`: top-level orchestrator

### Background Worker Load Order

`extension/background.js` imports these scripts in order:

1. `field-meta.js`
2. `field-visibility.js`
3. `site-feature-toggle.js`
4. `ai-recognition.js`
5. `smart-fill.js`
6. `storage-mirror.js`
7. `generated/data-manager-bridge.js`

### Storage Isolation

- Manual field annotations are stored in `chrome.storage.local` and keyed by `domain + first-level subpath`.
- Field visibility config is keyed by domain.
- Site feature toggles are keyed by domain and default to disabled until the user enables smart-fill and right-click annotation for that site.
- Global preferences use flat keys in `chrome.storage.local`.

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
- Do not use native CSS nesting in this repository; Chrome 109 does not support it reliably.
- Keep `background.js` at the extension root rather than moving it under `src/`.

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
- Use `mock-form/index.html` for local manual verification of the supported field types.
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
```

## Git Notes

- Ignore packaged zip files and planning files through `.gitignore`.
- Do not commit `.DS_Store` or other local system artifacts.
