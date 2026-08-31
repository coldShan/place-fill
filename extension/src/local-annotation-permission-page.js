(function () {
  "use strict";

  const api = globalThis.ChromeTestDataLocalAnnotationFile;
  const grantButton = document.querySelector('[data-role="grant"]');
  const statusNode = document.querySelector('[data-role="status"]');
  let permissionRequired = false;

  function setStatus(text) {
    if (statusNode) statusNode.textContent = text || "";
  }

  if (!api || !grantButton || typeof window.showDirectoryPicker !== "function") {
    if (grantButton) grantButton.disabled = true;
    setStatus("当前 Chrome 不支持目录授权，请升级浏览器后重试。");
    return;
  }

  api.getStoredDirectoryHandle().then(async function (directoryHandle) {
    permissionRequired = !!(directoryHandle
      && await directoryHandle.queryPermission({ mode: "readwrite" }) === "prompt");
    if (permissionRequired) {
      grantButton.textContent = "恢复目录访问权限";
      setStatus("Chrome 需要重新确认已选目录，点击即可恢复，不需要再次选择目录。");
    }
  }).catch(function () {});

  grantButton.addEventListener("click", async function () {
    grantButton.disabled = true;
    setStatus("正在请求目录授权…");
    try {
      const storedDirectoryHandle = await api.getStoredDirectoryHandle();
      const storedPermission = storedDirectoryHandle
        ? await storedDirectoryHandle.queryPermission({ mode: "readwrite" })
        : "denied";
      if (storedPermission === "prompt") {
        await api.reauthorize(storedDirectoryHandle);
      } else if (storedPermission === "granted") {
        await api.resume(storedDirectoryHandle);
      } else {
        const directoryHandle = await window.showDirectoryPicker({
          id: "place-fill-user-data",
          mode: "readwrite",
          startIn: "documents"
        });
        const hasExistingFile = await api.hasExistingFile(directoryHandle);
        const preserveExisting = hasExistingFile && !window.confirm(
          "检测到已有 place-fill-data/place-fill-user-data.json。\n\n确定：使用当前浏览器标注覆盖本地文件。\n取消：保留并使用已有本地文件。"
        );
        await api.enable(directoryHandle, undefined, preserveExisting);
      }
      grantButton.textContent = "自动保存已开启";
      setStatus(permissionRequired
        ? "目录访问权限已恢复，当前标注已同步。"
        : "目录授权成功，标注文件已就绪。");
    } catch (error) {
      grantButton.disabled = false;
      setStatus(error && error.name === "AbortError" ? "已取消授权，功能仍处于关闭状态。" : (error && error.message ? error.message : "目录授权失败，请重试。"));
    }
  });
})();
