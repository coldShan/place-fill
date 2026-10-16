import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pageDir = join(here, "../extension/src-ts/pages/data-manager");
const pageHtml = readFileSync(join(here, "../extension/data-manager.html"), "utf8");
const pageBootstrap = readFileSync(join(here, "../extension/src/data-manager-page.js"), "utf8");
const themeStyles = readFileSync(join(here, "../extension/src/theme.css"), "utf8");
const buildScript = readFileSync(join(here, "../scripts/build-extension.mjs"), "utf8");

function listSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap(function (entry) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return listSourceFiles(fullPath);
      return /\.tsx?$/.test(entry.name) ? [fullPath] : [];
    })
    .sort();
}

const sourceFiles = listSourceFiles(pageDir);
const pageSource = sourceFiles
  .map(function (filePath) {
    return readFileSync(filePath, "utf8");
  })
  .join("\n");
const pageStyles = readFileSync(join(pageDir, "style.css"), "utf8");

function readPageFile(name) {
  return readFileSync(join(pageDir, name), "utf8");
}

test("data manager page mounts a Preact app into a dedicated node", () => {
  assert.match(buildScript, /pages\/data-manager\/main\.tsx/);
  assert.match(buildScript, /jsxImportSource:\s*"preact"/);
  assert.match(readPageFile("main.tsx"), /render\(<App \/>,\s*mountNode\)/);
  assert.match(pageHtml, /<div id="app"><\/div>/);
  assert.ok(sourceFiles.every(function (filePath) {
    return !/innerHTML/.test(readFileSync(filePath, "utf8"));
  }), "page sources should render through Preact instead of innerHTML: " + sourceFiles.map(function (filePath) {
    return relative(pageDir, filePath);
  }).join(", "));
});

test("data manager bootstrap busts module caches with the manifest version", () => {
  assert.match(pageHtml, /<script src="\.\/src\/icon-assets\.js"><\/script>[\s\S]*<script type="module" src="\.\/src\/data-manager-page\.js">/);
  assert.match(pageBootstrap, /new URL\("\.\.\/generated\/data-manager\.js", import\.meta\.url\)/);
  assert.match(pageBootstrap, /searchParams\.set\("v", chrome\.runtime\.getManifest\(\)\.version\)/);
  assert.match(pageBootstrap, /await import\(dataManagerModuleUrl\.href\)/);
});

test("data manager blue actions use the shared brand blue", () => {
  assert.match(themeStyles, /--place-fill-accent-rgb:\s*43 127 216;/);
  assert.match(pageHtml, /<link rel="stylesheet" href="\.\/src\/theme\.css">\s*<link rel="stylesheet" href="\.\/generated\/data-manager\.css">/);
  assert.match(pageStyles, /\.dm-primary-btn\s*\{[\s\S]*?background:\s*rgb\(var\(--place-fill-accent-rgb\)\);/);
});

test("data manager follows the system dark mode through design tokens", () => {
  assert.match(pageStyles, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{[\s\S]*?color-scheme:\s*dark;[\s\S]*?--dm-surface:/);
  assert.doesNotMatch(pageStyles, /dm-ambient/);
  assert.doesNotMatch(pageStyles, /backdrop-filter/);
});

test("data manager replaces native confirm with a styled dialog", () => {
  assert.doesNotMatch(pageSource, /window\.confirm/);
  assert.match(pageSource, /role="dialog"/);
  assert.match(pageSource, /aria-modal="true"/);
});

test("data manager shows the current site and guides users without a scope", () => {
  assert.match(pageSource, /dm-site-chip/);
  assert.match(pageSource, /未指定站点/);
});

test("data manager keeps top tabs instead of a left sidebar layout", () => {
  assert.match(pageSource, /role="tablist"/);
  assert.match(pageSource, /role="tab"/);
  assert.doesNotMatch(pageSource, /dm-sidebar/);
});

test("favorites stay sortable by drag and keyboard", () => {
  assert.match(pageSource, /reorderFavoriteProfiles/);
  assert.match(pageSource, /draggable/);
  assert.match(pageSource, /ArrowUp/);
  assert.match(pageSource, /ArrowDown/);
});

test("icons are rendered from local Lucide assets through the icon asset map", () => {
  assert.match(pageSource, /ChromeTestDataIconAssets/);
  assert.match(pageSource, /--ctdp-icon-url/);
  assert.doesNotMatch(pageSource, /<svg/);
});

test("table headers stay sticky while the table body scrolls", () => {
  assert.match(pageStyles, /\.dm-table th\s*\{[\s\S]*position:\s*sticky/);
  assert.match(pageStyles, /\.dm-table th\s*\{[\s\S]*top:\s*0/);
  assert.match(pageStyles, /\.dm-table-shell\s*\{[\s\S]*overflow:\s*auto/);
});

test("data manager styles avoid native CSS nesting for Chrome 109", () => {
  assert.doesNotMatch(pageStyles, /\{[^{}]*&[^{}]*\{/);
});
