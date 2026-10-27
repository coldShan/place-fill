// Chrome 给扩展文件的 ETag 只取文件修改时间，覆盖目录更新或同版本号重新打包时可能继续命中旧缓存。
// 这里绕过缓存读取每个页面资源，按内容摘要生成 ?v= 参数：内容一变地址就变，保证加载到最新版本。
// 本文件改名即可强制刷新自身；后续尽量保持稳定，资源清单以外的逻辑放到 generated/data-manager.js。
export const DATA_MANAGER_PAGE_ASSETS = [
  { kind: "style", path: "src/theme.css" },
  { kind: "style", path: "generated/data-manager.css" },
  { kind: "script", path: "src/icon-assets.js" },
  { kind: "script", path: "src/generators.js" },
  { kind: "module", path: "generated/data-manager.js" }
];

export async function fingerprintAsset(url, { fetchImpl, subtle }) {
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) throw new Error("failed to fetch " + url);
  const digest = new Uint8Array(await subtle.digest("SHA-256", await response.arrayBuffer()));
  return Array.from(digest.subarray(0, 8), function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

export async function resolveAssetUrl(path, { baseUrl, fallbackVersion, fetchImpl, subtle }) {
  const url = new URL(path, baseUrl);
  let fingerprint = fallbackVersion;
  try {
    fingerprint = await fingerprintAsset(url.href, { fetchImpl, subtle });
  } catch (_) {}
  url.searchParams.set("v", fingerprint);
  return url.href;
}

function appendAsset(doc, kind, href) {
  return new Promise(function (resolve) {
    const element = kind === "style" ? doc.createElement("link") : doc.createElement("script");
    if (kind === "style") {
      element.rel = "stylesheet";
      element.href = href;
    } else {
      element.async = false;
      element.src = href;
    }
    // 单个资源失败也继续挂载页面，避免整页空白
    element.addEventListener("load", resolve);
    element.addEventListener("error", resolve);
    (kind === "style" ? doc.head : doc.body).appendChild(element);
  });
}

export async function loadDataManagerPage({ baseUrl, doc, fallbackVersion, fetchImpl, importModule, subtle }) {
  const assets = await Promise.all(DATA_MANAGER_PAGE_ASSETS.map(async function (asset) {
    return {
      kind: asset.kind,
      href: await resolveAssetUrl(asset.path, { baseUrl, fallbackVersion, fetchImpl, subtle })
    };
  }));
  await Promise.all(assets.filter(function (asset) {
    return asset.kind !== "module";
  }).map(function (asset) {
    return appendAsset(doc, asset.kind, asset.href);
  }));
  for (const asset of assets) {
    if (asset.kind === "module") await importModule(asset.href);
  }
}

if (typeof document !== "undefined" && typeof chrome !== "undefined" && chrome.runtime) {
  await loadDataManagerPage({
    baseUrl: new URL("../", import.meta.url).href,
    doc: document,
    fallbackVersion: chrome.runtime.getManifest().version,
    fetchImpl: fetch.bind(globalThis),
    importModule: function (href) {
      return import(href);
    },
    subtle: crypto.subtle
  });
}
