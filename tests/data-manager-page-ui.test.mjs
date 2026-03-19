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

test("data manager page uses left-nav dual routes instead of a single combined layout", () => {
  assert.match(pageSource, /data-view="favorites"/);
  assert.match(pageSource, /data-view="history"/);
  assert.match(pageSource, /dm-sidebar/);
  assert.match(pageSource, /dm-workspace/);
});

test("favorite create and edit share a modal form instead of an inline persistent form", () => {
  assert.match(pageSource, /data-role="favorite-modal"/);
  assert.match(pageSource, /data-role="favorite-modal-title"/);
  assert.match(pageSource, /data-action="open-create-favorite"/);
  assert.doesNotMatch(pageSource, /data-action="favorite-reset"/);
});

test("favorites view renders as a regular table instead of cards", () => {
  assert.match(pageSource, /dm-favorites-table/);
  assert.match(pageSource, /模板名称/);
  assert.doesNotMatch(pageSource, /dm-favorite-grid/);
  assert.doesNotMatch(pageSource, /dm-card-summary/);
});

test("history table stays single-row only and does not render a detail row", () => {
  assert.doesNotMatch(pageSource, /dm-table-detail-row/);
  assert.doesNotMatch(pageSource, /dm-detail-grid/);
});
