import type { FavoriteEntry } from "./page-model";
import { escapeHtml, renderActionButton } from "./view-helpers";

export function renderFavoritesView(_scope: string, entries: FavoriteEntry[]): string {
  return [
    '<section class="dm-view dm-view-favorites" aria-label="常用数据">',
    entries.length
      ? [
          '<div class="dm-table-shell dm-favorites-shell">',
          '  <table class="dm-table dm-favorites-table">',
          "    <thead><tr><th>姓名</th><th>公司</th><th>手机</th><th>邮箱</th><th>操作</th></tr></thead>",
          "    <tbody>",
          entries.map(function (entry) {
            return [
              "<tr>",
              "  <td>" + escapeHtml(entry.profile.fullName || "未填写") + "</td>",
              "  <td>" + escapeHtml(entry.profile.companyName || "未填写") + "</td>",
              "  <td>" + escapeHtml(entry.profile.mobile || "未填写") + "</td>",
              "  <td>" + escapeHtml(entry.profile.email || "未填写") + "</td>",
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
