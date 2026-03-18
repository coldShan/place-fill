import {
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  FIELD_KEYS,
  formatProfileForCopy,
  getFieldLabel,
  listKnownScopes,
  normalizeProfile,
  normalizeScopeKey,
  readFavoriteProfiles,
  readGeneratedProfiles,
  updateFavoriteProfile,
  type FavoriteEntry,
  type HistoryEntry,
  type ProfileFieldMap
} from "./page-model";
import "./style.css";

type ViewState = {
  activeScope: string;
  editingFavoriteId: string | null;
  favoriteProfiles: FavoriteEntry[];
  generatedProfiles: HistoryEntry[];
  knownScopes: string[];
  toastTimer: number | null;
};

const doc = document;
const win = window;

const state: ViewState = {
  activeScope: "",
  editingFavoriteId: null,
  favoriteProfiles: [],
  generatedProfiles: [],
  knownScopes: [],
  toastTimer: null
};

let scopeSelect: HTMLSelectElement | null = null;
let favoritesList: HTMLElement | null = null;
let historyTableBody: HTMLElement | null = null;
let historyEmpty: HTMLElement | null = null;
let toastNode: HTMLElement | null = null;
let scopeBadge: HTMLElement | null = null;
let scopeStatus: HTMLElement | null = null;
let favoriteForm: HTMLFormElement | null = null;
let favoriteTitleInput: HTMLInputElement | null = null;
let favoriteActionTitle: HTMLElement | null = null;
let favoriteEmpty: HTMLElement | null = null;

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readScopeFromQuery(): string {
  return normalizeScopeKey(new URLSearchParams(win.location.search).get("scope") || "");
}

function setToast(message: string, tone = "info"): void {
  if (!toastNode) return;
  toastNode.textContent = message;
  toastNode.setAttribute("data-tone", tone);
  toastNode.hidden = !message;
  if (state.toastTimer) win.clearTimeout(state.toastTimer);
  if (!message) return;
  state.toastTimer = win.setTimeout(function () {
    if (!toastNode) return;
    toastNode.hidden = true;
    toastNode.textContent = "";
  }, 2400);
}

async function copyProfile(profile: ProfileFieldMap): Promise<void> {
  const text = formatProfileForCopy(profile);
  try {
    await navigator.clipboard.writeText(text);
    setToast("已复制整组数据", "success");
  } catch (_error) {
    setToast("自动复制失败，请手动复制", "warning");
  }
}

function renderScopeHeader(): void {
  if (scopeBadge) scopeBadge.textContent = state.activeScope || "未识别作用域";
  if (scopeStatus) {
    scopeStatus.textContent = state.activeScope
      ? "当前页面按域名/IP 隔离管理数据，可切换到其他已有作用域查看。"
      : "当前地址未提供有效域名/IP，请从插件面板进入或切换已有作用域。";
  }
}

function renderScopeOptions(): void {
  if (!scopeSelect) return;
  const scopeSet = new Set(state.knownScopes);
  if (state.activeScope) scopeSet.add(state.activeScope);

  scopeSelect.innerHTML = "";
  Array.from(scopeSet).sort().forEach(function (scope) {
    const option = doc.createElement("option");
    option.value = scope;
    option.textContent = scope;
    if (scope === state.activeScope) option.selected = true;
    scopeSelect?.appendChild(option);
  });
  scopeSelect.disabled = scopeSet.size === 0;
}

function getFavoriteDraftProfile(): ProfileFieldMap {
  return normalizeProfile(
    Object.fromEntries(
      FIELD_KEYS.map(function (fieldKey) {
        const input = favoriteForm?.querySelector<HTMLInputElement>('[data-field-key="' + fieldKey + '"]');
        return [fieldKey, input ? input.value : ""];
      })
    )
  );
}

