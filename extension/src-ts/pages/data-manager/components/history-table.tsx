import { getFieldLabel, type HistoryEntry, type ProfileFieldKey } from "../page-model";
import { formatDisplayTime } from "../lib/display";
import { FieldCell } from "./field-cell";
import { IconButton } from "./icon-button";

export function HistoryTable(props: {
  entries: HistoryEntry[];
  columns: ProfileFieldKey[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCopyField: (fieldKey: ProfileFieldKey, value: string) => void;
  favoritedIds: Set<string>;
  onFavorite: (id: string) => void;
  onCopy: (id: string) => void;
}) {
  return (
    <div class="dm-table-shell">
      <table class="dm-table dm-history-table">
        <thead>
          <tr>
            <th>生成时间</th>
            {props.columns.map(function (fieldKey) {
              return <th key={fieldKey}>{getFieldLabel(fieldKey)}</th>;
            })}
            <th class="dm-col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          {props.entries.map(function (entry) {
            return (
              <tr
                key={entry.id}
                tabIndex={0}
                class={"dm-row" + (props.selectedId === entry.id ? " is-selected" : "")}
                onClick={function () { props.onSelect(entry.id); }}
                onKeyDown={function (event) {
                  if (event.key === "Enter" && event.target === event.currentTarget) props.onSelect(entry.id);
                }}
              >
                <td class="dm-cell-time">
                  {formatDisplayTime(entry.createdAt)}
                  {props.favoritedIds.has(entry.id) ? <span class="dm-badge">已收藏</span> : null}
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
                    {props.favoritedIds.has(entry.id) ? (
                      <IconButton icon="star" label="已收藏，查看常用数据" tone="accent" onClick={function () { props.onFavorite(entry.id); }} />
                    ) : (
                      <IconButton icon="star" label="收藏" onClick={function () { props.onFavorite(entry.id); }} />
                    )}
                    <IconButton icon="copy" label="复制整组" onClick={function () { props.onCopy(entry.id); }} />
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
