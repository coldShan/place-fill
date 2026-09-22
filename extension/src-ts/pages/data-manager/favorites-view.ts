import type { FavoriteEntry } from "./page-model";
import { escapeHtml, renderActionButton } from "./view-helpers";

export function renderFavoritesView(_scope: string, entries: FavoriteEntry[]): string {
  return [
    '<section class="dm-view dm-view-favorites" aria-label="常用数据">',
    entries.length
      ? [
          '<div class="dm-table-shell dm-favorites-shell">',
          '  <table class="dm-table dm-favorites-table">',
          '    <thead><tr><th class="dm-sort-column">排序</th><th>姓名</th><th>身份证号</th><th>公司名称</th><th>统一社会信用代码</th><th>手机号</th><th>备注</th><th>操作</th></tr></thead>',
          "    <tbody>",
          entries.map(function (entry) {
            return [
              '<tr data-favorite-id="' + escapeHtml(entry.id) + '">',
              '  <td class="dm-sort-cell"><button type="button" class="dm-drag-handle" draggable="true" data-role="favorite-drag-handle" data-id="' + escapeHtml(entry.id) + '" aria-label="拖动排序" title="拖动排序（也可使用上下方向键）"><span aria-hidden="true">⠿</span></button></td>',
              "  <td>" + escapeHtml(entry.profile.fullName || "—") + "</td>",
              "  <td>" + escapeHtml(entry.profile.idNumber || "—") + "</td>",
              "  <td>" + escapeHtml(entry.profile.companyName || "—") + "</td>",
              "  <td>" + escapeHtml(entry.profile.creditCode || "—") + "</td>",
              "  <td>" + escapeHtml(entry.profile.mobile || "—") + "</td>",
              "  <td>" + escapeHtml(entry.note || "—") + "</td>",
              '  <td class="dm-table-actions">',
              renderActionButton("favorite-edit", entry.id, "edit", "编辑"),
              renderActionButton("favorite-delete", entry.id, "delete", "删除", " is-danger"),
              "  </td>",
              "</tr>"
            ].join("");
          }).join(""),
          "    </tbody>",
          "  </table>",
          "</div>"
        ].join("")
      : [
          '<section class="dm-empty-state">',
          "  <h2>当前作用域还没有常用数据</h2>",
          "  <p>你可以手动新增一组数据，或者稍后从生成记录里收藏一组数据。</p>",
          '  <button type="button" class="dm-primary-btn" data-action="open-create-favorite">新增第一组数据</button>',
          "</section>"
        ].join(""),
    "</section>"
  ].join("");
}
