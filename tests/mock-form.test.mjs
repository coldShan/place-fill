import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const mockFormSource = readFileSync(join(here, "../mock-form/index.html"), "utf8");

test("mock form includes an account input for manual verification", () => {
  assert.match(mockFormSource, /<label for="account">账号<\/label>/);
  assert.match(mockFormSource, /<input id="account" placeholder="粘贴这里" \/>/);
});
