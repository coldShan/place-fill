(function (rootScope) {
  "use strict";

  const ICON_PATHS = {
    "arrow-left": "assets/icons/lucide/arrow-left.svg",
    "badge-check": "assets/icons/lucide/badge-check.svg",
    "building-2": "assets/icons/lucide/building-2.svg",
    copy: "assets/icons/lucide/copy.svg",
    "credit-card": "assets/icons/lucide/credit-card.svg",
    download: "assets/icons/lucide/download.svg",
    "id-card": "assets/icons/lucide/id-card.svg",
    landmark: "assets/icons/lucide/landmark.svg",
    "list-filter": "assets/icons/lucide/list-filter.svg",
    mail: "assets/icons/lucide/mail.svg",
    "map-pinned": "assets/icons/lucide/map-pinned.svg",
    "panel-right-close": "assets/icons/lucide/panel-right-close.svg",
    phone: "assets/icons/lucide/phone.svg",
    "refresh-cw": "assets/icons/lucide/refresh-cw.svg",
    settings: "assets/icons/lucide/settings.svg",
    smartphone: "assets/icons/lucide/smartphone.svg",
    shield: "assets/icons/lucide/shield.svg",
    upload: "assets/icons/lucide/upload.svg",
    "user-round": "assets/icons/lucide/user-round.svg"
  };

  const PRIMARY_LOGO_ICON = "id-card";
  const ACTION_ICONS = {
    back: "arrow-left",
    collapse: "panel-right-close",
    copyAll: "copy",
    copied: "badge-check",
    regen: "refresh-cw",
    settings: "settings"
  };
  const SETTINGS_CARD_ICONS = {
    exportOverrides: "download",
    exportSanitizedOverrides: "shield",
    importOverrides: "upload",
    visibleFields: "list-filter"
  };

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getRuntimeApi(env) {
    if (env && env.chromeRuntime) return env.chromeRuntime;
    if (typeof chrome !== "undefined" && chrome.runtime) return chrome.runtime;
    return null;
  }

  function getIconAssetPath(name) {
    return ICON_PATHS[name] || ICON_PATHS[PRIMARY_LOGO_ICON];
  }

  function getIconAssetUrl(name, env) {
    const assetPath = getIconAssetPath(name);
    const runtime = getRuntimeApi(env);
    if (runtime && typeof runtime.getURL === "function") return runtime.getURL(assetPath);
    return assetPath;
  }

  function renderIconMarkup(name, className, label, env) {
    const iconName = ICON_PATHS[name] ? name : PRIMARY_LOGO_ICON;
    const classes = ["ctdp-icon"];
    const url = getIconAssetUrl(iconName, env);
    if (className) classes.push(className);
    return [
      '<span class="',
      classes.join(" "),
      '" data-icon="',
      escapeAttribute(iconName),
      '" style="--ctdp-icon-url:url(',
      escapeAttribute(url),
      ')"',
      label ? ' role="img" aria-label="' + escapeAttribute(label) + '"' : ' aria-hidden="true"',
      "></span>"
    ].join("");
  }

  const api = {
    ACTION_ICONS,
    ICON_PATHS,
    PRIMARY_LOGO_ICON,
    SETTINGS_CARD_ICONS,
    getIconAssetPath,
    getIconAssetUrl,
    renderIconMarkup
  };

  rootScope.ChromeTestDataIconAssets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
