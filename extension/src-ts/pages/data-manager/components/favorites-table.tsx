import { useEffect, useRef, useState } from "preact/hooks";
import { getFieldLabel, type FavoriteEntry, type ProfileFieldKey } from "../page-model";
import { getCustomFavoriteName, getFavoriteTitle, moveId, shiftId } from "../lib/display";
import { FieldCell } from "./field-cell";
import { Highlight } from "./highlight";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { MoreMenu } from "./menu";

export function FavoritesTable(props: {
  entries: FavoriteEntry[];
  columns: ProfileFieldKey[];
  query: string;
  selectedId: string | null;
  sortable: boolean;
  onSelect: (id: string) => void;
  onCopyField: (fieldKey: ProfileFieldKey, value: string) => void;
  onCopyAll: (id: string) => void;
  onEdit: (id: string) => void;
  onCopyToSites: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const entriesById = new Map(props.entries.map(function (entry) {
    return [entry.id, entry];
  }));
  const orderedEntries = (dragOrder || props.entries.map(function (entry) { return entry.id; }))
    .map(function (id) { return entriesById.get(id); })
    .filter(function (entry): entry is FavoriteEntry { return !!entry; });

  useEffect(function () {
    const focusId = pendingFocusIdRef.current;
    if (!focusId) return;
    pendingFocusIdRef.current = null;
    tableRef.current?.querySelector<HTMLElement>('.dm-drag-handle[data-id="' + CSS.escape(focusId) + '"]')?.focus();
  }, [props.entries]);

  function finishDrag(commit: boolean): void {
    const order = dragOrder;
    draggedIdRef.current = null;
    setDragOrder(null);
    if (commit && order) props.onReorder(order);
  }

  return (
    <div class="dm-table-shell">
      <table ref={tableRef} class="dm-table dm-favorites-table">
        <thead>
          <tr>
            <th class="dm-col-handle" aria-label="排序" />
            <th>名称</th>
            {props.columns.map(function (fieldKey) {
              return <th key={fieldKey}>{getFieldLabel(fieldKey)}</th>;
            })}
            <th class="dm-col-actions">操作</th>
          </tr>
        </thead>
        <tbody
          onDragOver={function (event) {
            const draggedId = draggedIdRef.current;
            if (!draggedId) return;
            event.preventDefault();
            const row = (event.target as HTMLElement | null)?.closest<HTMLTableRowElement>("tr[data-favorite-id]");
            const targetId = row?.getAttribute("data-favorite-id");
            if (!row || !targetId || targetId === draggedId) return;
            const rect = row.getBoundingClientRect();
            const placeBefore = event.clientY < rect.top + rect.height / 2;
            setDragOrder(function (current) {
              return moveId(current || orderedEntries.map(function (entry) { return entry.id; }), draggedId, targetId, placeBefore);
            });
          }}
          onDrop={function (event) {
            if (!draggedIdRef.current) return;
            event.preventDefault();
            finishDrag(true);
          }}
        >
          {orderedEntries.map(function (entry) {
            const customName = getCustomFavoriteName(entry.name);
            return (
              <tr
                key={entry.id}
                data-favorite-id={entry.id}
                tabIndex={0}
                class={[
                  "dm-row",
                  props.selectedId === entry.id ? "is-selected" : "",
                  dragOrder && draggedIdRef.current === entry.id ? "is-dragging" : ""
                ].join(" ").trim()}
                onClick={function () { props.onSelect(entry.id); }}
                onKeyDown={function (event) {
                  if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(entry.id);
                }}
              >
                <td class="dm-col-handle">
                  <button
                    type="button"
                    class="dm-drag-handle"
                    draggable={props.sortable}
                    disabled={!props.sortable}
                    data-id={entry.id}
                    aria-label="拖动排序"
                    title={props.sortable ? "拖动排序（也可使用上下方向键）" : "搜索时不可排序"}
                    onClick={function (event) { event.stopPropagation(); }}
                    onDragStart={function (event) {
                      draggedIdRef.current = entry.id;
                      setDragOrder(props.entries.map(function (item) { return item.id; }));
                      if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", entry.id);
                      }
                    }}
                    onDragEnd={function () {
                      if (draggedIdRef.current) finishDrag(false);
                    }}
                    onKeyDown={function (event) {
                      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                      const ids = props.entries.map(function (item) { return item.id; });
                      const next = shiftId(ids, entry.id, event.key === "ArrowUp" ? -1 : 1);
                      if (!next) return;
                      event.preventDefault();
                      pendingFocusIdRef.current = entry.id;
                      props.onReorder(next);
                    }}
                  >
                    <Icon name="grip-vertical" />
                  </button>
                </td>
                <td>
                  <div class="dm-title-cell">
                    <span class={"dm-title-text" + (customName ? "" : " is-fallback")}>
                      <Highlight text={getFavoriteTitle(entry)} query={props.query} />
                    </span>
                    {entry.note ? (
                      <span class="dm-title-note" title={entry.note}>
                        <Highlight text={entry.note} query={props.query} />
                      </span>
                    ) : null}
                  </div>
                </td>
                {props.columns.map(function (fieldKey) {
                  return (
                    <td key={fieldKey}>
                      <FieldCell fieldKey={fieldKey} value={entry.profile[fieldKey]} query={props.query} onCopy={props.onCopyField} />
                    </td>
                  );
                })}
                <td class="dm-col-actions">
                  <div class="dm-row-actions">
                    <IconButton icon="copy" label="复制整组" onClick={function () { props.onCopyAll(entry.id); }} />
                    <IconButton icon="pencil" label="编辑" onClick={function () { props.onEdit(entry.id); }} />
                    <MoreMenu
                      label="更多操作"
                      items={[
                        { icon: "copy-plus", label: "复制到其他站点", onSelect: function () { props.onCopyToSites(entry.id); } },
                        { icon: "trash-2", label: "删除", danger: true, onSelect: function () { props.onDelete(entry.id); } }
                      ]}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
