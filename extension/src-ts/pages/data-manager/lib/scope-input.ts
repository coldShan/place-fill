import { normalizeScopeKey } from "../page-model";

export function parseScopeInput(input: string, currentScope: string): { scope: string; error: string } {
  const raw = String(input || "").trim();
  if (!raw) return { scope: "", error: "请输入域名或网址" };
  let hostname = "";
  try {
    hostname = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : "http://" + raw).hostname;
  } catch (_error) {
    hostname = "";
  }
  const scope = normalizeScopeKey(hostname);
  if (!scope || (!scope.includes(".") && scope !== "localhost")) return { scope: "", error: "请输入有效的域名，例如 test.example.com" };
  if (scope === normalizeScopeKey(currentScope)) return { scope: "", error: "不能复制到当前站点" };
  return { scope, error: "" };
}

export function summarizeCopyResults(results: { scope: string; status: "created" | "duplicate" }[]): {
  message: string;
  tone: "success" | "warning";
} {
  const created = results.filter(function (result) { return result.status === "created"; });
  const skipped = results.filter(function (result) { return result.status === "duplicate"; });
  const skippedNames = skipped.length > 2
    ? skipped.slice(0, 2).map(function (result) { return result.scope; }).join("、") + " 等 " + skipped.length + " 个站点"
    : skipped.map(function (result) { return result.scope; }).join("、");
  if (!created.length) {
    return { message: skippedNames + " 已存在相同数据，未重复复制", tone: "warning" };
  }
  const base = "已复制到 " + created.length + " 个站点";
  return skipped.length
    ? { message: base + "；" + skippedNames + " 已存在相同数据，已跳过", tone: "success" }
    : { message: base, tone: "success" };
}
