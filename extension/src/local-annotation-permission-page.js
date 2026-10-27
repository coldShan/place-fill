(function () {
  "use strict";

  const api = globalThis.ChromeTestDataLocalAnnotationFile;
  const grantButton = document.querySelector('[data-role="grant"]');
  const statusNode = document.querySelector('[data-role="status"]');
  const titleNode = document.querySelector('[data-role="title"]');
  const changeMode = new URLSearchParams(window.location.search).get("mode") === "change";
  let permissionRequired = false;

  function setStatus(text) {
    if (statusNode) statusNode.textContent = text || "";
  }

  if (!api || !grantButton || !api.isPersistentDirectoryPermissionSupported() || typeof window.showDirectoryPicker !== "function") {
    if (grantButton) grantButton.disabled = true;
    setStatus("本地目录自动备份需要 Chrome 122 或更高版本；当前版本请使用手动备份与恢复。");
    return;
  }

  function pickDirectory() {
    return window.showDirectoryPicker({
      id: "place-fill-user-data",
      mode: "readwrite",
      startIn: "documents"
    });
  }

  function confirmPreserveExisting() {
    return !window.confirm(
      "检测到已有 place-fill-data/place-fill-user-data.json。\n\n确定：使用当前浏览器全部数据覆盖本地文件。\n取消：保留并恢复已有本地备份。"
    );
  }

  if (changeMode) {
    if (titleNode) titleNode.textContent = "更换本地备份目录";
    grantButton.textContent = "选择新目录";
    setStatus("选择新的父目录后，自动备份将改为写入新目录；原目录中的备份文件会保留。");
    grantButton.addEventListener("click", async function () {
      grantButton.disabled = true;
      setStatus("正在选择新目录…");
      try {
        const directoryHandle = await pickDirectory();
        const preserveExisting = await api.hasExistingFile(directoryHandle) && confirmPreserveExisting();
        await api.changeDirectory(directoryHandle, undefined, preserveExisting);
        grantButton.textContent = "已更换目录";
        setStatus("已更换为「" + directoryHandle.name + "」，全部数据已同步，后续自动备份写入新目录。");
      } catch (error) {
        grantButton.disabled = false;
        setStatus(error && error.name === "AbortError"
          ? "已取消更换，自动备份继续使用原目录。"
          : (error && error.message ? error.message : "更换目录失败") + "，自动备份继续使用原目录。");
      }
    });
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
        const directoryHandle = await pickDirectory();
        const preserveExisting = await api.hasExistingFile(directoryHandle) && confirmPreserveExisting();
        await api.enable(directoryHandle, undefined, preserveExisting);
      }
      grantButton.textContent = "自动备份已开启";
      setStatus(permissionRequired
        ? "目录访问权限已恢复，全部数据已同步。"
        : "目录授权成功，全量备份文件已就绪。");
    } catch (error) {
      grantButton.disabled = false;
      setStatus(error && error.name === "AbortError" ? "已取消授权，功能仍处于关闭状态。" : (error && error.message ? error.message : "目录授权失败，请重试。"));
    }
  });
})();
