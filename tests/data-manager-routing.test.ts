import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDataManagerPageUrl,
  DATA_MANAGER_PAGE_PATH,
  normalizeDataManagerView,
  parseDataManagerPageLocation
} from "../extension/src-ts/shared/data-manager-routing";

test("buildDataManagerPageUrl appends normalized scope and default favorites view", () => {
  const url = buildDataManagerPageUrl("chrome-extension://abcdef/", " Example.COM ");
  assert.equal(url, "chrome-extension://abcdef/" + DATA_MANAGER_PAGE_PATH + "?scope=example.com&view=favorites");
});

test("buildDataManagerPageUrl accepts an explicit history view", () => {
  const url = buildDataManagerPageUrl("chrome-extension://abcdef/", " Example.COM ", "history");
  assert.equal(url, "chrome-extension://abcdef/" + DATA_MANAGER_PAGE_PATH + "?scope=example.com&view=history");
});

test("buildDataManagerPageUrl omits invalid scope input but preserves default view", () => {
  const url = buildDataManagerPageUrl("chrome-extension://abcdef/", "https://example.com/form");
  assert.equal(url, "chrome-extension://abcdef/" + DATA_MANAGER_PAGE_PATH + "?view=favorites");
});

test("normalizeDataManagerView falls back to favorites for invalid values", () => {
  assert.equal(normalizeDataManagerView("history"), "history");
  assert.equal(normalizeDataManagerView("favorites"), "favorites");
  assert.equal(normalizeDataManagerView("recent"), "favorites");
  assert.equal(normalizeDataManagerView(""), "favorites");
});

test("parseDataManagerPageLocation normalizes scope and view from a query string", () => {
  assert.deepEqual(parseDataManagerPageLocation("?scope= Example.COM &view=history"), {
    scope: "example.com",
    view: "history"
  });
  assert.deepEqual(parseDataManagerPageLocation("?scope=https://example.com&view=recent"), {
    scope: "",
    view: "favorites"
  });
});
