import {
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  formatProfileForCopy,
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
  modalOpen: false,
  toastTimer: null
};

let workspace: HTMLElement | null = null;
let toastNode: HTMLElement | null = null;
let favoriteModal: HTMLElement | null = null;
let favoriteModalTitle: HTMLElement | null = null;
let favoriteModalNote: HTMLElement | null = null;
let favoriteForm: HTMLFormElement | null = null;
let viewTitle: HTMLElement | null = null;
let viewActions: HTMLElement | null = null;

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

function updateLocationQuery(): void {
  if (!win.history || typeof win.history.replaceState !== "function") return;
  const url = buildDataManagerPageUrl(win.location.href, state.activeScope, state.activeView);
  win.history.replaceState(null, "", url);
}

function renderNavigation(): void {
  Array.from(doc.querySelectorAll<HTMLElement>("[data-role='view-link']")).forEach(function (node) {
    const nextView = normalizeDataManagerView(node.getAttribute("data-view"));
    const isActive = nextView === state.activeView;
    node.setAttribute("aria-current", isActive ? "page" : "false");
    node.setAttribute("aria-selected", isActive ? "true" : "false");
    node.setAttribute("data-active", isActive ? "true" : "false");
    node.setAttribute("tabindex", isActive ? "0" : "-1");
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

function renderTopbar(): void {
  if (viewTitle) viewTitle.textContent = state.activeView === "history" ? "生成记录" : "常用数据";
  if (!viewActions) return;
  viewActions.innerHTML = state.activeView === "favorites"
    ? '<button type="button" class="dm-primary-btn" data-action="open-create-favorite">新增常用数据</button>'
    : "";
}

function renderAll(): void {
  renderTopbar();
  renderNavigation();
  renderWorkspace();
  renderModal();
  updateLocationQuery();
}

async function syncViewState(nextScope?: string, nextView?: DataManagerView): Promise<void> {
  const normalizedScope = normalizeScopeKey(nextScope || "");
  state.activeScope = normalizedScope;
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
  favoriteForm?.querySelector<HTMLInputElement>("[data-field-key]")?.focus();
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
    await updateFavoriteProfile(state.activeScope, state.editingFavoriteId, { profile: draft });
    setToast("常用数据已更新", "success");
  } else {
    await createFavoriteProfile(state.activeScope, { profile: draft });
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

  if (action === "favorite-edit") {
    openFavoriteModal(id);
    return;
  }

  if (action === "favorite-delete") {
    const entry = state.favoriteProfiles.find(function (item) {
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
    const entry = state.generatedProfiles.find(function (item) {
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

function renderShell(): void {
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
