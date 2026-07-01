(function () {
  "use strict";

  function getOriginFromUrl() {
    const params = new URLSearchParams(location.search || "");
    const origin = String(params.get("origin") || "").trim();
    try {
      const parsed = new URL(origin);
      return parsed.protocol === "https:" ? parsed.origin : "";
    } catch (_) {
      return "";
    }
  }

  function setStatus(node, text) {
    if (node) node.textContent = text || "";
  }

  const origin = getOriginFromUrl();
  const originNode = document.querySelector('[data-role="origin"]');
  const grantButton = document.querySelector('[data-role="grant"]');
  const statusNode = document.querySelector('[data-role="status"]');
  const originPattern = origin + "/*";

  if (originNode) originNode.textContent = origin || "无效接口域名";
  if (!origin || !grantButton) {
    if (grantButton) grantButton.disabled = true;
    setStatus(statusNode, "无法识别需要授权的 HTTPS 接口域名。");
    return;
  }

  grantButton.addEventListener("click", function () {
    grantButton.disabled = true;
    setStatus(statusNode, "正在请求授权...");
    chrome.permissions.request({ origins: [originPattern] }, function (granted) {
      void chrome.runtime.lastError;
      if (granted) {
        setStatus(statusNode, "授权完成。你可以回到原页面继续使用 AI 识别。");
        return;
      }
      grantButton.disabled = false;
      setStatus(statusNode, "未获得授权。请点击按钮重试，或检查 Chrome 扩展权限设置。");
    });
  });
})();
