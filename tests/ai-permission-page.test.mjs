import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pageHtml = readFileSync(join(here, "../extension/ai-permission.html"), "utf8");
const pageScript = readFileSync(join(here, "../extension/src/ai-permission-page.js"), "utf8");

test("ai permission page loads a dedicated script from an extension page", () => {
  assert.match(pageHtml, /<title>place-fill AI 接口授权<\/title>/);
  assert.match(pageHtml, /src="\.\/src\/ai-permission-page\.js"/);
});

test("ai permission page requests host access from a click handler", () => {
  assert.match(pageScript, /addEventListener\("click"/);
  assert.match(pageScript, /chrome\.permissions\.request/);
  assert.match(pageScript, /origins:\s*\[originPattern\]/);
  assert.match(pageScript, /https:/);
});
