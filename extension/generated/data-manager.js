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
const FIELD_KEYS = FIELD_DEFINITIONS.map(function(definition) {
  return definition.key;
});
function getFieldLabel(fieldKey) {
  const definition = FIELD_DEFINITIONS.find(function(item) {
    return item.key === fieldKey;
  });
  return definition ? definition.label : fieldKey;
}
function createEmptyProfile() {
  return Object.fromEntries(
    FIELD_KEYS.map(function(fieldKey) {
      return [fieldKey, ""];
    })
  );
}
function normalizeProfile(profile) {
  const nextProfile = createEmptyProfile();
  FIELD_KEYS.forEach(function(fieldKey) {
    const value = profile && typeof profile[fieldKey] === "string" ? profile[fieldKey] : "";
    nextProfile[fieldKey] = String(value || "");
  });
  return nextProfile;
}
function formatProfileForCopy(profile) {
  const normalized = normalizeProfile(profile);
  return FIELD_DEFINITIONS.map(function(definition) {
    return definition.label + "：" + normalized[definition.key];
  }).join("\n");
}
const GENERATED_PROFILES_STORAGE_KEY = "ctdp.generatedProfiles.v1";
const FAVORITE_PROFILES_STORAGE_KEY = "ctdp.favoriteProfiles.v1";
const MAX_GENERATED_RECORDS = 30;
function getStorageArea(env) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) return chrome.storage.local;
  } catch (_error) {
  }
  return null;
}
function readStorageValue(storageArea, key) {
  if (!storageArea) return Promise.resolve(void 0);
  return new Promise(function(resolve) {
    storageArea.get([key], function(result) {
      resolve(result ? result[key] : void 0);
    });
  });
}
function writeStorageValue(storageArea, key, value) {
  if (!storageArea) return Promise.resolve();
  return new Promise(function(resolve) {
    storageArea.set({ [key]: value }, function() {
      resolve();
    });
  });
}
function normalizeTimestamp(value) {
  const raw = String(value || "").trim();
  return /^\d+$/.test(raw) ? raw : "0";
}
function normalizeId(value) {
  const raw = String(value || "").trim();
  return raw || "record-0";
}
function createId(now, random) {
  return String(now) + "-" + Math.floor(random() * 1e6).toString(36);
}
function normalizeScopeKey(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("://")) return "";
  if (/[/?#]/.test(normalized)) return "";
  if (!/^[a-z0-9.\-:]+$/i.test(normalized)) return "";
  return normalized;
}
function normalizeGeneratedProfilesMap(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
  const nextMap = {};
  Object.entries(rawValue).forEach(function([scope, entries]) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !Array.isArray(entries)) return;
    nextMap[normalizedScope] = entries.filter(function(entry) {
      return !!entry && typeof entry === "object" && !Array.isArray(entry);
    }).map(function(entry) {
      const current = entry;
      return {
        createdAt: normalizeTimestamp(current.createdAt),
        id: normalizeId(current.id),
        profile: normalizeProfile(current.profile)
      };
    }).sort(function(left, right) {
      return Number(right.createdAt) - Number(left.createdAt);
    }).slice(0, MAX_GENERATED_RECORDS);
  });
  return nextMap;
}
function normalizeFavoriteProfilesMap(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) return {};
  const nextMap = {};
  Object.entries(rawValue).forEach(function([scope, entries]) {
    const normalizedScope = normalizeScopeKey(scope);
    if (!normalizedScope || !Array.isArray(entries)) return;
    nextMap[normalizedScope] = entries.filter(function(entry) {
      return !!entry && typeof entry === "object" && !Array.isArray(entry);
    }).map(function(entry) {
      const current = entry;
      const createdAt = normalizeTimestamp(current.createdAt);
      const updatedAt = normalizeTimestamp(current.updatedAt || current.createdAt);
      return {
        createdAt,
        id: normalizeId(current.id),
        name: String(current.name || "").trim() || "常用数据",
        profile: normalizeProfile(current.profile),
        updatedAt
      };
    }).sort(function(left, right) {
      return Number(right.updatedAt) - Number(left.updatedAt);
    });
  });
  return nextMap;
}
function isSameProfile(left, right) {
  return FIELD_KEYS.every(function(fieldKey) {
    return left[fieldKey] === right[fieldKey];
  });
}
async function readGeneratedProfilesMap(env) {
  return normalizeGeneratedProfilesMap(await readStorageValue(getStorageArea(), GENERATED_PROFILES_STORAGE_KEY));
}
async function writeGeneratedProfilesMap(nextMap, env) {
  await writeStorageValue(getStorageArea(), GENERATED_PROFILES_STORAGE_KEY, nextMap);
}
async function readFavoriteProfilesMap(env) {
  return normalizeFavoriteProfilesMap(await readStorageValue(getStorageArea(), FAVORITE_PROFILES_STORAGE_KEY));
}
async function writeFavoriteProfilesMap(nextMap, env) {
  await writeStorageValue(getStorageArea(), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
}
async function readGeneratedProfiles(scope, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const records = await readGeneratedProfilesMap();
  return records[normalizedScope] ? records[normalizedScope].slice() : [];
}
async function readFavoriteProfiles(scope, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) return [];
  const favoritesMap = await readFavoriteProfilesMap();
  return favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
}
async function createFavoriteProfile(scope, input, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope) {
    throw new Error("Invalid scope");
  }
  const now = Date.now();
  const random = Math.random;
  const entry = {
    createdAt: String(now),
    id: createId(now, random),
    name: String(input.name || "").trim() || "常用数据",
    profile: normalizeProfile(input.profile),
    updatedAt: String(now)
  };
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  favoritesMap[normalizedScope] = [entry].concat(currentEntries);
  await writeFavoriteProfilesMap(favoritesMap);
  return entry;
}
async function updateFavoriteProfile(scope, id, input, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !id) return null;
  const now = Date.now();
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const entryIndex = currentEntries.findIndex(function(entry) {
    return entry.id === id;
  });
  if (entryIndex === -1) return null;
  const currentEntry = currentEntries[entryIndex];
  if (!currentEntry) return null;
  const nextEntry = {
    createdAt: currentEntry.createdAt,
    id: currentEntry.id,
    name: String(input.name || "").trim() || currentEntry.name,
    profile: normalizeProfile(input.profile),
    updatedAt: String(now)
  };
  currentEntries.splice(entryIndex, 1);
  favoritesMap[normalizedScope] = [nextEntry].concat(currentEntries);
  await writeFavoriteProfilesMap(favoritesMap);
  return nextEntry;
}
async function deleteFavoriteProfile(scope, id, env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !id) return false;
  const favoritesMap = await readFavoriteProfilesMap();
  const currentEntries = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const nextEntries = currentEntries.filter(function(entry) {
    return entry.id !== id;
  });
  if (nextEntries.length === currentEntries.length) return false;
  favoritesMap[normalizedScope] = nextEntries;
  await writeFavoriteProfilesMap(favoritesMap);
  return true;
}
async function createFavoriteFromHistory(scope, historyId, name = "", env) {
  const normalizedScope = normalizeScopeKey(scope);
  if (!normalizedScope || !historyId) return null;
  const recordsMap = await readGeneratedProfilesMap();
  const records = recordsMap[normalizedScope] ? recordsMap[normalizedScope].slice() : [];
  const historyEntry = records.find(function(entry2) {
    return entry2.id === historyId;
  });
  if (!historyEntry) return null;
  recordsMap[normalizedScope] = records.filter(function(entry2) {
    return entry2.id !== historyId;
  });
  const favoritesMap = await readFavoriteProfilesMap();
  const currentFavorites = favoritesMap[normalizedScope] ? favoritesMap[normalizedScope].slice() : [];
  const existingFavorite = currentFavorites.find(function(entry2) {
    return isSameProfile(entry2.profile, historyEntry.profile);
  });
  if (existingFavorite) {
    await writeGeneratedProfilesMap(recordsMap);
    return existingFavorite;
  }
  const now = Date.now();
  const random = Math.random;
  const entry = {
    createdAt: String(now),
    id: createId(now, random),
    name: String(name || "").trim() || "常用数据",
    profile: historyEntry.profile,
    updatedAt: String(now)
  };
  favoritesMap[normalizedScope] = [entry].concat(currentFavorites);
  await writeFavoriteProfilesMap(favoritesMap);
  await writeGeneratedProfilesMap(recordsMap);
  return entry;
}
function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function formatDisplayTime(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "时间未知";
  return new Date(timestamp).toLocaleString("zh-CN");
}
function renderFavoriteModal() {
  return [
    '<div class="dm-modal" data-role="favorite-modal" hidden>',
    '  <button type="button" class="dm-modal-backdrop" data-action="close-favorite-modal" aria-label="关闭常用数据表单"></button>',
    '  <section class="dm-modal-card" role="dialog" aria-modal="true" aria-labelledby="dm-favorite-modal-title">',
    '    <div class="dm-modal-head">',
    '      <div class="dm-modal-copy">',
    '        <h2 id="dm-favorite-modal-title" data-role="favorite-modal-title">新增常用数据</h2>',
    '        <p class="dm-modal-note" data-role="favorite-modal-note">仅保存当前作用域下的数据。</p>',
    "      </div>",
    '      <button type="button" class="dm-icon-btn" data-action="close-favorite-modal" aria-label="关闭弹窗">关闭</button>',
    "    </div>",
    '    <form class="dm-modal-form" data-role="favorite-form">',
    '      <div class="dm-modal-grid">',
    FIELD_KEYS.map(function(fieldKey) {
      return [
        '<label class="dm-form-field">',
        "  <span>" + escapeHtml(getFieldLabel(fieldKey)) + "</span>",
        '  <input type="text" data-field-key="' + escapeHtml(fieldKey) + '" placeholder="填写' + escapeHtml(getFieldLabel(fieldKey)) + '">',
        "</label>"
      ].join("");
    }).join(""),
    "      </div>",
    '      <div class="dm-modal-actions">',
    '        <button type="button" class="dm-subtle-btn" data-action="close-favorite-modal">取消</button>',
    '        <button type="submit" class="dm-primary-btn">保存常用数据</button>',
    "      </div>",
    "    </form>",
    "  </section>",
    "</div>"
  ].join("");
}
function readFavoriteDraft(form) {
  return normalizeProfile(
    Object.fromEntries(
      FIELD_KEYS.map(function(fieldKey) {
        return [
          fieldKey,
          form?.querySelector('[data-field-key="' + fieldKey + '"]')?.value || ""
        ];
      })
    )
  );
}
function syncFavoriteForm(form, titleNode, noteNode, entry) {
  if (!form) return;
  if (titleNode) titleNode.textContent = entry ? "编辑常用数据" : "新增常用数据";
  if (noteNode) {
    noteNode.textContent = entry ? "保存后将覆盖当前这组常用数据。" : "仅保存当前作用域下的数据。";
  }
  const profile = normalizeProfile(entry ? entry.profile : void 0);
  FIELD_KEYS.forEach(function(fieldKey) {
    const input = form.querySelector('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = profile[fieldKey];
  });
}
function renderFavoritesView(_scope, entries) {
  return [
    '<section class="dm-view dm-view-favorites" aria-label="常用数据">',
    entries.length ? [
      '<div class="dm-table-shell dm-favorites-shell">',
      '  <table class="dm-table dm-favorites-table">',
      "    <thead><tr><th>姓名</th><th>公司</th><th>手机</th><th>邮箱</th><th>操作</th></tr></thead>",
      "    <tbody>",
      entries.map(function(entry) {
        return [
          "<tr>",
          "  <td>" + escapeHtml(entry.profile.fullName || "未填写") + "</td>",
          "  <td>" + escapeHtml(entry.profile.companyName || "未填写") + "</td>",
          "  <td>" + escapeHtml(entry.profile.mobile || "未填写") + "</td>",
          "  <td>" + escapeHtml(entry.profile.email || "未填写") + "</td>",
          '  <td class="dm-table-actions">',
          '    <button type="button" class="dm-table-btn" data-action="favorite-copy" data-id="' + escapeHtml(entry.id) + '">复制整组</button>',
          '    <button type="button" class="dm-table-btn" data-action="favorite-edit" data-id="' + escapeHtml(entry.id) + '">编辑</button>',
          '    <button type="button" class="dm-table-btn is-danger" data-action="favorite-delete" data-id="' + escapeHtml(entry.id) + '">删除</button>',
          "  </td>",
          "</tr>"
        ].join("");
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("") : [
      '<section class="dm-empty-state">',
      "  <h2>当前作用域还没有常用数据</h2>",
      "  <p>你可以手动新增一组数据，或者稍后从生成记录里收藏一组数据。</p>",
      '  <button type="button" class="dm-primary-btn" data-action="open-create-favorite">新增第一组数据</button>',
      "</section>"
    ].join(""),
    "</section>"
  ].join("");
}
function renderHistoryView(_scope, entries) {
  return [
    '<section class="dm-view dm-view-history" aria-label="生成记录">',
    entries.length ? [
      '<div class="dm-table-shell">',
      '  <table class="dm-table">',
      "    <thead><tr><th>时间</th><th>姓名</th><th>公司</th><th>手机</th><th>邮箱</th><th>操作</th></tr></thead>",
      "    <tbody>",
      entries.map(function(entry) {
        return [
          "<tr>",
          "  <td>" + escapeHtml(formatDisplayTime(entry.createdAt)) + "</td>",
          "  <td>" + escapeHtml(entry.profile.fullName) + "</td>",
          "  <td>" + escapeHtml(entry.profile.companyName) + "</td>",
          "  <td>" + escapeHtml(entry.profile.mobile) + "</td>",
          "  <td>" + escapeHtml(entry.profile.email) + "</td>",
          '  <td class="dm-table-actions">',
          '    <button type="button" class="dm-table-btn" data-action="history-favorite" data-id="' + escapeHtml(entry.id) + '">收藏</button>',
          '    <button type="button" class="dm-table-btn" data-action="history-copy" data-id="' + escapeHtml(entry.id) + '">复制</button>',
          "  </td>",
          "</tr>"
        ].join("");
      }).join(""),
      "    </tbody>",
      "  </table>",
      "</div>"
    ].join("") : [
      '<section class="dm-empty-state">',
      "  <h2>当前作用域还没有生成记录</h2>",
      "  <p>先从插件面板生成一组数据，再回到这里进行复制或收藏。</p>",
      "</section>"
    ].join(""),
    "</section>"
  ].join("");
}
const DATA_MANAGER_PAGE_PATH = "data-manager.html";
function normalizeDataManagerView(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "history" ? "history" : "favorites";
}
function parseDataManagerPageLocation(search) {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    scope: normalizeScopeKey(params.get("scope") || ""),
    view: normalizeDataManagerView(params.get("view"))
  };
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
const doc = document;
const win = window;
const state = {
  activeScope: "",
  activeView: "favorites",
  editingFavoriteId: null,
  favoriteProfiles: [],
  generatedProfiles: [],
  modalOpen: false,
  toastTimer: null
};
let workspace = null;
let toastNode = null;
let favoriteModal = null;
let favoriteModalTitle = null;
let favoriteModalNote = null;
let favoriteForm = null;
let viewTitle = null;
let viewActions = null;
function setToast(message, tone = "info") {
  if (!toastNode) return;
  toastNode.textContent = message;
  toastNode.setAttribute("data-tone", tone);
  toastNode.hidden = !message;
  if (state.toastTimer) win.clearTimeout(state.toastTimer);
  if (!message) return;
  state.toastTimer = win.setTimeout(function() {
    if (!toastNode) return;
    toastNode.hidden = true;
    toastNode.textContent = "";
  }, 2400);
}
async function copyProfile(profile) {
  try {
    await navigator.clipboard.writeText(formatProfileForCopy(profile));
    setToast("已复制整组数据", "success");
  } catch (_error) {
    setToast("自动复制失败，请手动复制", "warning");
  }
}
function updateLocationQuery() {
  if (!win.history || typeof win.history.replaceState !== "function") return;
  const url = buildDataManagerPageUrl(win.location.href, state.activeScope, state.activeView);
  win.history.replaceState(null, "", url);
}
function renderNavigation() {
  Array.from(doc.querySelectorAll("[data-role='view-link']")).forEach(function(node) {
    const nextView = normalizeDataManagerView(node.getAttribute("data-view"));
    const isActive = nextView === state.activeView;
    node.setAttribute("aria-current", isActive ? "page" : "false");
    node.setAttribute("aria-selected", isActive ? "true" : "false");
    node.setAttribute("data-active", isActive ? "true" : "false");
    node.setAttribute("tabindex", isActive ? "0" : "-1");
  });
}
function renderWorkspace() {
  if (!workspace) return;
  workspace.innerHTML = state.activeView === "history" ? renderHistoryView(state.activeScope, state.generatedProfiles) : renderFavoritesView(state.activeScope, state.favoriteProfiles);
}
function renderModal() {
  if (!favoriteModal) return;
  const editingEntry = state.editingFavoriteId ? state.favoriteProfiles.find(function(entry) {
    return entry.id === state.editingFavoriteId;
  }) || null : null;
  favoriteModal.hidden = !state.modalOpen;
  favoriteModal.setAttribute("data-open", state.modalOpen ? "true" : "false");
  syncFavoriteForm(favoriteForm, favoriteModalTitle, favoriteModalNote, editingEntry);
}
function renderTopbar() {
  if (viewTitle) viewTitle.textContent = state.activeView === "history" ? "生成记录" : "常用数据";
  if (!viewActions) return;
  viewActions.innerHTML = state.activeView === "favorites" ? '<button type="button" class="dm-primary-btn" data-action="open-create-favorite">新增常用数据</button>' : "";
}
function renderAll() {
  renderTopbar();
  renderNavigation();
  renderWorkspace();
  renderModal();
  updateLocationQuery();
}
async function syncViewState(nextScope, nextView) {
  const normalizedScope = normalizeScopeKey(nextScope || "");
  state.activeScope = normalizedScope;
  state.activeView = normalizeDataManagerView(nextView || state.activeView);
  state.favoriteProfiles = state.activeScope ? await readFavoriteProfiles(state.activeScope) : [];
  state.generatedProfiles = state.activeScope ? await readGeneratedProfiles(state.activeScope) : [];
  if (state.editingFavoriteId && !state.favoriteProfiles.some(function(entry) {
    return entry.id === state.editingFavoriteId;
  })) {
    state.editingFavoriteId = null;
    state.modalOpen = false;
  }
  renderAll();
}
function openFavoriteModal(entryId) {
  state.editingFavoriteId = entryId || null;
  state.modalOpen = true;
  renderModal();
  favoriteForm?.querySelector("[data-field-key]")?.focus();
}
function closeFavoriteModal() {
  state.modalOpen = false;
  state.editingFavoriteId = null;
  renderModal();
}
async function handleFavoriteSubmit(event) {
  event.preventDefault();
  if (!state.activeScope) {
    setToast("当前没有可用作用域", "warning");
    return;
  }
  const draft = readFavoriteDraft(favoriteForm);
  if (state.editingFavoriteId) {
    await updateFavoriteProfile(state.activeScope, state.editingFavoriteId, { profile: draft });
    setToast("常用数据已更新", "success");
  } else {
    await createFavoriteProfile(state.activeScope, { profile: draft });
    setToast("已新增常用数据", "success");
  }
  closeFavoriteModal();
  await syncViewState(state.activeScope, "favorites");
}
async function handleRootClick(event) {
  const trigger = event.target?.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.getAttribute("data-action") || "";
  const id = trigger.getAttribute("data-id") || "";
  if (action === "switch-view") {
    await syncViewState(state.activeScope, normalizeDataManagerView(trigger.getAttribute("data-view")));
    return;
  }
  if (action === "open-create-favorite") {
    openFavoriteModal();
    return;
  }
  if (action === "close-favorite-modal") {
    closeFavoriteModal();
    return;
  }
  if (action === "favorite-copy") {
    const entry = state.favoriteProfiles.find(function(item) {
      return item.id === id;
    });
    if (entry) await copyProfile(entry.profile);
    return;
  }
  if (action === "favorite-edit") {
    openFavoriteModal(id);
    return;
  }
  if (action === "favorite-delete") {
    const entry = state.favoriteProfiles.find(function(item) {
      return item.id === id;
    });
    if (!entry || !win.confirm("确认删除这组常用数据？")) return;
    await deleteFavoriteProfile(state.activeScope, id);
    if (state.editingFavoriteId === id) closeFavoriteModal();
    await syncViewState(state.activeScope, state.activeView);
    setToast("已删除常用数据", "success");
    return;
  }
  if (action === "history-copy") {
    const entry = state.generatedProfiles.find(function(item) {
      return item.id === id;
    });
    if (entry) await copyProfile(entry.profile);
    return;
  }
  if (action === "history-favorite") {
    const created = await createFavoriteFromHistory(state.activeScope, id);
    if (!created) return;
    await syncViewState(state.activeScope, state.activeView);
    setToast("已从生成记录加入常用数据", "success");
  }
}
function renderShell() {
  doc.body.innerHTML = [
    '<div class="dm-app">',
    '  <div class="dm-ambient dm-ambient-top" aria-hidden="true"></div>',
    '  <div class="dm-ambient dm-ambient-bottom" aria-hidden="true"></div>',
    '  <div class="dm-shell">',
    '    <header class="dm-topbar">',
    '      <h1 class="dm-topbar-title" data-role="view-title"></h1>',
    '      <div class="dm-topbar-actions" data-role="view-actions"></div>',
    "    </header>",
    '    <nav class="dm-tabs" role="tablist" aria-label="数据管理视图">',
    '      <button type="button" class="dm-tab" role="tab" data-role="view-link" data-action="switch-view" data-view="favorites">常用数据</button>',
    '      <button type="button" class="dm-tab" role="tab" data-role="view-link" data-action="switch-view" data-view="history">生成记录</button>',
    "    </nav>",
    '    <main class="dm-workspace" data-role="workspace"></main>',
    '    <div class="dm-toast" data-role="toast" hidden></div>',
    renderFavoriteModal(),
    "  </div>",
    "</div>"
  ].join("");
  viewTitle = doc.querySelector('[data-role="view-title"]');
  viewActions = doc.querySelector('[data-role="view-actions"]');
  workspace = doc.querySelector('[data-role="workspace"]');
  toastNode = doc.querySelector('[data-role="toast"]');
  favoriteModal = doc.querySelector('[data-role="favorite-modal"]');
  favoriteModalTitle = doc.querySelector('[data-role="favorite-modal-title"]');
  favoriteModalNote = doc.querySelector('[data-role="favorite-modal-note"]');
  favoriteForm = doc.querySelector('[data-role="favorite-form"]');
  favoriteForm?.addEventListener("submit", function(event) {
    void handleFavoriteSubmit(event);
  });
  doc.body.addEventListener("click", function(event) {
    void handleRootClick(event);
  });
  doc.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && state.modalOpen) closeFavoriteModal();
  });
}
async function bootstrap() {
  renderShell();
  const route = parseDataManagerPageLocation(win.location.search);
  state.activeView = route.view;
  await syncViewState(route.scope, route.view);
}
void bootstrap();
