import { useEffect, useRef, useState } from "preact/hooks";
import type { FavoriteEntry } from "../page-model";
import { moveId, shiftId } from "../lib/display";
import { ActionButton } from "./action-button";

export function FavoritesTable(props: {
  entries: FavoriteEntry[];
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
    <div class="dm-table-shell dm-favorites-shell">
      <table ref={tableRef} class="dm-table dm-favorites-table">
        <thead>
          <tr>
            <th class="dm-sort-column">排序</th>
            <th>姓名</th>
            <th>身份证号</th>
            <th>公司名称</th>
            <th>统一社会信用代码</th>
            <th>手机号</th>
            <th>备注</th>
            <th>操作</th>
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
            return (
              <tr
                key={entry.id}
                data-favorite-id={entry.id}
                class={dragOrder && draggedIdRef.current === entry.id ? "is-dragging" : undefined}
              >
                <td class="dm-sort-cell">
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
                    <span aria-hidden="true">⠿</span>
                  </button>
                </td>
                <td>{entry.profile.fullName || "—"}</td>
                <td>{entry.profile.idNumber || "—"}</td>
                <td>{entry.profile.companyName || "—"}</td>
                <td>{entry.profile.creditCode || "—"}</td>
                <td>{entry.profile.mobile || "—"}</td>
                <td>{entry.note || "—"}</td>
                <td>
                  <div class="dm-table-actions">
                    <ActionButton icon="pencil" label="编辑" onClick={function () { props.onEdit(entry.id); }} />
                    <ActionButton icon="trash-2" label="删除" danger onClick={function () { props.onDelete(entry.id); }} />
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
