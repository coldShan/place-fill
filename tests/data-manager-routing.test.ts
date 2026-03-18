import test from "node:test";
import assert from "node:assert/strict";

import { buildDataManagerPageUrl, DATA_MANAGER_PAGE_PATH } from "../extension/src-ts/shared/data-manager-routing";

test("buildDataManagerPageUrl appends normalized scope for valid hostnames", () => {
  const url = buildDataManagerPageUrl("chrome-extension://abcdef/", " Example.COM ");
  assert.equal(url, "chrome-extension://abcdef/" + DATA_MANAGER_PAGE_PATH + "?scope=example.com");
});

test("buildDataManagerPageUrl omits invalid scope input", () => {
  const url = buildDataManagerPageUrl("chrome-extension://abcdef/", "https://example.com/form");
  assert.equal(url, "chrome-extension://abcdef/" + DATA_MANAGER_PAGE_PATH);
});
