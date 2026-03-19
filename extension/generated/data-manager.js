const FIELD_DEFINITIONS = [
  { key: "creditCode", label: "统一社会信用代码" },
  { key: "companyName", label: "公司名称" },
  { key: "fullName", label: "姓名" },
  { key: "idNumber", label: "身份证号" },
  { key: "bankCard", label: "银行卡号" },
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
        name: String(current.name || "").trim() || "未命名模板",
        profile: normalizeProfile(current.profile),
        updatedAt
      };
    }).sort(function(left, right) {
      return Number(right.updatedAt) - Number(left.updatedAt);
    });
  });
  return nextMap;
}
async function readGeneratedProfilesMap(env) {
  return normalizeGeneratedProfilesMap(await readStorageValue(getStorageArea(), GENERATED_PROFILES_STORAGE_KEY));
}
async function readFavoriteProfilesMap(env) {
  return normalizeFavoriteProfilesMap(await readStorageValue(getStorageArea(), FAVORITE_PROFILES_STORAGE_KEY));
}
async function writeFavoriteProfilesMap(nextMap, env) {
  await writeStorageValue(getStorageArea(), FAVORITE_PROFILES_STORAGE_KEY, nextMap);
}
async function listKnownScopes(env) {
  const generatedMap = await readGeneratedProfilesMap();
  const favoriteMap = await readFavoriteProfilesMap();
  return Array.from(new Set(Object.keys(generatedMap).concat(Object.keys(favoriteMap)))).sort();
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
    name: String(input.name || "").trim() || "未命名模板",
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
async function createFavoriteFromHistory(scope, historyId, name, env) {
  const records = await readGeneratedProfiles(scope);
  const historyEntry = records.find(function(entry) {
    return entry.id === historyId;
  });
  if (!historyEntry) return null;
  return createFavoriteProfile(
    scope,
    {
      name: String(name || "").trim(),
      profile: historyEntry.profile
    }
  );
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
    "      <div>",
    '        <p class="dm-modal-kicker">Reusable Profile</p>',
    '        <h2 id="dm-favorite-modal-title" data-role="favorite-modal-title">新增常用数据</h2>',
    '        <p class="dm-modal-note" data-role="favorite-modal-note">当前模板会按作用域保存，可在后续直接复制复用。</p>',
    "      </div>",
    '      <button type="button" class="dm-icon-btn" data-action="close-favorite-modal" aria-label="关闭弹窗">关闭</button>',
    "    </div>",
    '    <form class="dm-modal-form" data-role="favorite-form">',
    '      <label class="dm-form-field dm-form-field-wide">',
    "        <span>模板名称</span>",
    '        <input type="text" data-role="favorite-title" placeholder="例如：企业开户回归模板">',
    "      </label>",
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
    '        <button type="submit" class="dm-primary-btn">保存模板</button>',
    "      </div>",
    "    </form>",
    "  </section>",
    "</div>"
  ].join("");
}
function readFavoriteDraft(form) {
  return {
    name: String(form?.querySelector('[data-role="favorite-title"]')?.value || ""),
    profile: normalizeProfile(
      Object.fromEntries(
        FIELD_KEYS.map(function(fieldKey) {
          return [
            fieldKey,
            form?.querySelector('[data-field-key="' + fieldKey + '"]')?.value || ""
          ];
        })
      )
    )
  };
}
function syncFavoriteForm(form, titleNode, noteNode, entry) {
  if (!form) return;
  const titleInput = form.querySelector('[data-role="favorite-title"]');
  if (titleNode) titleNode.textContent = entry ? "编辑常用数据" : "新增常用数据";
  if (noteNode) {
    noteNode.textContent = entry ? "调整这组模板后，会立即覆盖当前作用域里的已收藏版本。" : "当前模板会按作用域保存，可在后续直接复制复用。";
  }
  if (titleInput) titleInput.value = entry ? entry.name : "";
  const profile = normalizeProfile(entry ? entry.profile : void 0);
  FIELD_KEYS.forEach(function(fieldKey) {
    const input = form.querySelector('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = profile[fieldKey];
  });
}
function renderFavoritesView(scope, entries) {
  return [
    '<section class="dm-view dm-view-favorites" aria-labelledby="dm-view-title">',
    '  <div class="dm-view-head">',
    '    <div class="dm-view-copy">',
    '      <p class="dm-view-kicker">Reusable Profiles</p>',
    '      <h1 id="dm-view-title">常用数据</h1>',
    '      <p class="dm-view-description">把会反复复用的整组资料沉淀为模板，当前按作用域 <strong>' + escapeHtml(scope || "未识别") + "</strong> 单独管理。</p>",
    "    </div>",
    '    <button type="button" class="dm-primary-btn" data-action="open-create-favorite">新增常用数据</button>',
    "  </div>",
    entries.length ? [
      '<div class="dm-table-shell dm-favorites-shell">',
      '  <table class="dm-table dm-favorites-table">',
      "    <thead><tr><th>模板名称</th><th>姓名</th><th>公司</th><th>手机</th><th>更新时间</th><th>操作</th></tr></thead>",
      "    <tbody>",
      entries.map(function(entry) {
        return [
          "<tr>",
          '  <td class="dm-favorites-name-cell"><strong>' + escapeHtml(entry.name) + "</strong></td>",
          "  <td>" + escapeHtml(entry.profile.fullName || "未填写") + "</td>",
          "  <td>" + escapeHtml(entry.profile.companyName || "未填写") + "</td>",
          "  <td>" + escapeHtml(entry.profile.mobile || "未填写") + "</td>",
          '  <td class="dm-favorites-time-cell">' + escapeHtml(formatDisplayTime(entry.updatedAt)) + "</td>",
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
      '  <p class="dm-empty-kicker">No favorites yet</p>',
      "  <h2>当前作用域还没有常用数据</h2>",
      "  <p>你可以手动新增模板，或者稍后从生成记录里收藏一组数据。</p>",
      '  <button type="button" class="dm-primary-btn" data-action="open-create-favorite">创建第一组模板</button>',
      "</section>"
    ].join(""),
    "</section>"
  ].join("");
}
function renderHistoryView(scope, entries) {
  return [
    '<section class="dm-view dm-view-history" aria-labelledby="dm-view-title">',
    '  <div class="dm-view-head">',
    '    <div class="dm-view-copy">',
    '      <p class="dm-view-kicker">Recent 30</p>',
    '      <h1 id="dm-view-title">生成记录</h1>',
    '      <p class="dm-view-description">这里只保留当前作用域 <strong>' + escapeHtml(scope || "未识别") + "</strong> 最近 30 条整组快照，单字段填充不会进入历史。</p>",
    "    </div>",
    '    <div class="dm-view-meta">按时间倒序排列</div>',
    "  </div>",
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
      '  <p class="dm-empty-kicker">No history yet</p>',
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
  knownScopes: [],
  modalOpen: false,
  toastTimer: null
};
let scopeSelect = null;
let scopeBadge = null;
let scopeStatus = null;
let workspace = null;
let toastNode = null;
let favoriteModal = null;
let favoriteModalTitle = null;
let favoriteModalNote = null;
let favoriteForm = null;
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
function buildDefaultFavoriteName() {
  return "收藏 " + (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { hour12: false });
}
function updateLocationQuery() {
  if (!win.history || typeof win.history.replaceState !== "function") return;
  const url = buildDataManagerPageUrl(win.location.href, state.activeScope, state.activeView);
  win.history.replaceState(null, "", url);
}
function renderScopeHeader() {
  if (scopeBadge) scopeBadge.textContent = state.activeScope || "未识别作用域";
  if (scopeStatus) {
    scopeStatus.textContent = state.activeScope ? "当前页面按域名/IP 隔离管理数据，可切换到其他作用域进行查看。" : "当前地址没有有效域名/IP，请从插件面板进入，或切换已有作用域继续管理。";
  }
}
function renderScopeOptions() {
  if (!scopeSelect) return;
  const scopeSet = new Set(state.knownScopes);
  if (state.activeScope) scopeSet.add(state.activeScope);
  scopeSelect.innerHTML = "";
  Array.from(scopeSet).sort().forEach(function(scope) {
    const option = doc.createElement("option");
    option.value = scope;
    option.textContent = scope;
    option.selected = scope === state.activeScope;
    scopeSelect?.appendChild(option);
  });
  scopeSelect.disabled = scopeSet.size === 0;
}
function renderNavigation() {
  Array.from(doc.querySelectorAll("[data-role='view-link']")).forEach(function(node) {
    const nextView = normalizeDataManagerView(node.getAttribute("data-view"));
    const isActive = nextView === state.activeView;
    node.setAttribute("aria-current", isActive ? "page" : "false");
    node.setAttribute("data-active", isActive ? "true" : "false");
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
function renderAll() {
  renderScopeHeader();
  renderScopeOptions();
  renderNavigation();
  renderWorkspace();
  renderModal();
  updateLocationQuery();
}
async function syncViewState(nextScope, nextView) {
  const knownScopes = await listKnownScopes();
  const normalizedScope = normalizeScopeKey(nextScope || "");
  state.knownScopes = knownScopes;
  state.activeScope = normalizedScope || knownScopes[0] || "";
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
  favoriteForm?.querySelector('[data-role="favorite-title"]')?.focus();
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
    await updateFavoriteProfile(state.activeScope, state.editingFavoriteId, draft);
    setToast("常用数据已更新", "success");
  } else {
    await createFavoriteProfile(state.activeScope, draft);
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
    if (!entry || !win.confirm("确认删除常用数据“" + entry.name + "”？")) return;
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
    const created = await createFavoriteFromHistory(state.activeScope, id, buildDefaultFavoriteName());
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
    '      <div class="dm-brand">',
    '        <p class="dm-brand-kicker">Place Fill / Data Manager</p>',
    '        <div class="dm-brand-copy"><h1>数据管理台</h1><p data-role="scope-status"></p></div>',
    "      </div>",
    '      <div class="dm-topbar-meta">',
    '        <span class="dm-scope-badge" data-role="scope-badge"></span>',
    '        <label class="dm-scope-switcher">',
    "          <span>作用域</span>",
    '          <select data-role="scope-select"></select>',
    "        </label>",
    "      </div>",
    "    </header>",
    '    <div class="dm-frame">',
    '      <aside class="dm-sidebar">',
    '        <div class="dm-sidebar-panel">',
    '          <p class="dm-sidebar-label">Navigation</p>',
    '          <button type="button" class="dm-nav-link" data-role="view-link" data-action="switch-view" data-view="favorites">常用数据</button>',
    '          <button type="button" class="dm-nav-link" data-role="view-link" data-action="switch-view" data-view="history">生成记录</button>',
    '          <div class="dm-sidebar-note"><strong>管理原则</strong><span>按域名/IP 隔离，模板优先，记录辅助。</span></div>',
    "        </div>",
    "      </aside>",
    '      <main class="dm-workspace" data-role="workspace"></main>',
    "    </div>",
    '    <div class="dm-toast" data-role="toast" hidden></div>',
    renderFavoriteModal(),
    "  </div>",
    "</div>"
  ].join("");
  scopeSelect = doc.querySelector('[data-role="scope-select"]');
  scopeBadge = doc.querySelector('[data-role="scope-badge"]');
  scopeStatus = doc.querySelector('[data-role="scope-status"]');
  workspace = doc.querySelector('[data-role="workspace"]');
  toastNode = doc.querySelector('[data-role="toast"]');
  favoriteModal = doc.querySelector('[data-role="favorite-modal"]');
  favoriteModalTitle = doc.querySelector('[data-role="favorite-modal-title"]');
  favoriteModalNote = doc.querySelector('[data-role="favorite-modal-note"]');
  favoriteForm = doc.querySelector('[data-role="favorite-form"]');
  scopeSelect?.addEventListener("change", function() {
    void syncViewState(scopeSelect?.value || "", state.activeView);
  });
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
