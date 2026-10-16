import { useEffect, useMemo, useState } from "preact/hooks";
import {
  buildDataManagerPageUrl,
  parseDataManagerPageLocation,
  type DataManagerView
} from "../../shared/data-manager-routing";
import {
  createFavoriteFromHistory,
  createFavoriteProfile,
  deleteFavoriteProfile,
  formatProfileForCopy,
  MAX_GENERATED_RECORDS,
  reorderFavoriteProfiles,
  updateFavoriteProfile,
  type ProfileFieldMap
} from "./page-model";
import { DEFAULT_COLUMNS } from "./lib/columns";
import { getFavoriteTitle } from "./lib/display";
import { EmptyState } from "./components/empty-state";
import { FavoriteModal } from "./components/favorite-modal";
import { FavoritesTable } from "./components/favorites-table";
import { Header } from "./components/header";
import { HistoryTable } from "./components/history-table";
import { Icon } from "./components/icon";
import { Toolbar, VIEW_LABELS } from "./components/toolbar";
import { useConfirm } from "./state/use-confirm";
import { useRecords } from "./state/use-records";
import { useToast } from "./state/use-toast";

type EditorState = { open: false } | { open: true; id: string | null };

export function App() {
  const route = useMemo(function () {
    return parseDataManagerPageLocation(window.location.search);
  }, []);
  const scope = route.scope;
  const [view, setView] = useState<DataManagerView>(route.view);
  const [editor, setEditor] = useState<EditorState>({ open: false });
  const records = useRecords(scope);
  const { toast, showToast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const editingEntry = editor.open && editor.id
    ? records.favorites.find(function (entry) { return entry.id === editor.id; }) || null
    : null;

  useEffect(function () {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    window.history.replaceState(null, "", buildDataManagerPageUrl(window.location.href, scope, view));
  }, [scope, view]);

  async function runSafely(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (_error) {
      showToast("操作失败，请重试", "danger");
    }
  }

  async function copyProfile(profile: ProfileFieldMap): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatProfileForCopy(profile));
      showToast("已复制整组数据", "success");
    } catch (_error) {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }

  async function handleSubmit(input: { note: string; profile: ProfileFieldMap }): Promise<void> {
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
    const entry = records.favorites.find(function (item) { return item.id === id; });
    if (!entry) return;
    const confirmed = await confirm({
      title: "删除常用数据",
      description: "确认删除「" + getFavoriteTitle(entry) + "」？删除后无法恢复。",
      confirmLabel: "删除",
      danger: true
    });
    if (!confirmed) return;
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

  function openCreate(): void {
    setEditor({ open: true, id: null });
  }

  function renderWorkspace() {
    if (!scope) {
      return (
        <EmptyState
          icon="globe"
          title="未指定站点"
          description="数据按站点隔离保存。请在目标网站打开 place-fill 面板，点击「数据管理」进入对应站点的数据。"
        />
      );
    }
    if (!records.loaded) return null;
    if (view === "history") {
      if (!records.history.length) {
        return (
          <EmptyState
            icon="refresh-cw"
            title="还没有生成记录"
            description="在当前站点的插件面板里生成数据后，记录会出现在这里，可复制或收藏为常用数据。"
          />
        );
      }
      return (
        <HistoryTable
          entries={records.history}
          columns={DEFAULT_COLUMNS.history}
          onFavorite={function (id) { void runSafely(function () { return handleHistoryFavorite(id); }); }}
          onCopy={function (id) {
            const entry = records.history.find(function (item) { return item.id === id; });
            if (entry) void copyProfile(entry.profile);
          }}
        />
      );
    }
    if (!records.favorites.length) {
      return (
        <EmptyState
          icon="star"
          title="还没有常用数据"
          description="常用数据可在填表时优先推荐。你可以手动新增，或从生成记录中收藏。"
        >
          <button type="button" class="dm-primary-btn" onClick={openCreate}>
            <Icon name="plus" />
            新增常用数据
          </button>
        </EmptyState>
      );
    }
    return (
      <FavoritesTable
        entries={records.favorites}
        columns={DEFAULT_COLUMNS.favorites}
        onEdit={function (id) { setEditor({ open: true, id }); }}
        onDelete={function (id) { void runSafely(function () { return handleDelete(id); }); }}
        onReorder={function (orderedIds) { void runSafely(function () { return handleReorder(orderedIds); }); }}
      />
    );
  }

  return (
    <div class="dm-app">
      <Header scope={scope}>
        {scope && view === "favorites" ? (
          <button type="button" class="dm-primary-btn" onClick={openCreate}>
            <Icon name="plus" />
            新增
          </button>
        ) : null}
      </Header>
      {scope ? (
        <Toolbar
          view={view}
          counts={{ favorites: records.favorites.length, history: records.history.length }}
          hint={view === "history" ? "仅保留最近 " + MAX_GENERATED_RECORDS + " 条" : ""}
          onViewChange={function (nextView) {
            setView(nextView);
            void records.reload();
          }}
        />
      ) : null}
      <div class="dm-body">
        <section class="dm-main" role="tabpanel" aria-label={VIEW_LABELS[view]}>
          {renderWorkspace()}
        </section>
      </div>
      {toast ? (
        <div class="dm-toast" role="status" data-tone={toast.tone} key={toast.id}>{toast.message}</div>
      ) : null}
      {editor.open ? (
        <FavoriteModal
          key={editor.id || "new"}
          entry={editingEntry}
          onClose={function () { setEditor({ open: false }); }}
          onSubmit={function (input) { void runSafely(function () { return handleSubmit(input); }); }}
        />
      ) : null}
      {confirmDialog}
    </div>
  );
}
