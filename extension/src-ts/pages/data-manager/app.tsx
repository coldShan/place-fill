import { useEffect, useMemo, useState } from "preact/hooks";
import {
  buildDataManagerPageUrl,
  normalizeDataManagerView,
  parseDataManagerPageLocation,
  type DataManagerView
} from "../../shared/data-manager-routing";
import {
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  formatProfileForCopy,
  reorderFavoriteProfiles,
  updateFavoriteProfile,
  type ProfileFieldMap
} from "./page-model";
import { FavoriteModal } from "./components/favorite-modal";
import { FavoritesTable } from "./components/favorites-table";
import { HistoryTable } from "./components/history-table";
import { useRecords } from "./state/use-records";
import { useToast } from "./state/use-toast";

type EditorState = { open: false } | { open: true; id: string | null };

const VIEW_LABELS: Record<DataManagerView, string> = {
  favorites: "常用数据",
  history: "生成记录"
};

export function App() {
  const route = useMemo(function () {
    return parseDataManagerPageLocation(window.location.search);
  }, []);
  const scope = route.scope;
  const [view, setView] = useState<DataManagerView>(route.view);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const records = useRecords(scope);
  const { toast, showToast } = useToast();
  const editingEntry = editor.open && editor.id
    ? records.favorites.find(function (entry) { return entry.id === editor.id; }) || null
    : null;

  useEffect(function () {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    window.history.replaceState(null, "", buildDataManagerPageUrl(window.location.href, scope, view));
  }, [scope, view]);

  useEffect(function () {
    if (!editor.open) return;
    function handleKeydown(event: KeyboardEvent): void {
      if (event.key === "Escape") setEditor({ open: false });
    }
    document.addEventListener("keydown", handleKeydown);
    return function () {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [editor.open]);

  async function copyProfile(profile: ProfileFieldMap): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatProfileForCopy(profile));
      showToast("已复制整组数据", "success");
    } catch (_error) {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }

  async function handleSubmit(input: { note: string; profile: ProfileFieldMap }): Promise<void> {
    if (!scope) {
      showToast("当前没有可用作用域", "warning");
      return;
    }
    if (editor.open && editor.id) {
      await updateFavoriteProfile(scope, editor.id, input);
      showToast("常用数据已更新", "success");
    } else {
      await createFavoriteProfile(scope, input);
      showToast("已新增常用数据", "success");
    }
    setEditor({ open: false });
    await records.reload();
  }

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm("确认删除这组常用数据？")) return;
    await deleteFavoriteProfile(scope, id);
    await records.reload();
    showToast("已删除常用数据", "success");
  }

  async function handleReorder(orderedIds: string[]): Promise<void> {
    records.setFavorites(await reorderFavoriteProfiles(scope, orderedIds));
    showToast("常用数据顺序已保存", "success");
  }

  async function handleHistoryFavorite(id: string): Promise<void> {
    const created = await createFavoriteFromHistory(scope, id);
    if (!created) return;
    await records.reload();
    showToast("已从生成记录加入常用数据", "success");
  }

  function renderWorkspace() {
    if (view === "history") {
      if (!records.history.length) {
        return (
          <section class="dm-empty-state">
            <h2>当前作用域还没有生成记录</h2>
            <p>先从插件面板生成一组数据，再回到这里进行复制或收藏。</p>
          </section>
        );
      }
      return (
        <HistoryTable
          entries={records.history}
          onFavorite={function (id) { void handleHistoryFavorite(id); }}
          onCopy={function (id) {
            const entry = records.history.find(function (item) { return item.id === id; });
            if (entry) void copyProfile(entry.profile);
          }}
        />
      );
    }
    if (!records.favorites.length) {
      return (
        <section class="dm-empty-state">
          <h2>当前作用域还没有常用数据</h2>
          <p>你可以手动新增一组数据，或者稍后从生成记录里收藏一组数据。</p>
          <button type="button" class="dm-primary-btn" onClick={function () { setEditor({ open: true, id: null }); }}>
            新增第一组数据
          </button>
        </section>
      );
    }
    return (
      <FavoritesTable
        entries={records.favorites}
        onEdit={function (id) { setEditor({ open: true, id }); }}
        onDelete={function (id) { void handleDelete(id); }}
        onReorder={function (orderedIds) { void handleReorder(orderedIds); }}
      />
    );
  }

  return (
    <div class="dm-app">
      <div class="dm-ambient dm-ambient-top" aria-hidden="true" />
      <div class="dm-ambient dm-ambient-bottom" aria-hidden="true" />
      <div class="dm-shell">
        <header class="dm-topbar">
          <h1 class="dm-topbar-title">{VIEW_LABELS[view]}</h1>
          <div class="dm-topbar-actions">
            {view === "favorites" ? (
              <button type="button" class="dm-primary-btn" onClick={function () { setEditor({ open: true, id: null }); }}>
                新增常用数据
              </button>
            ) : null}
          </div>
        </header>
        <nav class="dm-tabs" role="tablist" aria-label="数据管理视图">
          {(Object.keys(VIEW_LABELS) as DataManagerView[]).map(function (item) {
            const active = item === view;
            return (
              <button
                key={item}
                type="button"
                class="dm-tab"
                role="tab"
                data-view={item}
                data-active={active ? "true" : "false"}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={function () {
                  setView(normalizeDataManagerView(item));
                  void records.reload();
                }}
              >
                {VIEW_LABELS[item]}
              </button>
            );
          })}
        </nav>
        <main class="dm-workspace">
          <section class="dm-view" aria-label={VIEW_LABELS[view]}>
            {records.loaded ? renderWorkspace() : null}
          </section>
        </main>
        {toast ? (
          <div class="dm-toast" data-tone={toast.tone} key={toast.id}>{toast.message}</div>
        ) : null}
        {editor.open ? (
          <FavoriteModal
            key={editor.id || "new"}
            entry={editingEntry}
            onClose={function () { setEditor({ open: false }); }}
            onSubmit={function (input) { void handleSubmit(input); }}
          />
        ) : null}
      </div>
    </div>
  );
}
