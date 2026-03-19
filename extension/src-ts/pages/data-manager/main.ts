import {
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  formatProfileForCopy,
  listKnownScopes,
  normalizeScopeKey,
  readFavoriteProfiles,
  readGeneratedProfiles,
  updateFavoriteProfile,
  type FavoriteEntry,
  type HistoryEntry,
  type ProfileFieldMap
} from "./page-model";
import { renderFavoriteModal, readFavoriteDraft, syncFavoriteForm } from "./favorite-modal";
import { renderFavoritesView } from "./favorites-view";
import { renderHistoryView } from "./history-view";
import "./style.css";
import {
  buildDataManagerPageUrl,
  normalizeDataManagerView,
  parseDataManagerPageLocation,
  type DataManagerView
} from "../../shared/data-manager-routing";

type ViewState = {
  activeScope: string;
  activeView: DataManagerView;
  editingFavoriteId: string | null;
  favoriteProfiles: FavoriteEntry[];
  generatedProfiles: HistoryEntry[];
  knownScopes: string[];
  modalOpen: boolean;
  toastTimer: number | null;
};

const doc = document;
const win = window;

const state: ViewState = {
  activeScope: "",
  activeView: "favorites",
  editingFavoriteId: null,
  favoriteProfiles: [],
  generatedProfiles: [],
  knownScopes: [],
  modalOpen: false,
  toastTimer: null
};

let scopeSelect: HTMLSelectElement | null = null;
let scopeBadge: HTMLElement | null = null;
let scopeStatus: HTMLElement | null = null;
let workspace: HTMLElement | null = null;
let toastNode: HTMLElement | null = null;
let favoriteModal: HTMLElement | null = null;
let favoriteModalTitle: HTMLElement | null = null;
let favoriteModalNote: HTMLElement | null = null;
let favoriteForm: HTMLFormElement | null = null;

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
  try {
    await navigator.clipboard.writeText(formatProfileForCopy(profile));
    setToast("已复制整组数据", "success");
  } catch (_error) {
    setToast("自动复制失败，请手动复制", "warning");
  }
}

function buildDefaultFavoriteName(): string {
  return "收藏 " + new Date().toLocaleString("zh-CN", { hour12: false });
}

function updateLocationQuery(): void {
  if (!win.history || typeof win.history.replaceState !== "function") return;
  const url = buildDataManagerPageUrl(win.location.href, state.activeScope, state.activeView);
  win.history.replaceState(null, "", url);
}

function renderScopeHeader(): void {
  if (scopeBadge) scopeBadge.textContent = state.activeScope || "未识别作用域";
  if (scopeStatus) {
    scopeStatus.textContent = state.activeScope
      ? "当前页面按域名/IP 隔离管理数据，可切换到其他作用域进行查看。"
      : "当前地址没有有效域名/IP，请从插件面板进入，或切换已有作用域继续管理。";
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
    option.selected = scope === state.activeScope;
    scopeSelect?.appendChild(option);
  });
  scopeSelect.disabled = scopeSet.size === 0;
}

function renderNavigation(): void {
  Array.from(doc.querySelectorAll<HTMLElement>("[data-role='view-link']")).forEach(function (node) {
    const nextView = normalizeDataManagerView(node.getAttribute("data-view"));
    const isActive = nextView === state.activeView;
    node.setAttribute("aria-current", isActive ? "page" : "false");
    node.setAttribute("data-active", isActive ? "true" : "false");
  });
}

function renderWorkspace(): void {
  if (!workspace) return;
  workspace.innerHTML = state.activeView === "history"
    ? renderHistoryView(state.activeScope, state.generatedProfiles)
    : renderFavoritesView(state.activeScope, state.favoriteProfiles);
}

function renderModal(): void {
  if (!favoriteModal) return;
  const editingEntry = state.editingFavoriteId
    ? state.favoriteProfiles.find(function (entry) {
        return entry.id === state.editingFavoriteId;
      }) || null
    : null;
  favoriteModal.hidden = !state.modalOpen;
  favoriteModal.setAttribute("data-open", state.modalOpen ? "true" : "false");
  syncFavoriteForm(favoriteForm, favoriteModalTitle, favoriteModalNote, editingEntry);
}

function renderAll(): void {
  renderScopeHeader();
  renderScopeOptions();
  renderNavigation();
  renderWorkspace();
  renderModal();
  updateLocationQuery();
}

async function syncViewState(nextScope?: string, nextView?: DataManagerView): Promise<void> {
  const knownScopes = await listKnownScopes();
  const normalizedScope = normalizeScopeKey(nextScope || "");
  state.knownScopes = knownScopes;
  state.activeScope = normalizedScope || knownScopes[0] || "";
  state.activeView = normalizeDataManagerView(nextView || state.activeView);
  state.favoriteProfiles = state.activeScope ? await readFavoriteProfiles(state.activeScope) : [];
  state.generatedProfiles = state.activeScope ? await readGeneratedProfiles(state.activeScope) : [];
  if (state.editingFavoriteId && !state.favoriteProfiles.some(function (entry) { return entry.id === state.editingFavoriteId; })) {
    state.editingFavoriteId = null;
    state.modalOpen = false;
  }
  renderAll();
}

function openFavoriteModal(entryId?: string): void {
  state.editingFavoriteId = entryId || null;
  state.modalOpen = true;
  renderModal();
  favoriteForm?.querySelector<HTMLInputElement>('[data-role="favorite-title"]')?.focus();
}

function closeFavoriteModal(): void {
  state.modalOpen = false;
  state.editingFavoriteId = null;
  renderModal();
}

async function handleFavoriteSubmit(event: SubmitEvent): Promise<void> {
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

async function handleRootClick(event: MouseEvent): Promise<void> {
  const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
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
    const entry = state.favoriteProfiles.find(function (item) {
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
    const entry = state.favoriteProfiles.find(function (item) {
      return item.id === id;
    });
    if (!entry || !win.confirm('确认删除常用数据“' + entry.name + '”？')) return;
    await deleteFavoriteProfile(state.activeScope, id);
    if (state.editingFavoriteId === id) closeFavoriteModal();
    await syncViewState(state.activeScope, state.activeView);
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
    if (!created) return;
    await syncViewState(state.activeScope, state.activeView);
    setToast("已从生成记录加入常用数据", "success");
  }
}

function renderShell(): void {
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

  scopeSelect?.addEventListener("change", function () {
    void syncViewState(scopeSelect?.value || "", state.activeView);
  });
  favoriteForm?.addEventListener("submit", function (event) {
    void handleFavoriteSubmit(event as SubmitEvent);
  });
  doc.body.addEventListener("click", function (event) {
    void handleRootClick(event);
  });
  doc.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.modalOpen) closeFavoriteModal();
  });
}

async function bootstrap(): Promise<void> {
  renderShell();
  const route = parseDataManagerPageLocation(win.location.search);
  state.activeView = route.view;
  await syncViewState(route.scope, route.view);
}

void bootstrap();
