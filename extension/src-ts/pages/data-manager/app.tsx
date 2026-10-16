import { useEffect, useMemo, useRef, useState } from "preact/hooks";
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
  getFieldLabel,
  MAX_GENERATED_RECORDS,
  reorderFavoriteProfiles,
  updateFavoriteProfile,
  type ProfileFieldKey,
  type ProfileFieldMap
} from "./page-model";
import { copyText } from "./lib/clipboard";
import { DEFAULT_COLUMNS } from "./lib/columns";
import { formatDisplayTime, getFavoriteTitle } from "./lib/display";
import { matchesQuery } from "./lib/record-search";
import { ColumnPicker } from "./components/column-picker";
import { EmptyState } from "./components/empty-state";
import { FavoriteEditor, type FavoriteDraft } from "./components/favorite-editor";
import { FavoritesTable } from "./components/favorites-table";
import { Header } from "./components/header";
import { HistoryTable } from "./components/history-table";
import { Icon } from "./components/icon";
import { DrawerShell, ProfileDetails } from "./components/record-drawer";
import { SearchBox } from "./components/search-box";
import { Toolbar, VIEW_LABELS } from "./components/toolbar";
import { useColumnPreferences } from "./state/use-column-preferences";
import { useConfirm } from "./state/use-confirm";
import { useRecords } from "./state/use-records";
import { useToast } from "./state/use-toast";

type DrawerState =
  | null
  | { mode: "view"; view: DataManagerView; id: string }
  | { mode: "edit"; id: string }
  | { mode: "create" };

