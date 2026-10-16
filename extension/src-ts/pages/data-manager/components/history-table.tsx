import type { HistoryEntry } from "../page-model";
import { formatDisplayTime } from "../lib/display";
import { ActionButton } from "./action-button";

export function HistoryTable(props: {
  entries: HistoryEntry[];
  onFavorite: (id: string) => void;
  onCopy: (id: string) => void;
}) {
  return (
    <div class="dm-table-shell">
      <table class="dm-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>姓名</th>
            <th>公司</th>
            <th>手机</th>
            <th>邮箱</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {props.entries.map(function (entry) {
            return (
              <tr key={entry.id}>
                <td>{formatDisplayTime(entry.createdAt)}</td>
                <td>{entry.profile.fullName || "—"}</td>
                <td>{entry.profile.companyName || "—"}</td>
                <td>{entry.profile.mobile || "—"}</td>
                <td>{entry.profile.email || "—"}</td>
                <td>
                  <div class="dm-table-actions">
                    <ActionButton icon="star" label="收藏" onClick={function () { props.onFavorite(entry.id); }} />
                    <ActionButton icon="copy" label="复制" onClick={function () { props.onCopy(entry.id); }} />
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
