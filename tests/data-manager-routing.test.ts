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
  assert.equal(normalizeDataManagerView("systems"), "systems");
  assert.equal(normalizeDataManagerView(" Systems "), "systems");
  assert.equal(normalizeDataManagerView("favorites"), "favorites");
  assert.equal(normalizeDataManagerView("recent"), "favorites");
  assert.equal(normalizeDataManagerView(""), "favorites");
});

test("parseDataManagerPageLocation normalizes scope and view from a query string", () => {
  assert.deepEqual(parseDataManagerPageLocation("?scope= Example.COM &view=history"), {
    scope: "example.com",
    view: "history",
    systemId: ""
  });
  assert.deepEqual(parseDataManagerPageLocation("?scope=https://example.com&view=recent"), {
    scope: "",
    view: "favorites",
    systemId: ""
  });
});

test("buildDataManagerPageUrl carries the systems view and an optional system id", () => {
  const base = "chrome-extension://abcdef/" + DATA_MANAGER_PAGE_PATH;
  assert.equal(
    buildDataManagerPageUrl("chrome-extension://abcdef/", "system:a", "systems", "a"),
    base + "?scope=system%3Aa&view=systems&system=a"
  );
  assert.equal(
    buildDataManagerPageUrl("chrome-extension://abcdef/", "host:localhost:5173", "systems"),
    base + "?scope=host%3Alocalhost%3A5173&view=systems"
  );
  assert.equal(
    buildDataManagerPageUrl("chrome-extension://abcdef/", "system:a", "systems", "https://bad/id"),
    base + "?scope=system%3Aa&view=systems"
  );
});

test("parseDataManagerPageLocation reads the systems view with its system id", () => {
  assert.deepEqual(parseDataManagerPageLocation("?scope=system%3Aabc-1&view=systems&system=abc-1"), {
    scope: "system:abc-1",
    view: "systems",
    systemId: "abc-1"
  });
  assert.equal(parseDataManagerPageLocation("?view=systems&system=a/b").systemId, "");
});
