import { useEffect, useRef, useState } from "preact/hooks";
import { getFieldLabel, type FavoriteEntry, type ProfileFieldKey } from "../page-model";
import { getCustomFavoriteName, getFavoriteTitle, moveId, shiftId } from "../lib/display";
import { FieldCell } from "./field-cell";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";

export function FavoritesTable(props: {
  entries: FavoriteEntry[];
  columns: ProfileFieldKey[];
  onEdit: (id: string) => void;
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
                class={dragOrder && draggedIdRef.current === entry.id ? "is-dragging" : undefined}
              >
                <td class="dm-col-handle">
                  <button
                    type="button"
                    class="dm-drag-handle"
                    draggable
                    data-id={entry.id}
                    aria-label="拖动排序"
                    title="拖动排序（也可使用上下方向键）"
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
                    <span class={"dm-title-text" + (customName ? "" : " dm-cell-empty")}>{getFavoriteTitle(entry)}</span>
                    {entry.note ? <span class="dm-title-note" title={entry.note}>{entry.note}</span> : null}
                  </div>
                </td>
                {props.columns.map(function (fieldKey) {
                  return (
                    <td key={fieldKey}>
                      <FieldCell fieldKey={fieldKey} value={entry.profile[fieldKey]} />
                    </td>
                  );
                })}
                <td class="dm-col-actions">
                  <div class="dm-row-actions">
                    <IconButton icon="pencil" label="编辑" onClick={function () { props.onEdit(entry.id); }} />
                    <IconButton icon="trash-2" label="删除" tone="danger" onClick={function () { props.onDelete(entry.id); }} />
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