function resetFavoriteForm(profile?: Partial<ProfileFieldMap>, name = ""): void {
  state.editingFavoriteId = null;
  if (favoriteActionTitle) favoriteActionTitle.textContent = "新增常用数据";
  if (favoriteTitleInput) favoriteTitleInput.value = name;
  const normalized = normalizeProfile(profile);
  FIELD_KEYS.forEach(function (fieldKey) {
    const input = favoriteForm?.querySelector<HTMLInputElement>('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = normalized[fieldKey];
  });
}

function bindFavoriteForEdit(entry: FavoriteEntry): void {
  state.editingFavoriteId = entry.id;
  if (favoriteActionTitle) favoriteActionTitle.textContent = "编辑常用数据";
  if (favoriteTitleInput) favoriteTitleInput.value = entry.name;
  FIELD_KEYS.forEach(function (fieldKey) {
    const input = favoriteForm?.querySelector<HTMLInputElement>('[data-field-key="' + fieldKey + '"]');
    if (input) input.value = entry.profile[fieldKey];
  });
}

function renderFavoriteList(): void {
  if (!favoritesList || !favoriteEmpty) return;
  const targetList = favoritesList;
  targetList.innerHTML = "";
  favoriteEmpty.hidden = state.favoriteProfiles.length > 0;

  state.favoriteProfiles.forEach(function (entry) {
    const item = doc.createElement("article");
    item.className = "dm-card";
    item.innerHTML = [
      '<div class="dm-card-head">',
      '  <div>',
      '    <p class="dm-card-kicker">常用模板</p>',
      '    <h3 class="dm-card-title">' + escapeHtml(entry.name) + "</h3>",
      "  </div>",
      '  <span class="dm-card-time">' + escapeHtml(new Date(Number(entry.updatedAt)).toLocaleString("zh-CN")) + "</span>",
      "</div>",
      '<div class="dm-card-summary">',
      '  <span>' + escapeHtml(entry.profile.fullName || "未填写姓名") + "</span>",
      '  <span>' + escapeHtml(entry.profile.companyName || "未填写公司") + "</span>",
      '  <span>' + escapeHtml(entry.profile.mobile || "未填写手机") + "</span>",
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

function renderHistoryTable(): void {
  if (!historyTableBody || !historyEmpty) return;
  const targetBody = historyTableBody;
  targetBody.innerHTML = "";
  historyEmpty.hidden = state.generatedProfiles.length > 0;

  state.generatedProfiles.forEach(function (entry) {
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
      FIELD_KEYS.map(function (fieldKey) {
        return (
          '<div class="dm-detail-item"><span class="dm-detail-label">' +
          escapeHtml(getFieldLabel(fieldKey)) +
          '</span><span class="dm-detail-value">' +
          escapeHtml(entry.profile[fieldKey]) +
          "</span></div>"
        );
      }).join(""),
      "  </div>",
      "</td>"
    ].join("");
    targetBody.appendChild(detailRow);
  });
}

async function syncViewState(nextScope?: string): Promise<void> {
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

async function handleFavoriteSubmit(event: SubmitEvent): Promise<void> {
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

function buildDefaultFavoriteName(): string {
  return "收藏 " + new Date().toLocaleString("zh-CN", { hour12: false });
}

async function handleRootClick(event: MouseEvent): Promise<void> {
  const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
  if (!trigger) return;
  const action = trigger.getAttribute("data-action");
  const id = trigger.getAttribute("data-id") || "";

  if (action === "favorite-copy") {
    const entry = state.favoriteProfiles.find(function (item) {
      return item.id === id;
    });
    if (entry) await copyProfile(entry.profile);
    return;
  }

  if (action === "favorite-edit") {
    const entry = state.favoriteProfiles.find(function (item) {
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
    const entry = state.generatedProfiles.find(function (item) {
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

function renderLayout(): void {
  doc.body.innerHTML = [
    '<div class="dm-page">',
    '  <div class="dm-noise" aria-hidden="true"></div>',
    '  <header class="dm-hero">',
    '    <div class="dm-hero-copy">',
    '      <p class="dm-eyebrow">Place Fill / Data Ledger</p>',
    '      <h1>数据管理</h1>',
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
    FIELD_KEYS.map(function (fieldKey) {
      return (
        '<label class="dm-field"><span>' +
        escapeHtml(getFieldLabel(fieldKey)) +
        '</span><input type="text" data-field-key="' +
        escapeHtml(fieldKey) +
        '" placeholder="填写' +
        escapeHtml(getFieldLabel(fieldKey)) +
        '"></label>'
      );
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

  favoriteForm?.addEventListener("submit", function (event) {
    void handleFavoriteSubmit(event as SubmitEvent);
  });

  scopeSelect?.addEventListener("change", function () {
    void syncViewState(scopeSelect?.value || "");
  });

  doc.body.addEventListener("click", function (event) {
    void handleRootClick(event);
  });
}

async function bootstrap(): Promise<void> {
  renderLayout();
  resetFavoriteForm();
  await syncViewState(readScopeFromQuery());
}

void bootstrap();