export function App() {
  const route = useMemo(function () {
    return parseDataManagerPageLocation(window.location.search);
  }, []);
  const scope = route.scope;
  const [view, setView] = useState<DataManagerView>(route.view);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const editorDirtyRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const records = useRecords(scope);
  const { columns, setViewColumns } = useColumnPreferences();
  const { toast, showToast } = useToast();
  const { confirm, confirmDialog } = useConfirm();

  const visibleFavorites = records.favorites.filter(function (entry) {
    return matchesQuery(entry.profile, [getFavoriteTitle(entry), entry.note], query);
  });
  const visibleHistory = records.history.filter(function (entry) {
    return matchesQuery(entry.profile, [formatDisplayTime(entry.createdAt)], query);
  });
  const drawerFavoriteId = drawer && (drawer.mode === "edit" || (drawer.mode === "view" && drawer.view === "favorites"))
    ? drawer.id
    : null;
  const drawerFavorite = drawerFavoriteId
    ? records.favorites.find(function (entry) { return entry.id === drawerFavoriteId; }) || null
    : null;
  const drawerHistory = drawer && drawer.mode === "view" && drawer.view === "history"
    ? records.history.find(function (entry) { return entry.id === drawer.id; }) || null
    : null;

  useEffect(function () {
    if (!window.history || typeof window.history.replaceState !== "function") return;
    window.history.replaceState(null, "", buildDataManagerPageUrl(window.location.href, scope, view));
  }, [scope, view]);

  useEffect(function () {
    function handleKeydown(event: KeyboardEvent): void {
      if (event.defaultPrevented || confirmDialog) return;
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing && scope) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && drawer) {
        event.preventDefault();
        void changeDrawer(null);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return function () {
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  async function runSafely(task: () => Promise<void>): Promise<void> {
    try {
      await task();
    } catch (_error) {
      showToast("操作失败，请重试", "danger");
    }
  }

  async function changeDrawer(next: DrawerState): Promise<boolean> {
    const editing = drawer && (drawer.mode === "edit" || drawer.mode === "create");
    if (editing && editorDirtyRef.current) {
      const discard = await confirm({
        title: "放弃未保存的修改？",
        description: "当前编辑的内容尚未保存，离开后将丢失。",
        confirmLabel: "放弃修改",
        cancelLabel: "继续编辑",
        danger: true
      });
      if (!discard) return false;
    }
    editorDirtyRef.current = false;
    setDrawer(next);
    return true;
  }

  async function copyProfile(profile: ProfileFieldMap): Promise<void> {
    if (await copyText(formatProfileForCopy(profile))) {
      showToast("已复制整组数据", "success");
    } else {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }

  async function copyField(fieldKey: ProfileFieldKey, value: string): Promise<void> {
    if (await copyText(value)) {
      showToast("已复制" + getFieldLabel(fieldKey), "success");
    } else {
      showToast("自动复制失败，请手动复制", "warning");
    }
  }

  function handleCopyField(fieldKey: ProfileFieldKey, value: string): void {
    void copyField(fieldKey, value);
  }

  function toggleRow(rowView: DataManagerView, id: string): void {
    const isOpen = drawer && drawer.mode === "view" && drawer.view === rowView && drawer.id === id;
    void changeDrawer(isOpen ? null : { mode: "view", view: rowView, id });
  }

  async function handleSave(draft: FavoriteDraft): Promise<void> {
    if (!drawer || (drawer.mode !== "edit" && drawer.mode !== "create")) return;
    try {
      if (drawer.mode === "edit") {
        await updateFavoriteProfile(scope, drawer.id, draft);
        showToast("常用数据已更新", "success");
        editorDirtyRef.current = false;
        setDrawer({ mode: "view", view: "favorites", id: drawer.id });
      } else {
        const created = await createFavoriteProfile(scope, draft);
        showToast("已新增常用数据", "success");
        editorDirtyRef.current = false;
        setDrawer({ mode: "view", view: "favorites", id: created.id });
      }
      await records.reload();
    } catch (_error) {
      showToast("保存失败，请重试", "danger");
    }
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
    if (drawerFavoriteId === id) setDrawer(null);
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
    void changeDrawer({ mode: "create" });
  }

  function renderNoMatch() {
    return (
      <EmptyState icon="search" title="没有匹配的数据" description={"没有找到包含「" + query.trim() + "」的数据。"}>
        <button type="button" class="dm-secondary-btn" onClick={function () { setQuery(""); }}>清空搜索</button>
      </EmptyState>
    );
  }

  function renderDrawer() {
    if (!drawer) return null;
    if (drawer.mode === "create" || (drawer.mode === "edit" && drawerFavorite)) {
      return (
        <FavoriteEditor
          key={drawer.mode === "edit" ? "edit-" + drawer.id : "create"}
          entry={drawer.mode === "edit" ? drawerFavorite : null}
          favorites={records.favorites}
          onCancel={function () {
            void changeDrawer(drawer.mode === "edit" ? { mode: "view", view: "favorites", id: drawer.id } : null);
          }}
          onSave={handleSave}
          onDirtyChange={function (dirty) { editorDirtyRef.current = dirty; }}
          onShowExisting={function (id) {
            void changeDrawer({ mode: "view", view: "favorites", id });
          }}
        />
      );
    }
    if (drawerFavorite) {
      const entry = drawerFavorite;
      return (
        <DrawerShell
          eyebrow="常用数据"
          title={getFavoriteTitle(entry)}
          subtitle={entry.note}
          onClose={function () { void changeDrawer(null); }}
          footer={
            <>
              <button type="button" class="dm-secondary-btn" onClick={function () { void copyProfile(entry.profile); }}>
                <Icon name="copy" />
                复制整组
              </button>
              <button type="button" class="dm-secondary-btn" onClick={function () { void changeDrawer({ mode: "edit", id: entry.id }); }}>
                <Icon name="pencil" />
                编辑
              </button>
              <span class="dm-drawer-foot-spacer" />
              <button
                type="button"
                class="dm-ghost-btn is-danger"
                onClick={function () { void runSafely(function () { return handleDelete(entry.id); }); }}
              >
                <Icon name="trash-2" />
                删除
              </button>
            </>
          }
        >
          <ProfileDetails profile={entry.profile} onCopyField={handleCopyField} />
        </DrawerShell>
      );
    }
    if (drawerHistory) {
      const entry = drawerHistory;
      return (
        <DrawerShell
          eyebrow="生成记录"
          title={entry.profile.fullName || "生成记录"}
          subtitle={"生成于 " + formatDisplayTime(entry.createdAt)}
          onClose={function () { void changeDrawer(null); }}
          footer={
            <>
              <button type="button" class="dm-secondary-btn" onClick={function () { void copyProfile(entry.profile); }}>
                <Icon name="copy" />
                复制整组
              </button>
              <button
                type="button"
                class="dm-secondary-btn"
                onClick={function () { void runSafely(function () { return handleHistoryFavorite(entry.id); }); }}
              >
                <Icon name="star" />
                收藏
              </button>
            </>
          }
        >
          <ProfileDetails profile={entry.profile} onCopyField={handleCopyField} />
        </DrawerShell>
      );
    }
    return null;
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
      if (!visibleHistory.length) return renderNoMatch();
      return (
        <HistoryTable
          entries={visibleHistory}
          columns={columns.history}
          query={query}
          selectedId={drawerHistory ? drawerHistory.id : null}
          onSelect={function (id) { toggleRow("history", id); }}
          onCopyField={handleCopyField}
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
    if (!visibleFavorites.length) return renderNoMatch();
    return (
      <FavoritesTable
        entries={visibleFavorites}
        columns={columns.favorites}
        query={query}
        selectedId={drawerFavoriteId}
        sortable={!query.trim()}
        onSelect={function (id) { toggleRow("favorites", id); }}
        onCopyField={handleCopyField}
        onCopyAll={function (id) {
          const entry = records.favorites.find(function (item) { return item.id === id; });
          if (entry) void copyProfile(entry.profile);
        }}
        onEdit={function (id) { void changeDrawer({ mode: "edit", id }); }}
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
            if (nextView === view) return;
            void changeDrawer(null).then(function (changed) {
              if (!changed) return;
              setView(nextView);
              void records.reload();
            });
          }}
        >
          <SearchBox inputRef={searchInputRef} value={query} onChange={setQuery} />
          <ColumnPicker
            columns={columns[view]}
            defaultColumns={DEFAULT_COLUMNS[view]}
            onChange={function (nextColumns) { setViewColumns(view, nextColumns); }}
          />
        </Toolbar>
      ) : null}
      <div class="dm-body">
        <section class="dm-main" role="tabpanel" aria-label={VIEW_LABELS[view]}>
          {renderWorkspace()}
        </section>
        {renderDrawer()}
      </div>
      {toast ? (
        <div class="dm-toast" role="status" data-tone={toast.tone} key={toast.id}>{toast.message}</div>
      ) : null}
      {confirmDialog}
    </div>
  );
}
