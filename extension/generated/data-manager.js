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
const doc = document;
const win = window;
const state = {
  activeScope: "",
  editingFavoriteId: null,
  favoriteProfiles: [],
  generatedProfiles: [],
  knownScopes: [],
  toastTimer: null
};
let scopeSelect = null;
let favoritesList = null;
let historyTableBody = null;
let historyEmpty = null;
let toastNode = null;
let scopeBadge = null;
let scopeStatus = null;
let favoriteForm = null;
let favoriteTitleInput = null;
let favoriteActionTitle = null;
let favoriteEmpty = null;
function escapeHtml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function readScopeFromQuery() {
  return normalizeScopeKey(new URLSearchParams(win.location.search).get("scope") || "");
}
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
  const text = formatProfileForCopy(profile);
  try {
    await navigator.clipboard.writeText(text);
    setToast("已复制整组数据", "success");
  } catch (_error) {
    setToast("自动复制失败，请手动复制", "warning");
  }
}
function renderScopeHeader() {
  if (scopeBadge) scopeBadge.textContent = state.activeScope || "未识别作用域";
  if (scopeStatus) {
    scopeStatus.textContent = state.activeScope ? "当前页面按域名/IP 隔离管理数据，可切换到其他已有作用域查看。" : "当前地址未提供有效域名/IP，请从插件面板进入或切换已有作用域。";
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
    if (scope === state.activeScope) option.selected = true;
    scopeSelect?.appendChild(option);
  });
  scopeSelect.disabled = scopeSet.size === 0;
}
function getFavoriteDraftProfile() {
  return normalizeProfile(
    Object.fromEntries(
      FIELD_KEYS.map(function(fieldKey) {
        const input = favoriteForm?.querySelector('[data-field-key="' + fieldKey + '"]');
        return [fieldKey, input ? input.value : ""];
      })
    )
  );
}
function resetFavoriteForm(profile, name = "") {
  state.editingFavoriteId = null;
  if (favoriteActionTitle) favoriteActionTitle.textContent = "新增常用数据";
  if (favoriteTitleInput) favoriteTitleInput.value = name;
  const normalized = normalizeProfile(profile);
  FIELD_KEYS.forEach(function(fieldKey) {
    const input = favoriteForm?.querySelector('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = normalized[fieldKey];
  });
}
function bindFavoriteForEdit(entry) {
  state.editingFavoriteId = entry.id;
  if (favoriteActionTitle) favoriteActionTitle.textContent = "编辑常用数据";
  if (favoriteTitleInput) favoriteTitleInput.value = entry.name;
  FIELD_KEYS.forEach(function(fieldKey) {
    const input = favoriteForm?.querySelector('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = entry.profile[fieldKey];
  });
}
function renderFavoriteList() {
  if (!favoritesList || !favoriteEmpty) return;
  const targetList = favoritesList;
  targetList.innerHTML = "";
  favoriteEmpty.hidden = state.favoriteProfiles.length > 0;
  state.favoriteProfiles.forEach(function(entry) {
    const item = doc.createElement("article");
    item.className = "dm-card";
    item.innerHTML = [
      '<div class="dm-card-head">',
      "  <div>",
      '    <p class="dm-card-kicker">常用模板</p>',
      '    <h3 class="dm-card-title">' + escapeHtml(entry.name) + "</h3>",
      "  </div>",
      '  <span class="dm-card-time">' + escapeHtml(new Date(Number(entry.updatedAt)).toLocaleString("zh-CN")) + "</span>",
      "</div>",
      '<div class="dm-card-summary">',
      "  <span>" + escapeHtml(entry.profile.fullName || "未填写姓名") + "</span>",
      "  <span>" + escapeHtml(entry.profile.companyName || "未填写公司") + "</span>",
      "  <span>" + escapeHtml(entry.profile.mobile || "未填写手机") + "</span>",
      "</div>",
      '<div class="dm-card-actions">',
      '  <button type="button" class="dm-ghost-btn" data-action="favorite-copy" data-id="' + escapeHtml(entry.id) + '">复制整组</button>',
      '  <button type="button" class="dm-ghost-btn" data-action="favorite-edit" data-id="' + escapeHtml(entry.id) + '">编辑</button>',
      '  <button type="button" class="dm-ghost-btn danger" data-action="favorite-delete" data-id="' + escapeHtml(entry.id) + '">删除</button>',
      "</div>"
    ].join("");
    targetList.appendChild(item);
  });
}
function renderHistoryTable() {
  if (!historyTableBody || !historyEmpty) return;
  const targetBody = historyTableBody;
  targetBody.innerHTML = "";
  historyEmpty.hidden = state.generatedProfiles.length > 0;
  state.generatedProfiles.forEach(function(entry) {
    const row = doc.createElement("tr");
    row.innerHTML = [
      "<td>" + escapeHtml(new Date(Number(entry.createdAt)).toLocaleString("zh-CN")) + "</td>",
      "<td>" + escapeHtml(entry.profile.fullName) + "</td>",
      "<td>" + escapeHtml(entry.profile.companyName) + "</td>",
      "<td>" + escapeHtml(entry.profile.mobile) + "</td>",
      "<td>" + escapeHtml(entry.profile.email) + "</td>",
      '<td class="dm-table-actions">',
      '  <button type="button" class="dm-table-btn" data-action="history-favorite" data-id="' + escapeHtml(entry.id) + '">收藏</button>',
      '  <button type="button" class="dm-table-btn" data-action="history-copy" data-id="' + escapeHtml(entry.id) + '">复制</button>',
      "</td>"
    ].join("");
    targetBody.appendChild(row);
    const detailRow = doc.createElement("tr");
    detailRow.className = "dm-table-detail-row";
    detailRow.innerHTML = [
      '<td colspan="6">',
      '  <div class="dm-detail-grid">',
      FIELD_KEYS.map(function(fieldKey) {
        return '<div class="dm-detail-item"><span class="dm-detail-label">' + escapeHtml(getFieldLabel(fieldKey)) + '</span><span class="dm-detail-value">' + escapeHtml(entry.profile[fieldKey]) + "</span></div>";
      }).join(""),
      "  </div>",
      "</td>"
    ].join("");
    targetBody.appendChild(detailRow);
  });
}
async function syncViewState(nextScope) {
  const knownScopes = await listKnownScopes();
  const normalizedScope = normalizeScopeKey(nextScope || state.activeScope || "");
  state.knownScopes = knownScopes;
  state.activeScope = normalizedScope || knownScopes[0] || "";
  state.favoriteProfiles = state.activeScope ? await readFavoriteProfiles(state.activeScope) : [];
  state.generatedProfiles = state.activeScope ? await readGeneratedProfiles(state.activeScope) : [];
  renderScopeHeader();
  renderScopeOptions();
  renderFavoriteList();
  renderHistoryTable();
}
async function handleFavoriteSubmit(event) {
  event.preventDefault();
  if (!state.activeScope) {
    setToast("当前没有可用作用域", "warning");
    return;
  }
  const draft = {
    name: favoriteTitleInput ? favoriteTitleInput.value : "",
    profile: getFavoriteDraftProfile()
  };
  if (state.editingFavoriteId) {
    await updateFavoriteProfile(state.activeScope, state.editingFavoriteId, draft);
    setToast("常用数据已更新", "success");
  } else {
    await createFavoriteProfile(state.activeScope, draft);
    setToast("已新增常用数据", "success");
  }
  resetFavoriteForm();
  await syncViewState(state.activeScope);
}
function buildDefaultFavoriteName() {
  return "收藏 " + (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", { hour12: false });
}
async function handleRootClick(event) {
  const trigger = event.target?.closest("[data-action]");
  if (!trigger) return;
  const action = trigger.getAttribute("data-action");
  const id = trigger.getAttribute("data-id") || "";
  if (action === "favorite-copy") {
    const entry = state.favoriteProfiles.find(function(item) {
      return item.id === id;
    });
    if (entry) await copyProfile(entry.profile);
    return;
  }
  if (action === "favorite-edit") {
    const entry = state.favoriteProfiles.find(function(item) {
      return item.id === id;
    });
    if (entry) {
      bindFavoriteForEdit(entry);
      favoriteTitleInput?.focus();
    }
    return;
  }
  if (action === "favorite-delete") {
    await deleteFavoriteProfile(state.activeScope, id);
    if (state.editingFavoriteId === id) resetFavoriteForm();
    await syncViewState(state.activeScope);
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
    if (created) {
      await syncViewState(state.activeScope);
      setToast("已从生成记录加入常用数据", "success");
    }
    return;
  }
  if (action === "favorite-reset") {
    resetFavoriteForm();
  }
}
function renderLayout() {
  doc.body.innerHTML = [
    '<div class="dm-page">',
    '  <div class="dm-noise" aria-hidden="true"></div>',
    '  <header class="dm-hero">',
    '    <div class="dm-hero-copy">',
    '      <p class="dm-eyebrow">Place Fill / Data Ledger</p>',
    "      <h1>数据管理</h1>",
    '      <p class="dm-subtitle" data-role="scope-status"></p>',
    "    </div>",
    '    <div class="dm-hero-meta">',
    '      <span class="dm-scope-badge" data-role="scope-badge"></span>',
    '      <label class="dm-scope-switcher">',
    "        <span>作用域切换</span>",
    '        <select data-role="scope-select"></select>',
    "      </label>",
    "    </div>",
    "  </header>",
    '  <main class="dm-layout">',
    '    <section class="dm-panel dm-panel-form">',
    '      <div class="dm-panel-head">',
    '        <div><p class="dm-kicker">Core Module</p><h2>常用数据</h2></div>',
    '        <button type="button" class="dm-ghost-btn" data-action="favorite-reset">清空表单</button>',
    "      </div>",
    '      <form class="dm-form" data-role="favorite-form">',
    '        <div class="dm-form-topline">',
    '          <h3 data-role="favorite-action-title">新增常用数据</h3>',
    '          <label class="dm-form-title"><span>模板名称</span><input type="text" data-role="favorite-title" placeholder="例如：企业开户回归模板"></label>',
    "        </div>",
    '        <div class="dm-form-grid">',
    FIELD_KEYS.map(function(fieldKey) {
      return '<label class="dm-field"><span>' + escapeHtml(getFieldLabel(fieldKey)) + '</span><input type="text" data-field-key="' + escapeHtml(fieldKey) + '" placeholder="填写' + escapeHtml(getFieldLabel(fieldKey)) + '"></label>';
    }).join(""),
    "        </div>",
    '        <div class="dm-form-actions">',
    '          <button type="submit" class="dm-solid-btn">保存常用数据</button>',
    "        </div>",
    "      </form>",
    '      <div class="dm-favorite-empty" data-role="favorite-empty">当前作用域还没有常用数据，可以手动新增或从生成记录收藏。</div>',
    '      <div class="dm-card-list" data-role="favorites-list"></div>',
    "    </section>",
    '    <section class="dm-panel dm-panel-history">',
    '      <div class="dm-panel-head">',
    '        <div><p class="dm-kicker">Recent 30</p><h2>生成记录</h2></div>',
    '        <p class="dm-panel-note">只记录整组生成快照，单字段填充不会进入历史。</p>',
    "      </div>",
    '      <div class="dm-history-empty" data-role="history-empty">当前作用域还没有生成记录。</div>',
    '      <div class="dm-table-shell">',
    '        <table class="dm-table">',
    "          <thead><tr><th>时间</th><th>姓名</th><th>公司</th><th>手机</th><th>邮箱</th><th>操作</th></tr></thead>",
    '          <tbody data-role="history-table-body"></tbody>',
    "        </table>",
    "      </div>",
    "    </section>",
    "  </main>",
    '  <div class="dm-toast" data-role="toast" hidden></div>',
    "</div>"
  ].join("");
  scopeSelect = doc.querySelector('[data-role="scope-select"]');
  favoritesList = doc.querySelector('[data-role="favorites-list"]');
  historyTableBody = doc.querySelector('[data-role="history-table-body"]');
  historyEmpty = doc.querySelector('[data-role="history-empty"]');
  toastNode = doc.querySelector('[data-role="toast"]');
  scopeBadge = doc.querySelector('[data-role="scope-badge"]');
  scopeStatus = doc.querySelector('[data-role="scope-status"]');
  favoriteForm = doc.querySelector('[data-role="favorite-form"]');
  favoriteTitleInput = doc.querySelector('[data-role="favorite-title"]');
  favoriteActionTitle = doc.querySelector('[data-role="favorite-action-title"]');
  favoriteEmpty = doc.querySelector('[data-role="favorite-empty"]');
  favoriteForm?.addEventListener("submit", function(event) {
    void handleFavoriteSubmit(event);
  });
  scopeSelect?.addEventListener("change", function() {
    void syncViewState(scopeSelect?.value || "");
  });
  doc.body.addEventListener("click", function(event) {
    void handleRootClick(event);
  });
}
async function bootstrap() {
  renderLayout();
  resetFavoriteForm();
  await syncViewState(readScopeFromQuery());
}
void bootstrap();
