import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pageDir = join(here, "../extension/src-ts/pages/data-manager");
const pageSource = readdirSync(pageDir)
  .filter(function (fileName) {
    return fileName.endsWith(".ts");
  })
  .sort()
  .map(function (fileName) {
    return readFileSync(join(pageDir, fileName), "utf8");
  })
  .join("\n");
const pageStyles = readFileSync(join(pageDir, "style.css"), "utf8");

test("data manager page uses left-nav dual routes instead of a single combined layout", () => {
  assert.match(pageSource, /data-view="favorites"/);
  assert.match(pageSource, /data-view="history"/);
  assert.match(pageSource, /dm-sidebar/);
  assert.match(pageSource, /dm-workspace/);
  assert.doesNotMatch(pageSource, /dm-topbar/);
  assert.doesNotMatch(pageSource, /data-role="scope-select"/);
  assert.doesNotMatch(pageSource, /dm-sidebar-note/);
  assert.doesNotMatch(pageSource, /dm-view-meta/);
  assert.doesNotMatch(pageSource, /dm-sidebar-label/);
  assert.doesNotMatch(pageSource, />Reusable Profiles</);
  assert.doesNotMatch(pageSource, />Recent 30</);
  assert.doesNotMatch(pageSource, /dm-view-description/);
});

test("favorite create and edit share a modal form instead of an inline persistent form", () => {
  assert.match(pageSource, /data-role="favorite-modal"/);
  assert.match(pageSource, /data-role="favorite-modal-title"/);
  assert.match(pageSource, /data-action="open-create-favorite"/);
  assert.doesNotMatch(pageSource, /data-action="favorite-reset"/);
});

test("favorites view renders as a regular table instead of cards", () => {
  assert.match(pageSource, /dm-favorites-table/);
  assert.match(pageSource, /<th>姓名<\/th><th>公司<\/th><th>手机<\/th><th>邮箱<\/th><th>操作<\/th>/);
  assert.doesNotMatch(pageSource, /模板名称/);
  assert.doesNotMatch(pageSource, /模板/);
  assert.doesNotMatch(pageSource, /favorite-title/);
  assert.doesNotMatch(pageSource, /dm-favorite-grid/);
  assert.doesNotMatch(pageSource, /dm-card-summary/);
});

test("history table stays single-row only and does not render a detail row", () => {
  assert.doesNotMatch(pageSource, /dm-table-detail-row/);
  assert.doesNotMatch(pageSource, /dm-detail-grid/);
});

test("page fills the viewport and keeps table scrolling inside the workspace", () => {
  assert.match(pageStyles, /html,\s*body\s*\{[\s\S]*height:\s*100%/);
  assert.match(pageStyles, /body\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(pageStyles, /\.dm-app\s*\{[\s\S]*height:\s*100vh/);
  assert.match(pageStyles, /\.dm-shell\s*\{[\s\S]*height:\s*100vh/);
  assert.match(pageStyles, /\.dm-frame\s*\{[\s\S]*grid-template-columns:\s*190px minmax\(0,\s*1fr\)/);
  assert.match(pageStyles, /\.dm-frame\s*\{[\s\S]*min-height:\s*0/);
  assert.match(pageStyles, /\.dm-sidebar-panel\s*\{[\s\S]*align-content:\s*start/);
  assert.match(pageStyles, /\.dm-sidebar-panel\s*\{[\s\S]*padding:\s*18px/);
  assert.match(pageStyles, /\.dm-sidebar-panel\s*\{[\s\S]*grid-auto-rows:\s*max-content/);
  assert.match(pageStyles, /\.dm-nav-link\s*\{[\s\S]*font-size:\s*18px/);
  assert.match(pageStyles, /\.dm-nav-link\s*\{[\s\S]*font-weight:\s*600/);
  assert.match(pageStyles, /\.dm-workspace\s*\{[\s\S]*min-height:\s*0[\s\S]*overflow:\s*hidden/);
  assert.match(pageStyles, /\.dm-view\s*\{[\s\S]*height:\s*100%/);
  assert.match(pageStyles, /\.dm-table-shell\s*\{[\s\S]*overflow:\s*auto/);
});

test("table headers stay sticky while the table body scrolls", () => {
  assert.match(pageStyles, /\.dm-table th\s*\{[\s\S]*position:\s*sticky/);
  assert.match(pageStyles, /\.dm-table th\s*\{[\s\S]*top:\s*0/);
  assert.match(pageStyles, /\.dm-table th\s*\{[\s\S]*z-index:\s*1/);
  assert.match(pageStyles, /\.dm-table th\s*\{[\s\S]*background:/);
});
