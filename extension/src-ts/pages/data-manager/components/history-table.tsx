import { getFieldLabel, type HistoryEntry, type ProfileFieldKey } from "../page-model";
import { formatDisplayTime } from "../lib/display";
import { FieldCell } from "./field-cell";
import { IconButton } from "./icon-button";

export function HistoryTable(props: {
  entries: HistoryEntry[];
  columns: ProfileFieldKey[];
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
              <tr key={entry.id}>
                <td class="dm-cell-time">{formatDisplayTime(entry.createdAt)}</td>
                {props.columns.map(function (fieldKey) {
                  return (
                    <td key={fieldKey}>
                      <FieldCell fieldKey={fieldKey} value={entry.profile[fieldKey]} />
                    </td>
                  );
                })}
                <td class="dm-col-actions">
                  <div class="dm-row-actions">
                    <IconButton icon="star" label="收藏" onClick={function () { props.onFavorite(entry.id); }} />
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
