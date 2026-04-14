var ChromeTestDataDataManagerBridgeBundle = (function() {
  "use strict";
  const FIELD_DEFINITIONS = [
    { key: "creditCode", label: "统一社会信用代码" },
    { key: "companyName", label: "公司名称" },
    { key: "fullName", label: "姓名" },
    { key: "idNumber", label: "身份证号" },
    { key: "bankCard", label: "银行卡号" },
    { key: "account", label: "账号" },
    { key: "mobile", label: "手机号" },
    { key: "email", label: "邮箱" },
    { key: "landline", label: "固定电话" },
    { key: "address", label: "地址" }
  ];
  FIELD_DEFINITIONS.map(function(definition) {
    return definition.key;
  });
  function normalizeScopeKey(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    if (normalized.includes("://")) return "";
    if (/[/?#]/.test(normalized)) return "";
    if (!/^[a-z0-9.\-:]+$/i.test(normalized)) return "";
    return normalized;
  }
  const DATA_MANAGER_PAGE_PATH = "data-manager.html";
  function normalizeDataManagerView(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "history" ? "history" : "favorites";
  }
  function buildDataManagerPageUrl(baseUrl, scope, view) {
    const url = new URL(DATA_MANAGER_PAGE_PATH, baseUrl);
    const normalizedScope = normalizeScopeKey(scope);
    const normalizedView = normalizeDataManagerView(view);
    if (normalizedScope) {
      url.searchParams.set("scope", normalizedScope);
    } else {
      url.searchParams.delete("scope");
    }
    url.searchParams.set("view", normalizedView);
    return url.toString();
  }
  const api = {
    buildDataManagerPageUrl
  };
  const rootScope = globalThis;
  rootScope.ChromeTestDataDataManagerBridge = api;
  return api;
})();
