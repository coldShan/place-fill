# AGENTS.md

## Scope

- This file applies to the current repository root.
- Keep changes limited to this directory unless the task explicitly requires otherwise.

## Repo Layout

- `extension/`: Chrome Manifest V3 extension source
- `mock-form/`: local manual verification page
- `releases/`: local release artifacts output directory
- `*.zip`: exported delivery artifacts, kept local and ignored by Git
- `task_plan.md`, `findings.md`, `progress.md`: planning artifacts, kept local and ignored by Git

## Working Rules

- Update `README.md` when paths, commands, or feature descriptions change.
- Do not reintroduce references to the removed `plugin-extension/` folder; use `extension/`.
- Prefer small, direct edits and keep documentation aligned with the current directory structure.

## Icon Workflow

- All Lucide icons must be stored as standalone files under `extension/assets/icons/lucide/`.
- Do not inline Lucide SVG markup into source files; reference local icon files through the icon asset map instead.
- When adding a new icon, download it from the official Lucide source and keep the local filename aligned with the Lucide icon name.
- When removing an icon or changing icon mappings, keep `extension/src/icon-assets.js` and the local icon directory in sync.
- Whenever Lucide icon files or icon mappings are added, removed, or changed, run `node extension/scripts/localize-icons.mjs` before finishing.
- Use `node extension/scripts/localize-icons.mjs --force` when existing local Lucide files need to be refreshed from the official source.
- Treat the localization script as the required final sync step for every icon change, and include any resulting file additions or removals in the same change set.

## Release Workflow

- Release zip archives must contain only the contents of `extension/`, not the parent project directory.
- Create release archives from inside `extension/` so the zip root is the extension files themselves.
- Place release zip files under `releases/`.
- Name the release zip `place-fill-v<version>.zip`, where `<version>` comes from `extension/manifest.json`.
- Use `node extension/scripts/package-release.mjs` to create the release zip.
- Keep release zip files local only and do not commit them.

## Verification

- Syntax check:

```bash
node --check extension/src/*.js
```

- Tests:

```bash
node --test tests/*.test.mjs
```

## Git Notes

- Ignore packaged zip files and planning files through `.gitignore`.
- Do not commit `.DS_Store` or other local system artifacts.
